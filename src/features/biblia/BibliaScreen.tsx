import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Minus, Plus, Search, X } from "lucide-react";
import { formatRef, parseReference, type BookLite, type ParsedReference } from "./reference";

type View =
  | { name: "home" }
  | { name: "chapters"; book: BookLite }
  | { name: "read"; book: BookLite; chapter: number };

type VerseRow = { verse: number; text: string };
type MarkRow = { chapter: number; verse: number; highlight: string | null; note: string | null };
type SearchResult = { book_id: number; chapter: number; verse: number; text: string; book_name: string };

const HIGHLIGHTS = [
  { value: "amarelo", label: "Amarelo", className: "hl-amarelo" },
  { value: "verde", label: "Verde", className: "hl-verde" },
  { value: "rosa", label: "Rosa", className: "hl-rosa" },
] as const;

const LINK_SOURCE_LABEL: Record<string, string> = {
  reflexao: "Reflexão",
  aula: "Aula",
  lectio: "Lectio",
};

export function BibliaScreen({ initialRef }: { initialRef?: string } = {}) {
  const [view, setView] = useState<View>({ name: "home" });
  const [searchInput, setSearchInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [pendingRef, setPendingRef] = useState<ParsedReference | null>(null);

  const booksQuery = useQuery({
    queryKey: ["bible-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bible_books")
        .select("id, name, abbreviation, testament, book_order, chapter_count")
        .order("book_order");
      if (error) throw error;
      return data as BookLite[];
    },
  });

  const books = booksQuery.data ?? [];

  const appliedInitial = useRef(false);
  useEffect(() => {
    if (!initialRef || appliedInitial.current || books.length === 0) return;
    appliedInitial.current = true;
    const ref = parseReference(initialRef, books);
    if (ref) {
      setPendingRef(ref);
      setView({ name: "read", book: ref.book, chapter: ref.chapter });
    }
  }, [initialRef, books]);

  async function runSearch() {
    const term = searchInput.trim();
    setResults(null);
    setSearchError(null);
    if (!term) return;
    if (books.length === 0) return;
    const ref = parseReference(term, books);
    if (ref) {
      setPendingRef(ref);
      setView({ name: "read", book: ref.book, chapter: ref.chapter });
      return;
    }
    if (term.length < 3) {
      setSearchError("Escreva uma referência (ex.: 2Tm 3,14-17) ou pelo menos 3 letras para buscar palavras.");
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from("bible_verses")
      .select("book_id, chapter, verse, text, bible_books(name)")
      .ilike("text", `%${term}%`)
      .order("book_id")
      .order("chapter")
      .order("verse")
      .limit(40);
    setSearching(false);
    if (error) {
      setSearchError("Não consegui buscar agora. Tente de novo.");
      return;
    }
    const mapped = (data ?? []).map((r) => ({
      book_id: r.book_id,
      chapter: r.chapter,
      verse: r.verse,
      text: r.text,
      book_name: (r.bible_books as unknown as { name: string } | null)?.name ?? "",
    }));
    setResults(mapped);
    if (mapped.length === 0) setSearchError(`Nada encontrado para "${term}".`);
  }

  function openResult(r: SearchResult) {
    const book = books.find((b) => b.id === r.book_id);
    if (!book) return;
    setPendingRef({ book, chapter: r.chapter, verseStart: r.verse, verseEnd: r.verse });
    setView({ name: "read", book, chapter: r.chapter });
  }

  if (view.name === "read") {
    return (
      <ReadingView
        book={view.book}
        chapter={view.chapter}
        books={books}
        pendingRef={pendingRef}
        clearPendingRef={() => setPendingRef(null)}
        onChangeChapter={(chapter) => {
          setPendingRef(null);
          setView({ name: "read", book: view.book, chapter });
        }}
        onBack={() => setView({ name: "chapters", book: view.book })}
      />
    );
  }

  if (view.name === "chapters") {
    const book = view.book;
    return (
      <section>
        <BackButton onClick={() => setView({ name: "home" })}>{book.name}</BackButton>
        <h1 className="mt-4 font-serif text-2xl">{book.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{book.chapter_count} capítulos</p>
        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7">
          {Array.from({ length: book.chapter_count }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setView({ name: "read", book, chapter: n })}
              className="rounded-lg border bg-card py-3 text-lg font-serif hover:bg-secondary"
            >
              {n}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-3xl">Bíblia</h1>
      <p className="mt-2 font-serif text-lg text-muted-foreground">Tradução Ave-Maria, 73 livros.</p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
      >
        <label className="flex flex-1 items-center gap-2 rounded-full border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="2Tm 3,14-17 ou uma palavra"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button type="submit" className="rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
          Buscar
        </button>
      </form>
      {searchError && <p className="mt-2 text-sm text-muted-foreground">{searchError}</p>}
      {searching && <p className="mt-3 text-sm text-muted-foreground">Buscando…</p>}

      {results && results.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-medium text-muted-foreground">Resultados ({results.length})</h2>
          <ul className="mt-2 divide-y">
            {results.map((r) => {
              const book = books.find((b) => b.id === r.book_id);
              return (
                <li key={`${r.book_id}-${r.chapter}-${r.verse}`}>
                  <button onClick={() => openResult(r)} className="w-full py-3 text-left">
                    <span className="text-sm font-semibold text-primary">
                      {book ? formatRef(book, r.chapter, r.verse) : ""}
                    </span>
                    <span className="mt-0.5 block font-serif text-[15px] leading-snug text-foreground/90">
                      {r.text.length > 140 ? `${r.text.slice(0, 140)}…` : r.text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {booksQuery.isLoading && <p className="mt-6 text-muted-foreground">Carregando livros…</p>}
      {booksQuery.isError && (
        <p className="mt-6 text-muted-foreground">Não consegui carregar os livros. Recarregue a página.</p>
      )}

      {(["antigo", "novo"] as const).map((testament) => {
        const list = books.filter((b) => b.testament === testament);
        if (list.length === 0) return null;
        return (
          <div key={testament} className="mt-6">
            <h2 className="text-sm font-medium text-muted-foreground">
              {testament === "antigo" ? "Antigo Testamento" : "Novo Testamento"}
            </h2>
            <ul className="mt-2 divide-y">
              {list.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => setView({ name: "chapters", book: b })}
                    className="flex w-full items-baseline gap-3 py-3 text-left"
                  >
                    <span className="w-14 shrink-0 text-sm font-semibold text-primary">{b.abbreviation}</span>
                    <span className="flex-1">{b.name}</span>
                    <span className="text-xs text-muted-foreground">{b.chapter_count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm text-primary">
      <span aria-hidden>‹</span> {children}
    </button>
  );
}

function ReadingView({
  book,
  chapter,
  books,
  pendingRef,
  clearPendingRef,
  onChangeChapter,
  onBack,
}: {
  book: BookLite;
  chapter: number;
  books: BookLite[];
  pendingRef: ParsedReference | null;
  clearPendingRef: () => void;
  onChangeChapter: (chapter: number) => void;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [fontSize, setFontSize] = useState(() => {
    const stored = Number(localStorage.getItem("biblia-font-size"));
    return stored >= 16 && stored <= 30 ? stored : 19;
  });
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const verseRefs = useRef(new Map<number, HTMLParagraphElement>());

  const versesQuery = useQuery({
    queryKey: ["bible-chapter", book.id, chapter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bible_verses")
        .select("verse, text")
        .eq("book_id", book.id)
        .eq("chapter", chapter)
        .order("verse");
      if (error) throw error;
      return data as VerseRow[];
    },
  });

  const marksQuery = useQuery({
    queryKey: ["bible-marks", book.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verse_marks")
        .select("chapter, verse, highlight, note")
        .eq("book_id", book.id);
      if (error) throw error;
      return data as MarkRow[];
    },
  });

  const markMap = useMemo(() => {
    const map = new Map<number, MarkRow>();
    for (const m of marksQuery.data ?? []) if (m.chapter === chapter) map.set(m.verse, m);
    return map;
  }, [marksQuery.data, chapter]);

  const saveMark = useMutation({
    mutationFn: async (patch: { verse: number; highlight?: string | null; note?: string | null }) => {
      const { error } = await supabase.from("verse_marks").upsert(
        { book_id: book.id, chapter, verse: patch.verse, highlight: patch.highlight ?? null, note: patch.note ?? null },
        { onConflict: "user_id,book_id,chapter,verse" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bible-marks", book.id] });
    },
  });

  const flash = useMemo(() => {
    if (!pendingRef) return null;
    const start = pendingRef.verseStart;
    if (!start) return null;
    return { from: start, to: pendingRef.verseEnd ?? start };
  }, [pendingRef]);

  function changeFontSize(delta: number) {
    setFontSize((prev) => {
      const next = Math.min(30, Math.max(16, prev + delta));
      localStorage.setItem("biblia-font-size", String(next));
      return next;
    });
  }

  const verses = versesQuery.data ?? [];

  return (
    <section>
      <BackButton onClick={onBack}>Bíblia</BackButton>

      <div className="sticky top-[4.5rem] z-[5] -mx-1 mt-3 flex items-center justify-between rounded-full border bg-card/95 px-2 py-1.5 backdrop-blur">
        <button
          onClick={() => chapter > 1 && onChangeChapter(chapter - 1)}
          disabled={chapter <= 1}
          className="rounded-full px-3 py-1.5 text-sm disabled:opacity-30"
          aria-label="Capítulo anterior"
        >
          ‹
        </button>
        <span className="font-serif text-base">
          {book.name} {chapter}
        </span>
        <div className="flex items-center">
          <button onClick={() => changeFontSize(-1)} className="rounded-full px-2 py-1.5 text-sm" aria-label="Diminuir letra">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={() => changeFontSize(1)} className="rounded-full px-2 py-1.5 text-sm" aria-label="Aumentar letra">
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => chapter < book.chapter_count && onChangeChapter(chapter + 1)}
            disabled={chapter >= book.chapter_count}
            className="rounded-full px-3 py-1.5 text-sm disabled:opacity-30"
            aria-label="Próximo capítulo"
          >
            ›
          </button>
        </div>
      </div>

      {versesQuery.isLoading && <p className="mt-6 text-muted-foreground">Carregando capítulo…</p>}
      {versesQuery.isError && <p className="mt-6 text-muted-foreground">Não consegui carregar o texto. Recarregue a página.</p>}

      <div className="mt-4 font-serif leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
        {verses.map((v) => {
          const mark = markMap.get(v.verse);
          const hlClass = mark?.highlight ? HIGHLIGHTS.find((h) => h.value === mark.highlight)?.className : undefined;
          const isFlash = flash && v.verse >= flash.from && v.verse <= flash.to;
          return (
            <p
              key={v.verse}
              ref={(el) => {
                if (el) verseRefs.current.set(v.verse, el);
              }}
              className={`mb-2 rounded-md px-1 py-0.5 ${hlClass ?? ""} ${isFlash ? "hl-flash" : ""}`}
              onClick={() => setSelectedVerse(v.verse)}
              role="button"
            >
              <span className="mr-1.5 align-super font-sans text-[0.65em] font-semibold text-primary">{v.verse}</span>
              {v.text}
              {mark?.note && <span className="ml-1 align-super font-sans text-[0.6em] text-muted-foreground">✎</span>}
            </p>
          );
        })}
      </div>

      {selectedVerse !== null && (
        <VerseSheet
          book={book}
          chapter={chapter}
          verse={selectedVerse}
          mark={markMap.get(selectedVerse) ?? null}
          onClose={() => setSelectedVerse(null)}
          onSetHighlight={(highlight) => saveMark.mutate({ verse: selectedVerse, highlight })}
          onSaveNote={(note) => {
            saveMark.mutate({ verse: selectedVerse, note });
          }}
        />
      )}

      <ScrollToVerse
        verses={verses}
        pendingVerse={flash?.from ?? null}
        onDone={clearPendingRef}
        getEl={(v) => verseRefs.current.get(v)}
      />
    </section>
  );
}

function ScrollToVerse({
  verses,
  pendingVerse,
  onDone,
  getEl,
}: {
  verses: VerseRow[];
  pendingVerse: number | null;
  onDone: () => void;
  getEl: (verse: number) => HTMLParagraphElement | undefined;
}) {
  const ready = verses.length > 0;
  useEffect(() => {
    if (pendingVerse === null || !ready) return;
    const el = getEl(pendingVerse);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const timer = window.setTimeout(onDone, 2500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingVerse, ready]);
  return null;
}

function VerseSheet({
  book,
  chapter,
  verse,
  mark,
  onClose,
  onSetHighlight,
  onSaveNote,
}: {
  book: BookLite;
  chapter: number;
  verse: number;
  mark: MarkRow | null;
  onClose: () => void;
  onSetHighlight: (highlight: string | null) => void;
  onSaveNote: (note: string | null) => void;
}) {
  const [noteDraft, setNoteDraft] = useState(mark?.note ?? "");
  const [showLinked, setShowLinked] = useState(false);
  const [links, setLinks] = useState<{ source_type: string; ref: string }[] | null>(null);

  async function loadLinks() {
    setShowLinked(true);
    const { data, error } = await supabase
      .from("bible_links")
      .select("source_type, verse_start, verse_end")
      .eq("book_id", book.id)
      .eq("chapter", chapter);
    if (error) {
      setLinks([]);
      return;
    }
    const rows = (data ?? []).filter(
      (l) => l.verse_start === null || (l.verse_start <= verse && (l.verse_end ?? l.verse_start) >= verse),
    );
    setLinks(
      rows.map((l) => ({
        source_type: l.source_type,
        ref: l.verse_start ? formatRef(book, chapter, l.verse_start, l.verse_end) : "",
      })),
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-xl rounded-t-2xl border-t bg-card p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg">
            {formatRef(book, chapter, verse)}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">Destacar</p>
        <div className="mt-2 flex gap-2">
          {HIGHLIGHTS.map((h) => (
            <button
              key={h.value}
              onClick={() => onSetHighlight(h.value)}
              className={`h-9 flex-1 rounded-lg border ${h.className} ${mark?.highlight === h.value ? "ring-2 ring-ring" : ""}`}
              aria-label={`Destacar em ${h.label}`}
            />
          ))}
          {mark?.highlight && (
            <button
              onClick={() => onSetHighlight(null)}
              className="h-9 flex-1 rounded-lg border text-sm text-muted-foreground"
            >
              Remover
            </button>
          )}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">Nota</p>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={() => {
            const next = noteDraft.trim();
            if (next !== (mark?.note ?? "")) onSaveNote(next || null);
          }}
          rows={3}
          placeholder="O que este versículo te fez pensar?"
          className="mt-2 w-full rounded-lg border bg-background p-3 font-serif text-[15px] outline-none placeholder:text-muted-foreground"
        />

        {!showLinked ? (
          <button onClick={() => void loadLinks()} className="mt-4 text-sm text-primary underline-offset-2 hover:underline">
            Ver anotações ligadas
          </button>
        ) : links === null ? (
          <p className="mt-4 text-sm text-muted-foreground">Procurando…</p>
        ) : links.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma aula, reflexão ou lectio cita este trecho ainda.
          </p>
        ) : (
          <ul className="mt-4 space-y-1 text-sm">
            {links.map((l, i) => (
              <li key={i}>
                <span className="font-medium">{LINK_SOURCE_LABEL[l.source_type] ?? l.source_type}</span>
                {l.ref && <span className="text-muted-foreground"> · {l.ref}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
