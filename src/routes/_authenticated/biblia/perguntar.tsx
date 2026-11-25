import { createFileRoute } from "@tanstack/react-router";
import { AssistantScreen } from "@/features/assistente/AssistantScreen";

export const Route = createFileRoute("/_authenticated/biblia/perguntar")({
  validateSearch: (s: Record<string, unknown>): { c?: string } =>
    typeof s["c"] === "string" && /^[0-9a-f-]{36}$/i.test(s["c"]) ? { c: s["c"] } : {},
  head: () => ({
    meta: [
      { title: "Perguntar — Caminho" },
      { name: "description", content: "Tire dúvidas com a Bíblia, o Catecismo e as suas aulas." },
      { property: "og:title", content: "Perguntar — Caminho" },
      {
        property: "og:description",
        content: "Tire dúvidas com a Bíblia, o Catecismo e as suas aulas.",
      },
    ],
  }),
  component: PerguntarPage,
});

function PerguntarPage() {
  const { c } = Route.useSearch();
  return <AssistantScreen c={c} />;
}
