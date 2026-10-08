import { createFileRoute } from "@tanstack/react-router";
import { LectioScreen } from "@/features/lectio/LectioScreen";
import { localToday } from "@/features/lectio/liturgy";

export const Route = createFileRoute("/_authenticated/lectio")({
  validateSearch: (s: Record<string, unknown>): { date?: string } =>
    typeof s["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s["date"]) ? { date: s["date"] } : {},
  head: () => ({
    meta: [
      { title: "Lectio divina — Caminho" },
      { name: "description", content: "Leitura, meditação, oração e contemplação do texto do dia." },
      { property: "og:title", content: "Lectio divina — Caminho" },
      { property: "og:description", content: "Leitura, meditação, oração e contemplação do texto do dia." },
    ],
  }),
  component: LectioPage,
});

function LectioPage() {
  const { date } = Route.useSearch();
  const d = date ?? localToday();
  return <LectioScreen key={d} date={d} />;
}
