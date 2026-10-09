import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Chip, ScreenHeader } from "@/components/app/ui";
import { HIGHLIGHTS } from "./BibliaScreen";
import { formatRef } from "./reference";

type MarkItem = {
  book_id: number;
  chapter: number;
  verse: number;
  highlight: string | null;
  note: string | null;
  updated_at: string;
  book: { name: string; abbreviation: string };
  text: string;
};

type Filter = "todos" | "notas" | (typeof HIGHLIGHTS)[number]["value"];

const key = (b: number, c: number, v: number) => `${b}-${c}-${v}`;

async function fetchMarks(): Promise<MarkItem[]> {
  const { data: marks, error } = await supabase
    .from("verse_marks")
    .select("book_id, chapter, verse, highlight, note, updated_at, bible_books(name, abbreviation)")
    .or("highlight.not.is.null,note.not.is.null")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  if (!marks.length) return [];

  // Os versículos não têm chave estrangeira com verse_marks, então busca o texto à parte, em lotes.
  const texts = new Map<string, string>();
  for (let i = 0; i < marks.length; i += 40) {
    const filter = marks
      .slice(i, i + 40)
      .map((m) => `and(book_id.eq.${m.book_id},chapter.eq.${m.chapter},verse.eq.${m.verse})`)
      .join(",");
    const { data, error: vErr } = await supabase.from("bible_verses").select("book_id, chapter, verse, text").or(filter);
    if (vErr) throw vErr;
    for (const v of data) texts.set(key(v.book_id, v.chapter, v.verse), v.text);
  }

  return marks.map((m) => ({
    ...m,
    book: m.bible_books as unknown as { name: string; abbreviation: string },
    text: texts.get(key(m.book_id, m.chapter, m.verse)) ?? "",
  }));
}

export function MarksScreen() {
  const [filter, setFilter] = useState<Filter>("todos");
  const q = useQuery({ queryKey: ["bible-marks", "all"], queryFn: fetchMarks });

  const all = q.data ?? [];
  const items = all.filter((m) =>
    filter === "todos" ? true : filter === "notas" ? !!m.note : m.highlight === filter,
  );

  const chips: { value: Filter; label: string; className?: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "notas", label: "Com nota" },
    ...HIGHLIGHTS.map((h) => ({ value: h.value, label: h.label, className: h.className })),
  ];

  return (
    <section>
      <ScreenHeader
        title="Destaques e notas"
        subtitle={q.isSuccess ? `${all.length} ${all.length === 1 ? "versículo" : "versículos"}` : undefined}
        back={{ label: "Bíblia", to: "/biblia" }}
      />

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {chips.map((c) => (
          <Chip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}>
            {c.className && <span className={`h-3 w-3 rounded-full ${c.className}`} />}
            <span className="whitespace-nowrap">{c.label}</span>
          </Chip>
        ))}
      </div>

      {q.isLoading && <p className="mt-6 text-muted-foreground">Carregando…</p>}
      {q.isError && <p className="mt-6 text-muted-foreground">Não consegui carregar agora. Tente de novo.</p>}
      {q.isSuccess && items.length === 0 && (
        <p className="reading mt-6 text-muted-foreground">
          {all.length === 0
            ? "Você ainda não destacou nem anotou nenhum versículo. Na Bíblia, toque num versículo para começar."
            : "Nada com este filtro."}
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {items.map((m) => {
          const ref = formatRef(m.book, m.chapter, m.verse);
          const hl = HIGHLIGHTS.find((h) => h.value === m.highlight);
          return (
            <li key={key(m.book_id, m.chapter, m.verse)}>
              <Link to="/biblia" search={{ ref }} className="pressable block rounded-[20px] bg-card p-5 shadow-card">
                <span className="eyebrow">
                  {m.book.name} {m.chapter},{m.verse}
                </span>
                <p className={`reading mt-2 rounded-lg px-1.5 py-0.5 ${hl?.className ?? ""}`}>{m.text}</p>
                {m.note && (
                  <p className="mt-3 whitespace-pre-wrap border-l-2 border-primary pl-3 text-base text-muted-foreground">
                    {m.note}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
