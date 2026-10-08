import { createFileRoute } from "@tanstack/react-router";
import { EmptyPage } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/reflexoes")({
  head: () => ({
    meta: [
      { title: "Reflexões — Caminho" },
      { name: "description", content: "Suas reflexões ligadas à Palavra." },
      { property: "og:title", content: "Reflexões — Caminho" },
      { property: "og:description", content: "Suas reflexões ligadas à Palavra." },
    ],
  }),
  component: () => (
    <EmptyPage title="Reflexões" intro="Nenhuma reflexão ainda. Aqui ficarão suas notas, ligadas aos versículos e às aulas." />
  ),
});
