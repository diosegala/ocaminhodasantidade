import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Sunrise } from "lucide-react";
import { stripAccents } from "@/features/biblia/reference";
import { Chip, EmptyState, ScreenHeader } from "@/components/app/ui";
import { lectioEntriesQueryOptions } from "./queries";

type Filter = "todas" | "escritas" | "andamento";

const FIELDS = ["reading_mark", "meditation", "prayer", "contemplation"] as const;

/** Lectios dos dias anteriores, por mês, com busca no que foi escrito. */
export function LectiosList() {
  const entries = useQuery(lectioEntriesQueryOptions);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");

  const all = useMemo(() => entries.data ?? [], [entries.data]);
  const term = stripAccents(search);
  const items = all.filter((e) => {
    const written = FIELDS.some((f) => e[f]?.trim());
    if (filter === "escritas" && !written) return false;
    if (filter === "andamento" && e.completed_at) return false;
    if (!term) return true;
    return stripAccents([e.reference, ...FIELDS.map((f) => e[f])].join(" ")).includes(term);
  });

  // Agrupa por mês ("outubro de 2026"), mantendo a ordem do mais recente.
  const months = useMemo(() => {
    const groups: { label: string; items: typeof items }[] = [];
    for (const e of items) {
      const label = new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      const last = groups.at(-1);
      if (last?.label === label) last.items.push(e);
      else groups.push({ label, items: [e] });
    }
    return groups;
  }, [items]);

  return (
    <section>
      <ScreenHeader
        title="Minhas lectios"
        subtitle={all.length ? `${all.filter((e) => e.completed_at).length} concluídas` : undefined}
        back={{ label: "Voltar", to: "/" }}
      />

      {all.length > 0 && (
        <>
          <label className="flex h-11 items-center gap-2 rounded-xl bg-secondary px-3">
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no que você escreveu"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
            <Chip active={filter === "todas"} onClick={() => setFilter("todas")}>
              Todas
            </Chip>
            <Chip active={filter === "escritas"} onClick={() => setFilter("escritas")}>
              <span className="whitespace-nowrap">Com anotações</span>
            </Chip>
            <Chip active={filter === "andamento"} onClick={() => setFilter("andamento")}>
              <span className="whitespace-nowrap">Em andamento</span>
            </Chip>
          </div>
        </>
      )}

      {entries.isLoading && <p className="mt-6 text-muted-foreground">Carregando…</p>}

      {entries.isSuccess && all.length === 0 && (
        <EmptyState icon={Sunrise} title="Nenhuma lectio ainda">
          Cada lectio que você fizer fica guardada aqui, com as suas anotações, para reler quando
          quiser.
        </EmptyState>
      )}
      {all.length > 0 && items.length === 0 && (
        <p className="mt-6 px-1 text-[15px] text-muted-foreground">Nada encontrado.</p>
      )}

      {months.map((m) => (
        <section key={m.label} className="mt-6">
          <h2 className="eyebrow mb-2 px-4 first-letter:uppercase">{m.label}</h2>
          <ul className="space-y-3">
            {m.items.map((e) => {
              const note = e.meditation?.trim() || e.contemplation?.trim() || e.prayer?.trim();
              return (
                <li key={e.date}>
                  <Link
                    to="/lectio"
                    search={{ date: e.date }}
                    className="pressable block rounded-[20px] bg-card p-5 shadow-card"
                  >
                    <p className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
                      <span className="first-letter:uppercase">
                        {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "numeric",
                        })}
                      </span>
                      {!e.completed_at && (
                        <span className="rounded-full bg-secondary px-2 py-0.5">em andamento</span>
                      )}
                    </p>
                    <h3 className="mt-1 text-[17px] font-semibold">
                      {e.reference ?? "Leitura do dia"}
                    </h3>
                    {e.reading_mark?.trim() && (
                      <p className="reading mt-2 line-clamp-2 border-l-2 border-primary/40 pl-3 italic">
                        {e.reading_mark}
                      </p>
                    )}
                    {note && (
                      <p className="reading mt-2 line-clamp-3 text-muted-foreground">{note}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}
