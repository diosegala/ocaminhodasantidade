import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, Highlighter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseReference, type BookLite } from "@/features/biblia/reference";
import { getLiturgy } from "./liturgy.functions";
import type { Reading } from "./liturgy";

type Entry = {
  id?: string;
  reference: string | null;
  reading_mark: string | null;
  meditation: string | null;
  prayer: string | null;
  contemplation: string | null;
  completed_at: string | null;
};

const EMPTY: Entry = { reference: null, reading_mark: null, meditation: null, prayer: null, contemplation: null, completed_at: null };

const STEPS = [
  { key: "reading_mark", title: "Leitura", question: "Leia com calma. Qual palavra ou frase chamou a sua atenção?" },
  { key: "meditation", title: "Meditação", question: "O que o texto me diz?" },
  { key: "prayer", title: "Oração", question: "O que este texto me leva a pedir, agradecer ou louvar?" },
  { key: "contemplation", title: "Contemplação", question: "O que este texto me leva a ser e a fazer?" },
] as const;

export function useBooks() {
  return useQuery({
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
}

export function useLiturgy(date: string) {
  return useQuery({
    queryKey: ["liturgy", date],
    queryFn: () => getLiturgy({ data: { date } }),
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });
}

export function LectioScreen({ date }: { date: string }) {
  const queryClient = useQueryClient();
  const liturgyQ = useLiturgy(date);
  const booksQ = useBooks();
  const books = booksQ.data ?? [];

  const entryQ = useQuery({
    queryKey: ["lectio", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("lectio_entries").select("*").eq("date", date).maybeSingle();
      if (error) throw error;
      return data as Entry | null;
    },
  });

  const [entry, setEntry] = useState<Entry | null>(null);
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = useRef(false);

  useEffect(() => {
    if (entryQ.data !== undefined && entry === null) {
      setEntry(entryQ.data ?? EMPTY);
      if (entryQ.data?.completed_at) setStep(4);
    }
  }, [entryQ.data, entry]);

  const liturgy = liturgyQ.data?.liturgy ?? null;
  const readings = liturgy?.readings ?? [];
  const reference = entry?.reference ?? readings.find((r) => r.kind === "evangelho")?.referencia ?? null;
  const liturgyReading = readings.find((r) => r.referencia === reference) ?? null;

  // Autosave com pequena espera
  useEffect(() => {
    if (!entry || !dirty.current) return;
    const t = setTimeout(() => void save(entry), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  async function save(e: Entry, extra?: Partial<Entry>) {
    dirty.current = false;
    setSaveState("saving");
    const payload = {
      date,
      reference: e.reference ?? reference,
      reading_mark: e.reading_mark,
      meditation: e.meditation,
      prayer: e.prayer,
      contemplation: e.contemplation,
      completed_at: e.completed_at,
      ...extra,
    };
    const { data, error } = await supabase
      .from("lectio_entries")
      .upsert(payload, { onConflict: "user_id,date" })
      .select("id")
      .single();
    if (error) {
      setSaveState("error");
      return null;
    }
    setSaveState("saved");
    queryClient.invalidateQueries({ queryKey: ["lectio-history"] });
    return data.id as string;
  }

  function update(patch: Partial<Entry>) {
    dirty.current = true;
    setEntry((prev) => ({ ...(prev ?? EMPTY), ...patch }));
  }

  async function finish() {
    if (!entry) return;
    const completed_at = new Date().toISOString();
    const id = await save(entry, { completed_at });
    if (!id) return;
    setEntry({ ...entry, completed_at });
    // Liga a lectio ao trecho da Bíblia, para aparecer em "Ver anotações ligadas".
    const ref = reference ? parseReference(reference, books) : null;
    await supabase.from("bible_links").delete().eq("source_type", "lectio").eq("source_id", id);
    if (ref) {
      await supabase.from("bible_links").insert({
        source_type: "lectio",
        source_id: id,
        book_id: ref.book.id,
        chapter: ref.chapter,
        verse_start: ref.verseStart,
        verse_end: ref.verseEnd,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["lectio", date] });
    setStep(4);
  }

  if (entryQ.isLoading || liturgyQ.isLoading || !entry) {
    return <p className="font-serif text-lg text-muted-foreground">Preparando a leitura…</p>;
  }

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-3xl">Lectio divina</h1>
        <SaveBadge state={saveState} />
      </div>
      <p className="mt-1 text-sm capitalize text-muted-foreground">{dateLabel}</p>

      {step < 4 && <StepDots step={step} onPick={setStep} />}

      {step === 0 && (
        <TextChooser
          date={date}
          readings={readings}
          fromCacheOfDate={liturgyQ.data?.fromCacheOfDate ?? null}
          liturgyFailed={!liturgy}
          reference={reference}
          onReference={(r) => update({ reference: r })}
        />
      )}

      {step < 4 && STEPS[step] && (
        <div className="mt-6">
          {step === 0 && (
            <PassageText
              reading={liturgyReading}
              reference={reference}
              books={books}
              mark={entry.reading_mark ?? ""}
              onMark={(m) => update({ reading_mark: m })}
            />
          )}
          {step > 0 && reference && (
            <details className="mb-5 rounded-xl border bg-card px-4 py-3">
              <summary className="cursor-pointer text-sm text-muted-foreground">Reler o texto · {reference}</summary>
              <div className="mt-3">
                <PassageText reading={liturgyReading} reference={reference} books={books} mark={entry.reading_mark ?? ""} />
              </div>
            </details>
          )}

          <h2 className="mt-6 text-2xl">{STEPS[step].title}</h2>
          <p className="mt-1 font-serif text-lg text-muted-foreground">{STEPS[step].question}</p>
          <textarea
            value={(entry[STEPS[step].key] as string | null) ?? ""}
            onChange={(e) => update({ [STEPS[step].key]: e.target.value } as Partial<Entry>)}
            rows={step === 0 ? 2 : 7}
            placeholder={step === 0 ? "Escreva ou selecione no texto e toque em Marcar" : "Escreva com as suas palavras (pode usar o microfone do teclado)"}
            className="mt-3 w-full rounded-xl border bg-card p-4 font-serif text-lg leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="mt-5 flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 rounded-2xl border px-5 py-4">
                <ArrowLeft className="h-5 w-5" /> Voltar
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-lg text-primary-foreground"
              >
                Próximo passo <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={finish}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-lg text-primary-foreground"
              >
                <Check className="h-5 w-5" /> Concluir a lectio
              </button>
            )}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">Lectio concluída · {reference}</p>
            {STEPS.map((s) =>
              entry[s.key] ? (
                <div key={s.key} className="mt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">{s.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap font-serif text-lg leading-relaxed">{entry[s.key]}</p>
                </div>
              ) : null,
            )}
          </div>
          <button onClick={() => setStep(0)} className="w-full rounded-2xl border px-5 py-4">
            Rever ou editar os passos
          </button>
          <button disabled className="w-full rounded-2xl border px-5 py-4 text-muted-foreground opacity-60">
            Ver apoio (chega na próxima etapa)
          </button>
          <Link to="/historico" className="block text-center text-primary underline-offset-4 hover:underline">
            Ver histórico
          </Link>
        </div>
      )}
    </section>
  );
}

function SaveBadge({ state }: { state: string }) {
  const label = { idle: "", saving: "Salvando…", saved: "Salvo", error: "Não salvou — verifique a internet" }[state];
  return <span className="text-xs text-muted-foreground">{label}</span>;
}

function StepDots({ step, onPick }: { step: number; onPick: (n: number) => void }) {
  return (
    <ol className="mt-5 flex gap-2">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex-1">
          <button
            onClick={() => onPick(i)}
            className={`w-full border-t-4 pt-1 text-left text-xs ${i <= step ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}
          >
            {i + 1}. {s.title}
          </button>
        </li>
      ))}
    </ol>
  );
}

function TextChooser(props: {
  date: string;
  readings: Reading[];
  fromCacheOfDate: string | null;
  liturgyFailed: boolean;
  reference: string | null;
  onReference: (r: string) => void;
}) {
  const [manual, setManual] = useState("");
  return (
    <div className="mt-5 space-y-3">
      {props.fromCacheOfDate && (
        <p className="rounded-xl bg-secondary p-3 text-sm">
          Não consegui buscar a liturgia de hoje. Mostrando a do dia {props.fromCacheOfDate.split("-").reverse().join("/")}. Você pode escolher outro trecho abaixo.
        </p>
      )}
      {props.liturgyFailed && (
        <p className="rounded-xl bg-secondary p-3 text-sm">
          Não consegui buscar a liturgia agora. Escolha um trecho da Bíblia para a sua lectio.
        </p>
      )}
      {props.readings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {props.readings.map((r) => (
            <button
              key={r.kind}
              onClick={() => props.onReference(r.referencia)}
              className={`rounded-full border px-3 py-1.5 text-sm ${props.reference === r.referencia ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) props.onReference(manual.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Outro trecho, ex.: Jo 15,1-8"
          className="flex-1 rounded-xl border bg-card px-4 py-2.5 outline-none"
        />
        <button className="rounded-xl border px-4">Usar</button>
      </form>
    </div>
  );
}

function highlight(text: string, mark: string) {
  const m = mark.trim();
  if (m.length < 2) return text;
  const idx = text.toLowerCase().indexOf(m.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="hl-amarelo rounded px-0.5 text-inherit">{text.slice(idx, idx + m.length)}</mark>
      {text.slice(idx + m.length)}
    </>
  );
}

function PassageText(props: {
  reading: Reading | null;
  reference: string | null;
  books: BookLite[];
  mark: string;
  onMark?: (m: string) => void;
}) {
  const parsed = useMemo(
    () => (props.reference && props.books.length ? parseReference(props.reference, props.books) : null),
    [props.reference, props.books],
  );

  const versesQ = useQuery({
    enabled: !props.reading && !!parsed,
    queryKey: ["lectio-passage", props.reference],
    queryFn: async () => {
      let q = supabase.from("bible_verses").select("verse, text").eq("book_id", parsed!.book.id).eq("chapter", parsed!.chapter);
      if (parsed!.verseStart) q = q.gte("verse", parsed!.verseStart).lte("verse", parsed!.verseEnd ?? parsed!.verseStart);
      const { data, error } = await q.order("verse");
      if (error) throw error;
      return data;
    },
  });

  function markSelection() {
    const s = window.getSelection()?.toString().trim();
    if (s && props.onMark) props.onMark(s);
  }

  const bibleLink = parsed ? (
    <Link
      to="/biblia"
      search={props.reference ? { ref: props.reference } : {}}
      className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
    >
      <BookOpen className="h-4 w-4" /> Ver na Bíblia Ave-Maria
    </Link>
  ) : null;

  let body: React.ReactNode;
  if (props.reading) {
    body = (
      <>
        {props.reading.titulo && <p className="text-sm italic text-muted-foreground">{props.reading.titulo}</p>}
        {props.reading.refrao && <p className="mt-2 font-serif font-semibold">{props.reading.refrao}</p>}
        <p className="mt-3 whitespace-pre-wrap font-serif text-lg leading-relaxed">{highlight(props.reading.texto, props.mark)}</p>
        <p className="mt-3 text-xs text-muted-foreground">Texto da liturgia (CNBB), como foi publicado.</p>
      </>
    );
  } else if (!parsed) {
    body = <p className="text-muted-foreground">Não reconheci essa referência. Tente algo como "Jo 15,1-8".</p>;
  } else if (versesQ.isLoading) {
    body = <p className="text-muted-foreground">Carregando o texto…</p>;
  } else if (!versesQ.data?.length) {
    body = <p className="text-muted-foreground">Não encontrei esse trecho na Bíblia.</p>;
  } else {
    body = (
      <p className="font-serif text-lg leading-relaxed">
        {highlight(versesQ.data.map((v) => `${v.verse} ${v.text}`).join(" "), props.mark)}
      </p>
    );
  }

  return (
    <article>
      <h2 className="font-serif text-xl">{props.reference}</h2>
      <div className="mt-2">{body}</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {bibleLink}
        {props.onMark && (
          <button onClick={markSelection} className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm">
            <Highlighter className="h-4 w-4" /> Marcar seleção
          </button>
        )}
      </div>
    </article>
  );
}
