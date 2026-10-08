import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeStreak, localToday } from "@/features/lectio/liturgy";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico da lectio — Caminho" },
      { name: "description", content: "Os dias em que você fez a lectio e a sua sequência." },
      { property: "og:title", content: "Histórico da lectio — Caminho" },
      { property: "og:description", content: "Os dias em que você fez a lectio e a sua sequência." },
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

  const q = useQuery({
    queryKey: ["lectio-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectio_entries")
        .select("date, reference, completed_at")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const entries = q.data ?? [];
  const done = entries.filter((e) => e.completed_at).map((e) => e.date);
  const doneSet = new Set(done);
  const started = new Set(entries.map((e) => e.date));
  const streak = computeStreak(done, today);

  const first = new Date(cursor.y, cursor.m - 1, 1);
  const days = new Date(cursor.y, cursor.m, 0).getDate();
  const monthLabel = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const iso = (d: number) => `${cursor.y}-${String(cursor.m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const move = (delta: number) =>
    setCursor(({ y, m }) => {
      const n = new Date(y, m - 1 + delta, 1);
      return { y: n.getFullYear(), m: n.getMonth() + 1 };
    });

  return (
    <section>
      <h1 className="text-3xl">Histórico</h1>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border bg-card p-4">
        <Flame className="h-7 w-7 text-primary" />
        <p className="font-serif text-lg">
          {streak === 0 ? "Nenhum dia seguido agora. Hoje é um bom dia para começar." : `${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"}`}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => move(-1)} aria-label="Mês anterior" className="rounded-full p-2 hover:bg-secondary">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl capitalize">{monthLabel}</h2>
        <button onClick={() => move(1)} aria-label="Próximo mês" className="rounded-full p-2 hover:bg-secondary">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEK.map((w, i) => (
          <span key={i} className="py-1 text-xs text-muted-foreground">{w}</span>
        ))}
        {Array.from({ length: first.getDay() }).map((_, i) => <span key={"e" + i} />)}
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
          const key = iso(d);
          const isDone = doneSet.has(key);
          const future = key > today;
          const cls = isDone
            ? "bg-primary text-primary-foreground"
            : started.has(key)
              ? "border border-primary text-foreground"
              : "text-muted-foreground";
          return future ? (
            <span key={key} className="py-2.5 text-muted-foreground/40">{d}</span>
          ) : (
            <Link key={key} to="/lectio" search={{ date: key }} className={`rounded-full py-2.5 ${cls} ${key === today ? "font-bold" : ""}`}>
              {d}
            </Link>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Cheio: lectio concluída · Contorno: começada. Toque num dia para abrir.</p>

      <h2 className="mt-8 text-xl">Lectios feitas</h2>
      {entries.length === 0 ? (
        <p className="mt-2 font-serif text-muted-foreground">Ainda não há lectios registradas.</p>
      ) : (
        <ul className="mt-2 divide-y rounded-2xl border bg-card">
          {entries.map((e) => (
            <li key={e.date}>
              <Link to="/lectio" search={{ date: e.date }} className="flex justify-between gap-3 px-4 py-3">
                <span>{e.date.split("-").reverse().join("/")}</span>
                <span className="text-muted-foreground">
                  {e.reference ?? ""} {e.completed_at ? "✓" : "· em andamento"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
