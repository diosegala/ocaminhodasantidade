import { createServerFn } from "@tanstack/react-start";
import { normalizeLiturgy, type Liturgy } from "./liturgy";

export type LiturgyResult = { liturgy: Liturgy | null; fromCacheOfDate: string | null };

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9000), headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const getLiturgy = createServerFn({ method: "GET" })
  .inputValidator((input: { date: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input?.date ?? "")) throw new Error("Data inválida");
    return { date: input.date };
  })
  .handler(async ({ data }): Promise<LiturgyResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { date } = data;

    const cached = await supabaseAdmin.from("liturgy_cache").select("payload").eq("date", date).maybeSingle();
    if (cached.data?.payload) return { liturgy: cached.data.payload as unknown as Liturgy, fromCacheOfDate: null };

    const [y, m, d] = date.split("-");
    const sources = [
      `https://liturgia.up.railway.app/v2/?dia=${d}&mes=${m}&ano=${y}`,
      `https://api-liturgia-diaria.vercel.app/?date=${date}`,
    ];
    for (const url of sources) {
      const raw = await fetchJson(url);
      const lit = normalizeLiturgy(raw, date);
      if (lit) {
        await supabaseAdmin.from("liturgy_cache").upsert({ date, payload: lit as never, fetched_at: new Date().toISOString() });
        return { liturgy: lit, fromCacheOfDate: null };
      }
    }

    // As duas falharam: devolve o último dia guardado.
    const last = await supabaseAdmin
      .from("liturgy_cache")
      .select("date, payload")
      .lte("date", date)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last.data) return { liturgy: last.data.payload as unknown as Liturgy, fromCacheOfDate: last.data.date };
    return { liturgy: null, fromCacheOfDate: null };
  });
