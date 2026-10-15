import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Flame, Route as RouteIcon, Smartphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeStreak, localToday } from "@/features/lectio/liturgy";
import { useLiturgy } from "@/features/lectio/LectioScreen";
import { lectioHistoryQueryOptions } from "@/features/lectio/queries";
import { reflectionsQueryOptions } from "@/features/reflexoes/queries";
import { DayTrail } from "@/features/caminho/DayTrail";
import { InstallApp } from "@/components/app/InstallApp";
import { Button } from "@/components/ui/button";
import {
  computeMilestones,
  markSeen,
  nextCelebration,
  type Milestone,
} from "@/features/caminho/milestones";
import { MilestoneSheet } from "@/features/caminho/MilestoneSheet";
import {
  daysBetween,
  LIT_CLASSES,
  parseLitColor,
  seasonOf,
} from "@/features/caminho/liturgical-calendar";
import { Card, ListGroup, Row, rowClass, ScreenHeader } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Hoje — Caminho" },
      { name: "description", content: "A leitura do dia e a sua lectio divina." },
      { property: "og:title", content: "Hoje — Caminho" },
      { property: "og:description", content: "A leitura do dia e a sua lectio divina." },
    ],
  }),
  component: Hoje,
});

function Hoje() {
  const date = localToday();
  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const lit = useLiturgy(date);
  const history = useQuery(lectioHistoryQueryOptions);
  const reflections = useQuery(reflectionsQueryOptions);
  const entry = useQuery({
    queryKey: ["lectio", date],
    queryFn: async () => {
      const { data } = await supabase
        .from("lectio_entries")
        .select("*")
        .eq("date", date)
        .maybeSingle();
      return data;
    },
  });
  const liturgy = lit.data?.fromCacheOfDate ? null : lit.data?.liturgy;
  const gospel = liturgy?.readings.find((r) => r.kind === "evangelho");
  const season = seasonOf(date);
  // A cor da API vale para festas e memórias; sem ela, a do calendário.
  const color = parseLitColor(liturgy?.cor) ?? season.dayColor;

  const doneDates = (history.data ?? []).filter((e) => e.completed_at).map((e) => e.date);
  const streak = computeStreak(doneDates, date);
  const seasonDays = daysBetween(season.start, date) + 1;
  const seasonDone = doneDates.filter((d) => d >= season.start && d <= date).length;
  // Celebra um marco recente na primeira vez que a pessoa abre a Hoje depois dele.
  const [celebrate, setCelebrate] = useState<Milestone | null>(null);
  useEffect(() => {
    if (!history.isSuccess) return;
    setCelebrate(nextCelebration(computeMilestones(doneDates, date), date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.isSuccess, history.dataUpdatedAt, date]);

  const todayReflection = (reflections.data ?? []).find(
    (r) => (r.title.trim() || r.body.trim()) && localDate(r.updated_at) === date,
  );

  return (
    <section>
      <ScreenHeader title="Hoje" subtitle={todayLabel} />
      <InstallNotice />

      <Card className="relative overflow-hidden pt-6">
        <span className={`absolute inset-x-0 top-0 h-1.5 ${LIT_CLASSES[color].bg}`} aria-hidden />
        {lit.isLoading ? (
          <p className="reading text-muted-foreground">Buscando a liturgia do dia…</p>
        ) : liturgy ? (
          <>
            <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${LIT_CLASSES[color].bg}`}
                aria-hidden
              />
              <span className="line-clamp-2">{liturgy.liturgia}</span>
            </p>
            {gospel && (
              <>
                <p className="eyebrow mt-4">Evangelho · {gospel.referencia}</p>
                <p className="reading mt-1.5 line-clamp-3">{gospel.texto}</p>
              </>
            )}
          </>
        ) : (
          <p className="reading text-muted-foreground">
            Não consegui buscar a liturgia de hoje. Você ainda pode fazer a lectio escolhendo um
            trecho da Bíblia.
          </p>
        )}
      </Card>

      <h2 className="eyebrow mb-1 mt-8 px-4">Seu caminho de hoje</h2>
      <DayTrail
        entry={entry.data ?? null}
        todayReflectionId={todayReflection?.id ?? null}
        color={color}
      />

      <ListGroup className="mt-6">
        <Link to="/caminho" className={rowClass}>
          <Row
            icon={RouteIcon}
            title={season.name}
            detail={`${seasonDone} de ${seasonDays} ${seasonDays === 1 ? "dia" : "dias"}`}
            chevron
          />
        </Link>
        <Link to="/caminho" className={rowClass}>
          <Row
            icon={Flame}
            title="Dias seguidos"
            detail={streak === 0 ? "o caminho espera por você" : String(streak)}
            chevron
          />
        </Link>
      </ListGroup>

      {celebrate && (
        <MilestoneSheet
          milestone={celebrate}
          onClose={() => {
            markSeen([celebrate.id]);
            setCelebrate(null);
          }}
        />
      )}
    </section>
  );
}

/** Data local (AAAA-MM-DD) de um instante salvo pelo servidor. */
function localDate(timestamp: string) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Aviso na Hoje enquanto o app é usado pelo navegador; some ao instalar ou ao fechar. */
function InstallNotice() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem("aviso-instalar") === "fechado";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  return (
    <InstallApp>
      {(open) => (
        <Card className="relative mb-5 flex items-center gap-3 pr-11">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">Instale o Caminho no celular</p>
            <p className="text-[13px] text-muted-foreground">
              Abre em tela cheia e funciona sem internet.
            </p>
          </div>
          <Button size="sm" className="h-9 rounded-full px-3.5 text-[15px]" onClick={open}>
            Instalar
          </Button>
          <button
            onClick={() => {
              setHidden(true);
              try {
                localStorage.setItem("aviso-instalar", "fechado");
              } catch {
                // sem armazenamento: volta a aparecer na próxima vez
              }
            }}
            aria-label="Fechar aviso"
            className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </Card>
      )}
    </InstallApp>
  );
}
