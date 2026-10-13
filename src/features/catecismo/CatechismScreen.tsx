import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ListGroup, Row, rowClass, ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { StudySwitch } from "./StudySwitch";
import {
  catechismQueryOptions,
  parseParagraphNumber,
  searchCatechism,
  searchForm,
  type Catechism,
} from "./data";

export function CatechismScreen({ n, c }: { n?: number | undefined; c?: number | undefined }) {
  const q = useQuery(catechismQueryOptions);

  if (q.isLoading) {
    return (
      <section>
        <ScreenHeader title="Catecismo" />
        <p className="reading text-muted-foreground">Abrindo o Catecismo…</p>
      </section>
    );
  }
  if (!q.data) {
    return (
      <section>
        <ScreenHeader title="Catecismo" />
        <StudySwitch value="catecismo" />
        <p className="reading mt-6 text-muted-foreground">
          Não consegui abrir o Catecismo. Na primeira vez é preciso internet; depois ele fica no
          aparelho.
        </p>
      </section>
    );
  }

  const chapter = n !== undefined ? q.data.chapterOf.get(n) : c;
  if (chapter !== undefined && q.data.chapters[chapter]) {
    return <ChapterReader cat={q.data} index={chapter} target={n} />;
  }
  return <CatechismHome cat={q.data} />;
}

function CatechismHome({ cat }: { cat: Catechism }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");

  const results = useMemo(
    () => (submitted.trim().length >= 3 ? searchCatechism(cat, submitted) : []),
    [cat, submitted],
  );
  const parts = useMemo(() => {
    const map = new Map<number, Catechism["chapters"]>();
    for (const ch of cat.chapters) map.set(ch.part, [...(map.get(ch.part) ?? []), ch]);
    return [...map.values()];
  }, [cat]);

  function submit() {
    const num = parseParagraphNumber(term);
    if (num) {
      navigate({ to: "/biblia/catecismo", search: { n: num } });
      return;
    }
    setSubmitted(term);
  }

  return (
    <section>
      <ScreenHeader title="Catecismo" subtitle="Catecismo da Igreja Católica" />
      <StudySwitch value="catecismo" />

      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-secondary px-3">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          <input
            type="search"
            enterKeyHint="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="§ 1213 ou uma palavra"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>
        {term.trim() && (
          <Button type="submit" size="md">
            Buscar
          </Button>
        )}
      </form>

      {submitted.trim().length >= 3 && (
        <ListGroup
          title={`Resultados (${results.length}${results.length === 50 ? "+" : ""})`}
          className="mt-5"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3.5 text-[15px] text-muted-foreground">Nada encontrado.</p>
          ) : (
            results.map((r) => (
              <button
                key={r.n}
                onClick={() => navigate({ to: "/biblia/catecismo", search: { n: r.n } })}
                className={`${rowClass} block`}
              >
                <span className="text-[15px] font-semibold text-primary">§ {r.n}</span>
                <span className="mt-0.5 block font-serif text-base leading-snug">
                  {snippet(r.text, submitted)}
                </span>
              </button>
            ))
          )}
        </ListGroup>
      )}

      {parts.map((chapters) => (
        <ListGroup key={chapters[0]!.part} title={chapters[0]!.partTitle} className="mt-7">
          {chapters.map((ch) => (
            <button
              key={ch.index}
              onClick={() => navigate({ to: "/biblia/catecismo", search: { c: ch.index } })}
              className={rowClass}
            >
              <Row title={ch.title} detail={`§ ${ch.first}–${ch.last}`} chevron />
            </button>
          ))}
        </ListGroup>
      ))}

      <p className="mt-6 px-1 text-[13px] text-muted-foreground">
        Texto do site do Vaticano (vatican.va), em português de Portugal. Para estudo pessoal.
      </p>
    </section>
  );
}

function ChapterReader({
  cat,
  index,
  target,
}: {
  cat: Catechism;
  index: number;
  target?: number | undefined;
}) {
  const navigate = useNavigate();
  const ch = cat.chapters[index]!;
  const prev = cat.chapters[index - 1];
  const next = cat.chapters[index + 1];

  useEffect(() => {
    if (target === undefined) {
      window.scrollTo({ top: 0 });
      return;
    }
    document.getElementById(`cic-${target}`)?.scrollIntoView({ block: "center" });
  }, [index, target]);

  return (
    <section>
      <ScreenHeader back={{ label: "Catecismo", to: "/biblia/catecismo" }} />
      <p className="eyebrow">{ch.partTitle}</p>
      <h1 className="title mt-1">{ch.title}</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        § {ch.first}–{ch.last}
      </p>

      <div className="mt-5 space-y-4">
        {ch.paragraphs.map((p) => (
          <p
            key={p.n}
            id={`cic-${p.n}`}
            className={`reading scroll-mt-24 rounded-lg px-1.5 py-0.5 ${p.n === target ? "hl-flash" : ""}`}
          >
            <span className="mr-1.5 font-sans text-[0.7em] font-semibold text-primary">
              § {p.n}
            </span>
            {withNoteMarks(p.text)}
          </p>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        {prev && (
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => navigate({ to: "/biblia/catecismo", search: { c: prev.index } })}
          >
            <ChevronLeft /> Anterior
          </Button>
        )}
        {next && (
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => navigate({ to: "/biblia/catecismo", search: { c: next.index } })}
          >
            Próximo <ChevronRight />
          </Button>
        )}
      </div>
    </section>
  );
}

/** As chamadas de nota do texto original, como "(2)", ficam pequenas e discretas. */
function withNoteMarks(text: string): ReactNode {
  const parts = text.split(/\((\d{1,3})\)/);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <sup key={i} className="font-sans text-[0.55em] text-muted-foreground/70">
        {part}
      </sup>
    ) : (
      part
    ),
  );
}

/** Trecho do parágrafo em volta da primeira palavra buscada. */
function snippet(text: string, term: string) {
  const word = searchForm(term).split(/\s+/)[0] ?? "";
  // Procura a palavra no texto original, letra a letra na forma de busca.
  let at = 0;
  for (let i = 0; i < text.length; i++) {
    if (searchForm(text.slice(i, i + word.length + 4)).startsWith(word)) {
      at = i;
      break;
    }
  }
  const start = Math.max(0, at - 60);
  const cut = text.slice(start, start + 180);
  return `${start > 0 ? "…" : ""}${cut}${start + 180 < text.length ? "…" : ""}`;
}
