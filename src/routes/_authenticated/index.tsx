import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { localToday } from "@/features/lectio/liturgy";
import { useLiturgy } from "@/features/lectio/LectioScreen";

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
  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const lit = useLiturgy(date);
  const entry = useQuery({
    queryKey: ["lectio", date],
    queryFn: async () => {
      const { data } = await supabase.from("lectio_entries").select("*").eq("date", date).maybeSingle();
      return data;
    },
  });
  const liturgy = lit.data?.liturgy;
  const gospel = liturgy?.readings.find((r) => r.kind === "evangelho");
  const done = !!entry.data?.completed_at;

  return (
    <section>
      <h1 className="text-3xl">Hoje</h1>
      <p className="mt-1 text-sm capitalize text-muted-foreground">{todayLabel}</p>

      <div className="mt-5 rounded-2xl border bg-card p-5">
        {lit.isLoading ? (
          <p className="font-serif text-muted-foreground">Buscando a liturgia do dia…</p>
        ) : liturgy && !lit.data?.fromCacheOfDate ? (
          <>
            <p className="text-sm text-muted-foreground">{liturgy.liturgia}{liturgy.cor ? ` · ${liturgy.cor}` : ""}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {liturgy.readings.map((r) => (
                <li key={r.kind}>
                  <span className="text-muted-foreground">{r.label}:</span> {r.referencia}
                </li>
              ))}
            </ul>
            {gospel && (
              <p className="mt-4 line-clamp-4 font-serif text-lg leading-relaxed">{gospel.texto}</p>
            )}
          </>
        ) : (
          <p className="font-serif text-muted-foreground">
            Não consegui buscar a liturgia de hoje. Você ainda pode fazer a lectio escolhendo um trecho da Bíblia.
          </p>
        )}
      </div>

      <Link
        to="/lectio"
        className="mt-5 block w-full rounded-2xl bg-primary px-6 py-5 text-center font-serif text-lg text-primary-foreground"
      >
        {done ? "Rever a lectio de hoje" : entry.data ? "Continuar a lectio de hoje" : "Fazer a lectio de hoje"}
      </Link>
      <Link to="/historico" className="mt-4 block text-center text-primary underline-offset-4 hover:underline">
        Histórico e dias seguidos
      </Link>
    </section>
  );
}
