import { createFileRoute } from "@tanstack/react-router";
import { MarksScreen } from "@/features/biblia/MarksScreen";

export const Route = createFileRoute("/_authenticated/biblia/destaques")({
  head: () => ({
    meta: [
      { title: "Destaques e notas — Caminho" },
      { name: "description", content: "Todos os versículos que você destacou ou anotou." },
      { property: "og:title", content: "Destaques e notas — Caminho" },
      { property: "og:description", content: "Todos os versículos que você destacou ou anotou." },
    ],
  }),
  component: MarksScreen,
});
