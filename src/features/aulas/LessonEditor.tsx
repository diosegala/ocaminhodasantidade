import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Circle, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LinkedVerses, Tags } from "@/features/ligacoes/Ligacoes";
import { SaveBadge, ScreenHeader, type SaveState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  hasContent,
  LESSON_COLUMNS,
  lessonToRow,
  PHOTO_BUCKET,
  putInList,
  SOURCE,
  today,
  type Lesson,
} from "./queries";

type Editable = Pick<Lesson, "date" | "theme" | "raw_transcript" | "user_synthesis">;

export function LessonEditor({ id }: { id: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const lessonQ = useQuery({
    queryKey: ["lesson", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(LESSON_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Lesson | null;
    },
  });

  const [draft, setDraft] = useState<Lesson | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirty = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (draft !== null) return;
    // Nova (não existe no servidor) ou sem internet e sem nada guardado: começa em branco.
    const offlineEmpty = lessonQ.data === undefined && lessonQ.fetchStatus === "paused";
    if (lessonQ.data === undefined && !offlineEmpty) return;
    const now = new Date().toISOString();
    const initial = lessonQ.data ?? {
      id,
      date: today(),
      theme: "",
      raw_transcript: null,
      user_synthesis: null,
      created_at: now,
      updated_at: now,
    };
    if (initial._unsynced) dirty.current = true;
    setDraft(initial);
  }, [lessonQ.data, lessonQ.fetchStatus, draft, id]);

  // Salvamento automático: guarda primeiro no aparelho, depois envia.
  useEffect(() => {
    if (!draft || !dirty.current) return;
    const local = { ...draft, _unsynced: true };
    queryClient.setQueryData(["lesson", id], local);
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

  /** Envia ao servidor. Aula vazia só é criada quando `force` (ex.: ao anotar uma dúvida). */
  async function save(l: Lesson, force = false): Promise<boolean> {
    if (!force && !hasContent(l)) {
      dirty.current = false;
      return true;
    }
    dirty.current = false;
    setSaveState("saving");
    const { data, error } = await supabase
      .from("lessons")
      .upsert(lessonToRow(l), { onConflict: "id" })
      .select(LESSON_COLUMNS)
      .single();
    if (error) {
      dirty.current = true;
      setSaveState(navigator.onLine ? "error" : "offline");
      return false;
    }
    setSaveState("saved");
    if (!dirty.current) {
      queryClient.setQueryData(["lesson", id], data);
      putInList(queryClient, data);
    }
    return true;
  }

  function update(patch: Partial<Editable>) {
    dirty.current = true;
    setDraft((prev) => (prev ? { ...prev, ...patch, updated_at: new Date().toISOString() } : prev));
  }

  /** Dúvidas, fotos, versículos e temas apontam para a aula: ela precisa existir no servidor. */
  async function ensureSaved() {
    if (!draftRef.current) return false;
    if (!navigator.onLine) {
      toast.error("Dúvidas, fotos, versículos e temas precisam de internet.");
      return false;
    }
    return save(draftRef.current, true);
  }

  async function remove() {
    if (!window.confirm("Apagar esta aula, com dúvidas e fotos? Isso não pode ser desfeito."))
      return;
    dirty.current = false;
    const photos = await supabase.from("lesson_photos").select("storage_path").eq("lesson_id", id);
    const paths = (photos.data ?? []).map((p) => p.storage_path);
    const results = await Promise.all([
      paths.length ? supabase.storage.from(PHOTO_BUCKET).remove(paths) : { error: null },
      supabase.from("bible_links").delete().eq("source_type", SOURCE).eq("source_id", id),
      supabase.from("taggings").delete().eq("source_type", SOURCE).eq("source_id", id),
    ]);
    // Dúvidas e registros de fotos saem junto (on delete cascade).
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (photos.error || error || results.some((r) => r.error)) {
      toast.error("Não consegui apagar. Verifique a internet.");
      return;
    }
    queryClient.setQueryData<Lesson[]>(["lessons"], (list) =>
      (list ?? []).filter((l) => l.id !== id),
    );
    queryClient.removeQueries({ queryKey: ["lesson", id] });
    void queryClient.invalidateQueries({ queryKey: ["lesson-questions"] });
    void queryClient.invalidateQueries({ queryKey: ["taggings"] });
    navigate({ to: "/aulas", replace: true });
  }

  if (!draft) {
    return (
      <section>
        <ScreenHeader back={{ label: "Aulas", to: "/aulas" }} />
        <p className="reading text-muted-foreground">Abrindo…</p>
      </section>
    );
  }

  return (
    <section>
      <ScreenHeader
        back={{ label: "Aulas", to: "/aulas" }}
        action={<SaveBadge state={saveState} />}
      />

      <input
        type="date"
        value={draft.date}
        max={today()}
        onChange={(e) => e.target.value && update({ date: e.target.value })}
        aria-label="Data da aula"
        className="eyebrow -ml-1 rounded-lg bg-transparent px-1 py-0.5 outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        value={draft.theme}
        onChange={(e) => update({ theme: e.target.value })}
        placeholder="Tema da aula"
        className="title-large mt-1 w-full bg-transparent outline-none placeholder:text-muted-foreground/50"
      />

      <h2 className="eyebrow mt-6">Anotações</h2>
      <GrowingTextarea
        value={draft.raw_transcript ?? ""}
        onChange={(v) => update({ raw_transcript: v || null })}
        placeholder="O que foi ensinado, frases do catequista, leituras… (pode usar o microfone do teclado)"
        rows={6}
      />

      <h2 className="eyebrow mt-6">O que ficou para mim</h2>
      <GrowingTextarea
        value={draft.user_synthesis ?? ""}
        onChange={(v) => update({ user_synthesis: v || null })}
        placeholder="Em poucas linhas: o que tocou você, o que quer viver nesta semana."
        rows={3}
      />

      <Questions id={id} ensureSaved={ensureSaved} />
      <Photos id={id} ensureSaved={ensureSaved} />
      <LinkedVerses source={SOURCE} id={id} ensureSaved={ensureSaved} />
      <Tags source={SOURCE} id={id} ensureSaved={ensureSaved} />

      <Button
        variant="ghost"
        size="md"
        className="mt-10 w-full text-destructive"
        onClick={() => void remove()}
      >
        <Trash2 /> Apagar aula
      </Button>
    </section>
  );
}

/** Caixa de texto que cresce com o conteúdo, como uma página. */
function GrowingTextarea({
  value,
  onChange,
  placeholder,
  rows,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        "reading mt-2 w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground/60",
        className,
      )}
    />
  );
}

type Question = { id: string; question: string; status: string; answer: string | null };

function Questions({ id, ensureSaved }: { id: string; ensureSaved: () => Promise<boolean> }) {
  const queryClient = useQueryClient();
  const key = ["lesson-questions", id];
  const [input, setInput] = useState("");

  const questions = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_questions")
        .select("id, question, status, answer")
        .eq("lesson_id", id)
        .order("created_at");
      if (error) throw error;
      return data as Question[];
    },
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["lesson-questions"] });

  const add = useMutation({
    networkMode: "always",
    mutationFn: async (question: string) => {
      if (!(await ensureSaved())) throw new Error("silencioso");
      const { error } = await supabase.from("lesson_questions").insert({ lesson_id: id, question });
      if (error) throw error;
    },
    onSuccess: () => {
      setInput("");
      refresh();
    },
    onError: (e) => {
      if (e.message !== "silencioso")
        toast.error("Não consegui anotar a dúvida. Verifique a internet.");
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (input.trim()) add.mutate(input.trim());
  }

  const list = questions.data ?? [];

  return (
    <section className="mt-10">
      <h2 className="eyebrow mb-2 px-4">Dúvidas</h2>
      {list.length > 0 && (
        <ul className="mb-3 overflow-hidden rounded-[20px] bg-card shadow-card [&>*+*]:border-t">
          {list.map((q) => (
            <QuestionRow key={q.id} q={q} onChanged={refresh} />
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Uma dúvida para levar ao catequista"
          className="h-11 flex-1 rounded-xl bg-card px-4 text-base shadow-card outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="submit"
          variant="secondary"
          size="md"
          disabled={!input.trim() || add.isPending}
          aria-label="Anotar dúvida"
        >
          <Plus />
        </Button>
      </form>
    </section>
  );
}

function QuestionRow({ q, onChanged }: { q: Question; onChanged: () => void }) {
  const answered = q.status === "respondida";
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState(q.answer ?? "");

  const patch = useMutation({
    networkMode: "always",
    mutationFn: async (values: Partial<Pick<Question, "status" | "answer">>) => {
      const { error } = await supabase.from("lesson_questions").update(values).eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: onChanged,
    onError: () => toast.error("Não consegui salvar. Verifique a internet."),
  });

  const remove = useMutation({
    networkMode: "always",
    mutationFn: async () => {
      const { error } = await supabase.from("lesson_questions").delete().eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: onChanged,
    onError: () => toast.error("Não consegui remover. Verifique a internet."),
  });

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <button
          onClick={() => patch.mutate({ status: answered ? "aberta" : "respondida" })}
          aria-label={answered ? "Marcar como aberta" : "Marcar como respondida"}
          className="pressable mt-0.5 shrink-0 text-primary"
        >
          {answered ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
          ) : (
            <Circle className="h-6 w-6" strokeWidth={1.6} />
          )}
        </button>
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <span className={cn("block", answered && "text-muted-foreground")}>{q.question}</span>
          {!open && q.answer && (
            <span className="mt-0.5 block line-clamp-2 text-[15px] text-muted-foreground">
              {q.answer}
            </span>
          )}
          {!open && !q.answer && (
            <span className="mt-0.5 block text-[13px] text-primary">Anotar resposta</span>
          )}
        </button>
      </div>
      {open && (
        <div className="mt-3 pl-9">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            autoFocus
            placeholder="A resposta que você recebeu ou encontrou"
            className="w-full rounded-xl bg-secondary p-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="md"
              className="flex-1"
              disabled={patch.isPending}
              onClick={() =>
                patch.mutate(
                  {
                    answer: answer.trim() || null,
                    ...(answer.trim() ? { status: "respondida" } : {}),
                  },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              Salvar
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="text-destructive"
              aria-label="Apagar dúvida"
              onClick={() => window.confirm("Apagar esta dúvida?") && remove.mutate()}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

type Photo = { id: string; storage_path: string; url: string | null };

function Photos({ id, ensureSaved }: { id: string; ensureSaved: () => Promise<boolean> }) {
  const queryClient = useQueryClient();
  const key = ["lesson-photos", id];
  const fileRef = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState<Photo | null>(null);

  const photos = useQuery({
    queryKey: key,
    // Os links assinados expiram em 1 hora; renova antes disso.
    staleTime: 50 * 60 * 1000,
    queryFn: async (): Promise<Photo[]> => {
      const { data, error } = await supabase
        .from("lesson_photos")
        .select("id, storage_path")
        .eq("lesson_id", id)
        .order("created_at");
      if (error) throw error;
      if (data.length === 0) return [];
      const { data: signed } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(
        data.map((p) => p.storage_path),
        60 * 60,
      );
      const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      return data.map((p) => ({ ...p, url: urls.get(p.storage_path) ?? null }));
    },
  });

  const upload = useMutation({
    networkMode: "always",
    mutationFn: async (files: File[]) => {
      if (!(await ensureSaved())) throw new Error("silencioso");
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error("Sessão expirada. Entre de novo.");
      for (const file of files) {
        const blob = await shrink(file);
        const type = blob.type || "image/jpeg";
        const ext = type === "image/jpeg" ? "jpg" : (type.split("/")[1] ?? "img");
        const path = `${userId}/${id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, blob, { contentType: type });
        if (up.error) throw up.error;
        const { error } = await supabase
          .from("lesson_photos")
          .insert({ lesson_id: id, storage_path: path });
        if (error) {
          await supabase.storage.from(PHOTO_BUCKET).remove([path]);
          throw error;
        }
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: (e) => {
      if (e.message === "silencioso") return;
      toast.error(
        /bucket/i.test(e.message)
          ? "O espaço de fotos ainda não foi criado no banco."
          : "Não consegui enviar a foto. Verifique a internet.",
      );
    },
  });

  const remove = useMutation({
    networkMode: "always",
    mutationFn: async (p: Photo) => {
      const { error } = await supabase.from("lesson_photos").delete().eq("id", p.id);
      if (error) throw error;
      await supabase.storage.from(PHOTO_BUCKET).remove([p.storage_path]);
    },
    onSuccess: () => {
      setViewing(null);
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error("Não consegui apagar a foto. Verifique a internet."),
  });

  const list = photos.data ?? [];

  return (
    <section className="mt-8">
      <h2 className="eyebrow mb-2 px-4">Fotos</h2>
      <div className="grid grid-cols-3 gap-2">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => setViewing(p)}
            className="pressable aspect-square overflow-hidden rounded-xl bg-secondary"
          >
            {p.url && (
              <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
          </button>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="pressable flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-card text-[13px] text-primary shadow-card disabled:opacity-60"
        >
          <Camera className="h-6 w-6" />
          {upload.isPending ? "Enviando…" : "Adicionar"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) upload.mutate(files);
        }}
      />

      {viewing && (
        <div
          className="fixed inset-0 z-40 flex flex-col bg-black/90 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          onClick={() => setViewing(null)}
        >
          <div className="flex justify-between p-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => window.confirm("Apagar esta foto?") && remove.mutate(viewing)}
              aria-label="Apagar foto"
              className="pressable rounded-full bg-white/15 p-2 text-white"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewing(null)}
              aria-label="Fechar"
              className="pressable rounded-full bg-white/15 p-2 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {viewing.url && (
            <img src={viewing.url} alt="" className="min-h-0 flex-1 object-contain" />
          )}
        </div>
      )}
    </section>
  );
}

/** Reduz a foto (lado maior até 1600px, JPEG) para caber bem no plano gratuito. */
async function shrink(file: File): Promise<Blob> {
  const MAX = 1600;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    // Formato que o navegador não abre (ex.: HEIC em alguns aparelhos): envia como veio.
    return file;
  }
}
