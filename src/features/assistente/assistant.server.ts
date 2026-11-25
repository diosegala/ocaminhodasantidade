// Só roda no servidor: usa a chave da API da pessoa, guardada no Vault do Supabase.

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import type { BookLite } from "@/features/biblia/reference";
import {
  parseCatechism,
  URL_CATECISMO,
  type Catechism,
  type RawFile,
} from "@/features/catecismo/data";
import { runTool, TOOLS, type ToolContext } from "./tools";

export const DEFAULT_MODEL = "claude-opus-5-5";

/** Modelos que aceitam o desvio automático para outro modelo quando recusam responder. */
const FALLBACK_MODELS = new Set([
  "claude-fable-5-2",
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
]);

const MAX_ROUNDS = 8;
const HISTORY_MESSAGES = 20;

const SYSTEM = `Você é o assistente de estudo do Caminho, um app católico de lectio divina e catequese. Responda sempre em português do Brasil.

Ajude a pessoa a entender a fé católica a partir de três fontes, que você consulta com as ferramentas:
- a Bíblia, na tradução Ave-Maria;
- o Catecismo da Igreja Católica;
- as aulas de catequese que a própria pessoa registrou no app (anotações e sínteses).

Como responder:
- Consulte as fontes antes de responder. Apoie cada afirmação de doutrina em um parágrafo do Catecismo ou num trecho da Bíblia que você leu com as ferramentas; não cite de memória números de parágrafos ou versículos que não conferiu.
- Quando a pergunta tiver relação com o que a pessoa estudou, procure nas aulas dela e diga o que encontrou ("na sua aula de 12/10, sobre…").
- Se as fontes não tratam do assunto, diga isso com clareza em vez de completar com suposições.
- Fiel ao Magistério da Igreja. Em questões pessoais de consciência, vocação ou direção espiritual, ajude a entender o ensinamento e recomende conversar com um padre ou com o catequista.
- Seja direto e acolhedor. Prefira parágrafos curtos; use listas com "- " só quando ajudarem. Não use títulos, tabelas nem negrito.

Como citar (o app transforma as citações em links):
- Catecismo: "§ 1213" (ou "§§ 1213-1216").
- Bíblia: entre colchetes duplos, com a abreviação do livro, como [[Jo 3,16]] ou [[1Cor 13,4-7]].
- Aulas: pela data e pelo tema.`;

let catechismCache: Promise<Catechism> | null = null;

/** O Catecismo vem do mesmo arquivo que o app usa, lido uma vez por instância do servidor. */
function loadCatechism(): Promise<Catechism> {
  if (!catechismCache) {
    const url = new URL(URL_CATECISMO, getRequest().url);
    catechismCache = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Catecismo indisponível (${res.status})`);
        return res.json() as Promise<RawFile>;
      })
      .then(parseCatechism)
      .catch((e: unknown) => {
        catechismCache = null;
        throw e;
      });
  }
  return catechismCache;
}

export async function userApiKey(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("get_user_anthropic_key", { _user_id: userId });
  if (error) throw new Error(`Não consegui ler a chave: ${error.message}`);
  return data ?? null;
}

export function clientFor(apiKey: string) {
  return new Anthropic({ apiKey, maxRetries: 2 });
}

export type ModelOption = { id: string; name: string };

export async function listModels(apiKey: string): Promise<ModelOption[]> {
  const client = clientFor(apiKey);
  const out: (ModelOption & { created: string })[] = [];
  for await (const m of client.models.list({ limit: 100 })) {
    out.push({ id: m.id, name: m.display_name, created: m.created_at });
  }
  return out
    .sort((a, b) => b.created.localeCompare(a.created))
    .map(({ id, name }) => ({ id, name }));
}

/** Mensagem compreensível para os erros da API. */
export function friendlyApiError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError)
    return "A chave da API não foi aceita pela Anthropic.";
  if (e instanceof Anthropic.PermissionDeniedError)
    return "A chave não tem permissão para usar este modelo.";
  if (e instanceof Anthropic.NotFoundError)
    return "Este modelo não está disponível para a sua chave. Escolha outro em Conta → Assistente.";
  if (e instanceof Anthropic.RateLimitError)
    return "Muitas perguntas seguidas. Espere um pouco e tente de novo.";
  if (e instanceof Anthropic.APIConnectionError)
    return "Não consegui falar com a Anthropic. Verifique a internet e tente de novo.";
  if (e instanceof Anthropic.APIError) {
    if (/credit balance/i.test(e.message))
      return "A conta da API está sem créditos. Adicione créditos no console da Anthropic.";
    return `A Anthropic respondeu com erro (${e.status ?? "?"}). Tente de novo.`;
  }
  return e instanceof Error ? e.message : "Erro inesperado.";
}

export type Turn = { role: "user" | "assistant"; content: string };

export type AgentResult = {
  answer: string;
  usage: { input: number; output: number; cacheRead: number };
};

/** Conversa com o modelo, deixando-o consultar as fontes quantas vezes precisar (até um limite). */
export async function runAgent(opts: {
  apiKey: string;
  model: string;
  history: Turn[];
  question: string;
  supabase: SupabaseClient<Database>;
}): Promise<AgentResult> {
  const client = clientFor(opts.apiKey);
  const { data: books } = await opts.supabase
    .from("bible_books")
    .select("id, name, abbreviation, testament, book_order, chapter_count")
    .order("book_order");
  const ctx: ToolContext = {
    supabase: opts.supabase,
    books: (books ?? []) as BookLite[],
    catechism: loadCatechism,
  };

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...opts.history.slice(-HISTORY_MESSAGES).map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: opts.question },
  ];
  const usage = { input: 0, output: 0, cacheRead: 0 };
  const fallback = FALLBACK_MODELS.has(opts.model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
    : {};

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Sem "thinking" nem "effort": cada modelo usa o próprio padrão, e qualquer modelo
    // escolhido na lista funciona com o mesmo pedido.
    const response = await client.beta.messages.create({
      model: opts.model,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
      ...fallback,
    });
    usage.input += response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0);
    usage.output += response.usage.output_tokens;
    usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (response.stop_reason === "refusal") {
      return {
        answer: "O modelo preferiu não responder a esta pergunta. Tente perguntar de outro jeito.",
        usage,
      };
    }
    if (response.stop_reason !== "tool_use") {
      return { answer: text || "Não consegui formular uma resposta. Tente de novo.", usage };
    }

    // Devolve o conteúdo inteiro (inclusive o raciocínio) e os resultados de todas as
    // ferramentas pedidas, numa única mensagem.
    messages.push({ role: "assistant", content: response.content });
    const calls = response.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );
    const results = await Promise.all(
      calls.map(async (call): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        try {
          const content = await runTool(call.name, call.input as Record<string, unknown>, ctx);
          return { type: "tool_result", tool_use_id: call.id, content };
        } catch (e) {
          return {
            type: "tool_result",
            tool_use_id: call.id,
            content: `Erro: ${e instanceof Error ? e.message : String(e)}`,
            is_error: true,
          };
        }
      }),
    );
    messages.push({ role: "user", content: results });
  }
  return {
    answer: "A pesquisa ficou longa demais. Tente uma pergunta mais específica.",
    usage,
  };
}
