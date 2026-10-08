import { createFileRoute } from "@tanstack/react-router";
import { BibliaScreen } from "@/features/biblia/BibliaScreen";

export const Route = createFileRoute("/_authenticated/biblia")({
  head: () => ({
    meta: [
      { title: "Bíblia — Caminho" },
      { name: "description", content: "A Bíblia Ave-Maria, com destaques e notas." },
      { property: "og:title", content: "Bíblia — Caminho" },
      { property: "og:description", content: "A Bíblia Ave-Maria, com destaques e notas." },
    ],
  }),
  component: BibliaScreen,
});
