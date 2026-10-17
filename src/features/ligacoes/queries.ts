import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Tipo do texto de origem, gravado em bible_links.source_type e taggings.source_type. */
export type LinkSource = "reflexao" | "aula";

export const tagsQueryOptions = queryOptions({
  queryKey: ["tags"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tags").select("id, name").order("name");
    if (error) throw error;
    return data;
  },
});

export const taggingsQueryOptions = (source: LinkSource) =>
  queryOptions({
    queryKey: ["taggings", source],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taggings")
        .select("id, tag_id, source_id")
        .eq("source_type", source);
      if (error) throw error;
      return data;
    },
  });
