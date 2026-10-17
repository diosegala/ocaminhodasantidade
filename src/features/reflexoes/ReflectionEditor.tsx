import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LinkedVerses, Tags } from "@/features/ligacoes/Ligacoes";
import { SaveBadge, ScreenHeader, type SaveState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { putInList, SOURCE, type Reflection } from "./queries";

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

      <LinkedVerses source={SOURCE} id={id} ensureSaved={ensureSaved} />
      <Tags source={SOURCE} id={id} ensureSaved={ensureSaved} />

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
