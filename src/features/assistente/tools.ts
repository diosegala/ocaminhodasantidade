// Ferramentas do assistente: o modelo pede e o servidor consulta a Bíblia, o Catecismo e
// as aulas da própria pessoa. Só o trecho encontrado volta para o modelo, nunca o banco inteiro.

import type { SupabaseClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import type { Database } from "@/integrations/supabase/types";
import { describeReference, parseReference, type BookLite } from "@/features/biblia/reference";
import { searchForm, type Catechism } from "@/features/catecismo/data";

export type ToolContext = {
  /** Cliente com o login da pessoa: as regras do banco só deixam ver as aulas dela. */
  supabase: SupabaseClient<Database>;
  books: BookLite[];
  catechism: () => Promise<Catechism>;
};

const MAX_PARAGRAPH = 1800;
const MAX_LESSON_FIELD = 8000;

const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}… [cortado]` : s);

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "buscar_catecismo",
    description:
      "Busca parágrafos do Catecismo da Igreja Católica por palavras (sem diferenciar acentos). Devolve os parágrafos mais relevantes com o número (§). Use palavras-chave curtas, como 'purgatório' ou 'confissão pecado mortal'.",
    input_schema: {
      type: "object",
      properties: { termos: { type: "string", description: "Palavras-chave em português." } },
      required: ["termos"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "ler_catecismo",
    description:
      "Lê parágrafos do Catecismo pelo número, de 'de' até 'ate' (no máximo 12 de uma vez). Use para ler o contexto de um parágrafo encontrado ou citado.",
    input_schema: {
      type: "object",
      properties: {
        de: { type: "integer", description: "Primeiro parágrafo (1 a 2865)." },
        ate: { type: "integer", description: "Último parágrafo; igual a 'de' para ler só um." },
      },
      required: ["de", "ate"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "buscar_biblia",
    description:
      "Busca versículos na Bíblia Ave-Maria por palavras, com variações (amar, amor, amou). Todas as palavras precisam aparecer no versículo; use 'or' entre palavras para aceitar qualquer uma e aspas para uma expressão exata.",
    input_schema: {
      type: "object",
      properties: { termos: { type: "string", description: "Palavras em português." } },
      required: ["termos"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "ler_biblia",
    description:
      "Lê um trecho da Bíblia Ave-Maria pela referência, como 'Jo 3,16-21', 'Mateus 5' ou '1Cor 13,1-13'. Sem versículos, lê o capítulo inteiro.",
    input_schema: {
      type: "object",
      properties: { referencia: { type: "string", description: "Livro, capítulo e versículos." } },
      required: ["referencia"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "buscar_aulas",
    description:
      "Busca nas aulas de catequese que a pessoa registrou no app (tema, anotações e síntese). Com 'termos' vazio, lista todas as aulas com data e tema. Devolve o id de cada aula para usar em ler_aula.",
    input_schema: {
      type: "object",
      properties: {
        termos: { type: "string", description: "Palavras a procurar; vazio para listar todas." },
      },
      required: ["termos"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "ler_aula",
    description:
      "Lê uma aula registrada pela pessoa: tema, data, anotações, síntese e as dúvidas com respostas.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "Id da aula, vindo de buscar_aulas." } },
      required: ["id"],
      additionalProperties: false,
    },
    strict: true,
  },
];

/** Palavras curtas e comuns que não ajudam na busca. */
const STOPWORDS = new Set(
  "a o as os de da do das dos e em no na nos nas um uma uns umas por para com sem que se ao aos é ou mais como sua seu suas seus ele ela eles elas qual quais".split(
    " ",
  ),
);

function keywords(term: string) {
  return searchForm(term.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/** Parágrafos com mais palavras da busca primeiro; empate, na ordem do Catecismo. */
export function rankCatechism(cat: Catechism, term: string, limit = 8) {
  const words = keywords(term);
  if (!words.length) return [];
  return cat.searchable
    .map((p) => ({ p, score: words.filter((w) => p.plain.includes(w)).length }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.p.n - b.p.n)
    .slice(0, limit)
    .map((r) => r.p);
}

/** Trecho de um texto em volta da primeira palavra encontrada. */
export function snippetAround(text: string, words: string[], size = 300) {
  const plain = searchForm(text.toLowerCase());
  const at = Math.min(...words.map((w) => plain.indexOf(w)).filter((i) => i >= 0));
  if (!Number.isFinite(at)) return null;
  const start = Math.max(0, at - size / 2);
  return `${start > 0 ? "…" : ""}${text.slice(start, start + size).trim()}${start + size < text.length ? "…" : ""}`;
}

type Input = Record<string, unknown>;

export async function runTool(name: string, input: Input, ctx: ToolContext): Promise<string> {
  switch (name) {
    case "buscar_catecismo": {
      const cat = await ctx.catechism();
      const found = rankCatechism(cat, String(input["termos"] ?? ""));
      if (!found.length) return "Nenhum parágrafo encontrado. Tente outras palavras.";
      return found
        .map(
          (p) =>
            `§ ${p.n} (${cat.chapters[p.chapter]?.title ?? ""}): ${cut(p.text, MAX_PARAGRAPH)}`,
        )
        .join("\n\n");
    }
    case "ler_catecismo": {
      const cat = await ctx.catechism();
      const from = Math.max(1, Math.floor(Number(input["de"])));
      const to = Math.min(
        2865,
        Math.max(from, Math.floor(Number(input["ate"] ?? from))),
        from + 11,
      );
      const out: string[] = [];
      for (let n = from; n <= to; n++) {
        const ch = cat.chapters[cat.chapterOf.get(n) ?? -1];
        const p = ch?.paragraphs.find((x) => x.n === n);
        if (p) out.push(`§ ${n} (${ch!.title}): ${cut(p.text, MAX_PARAGRAPH)}`);
      }
      return out.length ? out.join("\n\n") : "Parágrafo não encontrado (vão de 1 a 2865).";
    }
    case "buscar_biblia": {
      const termos = String(input["termos"] ?? "").trim();
      if (!termos) return "Informe palavras para buscar.";
      const { data, error } = await ctx.supabase
        .from("bible_verses")
        .select("book_id, chapter, verse, text")
        .textSearch("busca", termos, { config: "portuguese", type: "websearch" })
        .order("book_id")
        .order("chapter")
        .order("verse")
        .limit(25);
      if (error) return `Erro na busca: ${error.message}`;
      if (!data.length) return "Nenhum versículo encontrado. Tente outras palavras ou 'or'.";
      const byId = new Map(ctx.books.map((b) => [b.id, b]));
      return data
        .map((v) => `${byId.get(v.book_id)?.name ?? "?"} ${v.chapter},${v.verse}: ${v.text}`)
        .join("\n");
    }
    case "ler_biblia": {
      const ref = parseReference(String(input["referencia"] ?? ""), ctx.books);
      if (!ref) return "Não reconheci a referência. Use, por exemplo, 'Jo 3,16-21' ou 'Mateus 5'.";
      let q = ctx.supabase
        .from("bible_verses")
        .select("verse, text")
        .eq("book_id", ref.book.id)
        .eq("chapter", ref.chapter);
      if (ref.verseStart)
        q = q.gte("verse", ref.verseStart).lte("verse", ref.verseEnd ?? ref.verseStart);
      const { data, error } = await q.order("verse").limit(80);
      if (error) return `Erro ao ler: ${error.message}`;
      if (!data.length) return `Não há versículos em ${describeReference(ref)}.`;
      return `${describeReference(ref)} (abreviação ${ref.book.abbreviation})\n${data
        .map((v) => `${v.verse} ${v.text}`)
        .join("\n")}`;
    }
    case "buscar_aulas": {
      const { data, error } = await ctx.supabase
        .from("lessons")
        .select("id, date, theme, raw_transcript, user_synthesis")
        .order("date", { ascending: false })
        .limit(200);
      if (error) return `Erro ao buscar as aulas: ${error.message}`;
      if (!data.length) return "A pessoa ainda não registrou nenhuma aula.";
      const words = keywords(String(input["termos"] ?? ""));
      const rows = data
        .map((l) => {
          const all = [l.theme, l.user_synthesis ?? "", l.raw_transcript ?? ""].join("\n");
          const snippet = words.length ? snippetAround(all, words) : null;
          return { l, snippet };
        })
        .filter((r) => !words.length || r.snippet)
        .slice(0, 15);
      if (!rows.length) return "Nenhuma aula fala disso. Use termos vazio para ver a lista.";
      return rows
        .map(
          ({ l, snippet }) =>
            `id ${l.id} · aula de ${l.date} · tema: ${l.theme || "(sem tema)"}${snippet ? `\n  ${snippet}` : ""}`,
        )
        .join("\n");
    }
    case "ler_aula": {
      const id = String(input["id"] ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return "Id de aula inválido.";
      const [{ data: l }, { data: qs }] = await Promise.all([
        ctx.supabase
          .from("lessons")
          .select("date, theme, raw_transcript, user_synthesis")
          .eq("id", id)
          .maybeSingle(),
        ctx.supabase.from("lesson_questions").select("question, answer").eq("lesson_id", id),
      ]);
      if (!l) return "Aula não encontrada.";
      const parts = [
        `Aula de ${l.date} · tema: ${l.theme || "(sem tema)"}`,
        l.user_synthesis ? `Síntese:\n${cut(l.user_synthesis, MAX_LESSON_FIELD)}` : "",
        l.raw_transcript ? `Anotações:\n${cut(l.raw_transcript, MAX_LESSON_FIELD)}` : "",
        qs?.length
          ? `Dúvidas:\n${qs.map((q) => `- ${q.question}${q.answer ? ` → ${q.answer}` : " (sem resposta)"}`).join("\n")}`
          : "",
      ];
      return parts.filter(Boolean).join("\n\n");
    }
    default:
      return `Ferramenta desconhecida: ${name}`;
  }
}
