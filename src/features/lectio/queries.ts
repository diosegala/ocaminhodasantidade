import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const lectioHistoryQueryOptions = queryOptions({
  queryKey: ["lectio-history"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("lectio_entries")
      .select("date, reference, completed_at")
      .order("date", { ascending: false });
    if (error) throw error;
    return data;
  },
});

/** Lectios com o texto escrito, para reler e buscar. A chave fica sob "lectio-history"
 * para ser atualizada junto quando uma lectio é salva. */
export const lectioEntriesQueryOptions = queryOptions({
  queryKey: ["lectio-history", "completo"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("lectio_entries")
      .select(
        "date, reference, reading_mark, meditation, prayer, contemplation, completed_at, steps_done",
      )
      .order("date", { ascending: false });
    if (error) throw error;
    return data;
  },
});
