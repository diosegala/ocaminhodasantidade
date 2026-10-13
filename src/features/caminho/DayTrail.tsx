import { Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Flag,
  HandHeart,
  Lightbulb,
  Mountain,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LIT_CLASSES, type LitColor } from "./liturgical-calendar";

type LectioToday = {
  reading_mark: string | null;
  meditation: string | null;
  prayer: string | null;
  contemplation: string | null;
  completed_at: string | null;
  steps_done?: number | null;
} | null;

type Station = { title: string; hint: string; icon: LucideIcon; optional?: boolean };

const STATIONS: Station[] = [
  { title: "Leitura", hint: "Leia o Evangelho com calma", icon: BookOpen },
  { title: "Meditação", hint: "O que o texto me diz?", icon: Lightbulb },
  { title: "Oração", hint: "O que eu digo a Deus?", icon: HandHeart },
  { title: "Contemplação", hint: "O que vou ser e fazer?", icon: Mountain },
  { title: "Concluir", hint: "Encerre a lectio de hoje", icon: Flag },
  { title: "Reflexão", hint: "Opcional: escreva o que ficou", icon: PenLine, optional: true },
];

const FIELDS = ["reading_mark", "meditation", "prayer", "contemplation"] as const;

// Geometria da trilha: estações em zigue-zague, como casas de um tabuleiro.
const WIDTH = 320;
const GAP = 96;
const XS = [160, 250, 160, 70, 160, 250];
const R = 30;

/** Quais estações já foram percorridas hoje. */
export function stationsDone(entry: LectioToday, reflectedToday: boolean): boolean[] {
  const filled = FIELDS.map((f) => !!entry?.[f]?.trim());
  const completed = !!entry?.completed_at;
  const steps = entry?.steps_done ?? 0;
  // Um passo conta como feito se foi rezado (mesmo sem escrever) ou se ele, ou algum
  // passo seguinte, já tem texto.
  const lectio = FIELDS.map((_, i) => completed || i < steps || filled.slice(i).some(Boolean));
  return [...lectio, completed, reflectedToday];
}

export function DayTrail({
  entry,
  todayReflectionId,
  color,
}: {
  entry: LectioToday;
  todayReflectionId: string | null;
  color: LitColor;
}) {
  const navigate = useNavigate();
  const lit = LIT_CLASSES[color];
  const onLit = color === "branco" ? "text-foreground" : "text-white";
  const done = stationsDone(entry, !!todayReflectionId);
  const current = done.findIndex((d) => !d);
  const height = GAP * STATIONS.length;
  const points = STATIONS.map((_, i) => ({ x: XS[i]!, y: GAP / 2 + i * GAP }));

  function open(i: number) {
    if (i <= 3) navigate({ to: "/lectio", search: { step: i } });
    else if (i === 4) navigate({ to: "/lectio", search: done[4] ? {} : { step: 3 } });
    else if (todayReflectionId)
      navigate({ to: "/reflexoes/$id", params: { id: todayReflectionId } });
    else navigate({ to: "/reflexoes/$id", params: { id: crypto.randomUUID() } });
  }

  return (
    <div>
      <div className="relative mx-auto w-[320px] max-w-full" style={{ height }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {points.slice(1).map((p, i) => {
            const a = points[i]!;
            const walked = done[i] && done[i + 1];
            return (
              <path
                key={i}
                d={`M ${a.x} ${a.y} C ${a.x} ${a.y + GAP / 2}, ${p.x} ${p.y - GAP / 2}, ${p.x} ${p.y}`}
                fill="none"
                strokeWidth={walked ? 6 : 4}
                strokeLinecap="round"
                strokeDasharray={walked ? undefined : "1 12"}
                className={walked ? lit.stroke : "stroke-border"}
              />
            );
          })}
        </svg>

        {STATIONS.map((s, i) => {
          const p = points[i]!;
          const isDone = done[i];
          const isCurrent = i === current;
          const labelLeft = p.x > WIDTH / 2;
          const Icon = s.icon;
          return (
            <div key={s.title}>
              <button
                onClick={() => open(i)}
                aria-label={`${s.title}${isDone ? " (feito)" : ""}`}
                className={cn(
                  "pressable absolute flex items-center justify-center rounded-full shadow-card",
                  isDone && [lit.bg, onLit],
                  isCurrent && ["bg-card ring-4", lit.ring, lit.text],
                  !isDone && !isCurrent && "bg-secondary text-muted-foreground",
                  s.optional &&
                    !isDone &&
                    !isCurrent &&
                    "border-2 border-dashed border-border bg-transparent",
                )}
                style={{ left: p.x - R, top: p.y - R, width: R * 2, height: R * 2 }}
              >
                {isCurrent && (
                  <span
                    className={cn("absolute inset-0 animate-ping rounded-full opacity-25", lit.bg)}
                    aria-hidden
                  />
                )}
                <Icon className="relative h-6 w-6" strokeWidth={2} />
              </button>
              <div
                className={cn("absolute w-[110px]", labelLeft ? "text-right" : "text-left")}
                style={{
                  top: p.y - 22,
                  ...(labelLeft ? { right: WIDTH - p.x + R + 12 } : { left: p.x + R + 12 }),
                }}
              >
                <p
                  className={cn(
                    "text-[15px] font-semibold leading-tight",
                    !isDone && !isCurrent && "text-muted-foreground",
                  )}
                >
                  {s.title}
                </p>
                <p className="text-[12px] leading-snug text-muted-foreground">{s.hint}</p>
                {isCurrent && (
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                      lit.bg,
                      onLit,
                    )}
                  >
                    {i === 0 && !entry ? "Começar" : "Continuar"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {done[4] && (
        <p className="reading mt-2 text-center text-muted-foreground">
          Caminho de hoje percorrido.{" "}
          <Link to="/lectio" className="text-primary">
            Rever a lectio
          </Link>
        </p>
      )}
    </div>
  );
}
