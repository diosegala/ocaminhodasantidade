import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, History, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { booksQueryOptions } from "@/features/biblia/queries";
import { describeReference, formatLinkRef, parseReference } from "@/features/biblia/reference";
import { lectioEntriesQueryOptions } from "@/features/lectio/queries";
import { Card } from "@/components/app/ui";
import { dailyFor, timeAgo } from "./daily-word";

/** "Para hoje": um versículo com um convite, ou algo que a pessoa escreveu antes. */
export function DailyCard({ date }: { date: string }) {
  const entries = useQuery(lectioEntriesQueryOptions);
  const books = useQuery(booksQueryOptions).data ?? [];
  // Espera as lectios para não trocar o cartão na frente da pessoa.
  const daily = entries.isPending ? null : dailyFor(date, entries.data ?? []);

  const ref = daily?.kind === "word" && books.length ? parseReference(daily.word.ref, books) : null;
  const verse = useQuery({
    enabled: !!ref,
    queryKey: ["daily-verse", daily?.kind === "word" ? daily.word.ref : null],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bible_verses")
        .select("text")
        .eq("book_id", ref!.book.id)
        .eq("chapter", ref!.chapter)
        .gte("verse", ref!.verseStart!)
        .lte("verse", ref!.verseEnd!)
        .order("verse");
      if (error) throw error;
      return data.map((v) => v.text).join(" ");
    },
  });

  if (!daily) return null;

  if (daily.kind === "memory") {
    const { entry, text } = daily;
    return (
      <Link to="/lectio" search={{ date: entry.date }} className="pressable mt-5 block">
        <Card>
          <p className="eyebrow flex items-center gap-1.5">
            <History className="h-4 w-4" /> Para hoje · das suas lectios
          </p>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {timeAgo(entry.date, date).replace(/^h/, "H")}, meditando{" "}
            {entry.reference ?? "a Palavra"}, você escreveu:
          </p>
          <p className="reading mt-2 line-clamp-4 border-l-2 border-primary/40 pl-3 italic">
            {text}
          </p>
          <p className="mt-3 flex items-center gap-1 text-[15px] text-primary">
            Reler essa lectio <ChevronRight className="h-4 w-4" />
          </p>
        </Card>
      </Link>
    );
  }

  const label = ref ? describeReference(ref) : daily.word.ref;
  const body = (
    <Card>
      <p className="eyebrow flex items-center gap-1.5">
        <Sparkles className="h-4 w-4" /> Para hoje
      </p>
      {verse.data && <p className="reading mt-2">“{verse.data.trim()}”</p>}
      <p className="mt-1 text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-3 text-[15px] font-medium">{daily.word.invite}</p>
    </Card>
  );
  return ref ? (
    <Link
      to="/biblia"
      search={{ ref: formatLinkRef(ref.book, ref.chapter, ref.verseStart, ref.verseEnd) }}
      className="pressable mt-5 block"
    >
      {body}
    </Link>
  ) : (
    <div className="mt-5">{body}</div>
  );
}
