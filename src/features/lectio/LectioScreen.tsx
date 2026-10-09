import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, Highlighter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseReference, type BookLite } from "@/features/biblia/reference";
import { booksQueryOptions } from "@/features/biblia/queries";
import { getLiturgy } from "./liturgy.functions";
import type { Reading } from "./liturgy";
import { Card, Chip, ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";

type Entry = {
  id?: string;
  reference: string | null;
  reading_mark: string | null;
  meditation: string | null;
  prayer: string | null;
  contemplation: string | null;
  completed_at: string | null;
  /** Texto guardado só no aparelho, ainda não enviado ao servidor. */
  _unsynced?: boolean;
};

const EMPTY: Entry = { reference: null, reading_mark: null, meditation: null, prayer: null, contemplation: null, completed_at: null };

const STEPS = [
  { key: "reading_mark", title: "Leitura", question: "Leia com calma. Qual palavra ou frase chamou a sua atenção?" },
  { key: "meditation", title: "Meditação", question: "O que o texto me diz?" },
  { key: "prayer", title: "Oração", question: "O que este texto me leva a pedir, agradecer ou louvar?" },
  { key: "contemplation", title: "Contemplação", question: "O que este texto me leva a ser e a fazer?" },
] as const;

export function useBooks() {
  return useQuery(booksQueryOptions);
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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error" | "offline">("idle");
  const dirty = useRef(false);
  const entryRef = useRef(entry);
  entryRef.current = entry;

  useEffect(() => {
    if (entry !== null) return;
    // Sem internet e sem nada guardado: começa em branco e envia quando a conexão voltar.
    const offlineEmpty = entryQ.data === undefined && entryQ.fetchStatus === "paused";
    if (entryQ.data === undefined && !offlineEmpty) return;
    const initial = entryQ.data ?? EMPTY;
    if (initial._unsynced) dirty.current = true;
    setEntry(initial);
    if (initial.completed_at) setStep(4);
  }, [entryQ.data, entryQ.fetchStatus, entry]);

  const liturgy = liturgyQ.data?.liturgy ?? null;
  const readings = liturgy?.readings ?? [];
  const reference = entry?.reference ?? readings.find((r) => r.kind === "evangelho")?.referencia ?? null;
  const liturgyReading = readings.find((r) => r.referencia === reference) ?? null;

  // Autosave com pequena espera. Antes, guarda no cache (que fica no aparelho),
  // para nada se perder se a internet falhar ou o app for fechado.
  useEffect(() => {
    if (!entry || !dirty.current) return;
    queryClient.setQueryData(["lectio", date], { ...entry, _unsynced: true });
    const t = setTimeout(() => void save(entry), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  const saveRef = useRef(save);
  saveRef.current = save;

  // Envia o que ficou pendente quando a internet volta, e ao sair da tela.
  useEffect(() => {
    const flush = () => {
      if (dirty.current && entryRef.current) void saveRef.current(entryRef.current);
    };
    window.addEventListener("online", flush);
    return () => {
      window.removeEventListener("online", flush);
      flush();
    };
  }, []);

  async function save(e: Entry, extra?: Pick<Entry, "completed_at">) {
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
      dirty.current = true;
      setSaveState(navigator.onLine ? "error" : "offline");
      queryClient.setQueryData(["lectio", date], { ...(entryRef.current ?? e), _unsynced: true });
      return null;
    }
    setSaveState("saved");
    if (!dirty.current) queryClient.setQueryData(["lectio", date], { ...e, ...extra, id: data.id });
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
    return (
      <section>
        <ScreenHeader title="Lectio divina" back={{ label: "Hoje", to: "/" }} />
        <p className="reading text-muted-foreground">Preparando a leitura…</p>
      </section>
    );
  }

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section>
      <ScreenHeader
        title="Lectio divina"
        subtitle={dateLabel}
        back={{ label: "Hoje", to: "/" }}
        action={<SaveBadge state={saveState} />}
      />

      {step < 4 && <StepProgress step={step} onPick={setStep} />}

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
        <div className="mt-5">
          {step === 0 && (
            <Card>
              <PassageText
                reading={liturgyReading}
                reference={reference}
                books={books}
                mark={entry.reading_mark ?? ""}
                onMark={(m) => update({ reading_mark: m })}
              />
            </Card>
          )}
          {step > 0 && reference && (
            <details className="rounded-[20px] bg-card px-5 py-4 shadow-card">
              <summary className="cursor-pointer text-[15px] text-primary">Reler o texto · {reference}</summary>
              <div className="mt-3">
                <PassageText reading={liturgyReading} reference={reference} books={books} mark={entry.reading_mark ?? ""} />
              </div>
            </details>
          )}

          <p className="eyebrow mt-7">
            Passo {step + 1} de 4 · {STEPS[step].title}
          </p>
          <h2 className="title mt-1">{STEPS[step].question}</h2>
          <textarea
            value={(entry[STEPS[step].key] as string | null) ?? ""}
            onChange={(e) => update({ [STEPS[step]!.key]: e.target.value } as Partial<Entry>)}
            rows={step === 0 ? 2 : 7}
            placeholder={step === 0 ? "Escreva ou selecione no texto e toque em Marcar" : "Escreva com as suas palavras (pode usar o microfone do teclado)"}
            className="reading mt-3 w-full rounded-[20px] bg-card p-4 shadow-card outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
          />

          <div className="mt-5 flex gap-3">
            {step > 0 && (
              <Button variant="secondary" size="lg" className="w-auto" onClick={() => setStep(step - 1)} aria-label="Passo anterior">
                <ArrowLeft />
              </Button>
            )}
            {step < 3 ? (
              <Button size="lg" className="flex-1" onClick={() => setStep(step + 1)}>
                Próximo passo <ArrowRight />
              </Button>
            ) : (
              <Button size="lg" className="flex-1" onClick={finish}>
                <Check /> Concluir a lectio
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <Card>
            <p className="eyebrow">Lectio concluída · {reference}</p>
            {STEPS.map((s) =>
              entry[s.key] ? (
                <div key={s.key} className="mt-5">
                  <h3 className="text-[15px] font-semibold text-primary">{s.title}</h3>
                  <p className="reading mt-1 whitespace-pre-wrap">{entry[s.key]}</p>
                </div>
              ) : null,
            )}
          </Card>
          <Button variant="secondary" size="lg" onClick={() => setStep(0)}>
            Rever ou editar os passos
          </Button>
          <Button variant="secondary" size="lg" disabled>
            Ver apoio (chega na próxima etapa)
          </Button>
          <Button asChild variant="link" className="w-full text-[17px]">
            <Link to="/historico">Ver histórico</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

function SaveBadge({ state }: { state: string }) {
  const label = {
    idle: "",
    saving: "Salvando…",
    saved: "Salvo",
    error: "Não salvou — verifique a internet",
    offline: "Guardado no aparelho",
  }[state];
  return <span className="text-[13px] text-muted-foreground">{label}</span>;
}

function StepProgress({ step, onPick }: { step: number; onPick: (n: number) => void }) {
  return (
    <ol className="flex gap-1.5">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex-1">
          <button onClick={() => onPick(i)} aria-label={`Ir para ${s.title}`} className="block w-full py-2">
            <span className={`block h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`} />
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
    <div className="mt-3 space-y-3">
      {props.fromCacheOfDate && (
        <p className="rounded-2xl bg-secondary p-4 text-[15px]">
          Não consegui buscar a liturgia de hoje. Mostrando a do dia {props.fromCacheOfDate.split("-").reverse().join("/")}. Você pode escolher outro trecho abaixo.
        </p>
      )}
      {props.liturgyFailed && (
        <p className="rounded-2xl bg-secondary p-4 text-[15px]">
          Não consegui buscar a liturgia agora. Escolha um trecho da Bíblia para a sua lectio.
        </p>
      )}
      {props.readings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {props.readings.map((r) => (
            <Chip key={r.kind} active={props.reference === r.referencia} onClick={() => props.onReference(r.referencia)}>
              {r.label}
            </Chip>
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
          className="h-11 flex-1 rounded-xl bg-card px-4 text-base shadow-card outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" variant="secondary" size="md">
          Usar
        </Button>
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
      className="inline-flex items-center gap-1.5 text-[15px] text-primary"
    >
      <BookOpen className="h-4 w-4" /> Ver na Bíblia
    </Link>
  ) : null;

  let body: React.ReactNode;
  if (props.reading) {
    body = (
      <>
        {props.reading.titulo && <p className="text-[15px] italic text-muted-foreground">{props.reading.titulo}</p>}
        {props.reading.refrao && <p className="reading mt-2 font-semibold">{props.reading.refrao}</p>}
        <p className="reading mt-3 whitespace-pre-wrap">{highlight(props.reading.texto, props.mark)}</p>
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
      <p className="reading">
        {highlight(versesQ.data.map((v) => `${v.verse} ${v.text}`).join(" "), props.mark)}
      </p>
    );
  }

  return (
    <article>
      <h2 className="eyebrow">{props.reference}</h2>
      <div className="mt-2">{body}</div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {bibleLink}
        {props.onMark && (
          <Button variant="secondary" size="sm" className="h-9 rounded-full px-3.5 text-[15px]" onClick={markSelection}>
            <Highlighter /> Marcar seleção
          </Button>
        )}
      </div>
    </article>
  );
}
