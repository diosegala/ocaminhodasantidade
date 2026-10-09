import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BookLite } from "./reference";

export const booksQueryOptions = queryOptions({
  queryKey: ["bible-books"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bible_books")
      .select("id, name, abbreviation, testament, book_order, chapter_count")
      .order("book_order");
    if (error) throw error;
    return data as BookLite[];
  },
  staleTime: Infinity,
});
