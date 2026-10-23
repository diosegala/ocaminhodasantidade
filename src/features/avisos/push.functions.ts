import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/require-auth";

const subscription = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(10),
  auth: z.string().min(10),
});

/** Chave pública do VAPID, para o navegador criar a inscrição (null = ainda não configurado). */
export const getPushKey = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const { vapidKeys } = await import("./push.server");
    return (await vapidKeys())?.publicKey ?? null;
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    subscription.extend({ notifyHour: z.number().int().min(0).max(23) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // O mesmo aparelho pode ter sido usado por outra conta: a inscrição passa a ser desta.
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        notify_hour: data.notifyHour,
        user_id: context.userId,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Hora escolhida para este aparelho (null = sem inscrição salva). */
export const getPushHour = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("push_subscriptions")
      .select("notify_hour")
      .eq("endpoint", data.endpoint)
      .maybeSingle();
    return row?.notify_hour ?? null;
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

/** Manda agora uma notificação de teste para este aparelho. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { deliver, vapidKeys } = await import("./push.server");
    const vapid = await vapidKeys();
    if (!vapid) throw new Error("As notificações ainda não foram configuradas no servidor.");
    const { data: sub } = await context.supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("endpoint", data.endpoint)
      .maybeSingle();
    if (!sub) throw new Error("Este aparelho não está inscrito. Ative as notificações de novo.");
    const r = await deliver(
      sub,
      {
        title: "Notificações ligadas",
        body: "É assim que o Caminho vai lembrar você da lectio de cada dia.",
        url: "/",
        tag: "teste",
      },
      vapid,
    );
    if (!r.ok) throw new Error(`O serviço de notificações recusou (${r.status}).`);
    return { ok: true };
  });
