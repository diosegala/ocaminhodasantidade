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
