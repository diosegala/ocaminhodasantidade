import { createFileRoute } from "@tanstack/react-router";
import { LectiosList } from "@/features/lectio/LectiosList";

export const Route = createFileRoute("/_authenticated/lectios")({
  head: () => ({
    meta: [
      { title: "Minhas lectios — Caminho" },
      { name: "description", content: "Suas lectios dos dias anteriores, para reler e buscar." },
      { property: "og:title", content: "Minhas lectios — Caminho" },
      {
        property: "og:description",
        content: "Suas lectios dos dias anteriores, para reler e buscar.",
      },
    ],
  }),
  component: LectiosList,
});
