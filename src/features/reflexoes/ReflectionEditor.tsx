import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { booksQueryOptions } from "@/features/biblia/queries";
import { formatLinkRef, parseReference } from "@/features/biblia/reference";
import {
  Chip,
  ListGroup,
  rowClass,
  SaveBadge,
  ScreenHeader,
  type SaveState,
} from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import {
  putInList,
  reflectionTaggingsQueryOptions,
  SOURCE,
  tagsQueryOptions,
  type Reflection,
} from "./queries";

export function ReflectionEditor({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const reflectionQ = useQuery({
    queryKey: ["reflection", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reflections")
        .select("id, title, body, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Reflection | null;
    },
  });

  const [draft, setDraft] = useState<Reflection | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirty = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (draft !== null) return;
    // Nova (não existe no servidor) ou sem internet e sem nada guardado: começa em branco.
    const offlineEmpty = reflectionQ.data === undefined && reflectionQ.fetchStatus === "paused";
    if (reflectionQ.data === undefined && !offlineEmpty) return;
    const now = new Date().toISOString();
    const initial = reflectionQ.data ?? {
      id,
      title: "",
      body: "",
      created_at: now,
      updated_at: now,
    };
    if (initial._unsynced) dirty.current = true;
    setDraft(initial);
  }, [reflectionQ.data, reflectionQ.fetchStatus, draft, id]);

  // Salvamento automático: guarda primeiro no aparelho, depois envia.
  useEffect(() => {
    if (!draft || !dirty.current) return;
    const local = { ...draft, _unsynced: true };
    queryClient.setQueryData(["reflection", id], local);
    if (hasContent(draft)) putInList(queryClient, local);
    const t = setTimeout(() => void save(draft), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    const flush = () => {
      if (dirty.current && draftRef.current) void saveRef.current(draftRef.current);
    };
    window.addEventListener("online", flush);
    return () => {
      window.removeEventListener("online", flush);
      flush();
    };
  }, []);

  /** Envia ao servidor. Reflexão vazia só é criada quando `force` (ex.: ao ligar um versículo). */
  async function save(r: Reflection, force = false): Promise<boolean> {
    if (!force && !hasContent(r)) {
      dirty.current = false;
      return true;
    }
    dirty.current = false;
    setSaveState("saving");
    const { data, error } = await supabase
      .from("reflections")
      .upsert({ id: r.id, title: r.title, body: r.body }, { onConflict: "id" })
      .select("id, title, body, created_at, updated_at")
      .single();
    if (error) {
      dirty.current = true;
      setSaveState(navigator.onLine ? "error" : "offline");
      return false;
    }
    setSaveState("saved");
    if (!dirty.current) {
      queryClient.setQueryData(["reflection", id], data);
      putInList(queryClient, data);
    }
    return true;
  }

  function update(patch: Partial<Pick<Reflection, "title" | "body">>) {
    dirty.current = true;
    setDraft((prev) => (prev ? { ...prev, ...patch, updated_at: new Date().toISOString() } : prev));
  }

  /** Versículos e temas apontam para a reflexão, então ela precisa existir no servidor antes. */
  async function ensureSaved() {
    if (!draftRef.current) return false;
    if (!navigator.onLine) {
      toast.error("Ligar versículos e temas precisa de internet.");
      return false;
    }
    return save(draftRef.current, true);
  }

  async function remove() {
    if (!window.confirm("Apagar esta reflexão? Isso não pode ser desfeito.")) return;
    dirty.current = false;
    const results = await Promise.all([
      supabase.from("bible_links").delete().eq("source_type", SOURCE).eq("source_id", id),
      supabase.from("taggings").delete().eq("source_type", SOURCE).eq("source_id", id),
    ]);
    const { error } = await supabase.from("reflections").delete().eq("id", id);
    if (error || results.some((r) => r.error)) {
      toast.error("Não consegui apagar. Verifique a internet.");
      return;
    }
    queryClient.setQueryData<Reflection[]>(["reflections"], (list) =>
      (list ?? []).filter((r) => r.id !== id),
    );
    queryClient.removeQueries({ queryKey: ["reflection", id] });
    void queryClient.invalidateQueries({ queryKey: ["taggings"] });
    navigate({ to: "/reflexoes", replace: true });
  }

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // A caixa de texto cresce com o conteúdo, como uma página.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft?.body]);

  if (!draft) {
    return (
      <section>
        <ScreenHeader back={{ label: "Reflexões", to: "/reflexoes" }} />
        <p className="reading text-muted-foreground">Abrindo…</p>
      </section>
    );
  }

  return (
    <section>
      <ScreenHeader
        back={{ label: "Reflexões", to: "/reflexoes" }}
        action={<SaveBadge state={saveState} />}
      />

      <input
        value={draft.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Título"
        className="title-large w-full bg-transparent outline-none placeholder:text-muted-foreground/50"
      />
      <p className="mt-1 text-[13px] text-muted-foreground">
        {new Date(draft.created_at).toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <textarea
        ref={bodyRef}
        value={draft.body}
        onChange={(e) => update({ body: e.target.value })}
        placeholder="Escreva a sua reflexão… (pode usar o microfone do teclado)"
        rows={8}
        className="reading mt-4 w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground/60"
      />

      <LinkedVerses id={id} ensureSaved={ensureSaved} />
      <Tags id={id} ensureSaved={ensureSaved} />

      <Button
        variant="ghost"
        size="md"
        className="mt-10 w-full text-destructive"
        onClick={() => void remove()}
      >
        <Trash2 /> Apagar reflexão
      </Button>
    </section>
  );
}

function hasContent(r: Reflection) {
  return !!(r.title.trim() || r.body.trim());
}

function LinkedVerses({ id, ensureSaved }: { id: string; ensureSaved: () => Promise<boolean> }) {
  const queryClient = useQueryClient();
  const booksData = useQuery(booksQueryOptions).data;
  const books = useMemo(() => booksData ?? [], [booksData]);
  const booksById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const [input, setInput] = useState("");
  const key = ["bible-links", SOURCE, id];

  const links = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bible_links")
        .select("id, book_id, chapter, verse_start, verse_end")
        .eq("source_type", SOURCE)
        .eq("source_id", id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    networkMode: "always",
    mutationFn: async (ref: NonNullable<ReturnType<typeof parseReference>>) => {
      if (!(await ensureSaved())) throw new Error("silencioso");
      const { error } = await supabase.from("bible_links").insert({
        source_type: SOURCE,
        source_id: id,
        book_id: ref.book.id,
        chapter: ref.chapter,
        verse_start: ref.verseStart,
        verse_end: ref.verseEnd,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setInput("");
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => {
      if (e.message !== "silencioso")
        toast.error("Não consegui ligar o versículo. Verifique a internet.");
    },
  });

  const removeLink = useMutation({
    networkMode: "always",
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from("bible_links").delete().eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: () => toast.error("Não consegui remover. Verifique a internet."),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const ref = parseReference(input, books);
    if (!ref) {
      toast.error('Não reconheci a referência. Tente algo como "Jo 15,1-8".');
      return;
    }
    add.mutate(ref);
  }

  return (
    <section className="mt-10">
      <h2 className="eyebrow mb-2 px-4">Versículos</h2>
      {(links.data ?? []).length > 0 && (
        <ListGroup className="mb-3">
          {(links.data ?? []).map((l) => {
            const book = booksById.get(l.book_id);
            const ref = book ? formatLinkRef(book, l.chapter, l.verse_start, l.verse_end) : "";
            return (
              <div key={l.id} className="flex items-center">
                <Link to="/biblia" search={{ ref }} className={`${rowClass} flex-1`}>
                  <BookOpen className="h-5 w-5 shrink-0 text-primary" />
                  <span className="flex-1">
                    {book ? `${book.name} ${ref.slice(book.abbreviation.length + 1)}` : ref}
                  </span>
                </Link>
                <button
                  onClick={() => removeLink.mutate(l.id)}
                  aria-label={`Remover ${ref}`}
                  className="pressable p-3.5 text-muted-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </ListGroup>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ligar um trecho, ex.: Jo 15,1-8"
          className="h-11 flex-1 rounded-xl bg-card px-4 text-base shadow-card outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="submit"
          variant="secondary"
          size="md"
          disabled={!input.trim() || add.isPending}
          aria-label="Ligar"
        >
          <Plus />
        </Button>
      </form>
    </section>
  );
}

function Tags({ id, ensureSaved }: { id: string; ensureSaved: () => Promise<boolean> }) {
  const queryClient = useQueryClient();
  const tags = useQuery(tagsQueryOptions).data ?? [];
  const taggings = useQuery(reflectionTaggingsQueryOptions).data ?? [];
  const [input, setInput] = useState("");

  const mine = taggings.filter((t) => t.source_id === id);
  const mineIds = new Set(mine.map((t) => t.tag_id));
  const tagName = new Map(tags.map((t) => [t.id, t.name]));
  const suggestions = tags.filter((t) => !mineIds.has(t.id));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["tags"] });
    void queryClient.invalidateQueries({ queryKey: ["taggings"] });
  };

  const add = useMutation({
    networkMode: "always",
    mutationFn: async (name: string) => {
      if (!(await ensureSaved())) throw new Error("silencioso");
      let tagId = tags.find((t) => t.name.toLowerCase() === name.toLowerCase())?.id;
      if (!tagId) {
        const { data, error } = await supabase.from("tags").insert({ name }).select("id").single();
        if (error) throw error;
        tagId = data.id;
      }
      if (mineIds.has(tagId)) return;
      const { error } = await supabase
        .from("taggings")
        .insert({ tag_id: tagId, source_type: SOURCE, source_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      setInput("");
      refresh();
    },
    onError: (e) => {
      if (e.message !== "silencioso")
        toast.error("Não consegui adicionar o tema. Verifique a internet.");
    },
  });

  const removeTagging = useMutation({
    networkMode: "always",
    mutationFn: async (taggingId: string) => {
      const { error } = await supabase.from("taggings").delete().eq("id", taggingId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: () => toast.error("Não consegui remover. Verifique a internet."),
  });

  return (
    <section className="mt-8">
      <h2 className="eyebrow mb-2 px-4">Temas</h2>
      {mine.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {mine.map((t) => (
            <Chip key={t.id} active onClick={() => removeTagging.mutate(t.id)}>
              {tagName.get(t.tag_id)} <X className="h-4 w-4" aria-label="Remover tema" />
            </Chip>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) add.mutate(input.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Novo tema, ex.: Eucaristia"
          className="h-11 flex-1 rounded-xl bg-card px-4 text-base shadow-card outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="submit"
          variant="secondary"
          size="md"
          disabled={!input.trim() || add.isPending}
          aria-label="Adicionar tema"
        >
          <Plus />
        </Button>
      </form>
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((t) => (
            <Chip key={t.id} active={false} onClick={() => add.mutate(t.name)}>
              <Plus className="h-4 w-4" /> {t.name}
            </Chip>
          ))}
        </div>
      )}
    </section>
  );
}
