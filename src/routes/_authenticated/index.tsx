import { createFileRoute } from "@tanstack/react-router";
import { EmptyPage } from "@/components/app/AppShell";

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
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <EmptyPage title="Hoje" intro="Em breve, aqui estarão a leitura do dia e o caminho para a sua lectio.">
      <p className="mt-6 text-sm capitalize text-muted-foreground">{today}</p>
      <button
        disabled
        className="mt-4 w-full rounded-2xl bg-primary px-6 py-5 font-serif text-lg text-primary-foreground opacity-60"
      >
        Fazer a lectio de hoje
      </button>
    </EmptyPage>
  );
}
