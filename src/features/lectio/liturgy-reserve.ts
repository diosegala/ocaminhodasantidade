import type { QueryClient } from "@tanstack/react-query";
import { getLiturgy, reserveLiturgy, RESERVE_DAYS } from "./liturgy.functions";
import { localToday } from "./liturgy";
import { addDays } from "@/features/caminho/liturgical-calendar";

const KEY = "liturgia-reserva";

/**
 * Pede ao servidor para guardar a liturgia dos próximos dias e traz esses dias para o
 * cache do aparelho (que vale offline). Roda no máximo uma vez por dia.
 */
export async function reserveLiturgyOnce(queryClient: QueryClient) {
  const today = localToday();
  try {
    if (localStorage.getItem(KEY) === today) return;
  } catch {
    // sem armazenamento: segue mesmo assim
  }
  try {
    await reserveLiturgy({ data: { date: today } });
    for (let i = 1; i <= RESERVE_DAYS; i++) {
      const date = addDays(today, i);
      await queryClient.prefetchQuery({
        queryKey: ["liturgy", date],
        queryFn: () => getLiturgy({ data: { date } }),
        staleTime: 1000 * 60 * 60,
      });
    }
    localStorage.setItem(KEY, today);
  } catch {
    // sem rede ou API fora do ar: tenta de novo na próxima abertura
  }
}
