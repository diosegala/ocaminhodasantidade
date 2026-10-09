import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { computeStreak, localToday } from "@/features/lectio/liturgy";
import { lectioHistoryQueryOptions } from "@/features/lectio/queries";
import { Card, ListGroup, Row, rowClass, ScreenHeader } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico da lectio — Caminho" },
      { name: "description", content: "Os dias em que você fez a lectio e a sua sequência." },
      { property: "og:title", content: "Histórico da lectio — Caminho" },
      {
        property: "og:description",
        content: "Os dias em que você fez a lectio e a sua sequência.",
      },
    ],
  }),
  component: Historico,
});

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

function Historico() {
  const today = localToday();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return { y: y ?? 2026, m: m ?? 1 };
  });

  const q = useQuery(lectioHistoryQueryOptions);

  const entries = q.data ?? [];
  const done = entries.filter((e) => e.completed_at).map((e) => e.date);
  const doneSet = new Set(done);
  const started = new Set(entries.map((e) => e.date));
  const streak = computeStreak(done, today);

  const first = new Date(cursor.y, cursor.m - 1, 1);
  const days = new Date(cursor.y, cursor.m, 0).getDate();
  const monthLabel = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const iso = (d: number) =>
    `${cursor.y}-${String(cursor.m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const move = (delta: number) =>
    setCursor(({ y, m }) => {
      const n = new Date(y, m - 1 + delta, 1);
      return { y: n.getFullYear(), m: n.getMonth() + 1 };
    });

  return (
    <section>
      <ScreenHeader title="Histórico" back={{ label: "Hoje", to: "/" }} />

      <Card className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <Flame className="h-6 w-6" />
        </span>
        <div>
          <p className="title">{streak === 1 ? "1 dia seguido" : `${streak} dias seguidos`}</p>
          <p className="text-[15px] text-muted-foreground">
            {streak === 0 ? "Hoje é um bom dia para começar." : "Continue no seu caminho."}
          </p>
        </div>
      </Card>

      <Card className="mt-5 px-3">
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => move(-1)}
            aria-label="Mês anterior"
            className="pressable rounded-full p-2 text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-[17px] font-semibold capitalize">{monthLabel}</h2>
          <button
            onClick={() => move(1)}
            aria-label="Próximo mês"
            className="pressable rounded-full p-2 text-primary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
          {WEEK.map((w, i) => (
            <span key={i} className="py-1 text-xs font-medium text-muted-foreground">
              {w}
            </span>
          ))}
          {Array.from({ length: first.getDay() }).map((_, i) => (
            <span key={"e" + i} />
          ))}
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
            const key = iso(d);
            const cls = doneSet.has(key)
              ? "bg-primary font-semibold text-primary-foreground"
              : started.has(key)
                ? "ring-2 ring-inset ring-primary"
                : key === today
                  ? "font-bold text-primary"
                  : "";
            return (
              <span key={key} className="flex justify-center">
                {key > today ? (
                  <span className="flex h-10 w-10 items-center justify-center text-muted-foreground/40">
                    {d}
                  </span>
                ) : (
                  <Link
                    to="/lectio"
                    search={{ date: key }}
                    className={`pressable flex h-10 w-10 items-center justify-center rounded-full ${cls}`}
                  >
                    {d}
                  </Link>
                )}
              </span>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Cheio: lectio concluída · Contorno: começada. Toque num dia para abrir.
        </p>
      </Card>

      {entries.length === 0 ? (
        <p className="reading mt-6 text-muted-foreground">Ainda não há lectios registradas.</p>
      ) : (
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
    </section>
  );
}
