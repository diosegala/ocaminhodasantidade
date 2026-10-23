import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  addDays,
  daysBetween,
  LIT_CLASSES,
  weekday,
  type LiturgicalYear,
  type LitColor,
} from "./liturgical-calendar";

// Geometria (unidades do viewBox; o SVG escala para a largura da tela).
const W = 350;
const MARGIN = 40;
const COL = (W - 2 * MARGIN) / 6;
const HEADER = 26;
const CAPTION = 16;
const ROW_GAP = 34;

type Status = "done" | "started" | "missed" | "today" | "future";

type Cell = {
  date: string;
  x: number;
  y: number;
  color: LitColor;
  status: Status;
  sunday: boolean;
  feast: string | null;
  milestone: boolean;
};

type Label = {
  y: number;
  text: string;
  color?: LitColor;
  kind: "season" | "feast";
  /** Lado do texto: o oposto da curva que liga as duas linhas, para não cruzar a trilha. */
  side: "left" | "right";
};

/** A curva depois da linha `r` fica à direita nas linhas pares e à esquerda nas ímpares. */
const freeSide = (r: number): "left" | "right" => (r % 2 === 0 ? "left" : "right");

function shortDate(date: string) {
  return `${date.slice(8)}/${date.slice(5, 7)}`;
}

/** Posições das casas: semanas em linhas que alternam o sentido, como num tabuleiro. */
function layout(
  year: LiturgicalYear,
  today: string,
  done: Set<string>,
  started: Set<string>,
  milestoneDates: Set<string>,
) {
  const cells: Cell[] = [];
  const labels: Label[] = [];
  const feastByDate = new Map(year.feasts.map((f) => [f.date, f.name]));
  const total = daysBetween(year.start, year.end) + 1;
  const rows = Math.ceil(total / 7);
  let y = 8;

  for (let r = 0; r < rows; r++) {
    const days = Array.from({ length: 7 }, (_, c) => addDays(year.start, r * 7 + c)).filter(
      (d) => d <= year.end,
    );
    const starting = year.seasons.filter((s) => days.includes(s.start));
    for (const s of starting) {
      labels.push({
        y: y + 16,
        text:
          s.start === days[0]
            ? s.name.toUpperCase()
            : `${s.name.toUpperCase()} · ${shortDate(s.start)}`,
        color: s.color,
        kind: "season",
        side: r === 0 ? "left" : freeSide(r - 1),
      });
      y += HEADER;
    }
    const nodeY = y + 14;
    for (const date of days) {
      const col = weekday(date);
      const season = year.seasons.find((s) => date >= s.start && date <= s.end)!;
      const status: Status = done.has(date)
        ? "done"
        : started.has(date)
          ? "started"
          : date === today
            ? "today"
            : date < today
              ? "missed"
              : "future";
      cells.push({
        date,
        x: MARGIN + (r % 2 === 0 ? col : 6 - col) * COL,
        y: nodeY,
        color: year.roseSundays.includes(date) ? "rosa" : season.color,
        status,
        sunday: col === 0,
        feast: feastByDate.get(date) ?? null,
        milestone: milestoneDates.has(date),
      });
    }
    y = nodeY + 22;
    for (const date of days) {
      const feast = feastByDate.get(date);
      if (!feast) continue;
      labels.push({
        y: y + 4,
        text: `★ ${shortDate(date)} · ${feast}`,
        kind: "feast",
        side: freeSide(r),
      });
      y += CAPTION;
    }
    y += ROW_GAP;
  }
  return { cells, labels, height: y };
}

export function YearBoard({
  year,
  today,
  entries,
  milestoneDates,
  onOpen,
}: {
  year: LiturgicalYear;
  today: string;
  entries: { date: string; completed_at: string | null }[];
  milestoneDates: Set<string>;
  onOpen: (date: string) => void;
}) {
  const { cells, labels, height } = useMemo(() => {
    const done = new Set(entries.filter((e) => e.completed_at).map((e) => e.date));
    const started = new Set(entries.filter((e) => !e.completed_at).map((e) => e.date));
    return layout(year, today, done, started, milestoneDates);
  }, [year, today, entries, milestoneDates]);

  const todayRef = useRef<SVGGElement>(null);
  // Abre no dia de hoje, no meio da tela. (No iPhone, scrollIntoView em SVG não é confiável.)
  useEffect(() => {
    const el = todayRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2 });
  }, []);

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="w-full select-none"
      role="img"
      aria-label="Tabuleiro do ano litúrgico"
    >
      {/* Trilha: cheia onde foi percorrida, clara no passado sem lectio, pontilhada no futuro. */}
      {cells.slice(1).map((b, i) => {
        const a = cells[i]!;
        const walked =
          (a.status === "done" || a.status === "started") &&
          (b.status === "done" || b.status === "started");
        const future = b.date > today;
        const dir = a.x > W / 2 ? 1 : -1;
        const d =
          a.y === b.y
            ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
            : `M ${a.x} ${a.y} C ${a.x + dir * 34} ${a.y}, ${b.x + dir * 34} ${b.y}, ${b.x} ${b.y}`;
        return (
          <path
            key={b.date}
            d={d}
            fill="none"
            strokeLinecap="round"
            strokeWidth={walked ? 5 : 3}
            strokeDasharray={future ? "1 7" : undefined}
            opacity={walked ? 1 : future ? 0.5 : 0.3}
            className={future ? "stroke-border" : LIT_CLASSES[b.color].stroke}
          />
        );
      })}

      {labels.map((l, i) => (
        <text
          key={i}
          x={l.side === "left" ? 12 : W - 12}
          textAnchor={l.side === "left" ? "start" : "end"}
          y={l.y}
          className={cn(
            l.kind === "season" ? "text-[12px] font-bold tracking-wider" : "text-[11px]",
            l.kind === "season" && l.color ? LIT_CLASSES[l.color].fill : "fill-muted-foreground",
          )}
        >
          {l.text}
        </text>
      ))}

      {cells.map((c) => {
        const r = c.sunday ? 10 : 8;
        const lit = LIT_CLASSES[c.color];
        const tappable = c.date <= today;
        return (
          <g
            key={c.date}
            ref={c.date === today ? todayRef : undefined}
            onClick={tappable ? () => onOpen(c.date) : undefined}
            className={tappable ? "cursor-pointer" : undefined}
            role={tappable ? "button" : undefined}
            aria-label={tappable ? `Abrir a lectio de ${shortDate(c.date)}` : undefined}
          >
            <circle cx={c.x} cy={c.y} r={18} fill="transparent" />
            {c.date === today && (
              <circle
                cx={c.x}
                cy={c.y}
                r={16}
                fill="none"
                strokeWidth={2.5}
                className="animate-pulse stroke-primary"
              />
            )}
            {c.status === "done" && (
              <circle
                cx={c.x}
                cy={c.y}
                r={r}
                strokeWidth={2}
                className={cn(lit.fill, "stroke-background")}
              />
            )}
            {c.status === "started" && (
              <circle
                cx={c.x}
                cy={c.y}
                r={r - 1}
                strokeWidth={3}
                className={cn("fill-card", lit.stroke)}
              />
            )}
            {c.status === "today" && (
              <circle
                cx={c.x}
                cy={c.y}
                r={r}
                strokeWidth={2}
                className="fill-card stroke-primary"
              />
            )}
            {c.status === "missed" && (
              <circle cx={c.x} cy={c.y} r={c.sunday ? 5 : 4} className="fill-border" />
            )}
            {c.status === "future" && (
              <circle
                cx={c.x}
                cy={c.y}
                r={c.sunday ? 5 : 4}
                opacity={0.6}
                className="fill-border"
              />
            )}
            {c.feast && (
              <text
                x={c.x}
                y={c.y - 13}
                textAnchor="middle"
                className="fill-lit-branco text-[11px]"
              >
                ★
              </text>
            )}
            {c.milestone && (
              <text
                x={c.x + 9}
                y={c.y - 9}
                textAnchor="middle"
                className="fill-primary text-[12px] font-bold"
              >
                ⚑
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
