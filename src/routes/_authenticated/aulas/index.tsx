import { createFileRoute } from "@tanstack/react-router";
import { LessonsList } from "@/features/aulas/LessonsList";

export const Route = createFileRoute("/_authenticated/aulas/")({
  head: () => ({
    meta: [
      { title: "Aulas — Caminho" },
      { name: "description", content: "Suas aulas de catequese organizadas." },
      { property: "og:title", content: "Aulas — Caminho" },
      { property: "og:description", content: "Suas aulas de catequese organizadas." },
    ],
  }),
  component: LessonsList,
});
