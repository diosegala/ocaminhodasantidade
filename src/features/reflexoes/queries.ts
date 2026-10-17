import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taggingsQueryOptions } from "@/features/ligacoes/queries";

export type Reflection = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  /** Texto guardado só no aparelho, ainda não enviado ao servidor. */
  _unsynced?: boolean;
};

export const SOURCE = "reflexao" as const;

export const reflectionsQueryOptions = queryOptions({
  queryKey: ["reflections"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reflections")
      .select("id, title, body, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data as Reflection[];
  },
});

export const reflectionTaggingsQueryOptions = taggingsQueryOptions(SOURCE);

/** Coloca a reflexão no topo da lista guardada, para ela aparecer mesmo antes de sincronizar. */
export function putInList(queryClient: QueryClient, r: Reflection) {
  queryClient.setQueryData<Reflection[]>(["reflections"], (list) => [
    r,
    ...(list ?? []).filter((x) => x.id !== r.id),
  ]);
}
