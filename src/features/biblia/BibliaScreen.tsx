import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Highlighter, Minus, Plus, Search, X } from "lucide-react";
import { ListGroup, Row, rowClass, ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { booksQueryOptions } from "./queries";
import { formatRef, parseReference, type BookLite, type ParsedReference } from "./reference";

type View =
  | { name: "home" }
  | { name: "chapters"; book: BookLite }
  | { name: "read"; book: BookLite; chapter: number };

type VerseRow = { verse: number; text: string };
type MarkRow = { chapter: number; verse: number; highlight: string | null; note: string | null };
type SearchResult = { book_id: number; chapter: number; verse: number; text: string; book_name: string };

export const HIGHLIGHTS = [
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

  const booksQuery = useQuery(booksQueryOptions);

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
        <BackButton onClick={() => setView({ name: "home" })}>Bíblia</BackButton>
        <h1 className="title-large mt-1">{book.name}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">{book.chapter_count} capítulos</p>
        <div className="mt-5 grid grid-cols-5 gap-2.5 sm:grid-cols-7">
          {Array.from({ length: book.chapter_count }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setView({ name: "read", book, chapter: n })}
              className="pressable aspect-square rounded-2xl bg-card text-lg font-medium shadow-card active:bg-secondary"
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
      <ScreenHeader title="Bíblia" subtitle="Tradução Ave-Maria" />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
      >
        <label className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-secondary px-3">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          <input
            type="search"
            enterKeyHint="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="2Tm 3,14-17 ou uma palavra"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>
        {searchInput.trim() && (
          <Button type="submit" size="md">
            Buscar
          </Button>
        )}
      </form>

      {searchError && <p className="mt-3 px-1 text-[15px] text-muted-foreground">{searchError}</p>}
      {searching && <p className="mt-3 px-1 text-[15px] text-muted-foreground">Buscando…</p>}

      {results && results.length > 0 && (
        <ListGroup title={`Resultados (${results.length})`} className="mt-5">
          {results.map((r) => {
            const book = books.find((b) => b.id === r.book_id);
            return (
              <button key={`${r.book_id}-${r.chapter}-${r.verse}`} onClick={() => openResult(r)} className={`${rowClass} block`}>
                <span className="text-[15px] font-semibold text-primary">{book ? formatRef(book, r.chapter, r.verse) : ""}</span>
                <span className="mt-0.5 block font-serif text-base leading-snug">
                  {r.text.length > 140 ? `${r.text.slice(0, 140)}…` : r.text}
                </span>
              </button>
            );
          })}
        </ListGroup>
      )}

      <ListGroup className="mt-5">
        <Link to="/biblia/destaques" className={rowClass}>
          <Row icon={Highlighter} title="Destaques e notas" chevron />
        </Link>
      </ListGroup>

      {booksQuery.isLoading && <p className="mt-6 text-muted-foreground">Carregando livros…</p>}
      {booksQuery.isError && <p className="mt-6 text-muted-foreground">Não consegui carregar os livros. Recarregue a página.</p>}

      {(["antigo", "novo"] as const).map((testament) => {
        const list = books.filter((b) => b.testament === testament);
        if (list.length === 0) return null;
        return (
          <ListGroup key={testament} title={testament === "antigo" ? "Antigo Testamento" : "Novo Testamento"} className="mt-7">
            {list.map((b) => (
              <button key={b.id} onClick={() => setView({ name: "chapters", book: b })} className={rowClass}>
                <Row
                  title={
                    <>
                      {b.name} <span className="text-[15px] text-muted-foreground">{b.abbreviation}</span>
                    </>
                  }
                  chevron
                />
              </button>
            ))}
          </ListGroup>
        );
      })}
    </section>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="pressable -ml-2 flex h-10 items-center gap-0.5 pr-3 text-[17px] text-primary">
      <ChevronLeft className="h-6 w-6" /> {children}
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
      // Só envia o campo alterado: o upsert atualiza apenas as colunas presentes,
      // então salvar o destaque não apaga a nota (e vice-versa).
      const { error } = await supabase.from("verse_marks").upsert(
        {
          book_id: book.id,
          chapter,
          verse: patch.verse,
          ...("highlight" in patch ? { highlight: patch.highlight ?? null } : {}),
          ...("note" in patch ? { note: patch.note ?? null } : {}),
        },
        { onConflict: "user_id,book_id,chapter,verse" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      // Prefixo: atualiza o livro aberto e a lista de "Destaques e notas".
      void queryClient.invalidateQueries({ queryKey: ["bible-marks"] });
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
      <BackButton onClick={onBack}>{book.name}</BackButton>

      {/* Barra do leitor: presa logo abaixo da área do relógio do iPhone. */}
      <div className="sticky top-[max(env(safe-area-inset-top),0.5rem)] z-[5] mt-1 flex items-center justify-between rounded-full bg-glass p-1 shadow-card backdrop-blur-xl backdrop-saturate-150">
        <button
          onClick={() => chapter > 1 && onChangeChapter(chapter - 1)}
          disabled={chapter <= 1}
          className="pressable rounded-full p-2 text-primary disabled:opacity-30"
          aria-label="Capítulo anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-[15px] font-semibold">
          {book.name} {chapter}
        </span>
        <div className="flex items-center">
          <button onClick={() => changeFontSize(-1)} className="pressable rounded-full p-2" aria-label="Diminuir letra">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={() => changeFontSize(1)} className="pressable rounded-full p-2" aria-label="Aumentar letra">
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => chapter < book.chapter_count && onChangeChapter(chapter + 1)}
            disabled={chapter >= book.chapter_count}
            className="pressable rounded-full p-2 text-primary disabled:opacity-30"
            aria-label="Próximo capítulo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {versesQuery.isLoading && <p className="mt-6 text-muted-foreground">Carregando capítulo…</p>}
      {versesQuery.isError && <p className="mt-6 text-muted-foreground">Não consegui carregar o texto. Recarregue a página.</p>}

      <div className="mt-5 font-serif leading-[1.7]" style={{ fontSize: `${fontSize}px` }}>
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
              className={`mb-1.5 rounded-lg px-1.5 py-0.5 transition-colors ${hlClass ?? ""} ${isFlash ? "hl-flash" : ""}`}
              onClick={() => setSelectedVerse(v.verse)}
              role="button"
            >
              <span className="mr-1 align-super font-sans text-[0.6em] font-medium text-muted-foreground">{v.verse}</span>
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
        className="mx-auto w-full max-w-xl rounded-t-[28px] bg-card px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="title">{formatRef(book, chapter, verse)}</h2>
          <button onClick={onClose} aria-label="Fechar" className="pressable rounded-full bg-secondary p-1.5 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="eyebrow mt-4">Destacar</p>
        <div className="mt-2 flex gap-2">
          {HIGHLIGHTS.map((h) => (
            <button
              key={h.value}
              onClick={() => onSetHighlight(h.value)}
              className={`pressable h-11 flex-1 rounded-xl ${h.className} ${mark?.highlight === h.value ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : ""}`}
              aria-label={`Destacar em ${h.label}`}
            />
          ))}
          {mark?.highlight && (
            <button
              onClick={() => onSetHighlight(null)}
              className="pressable h-11 flex-1 rounded-xl bg-secondary text-[15px] text-muted-foreground"
            >
              Remover
            </button>
          )}
        </div>

        <p className="eyebrow mt-5">Nota</p>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onBlur={() => {
            const next = noteDraft.trim();
            if (next !== (mark?.note ?? "")) onSaveNote(next || null);
          }}
          rows={3}
          placeholder="O que este versículo te fez pensar?"
          className="mt-2 w-full rounded-xl bg-secondary p-3 font-serif text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />

        {!showLinked ? (
          <button onClick={() => void loadLinks()} className="mt-4 text-[15px] text-primary">
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
