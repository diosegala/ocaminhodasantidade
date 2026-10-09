import { createFileRoute } from "@tanstack/react-router";
import { ReflectionsList } from "@/features/reflexoes/ReflectionsList";

export const Route = createFileRoute("/_authenticated/reflexoes/")({
  head: () => ({
    meta: [
      { title: "Reflexões — Caminho" },
      { name: "description", content: "Suas reflexões ligadas à Palavra." },
      { property: "og:title", content: "Reflexões — Caminho" },
      { property: "og:description", content: "Suas reflexões ligadas à Palavra." },
    ],
  }),
  component: ReflectionsList,
});
