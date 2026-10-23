import { computeStreak } from "@/features/lectio/liturgy";
import { sendPush, type PushResult, type VapidKeys } from "@/lib/web-push";
import { brasiliaNow, dailyPush, type PushMessage } from "./push-message";

// Só roda no servidor: usa as chaves secretas do VAPID e o acesso de administrador.

export function vapidFromEnv(): VapidKeys | null {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: process.env["VAPID_SUBJECT"] ?? "https://ocaminhodasantidade.lovable.app",
  };
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Envia e apaga a inscrição se o aparelho não aceitar mais (app removido, permissão retirada). */
export async function deliver(
  sub: Sub,
  message: PushMessage,
  vapid: VapidKeys,
): Promise<PushResult> {
  const result = await sendPush(sub, message, vapid);
  if (result.gone) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
  }
  return result;
}

/** Aviso da hora cheia: para cada aparelho que escolheu esta hora (de Brasília). */
export async function sendDailyPushes(now = new Date()) {
  const vapid = vapidFromEnv();
  if (!vapid) throw new Error("Faltam VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.");
  const { date, hour } = brasiliaNow(now);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("notify_hour", hour);
  if (error) throw new Error(error.message);
  if (!subs?.length) return { hour, sent: 0, skipped: 0, failed: 0 };

  const users = [...new Set(subs.map((s) => s.user_id))];
  const { data: lectios } = await supabaseAdmin
    .from("lectio_entries")
    .select("user_id, date")
    .in("user_id", users)
    .not("completed_at", "is", null)
    .gte("date", new Date(Date.parse(date) - 400 * 86400000).toISOString().slice(0, 10));
  const doneBy = new Map<string, string[]>();
  for (const l of lectios ?? []) doneBy.set(l.user_id, [...(doneBy.get(l.user_id) ?? []), l.date]);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      const done = doneBy.get(sub.user_id) ?? [];
      const message = dailyPush(date, done.includes(date), computeStreak(done, date));
      if (!message) return void skipped++;
      try {
        const r = await deliver(sub, message, vapid);
        if (r.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }),
  );
  return { hour, sent, skipped, failed };
}
