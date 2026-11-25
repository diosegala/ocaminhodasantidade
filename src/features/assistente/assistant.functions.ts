import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";

export type AiSettings = { hasKey: boolean; keyHint: string | null; model: string | null };

/** Se há chave salva (só os 4 últimos caracteres) e o modelo escolhido. */
export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AiSettings> => {
    const { data } = await context.supabase
      .from("ai_settings")
      .select("key_hint, model")
      .maybeSingle();
    return {
      hasKey: !!data?.key_hint,
      keyHint: data?.key_hint ?? null,
      model: data?.model ?? null,
    };
  });

/** Confere a chave com a Anthropic e guarda no Vault. */
export const saveAiKey = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ key: z.string().trim().min(20, "Cole a chave completa.").max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { listModels, friendlyApiError } = await import("./assistant.server");
    try {
      await listModels(data.key);
    } catch (e) {
      throw new Error(friendlyApiError(e));
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const saved = await supabaseAdmin.rpc("set_user_anthropic_key", {
      _user_id: context.userId,
      _key: data.key,
    });
    if (saved.error) throw new Error(`Não consegui guardar a chave: ${saved.error.message}`);
    const { error } = await context.supabase
      .from("ai_settings")
      .upsert({ user_id: context.userId, key_hint: data.key.slice(-4) }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAiKey = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const removed = await supabaseAdmin.rpc("delete_user_anthropic_key", {
      _user_id: context.userId,
    });
    if (removed.error) throw new Error(removed.error.message);
    await context.supabase
      .from("ai_settings")
      .update({ key_hint: null })
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** Modelos que a chave da pessoa pode usar, direto da API (os novos aparecem sozinhos). */
export const listAiModels = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { listModels, userApiKey, friendlyApiError, DEFAULT_MODEL } =
      await import("./assistant.server");
    const key = await userApiKey(context.userId);
    if (!key) return { models: [], defaultModel: DEFAULT_MODEL };
    try {
      return { models: await listModels(key), defaultModel: DEFAULT_MODEL };
    } catch (e) {
      throw new Error(friendlyApiError(e));
    }
  });

export const saveAiModel = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ model: z.string().regex(/^[a-z0-9.-]{3,80}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ai_settings")
      .upsert({ user_id: context.userId, model: data.model }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Faz uma pergunta; cria a conversa na primeira pergunta e guarda pergunta e resposta. */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        conversationId: z.string().uuid().nullable(),
        question: z.string().trim().min(2).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { runAgent, userApiKey, friendlyApiError, DEFAULT_MODEL } =
      await import("./assistant.server");
    const db = context.supabase;
    const key = await userApiKey(context.userId);
    if (!key) throw new Error("Cadastre a sua chave da API em Conta → Assistente de estudo.");
    const { data: settings } = await db.from("ai_settings").select("model").maybeSingle();
    const model = settings?.model || DEFAULT_MODEL;

    let conversationId = data.conversationId;
    let history: { role: "user" | "assistant"; content: string }[] = [];
    if (conversationId) {
      const { data: rows, error } = await db
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at");
      if (error) throw new Error(error.message);
      history = (rows ?? []) as typeof history;
    }

    let result;
    try {
      result = await runAgent({
        apiKey: key,
        model,
        history,
        question: data.question,
        supabase: db,
      });
    } catch (e) {
      throw new Error(friendlyApiError(e));
    }

    if (!conversationId) {
      const { data: conv, error } = await db
        .from("ai_conversations")
        .insert({ title: data.question.slice(0, 120) })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      conversationId = conv.id;
    } else {
      // Sobe a conversa para o topo da lista.
      await db
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    const now = Date.now();
    const saved = await db.from("ai_messages").insert([
      {
        conversation_id: conversationId,
        role: "user",
        content: data.question,
        created_at: new Date(now).toISOString(),
      },
      {
        conversation_id: conversationId,
        role: "assistant",
        content: result.answer,
        created_at: new Date(now + 1).toISOString(),
      },
    ]);
    if (saved.error) throw new Error(saved.error.message);
    await db.from("ai_usage").insert({
      function_name: "assistente",
      model,
      input_tokens: result.usage.input,
      output_tokens: result.usage.output,
      cache_read_tokens: result.usage.cacheRead,
      tokens: result.usage.input + result.usage.output,
    });
    return { conversationId, answer: result.answer, model };
  });
