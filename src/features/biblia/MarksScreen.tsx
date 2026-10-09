import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
      <Link to="/biblia" className="flex items-center gap-1 text-sm text-primary">
        <span aria-hidden>‹</span> Bíblia
      </Link>
      <h1 className="mt-4 text-3xl">Destaques e notas</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${filter === c.value ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
          >
            {c.className && <span className={`h-3 w-3 rounded-full border ${c.className}`} />}
            {c.label}
          </button>
        ))}
      </div>

      {q.isLoading && <p className="mt-6 text-muted-foreground">Carregando…</p>}
      {q.isError && <p className="mt-6 text-muted-foreground">Não consegui carregar agora. Tente de novo.</p>}
      {q.isSuccess && items.length === 0 && (
        <p className="mt-6 font-serif text-lg text-muted-foreground">
          {all.length === 0
            ? "Você ainda não destacou nem anotou nenhum versículo. Na Bíblia, toque num versículo para começar."
            : "Nada com este filtro."}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {items.map((m) => {
          const ref = formatRef(m.book, m.chapter, m.verse);
          const hl = HIGHLIGHTS.find((h) => h.value === m.highlight);
          return (
            <li key={key(m.book_id, m.chapter, m.verse)}>
              <Link to="/biblia" search={{ ref }} className="block rounded-2xl border bg-card p-4">
                <span className="text-sm font-semibold text-primary">
                  {m.book.name} {m.chapter},{m.verse}
                </span>
                <p className={`mt-1 rounded-md px-1 py-0.5 font-serif text-lg leading-relaxed ${hl?.className ?? ""}`}>
                  {m.text}
                </p>
                {m.note && (
                  <p className="mt-2 whitespace-pre-wrap border-l-2 border-primary pl-3 font-serif text-muted-foreground">
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
