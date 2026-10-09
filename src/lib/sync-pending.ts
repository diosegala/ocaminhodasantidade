import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { putInList, type Reflection } from "@/features/reflexoes/queries";

type PendingLectio = {
  date?: string;
  reference: string | null;
  reading_mark: string | null;
  meditation: string | null;
  prayer: string | null;
  contemplation: string | null;
  completed_at: string | null;
  _unsynced?: boolean;
};

/**
 * Envia o que foi escrito sem internet (marcado com `_unsynced` no cache guardado no
 * aparelho), mesmo que a tela de origem não seja aberta de novo.
 */
export async function syncPending(queryClient: QueryClient) {
  const pending = queryClient
    .getQueryCache()
    .findAll({
      predicate: (q) => (q.state.data as { _unsynced?: boolean } | null)?._unsynced === true,
    });

  for (const query of pending) {
    const [kind, key] = query.queryKey as [string, string];
    const local = query.state.data;

    if (kind === "reflection") {
      const r = local as Reflection;
      if (!r.title.trim() && !r.body.trim()) continue;
      const { data, error } = await supabase
        .from("reflections")
        .upsert({ id: r.id, title: r.title, body: r.body }, { onConflict: "id" })
        .select("id, title, body, created_at, updated_at")
        .single();
      // Só troca o cache se ninguém editou enquanto enviava.
      if (!error && queryClient.getQueryData(query.queryKey) === local) {
        queryClient.setQueryData(query.queryKey, data);
        putInList(queryClient, data);
      }
    } else if (kind === "lectio") {
      const e = local as PendingLectio;
      const { error } = await supabase.from("lectio_entries").upsert(
        {
          date: key,
          reference: e.reference,
          reading_mark: e.reading_mark,
          meditation: e.meditation,
          prayer: e.prayer,
          contemplation: e.contemplation,
          completed_at: e.completed_at,
        },
        { onConflict: "user_id,date" },
      );
      if (!error && queryClient.getQueryData(query.queryKey) === local) {
        queryClient.setQueryData(query.queryKey, { ...e, _unsynced: false });
        void queryClient.invalidateQueries({ queryKey: ["lectio-history"] });
      }
    }
  }
}
