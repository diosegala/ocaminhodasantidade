import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Plus, Search } from "lucide-react";
import { stripAccents } from "@/features/biblia/reference";
import { EmptyState, ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { formatLessonDate, lessonsQueryOptions, openQuestionsQueryOptions } from "./queries";

export function LessonsList() {
  const navigate = useNavigate();
  const lessons = useQuery(lessonsQueryOptions);
  const openQuestions = useQuery(openQuestionsQueryOptions);
  const [search, setSearch] = useState("");

  const openByLesson = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of openQuestions.data ?? []) map.set(q.lesson_id, (map.get(q.lesson_id) ?? 0) + 1);
    return map;
  }, [openQuestions.data]);

  const all = lessons.data ?? [];
  const term = stripAccents(search);
  const items = all.filter(
    (l) =>
      !term ||
      stripAccents(`${l.theme} ${l.raw_transcript ?? ""} ${l.user_synthesis ?? ""}`).includes(term),
  );

  function newLesson() {
    navigate({ to: "/aulas/$id", params: { id: crypto.randomUUID() } });
  }

  return (
    <section>
      <ScreenHeader title="Aulas" />

      <Button size="lg" onClick={newLesson}>
        <Plus /> Registrar aula
      </Button>

      {all.length > 0 && (
        <label className="mt-5 flex h-11 items-center gap-2 rounded-xl bg-secondary px-3">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nas aulas"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>
      )}

      {lessons.isLoading && <p className="mt-6 text-muted-foreground">Carregando…</p>}

      {lessons.isSuccess && all.length === 0 && (
        <EmptyState icon={GraduationCap} title="Nenhuma aula ainda">
          Registre cada encontro da catequese: o tema, suas anotações, fotos do quadro e as dúvidas
          para levar ao catequista.
        </EmptyState>
      )}
      {all.length > 0 && items.length === 0 && (
        <p className="mt-6 px-1 text-[15px] text-muted-foreground">Nada encontrado.</p>
      )}

      <ul className="mt-5 space-y-3">
        {items.map((l) => {
          const open = openByLesson.get(l.id) ?? 0;
          const preview = l.user_synthesis?.trim() || l.raw_transcript?.trim();
          return (
            <li key={l.id}>
              <Link
                to="/aulas/$id"
                params={{ id: l.id }}
                className="pressable block rounded-[20px] bg-card p-5 shadow-card"
              >
                <p className="eyebrow">{formatLessonDate(l.date)}</p>
                <h2 className="mt-1 text-[17px] font-semibold">{l.theme.trim() || "Sem tema"}</h2>
                {preview && (
                  <p className="reading mt-1 line-clamp-3 text-muted-foreground">{preview}</p>
                )}
                {(open > 0 || l._unsynced) && (
                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                    {open > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-primary">
                        {open === 1 ? "1 dúvida aberta" : `${open} dúvidas abertas`}
                      </span>
                    )}
                    {l._unsynced && <span>guardada no aparelho</span>}
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
