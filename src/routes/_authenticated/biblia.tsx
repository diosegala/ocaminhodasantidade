import { createFileRoute } from "@tanstack/react-router";
import { EmptyPage } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/biblia")({
  head: () => ({
    meta: [
      { title: "Bíblia — Caminho" },
      { name: "description", content: "A Bíblia Ave-Maria, com destaques e notas." },
      { property: "og:title", content: "Bíblia — Caminho" },
      { property: "og:description", content: "A Bíblia Ave-Maria, com destaques e notas." },
    ],
  }),
  component: () => (
    <EmptyPage title="Bíblia" intro="O texto da Bíblia ainda vai ser carregado. Depois você poderá ler, buscar e anotar cada versículo." />
  ),
});
