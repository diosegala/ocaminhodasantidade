import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeStreak, localToday } from "@/features/lectio/liturgy";
import { useLiturgy } from "@/features/lectio/LectioScreen";
import { lectioHistoryQueryOptions } from "@/features/lectio/queries";
import { stripAccents } from "@/features/biblia/reference";
import { Card, ListGroup, Row, rowClass, ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";

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

// Classes escritas por extenso para o Tailwind encontrá-las.
const LIT_COLORS: Record<string, string> = {
  verde: "bg-lit-verde",
  roxo: "bg-lit-roxo",
  branco: "bg-lit-branco",
  vermelho: "bg-lit-vermelho",
  rosa: "bg-lit-rosa",
};

function litColor(cor: string | undefined) {
  return LIT_COLORS[stripAccents(cor ?? "").split(/\s/)[0] ?? ""] ?? "bg-primary";
}

function Hoje() {
  const date = localToday();
  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const lit = useLiturgy(date);
  const history = useQuery(lectioHistoryQueryOptions);
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
  const done = !!entry.data?.completed_at;
  const doneDates = (history.data ?? []).filter((e) => e.completed_at).map((e) => e.date);
  const streak = computeStreak(doneDates, date);

  return (
    <section>
      <ScreenHeader title="Hoje" subtitle={todayLabel} />

      <Card className="relative overflow-hidden pt-6">
        <span className={`absolute inset-x-0 top-0 h-1.5 ${litColor(liturgy?.cor)}`} aria-hidden />
        {lit.isLoading ? (
          <p className="reading text-muted-foreground">Buscando a liturgia do dia…</p>
        ) : liturgy ? (
          <>
            <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${litColor(liturgy.cor)}`}
                aria-hidden
              />
              <span className="line-clamp-2">{liturgy.liturgia}</span>
            </p>
            {gospel && (
              <>
                <p className="eyebrow mt-5">Evangelho · {gospel.referencia}</p>
                <p className="reading mt-2 line-clamp-5">{gospel.texto}</p>
              </>
            )}
            <ul className="mt-5 space-y-1 border-t pt-4 text-[15px]">
              {liturgy.readings
                .filter((r) => r.kind !== "evangelho")
                .map((r) => (
                  <li key={r.kind} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span>{r.referencia}</span>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <p className="reading text-muted-foreground">
            Não consegui buscar a liturgia de hoje. Você ainda pode fazer a lectio escolhendo um
            trecho da Bíblia.
          </p>
        )}
      </Card>

      <Button asChild size="lg" className="mt-5">
        <Link to="/lectio">
          {done
            ? "Rever a lectio de hoje"
            : entry.data
              ? "Continuar a lectio de hoje"
              : "Fazer a lectio de hoje"}
        </Link>
      </Button>

      <ListGroup className="mt-6">
        <Link to="/historico" className={rowClass}>
          <Row
            icon={Flame}
            title="Histórico"
            detail={
              streak === 0
                ? "comece hoje"
                : `${streak} ${streak === 1 ? "dia seguido" : "dias seguidos"}`
            }
            chevron
          />
        </Link>
      </ListGroup>
    </section>
  );
}
