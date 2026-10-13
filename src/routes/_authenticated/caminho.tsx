import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, Flag } from "lucide-react";
import { computeStreak, localToday } from "@/features/lectio/liturgy";
import { lectioHistoryQueryOptions } from "@/features/lectio/queries";
import {
  daysBetween,
  LIT_CLASSES,
  liturgicalYear,
  seasonOf,
} from "@/features/caminho/liturgical-calendar";
import { computeMilestones, type Milestone } from "@/features/caminho/milestones";
import { MilestoneSheet } from "@/features/caminho/MilestoneSheet";
import { YearBoard } from "@/features/caminho/YearBoard";
import { Card, ListGroup, Row, rowClass, ScreenHeader } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/caminho")({
  head: () => ({
    meta: [
      { title: "Seu caminho — Caminho" },
      { name: "description", content: "Seu caminho pelo ano litúrgico, dia a dia." },
      { property: "og:title", content: "Seu caminho — Caminho" },
      { property: "og:description", content: "Seu caminho pelo ano litúrgico, dia a dia." },
    ],
  }),
  component: CaminhoPage,
});

function CaminhoPage() {
  const navigate = useNavigate();
  const today = localToday();
  const history = useQuery(lectioHistoryQueryOptions);
  const [open, setOpen] = useState<Milestone | null>(null);

  const entries = useMemo(() => history.data ?? [], [history.data]);
  const doneDates = useMemo(
    () => entries.filter((e) => e.completed_at).map((e) => e.date),
    [entries],
  );
  const milestones = useMemo(() => computeMilestones(doneDates, today), [doneDates, today]);
  const year = liturgicalYear(today);
  const yearMilestones = milestones.filter((m) => m.date >= year.start);
  const milestoneDates = useMemo(
    () => new Set(yearMilestones.map((m) => m.date)),
    [yearMilestones],
  );

  const season = seasonOf(today);
  const seasonDays = daysBetween(season.start, today) + 1;
  const seasonDone = doneDates.filter((d) => d >= season.start && d <= today).length;
  const streak = computeStreak(doneDates, today);

  return (
    <section>
      <ScreenHeader
        title="Seu caminho"
        subtitle={`Ano litúrgico ${year.start.slice(0, 4)}–${year.end.slice(0, 4)}`}
        back={{ label: "Hoje", to: "/" }}
      />

      <Card>
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <span
            className={`h-2.5 w-2.5 rounded-full ${LIT_CLASSES[season.dayColor].bg}`}
            aria-hidden
          />
          {season.name}
        </p>
        <p className="title mt-1">
          {seasonDone} de {seasonDays} {seasonDays === 1 ? "dia" : "dias"} com lectio
        </p>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {streak === 0
            ? "O caminho espera por você."
            : `${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"}. Continue no seu caminho.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${LIT_CLASSES[season.color].bg}`} /> lectio feita
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`h-3 w-3 rounded-full border-[3px] bg-card ${LIT_CLASSES[season.color].border}`}
            />
            começada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-border" /> sem lectio
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-lit-branco">★</span> festa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-primary">⚑</span> marco
          </span>
        </div>
      </Card>

      <div className="mt-5">
        <YearBoard
          year={year}
          today={today}
          entries={entries}
          milestoneDates={milestoneDates}
          onOpen={(date) => navigate({ to: "/lectio", search: { date } })}
        />
      </div>

      {yearMilestones.length > 0 && (
        <ListGroup title="Marcos" className="mt-6">
          {yearMilestones
            .slice()
            .reverse()
            .map((m) => (
              <button key={m.id} onClick={() => setOpen(m)} className={rowClass}>
                <Row
                  icon={Flag}
                  title={m.title}
                  detail={new Date(m.date + "T12:00:00").toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "short",
                  })}
                />
              </button>
            ))}
        </ListGroup>
      )}

      {entries.length > 0 && (
        <ListGroup title="Lectios" className="mt-6">
          {entries.map((e) => (
            <Link key={e.date} to="/lectio" search={{ date: e.date }} className={rowClass}>
              <Row
                icon={e.completed_at ? Check : undefined}
                title={new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                })}
                detail={e.completed_at ? (e.reference ?? "") : "em andamento"}
                chevron
              />
            </Link>
          ))}
        </ListGroup>
      )}

      {open && <MilestoneSheet milestone={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
