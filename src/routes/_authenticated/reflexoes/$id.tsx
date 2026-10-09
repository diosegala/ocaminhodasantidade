import { createFileRoute } from "@tanstack/react-router";
import { ReflectionEditor } from "@/features/reflexoes/ReflectionEditor";

export const Route = createFileRoute("/_authenticated/reflexoes/$id")({
  head: () => ({
    meta: [
      { title: "Reflexão — Caminho" },
      { name: "description", content: "Escreva e ligue sua reflexão aos versículos." },
      { property: "og:title", content: "Reflexão — Caminho" },
      { property: "og:description", content: "Escreva e ligue sua reflexão aos versículos." },
    ],
  }),
  component: ReflectionPage,
});

function ReflectionPage() {
  const { id } = Route.useParams();
  return <ReflectionEditor key={id} id={id} />;
}
