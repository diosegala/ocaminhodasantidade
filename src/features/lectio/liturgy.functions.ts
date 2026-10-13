import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/require-auth";
import { normalizeLiturgy, type Liturgy } from "./liturgy";

export type LiturgyResult = { liturgy: Liturgy | null; fromCacheOfDate: string | null };

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const DAY = 86400000;

/** Busca a liturgia do dia nas duas APIs, na ordem; null se as duas falharem. */
async function fetchFromSources(date: string): Promise<Liturgy | null> {
  const [y, m, d] = date.split("-");
  const sources = [
    `https://liturgia.up.railway.app/v2/?dia=${d}&mes=${m}&ano=${y}`,
    `https://api-liturgia-diaria.vercel.app/?date=${date}`,
  ];
  for (const url of sources) {
    const lit = normalizeLiturgy(await fetchJson(url), date);
    if (lit) return lit;
  }
  return null;
}

function validateDate(input: { date: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input?.date ?? "")) throw new Error("Data inválida");
  // Limita a até ~1 ano atrás e 2 meses à frente, para não consultar as APIs com datas arbitrárias.
  const diff = new Date(input.date + "T12:00:00Z").getTime() - Date.now();
  if (Number.isNaN(diff) || diff < -400 * DAY || diff > 60 * DAY)
    throw new Error("Data fora do intervalo");
  return { date: input.date };
}

export const getLiturgy = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator(validateDate)
  .handler(async ({ data }): Promise<LiturgyResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { date } = data;

    const cached = await supabaseAdmin
      .from("liturgy_cache")
      .select("payload")
      .eq("date", date)
      .maybeSingle();
    if (cached.data?.payload)
      return { liturgy: cached.data.payload as unknown as Liturgy, fromCacheOfDate: null };

    const lit = await fetchFromSources(date);
    if (lit) {
      await supabaseAdmin
        .from("liturgy_cache")
        .upsert({ date, payload: lit as never, fetched_at: new Date().toISOString() });
      return { liturgy: lit, fromCacheOfDate: null };
    }

    // As duas falharam: devolve o último dia guardado.
    const last = await supabaseAdmin
      .from("liturgy_cache")
      .select("date, payload")
      .lte("date", date)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last.data)
      return { liturgy: last.data.payload as unknown as Liturgy, fromCacheOfDate: last.data.date };
    return { liturgy: null, fromCacheOfDate: null };
  });

/** Quantos dias à frente a liturgia fica guardada, como reserva contra as APIs fora do ar. */
export const RESERVE_DAYS = 7;

/**
 * Guarda no banco a liturgia dos próximos dias que ainda faltam. Chamada uma vez por
 * dia pelo app; assim, se as APIs caírem, a liturgia da semana já está guardada.
 */
export const reserveLiturgy = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator(validateDate)
  .handler(async ({ data }): Promise<{ saved: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const base = new Date(data.date + "T12:00:00Z").getTime();
    const dates = Array.from({ length: RESERVE_DAYS + 1 }, (_, i) =>
      new Date(base + i * DAY).toISOString().slice(0, 10),
    );
    const { data: cached } = await supabaseAdmin
      .from("liturgy_cache")
      .select("date")
      .in("date", dates);
    const have = new Set((cached ?? []).map((r) => r.date));
    let saved = 0;
    for (const date of dates.filter((d) => !have.has(d))) {
      const lit = await fetchFromSources(date);
      if (!lit) continue;
      await supabaseAdmin
        .from("liturgy_cache")
        .upsert({ date, payload: lit as never, fetched_at: new Date().toISOString() });
      saved++;
    }
    return { saved };
  });
