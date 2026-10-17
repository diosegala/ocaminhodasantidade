import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Lesson = {
  id: string;
  /** Dia do encontro, "aaaa-mm-dd". */
  date: string;
  theme: string;
  /** Anotações feitas durante a aula. */
  raw_transcript: string | null;
  /** O que ficou para a pessoa, escrito depois. */
  user_synthesis: string | null;
  created_at: string;
  updated_at: string;
  /** Texto guardado só no aparelho, ainda não enviado ao servidor. */
  _unsynced?: boolean;
};

export const SOURCE = "aula" as const;

export const LESSON_COLUMNS =
  "id, date, theme, raw_transcript, user_synthesis, created_at, updated_at";

export const PHOTO_BUCKET = "lesson-photos";

export const lessonsQueryOptions = queryOptions({
  queryKey: ["lessons"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("lessons")
      .select(LESSON_COLUMNS)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Lesson[];
  },
});

/** Dúvidas abertas de todas as aulas, para mostrar na lista. */
export const openQuestionsQueryOptions = queryOptions({
  queryKey: ["lesson-questions", "abertas"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("lesson_questions")
      .select("lesson_id")
      .eq("status", "aberta");
    if (error) throw error;
    return data;
  },
});

export function lessonToRow(l: Lesson) {
  return {
    id: l.id,
    date: l.date,
    theme: l.theme,
    raw_transcript: l.raw_transcript,
    user_synthesis: l.user_synthesis,
  };
}

export function hasContent(l: Lesson) {
  return !!(l.theme.trim() || l.raw_transcript?.trim() || l.user_synthesis?.trim());
}

/** Coloca a aula na lista guardada, para ela aparecer mesmo antes de sincronizar. */
export function putInList(queryClient: QueryClient, l: Lesson) {
  queryClient.setQueryData<Lesson[]>(["lessons"], (list) =>
    [l, ...(list ?? []).filter((x) => x.id !== l.id)].sort(
      (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
    ),
  );
}

/** "2026-10-17" → "17 de outubro de 2026" (ou sem o ano, com `short`). */
export function formatLessonDate(date: string, short = false) {
  return new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
  });
}

/** Data local de hoje, "aaaa-mm-dd" (toISOString daria o dia em UTC). */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
