import { createFileRoute } from "@tanstack/react-router";
import { LessonEditor } from "@/features/aulas/LessonEditor";

export const Route = createFileRoute("/_authenticated/aulas/$id")({
  head: () => ({
    meta: [
      { title: "Aula — Caminho" },
      { name: "description", content: "Anotações, fotos e dúvidas de um encontro de catequese." },
      { property: "og:title", content: "Aula — Caminho" },
      {
        property: "og:description",
        content: "Anotações, fotos e dúvidas de um encontro de catequese.",
      },
    ],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { id } = Route.useParams();
  return <LessonEditor key={id} id={id} />;
}
