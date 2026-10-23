import { useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { booksQueryOptions } from "@/features/biblia/queries";
import { formatLinkRef, parseReference } from "@/features/biblia/reference";
import { ReferenceHint } from "@/features/biblia/ReferenceHint";
import { Chip, ListGroup, rowClass } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { taggingsQueryOptions, tagsQueryOptions, type LinkSource } from "./queries";

// Versículos e temas ligados a um texto (reflexão, aula…), identificado por `source` + `id`.

type Props = {
  source: LinkSource;
  id: string;
  /** Versículos e temas apontam para o texto, então ele precisa existir no servidor antes. */
  ensureSaved: () => Promise<boolean>;
};

export function LinkedVerses({ source, id, ensureSaved }: Props) {
  const queryClient = useQueryClient();
  const booksData = useQuery(booksQueryOptions).data;
  const books = useMemo(() => booksData ?? [], [booksData]);
  const booksById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const [input, setInput] = useState("");
  const key = ["bible-links", source, id];

  const links = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bible_links")
        .select("id, book_id, chapter, verse_start, verse_end")
        .eq("source_type", source)
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
        source_type: source,
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
      toast.error("Não reconheci o trecho. Escreva o livro e o capítulo, ex.: João 15,1-8.");
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
          placeholder="Ligar um trecho, ex.: João 15,1-8"
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
      <ReferenceHint input={input} books={books} onChange={setInput} />
    </section>
  );
}

export function Tags({ source, id, ensureSaved }: Props) {
  const queryClient = useQueryClient();
  const tags = useQuery(tagsQueryOptions).data ?? [];
  const taggings = useQuery(taggingsQueryOptions(source)).data ?? [];
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
        .insert({ tag_id: tagId, source_type: source, source_id: id });
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
