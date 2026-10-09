import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { NotebookPen, Plus, Search } from "lucide-react";
import { stripAccents } from "@/features/biblia/reference";
import { Chip, EmptyState, ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import {
  reflectionsQueryOptions,
  reflectionTaggingsQueryOptions,
  tagsQueryOptions,
} from "./queries";

export function ReflectionsList() {
  const navigate = useNavigate();
  const reflections = useQuery(reflectionsQueryOptions);
  const tags = useQuery(tagsQueryOptions);
  const taggings = useQuery(reflectionTaggingsQueryOptions);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Temas de cada reflexão, por id.
  const tagsBySource = useMemo(() => {
    const names = new Map((tags.data ?? []).map((t) => [t.id, t.name]));
    const map = new Map<string, { id: string; name: string }[]>();
    for (const tg of taggings.data ?? []) {
      const name = names.get(tg.tag_id);
      if (!name) continue;
      map.set(tg.source_id, [...(map.get(tg.source_id) ?? []), { id: tg.tag_id, name }]);
    }
    return map;
  }, [tags.data, taggings.data]);

  const usedTags = useMemo(() => {
    const used = new Set((taggings.data ?? []).map((t) => t.tag_id));
    return (tags.data ?? []).filter((t) => used.has(t.id));
  }, [tags.data, taggings.data]);

  const all = reflections.data ?? [];
  const term = stripAccents(search);
  const items = all.filter((r) => {
    if (tagFilter && !tagsBySource.get(r.id)?.some((t) => t.id === tagFilter)) return false;
    return !term || stripAccents(`${r.title} ${r.body}`).includes(term);
  });

  function newReflection() {
    navigate({ to: "/reflexoes/$id", params: { id: crypto.randomUUID() } });
  }

  return (
    <section>
      <ScreenHeader title="Reflexões" />

      <Button size="lg" onClick={newReflection}>
        <Plus /> Nova reflexão
      </Button>

      {all.length > 0 && (
        <label className="mt-5 flex h-11 items-center gap-2 rounded-xl bg-secondary px-3">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nas reflexões"
            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </label>
      )}

      {usedTags.length > 0 && (
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip active={tagFilter === null} onClick={() => setTagFilter(null)}>
            Todas
          </Chip>
          {usedTags.map((t) => (
            <Chip key={t.id} active={tagFilter === t.id} onClick={() => setTagFilter(t.id)}>
              <span className="whitespace-nowrap">{t.name}</span>
            </Chip>
          ))}
        </div>
      )}

      {reflections.isLoading && <p className="mt-6 text-muted-foreground">Carregando…</p>}

      {reflections.isSuccess && all.length === 0 && (
        <EmptyState icon={NotebookPen} title="Nenhuma reflexão ainda">
          Escreva o que a Palavra, a oração ou a catequese despertaram em você, e ligue aos
          versículos.
        </EmptyState>
      )}
      {all.length > 0 && items.length === 0 && (
        <p className="mt-6 px-1 text-[15px] text-muted-foreground">Nada encontrado.</p>
      )}

      <ul className="mt-5 space-y-3">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              to="/reflexoes/$id"
              params={{ id: r.id }}
              className="pressable block rounded-[20px] bg-card p-5 shadow-card"
            >
              <h2 className="text-[17px] font-semibold">{r.title.trim() || "Sem título"}</h2>
              {r.body.trim() && (
                <p className="reading mt-1 line-clamp-3 text-muted-foreground">{r.body}</p>
              )}
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                <span>
                  {new Date(r.updated_at).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                {r._unsynced && <span>· guardada no aparelho</span>}
                {tagsBySource.get(r.id)?.map((t) => (
                  <span key={t.id} className="rounded-full bg-accent px-2 py-0.5 text-primary">
                    {t.name}
                  </span>
                ))}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
