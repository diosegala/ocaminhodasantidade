import { createFileRoute } from "@tanstack/react-router";
import { BibliaScreen } from "@/features/biblia/BibliaScreen";

export const Route = createFileRoute("/_authenticated/biblia/")({
  validateSearch: (s: Record<string, unknown>): { ref?: string } =>
    typeof s["ref"] === "string" && s["ref"] ? { ref: s["ref"] } : {},
  head: () => ({
    meta: [
      { title: "Bíblia — Caminho" },
      { name: "description", content: "A Bíblia Ave-Maria, com destaques e notas." },
      { property: "og:title", content: "Bíblia — Caminho" },
      { property: "og:description", content: "A Bíblia Ave-Maria, com destaques e notas." },
    ],
  }),
  component: BibliaPage,
});

function BibliaPage() {
  const { ref } = Route.useSearch();
  return <BibliaScreen key={ref ?? ""} {...(ref ? { initialRef: ref } : {})} />;
}
