import { createFileRoute } from "@tanstack/react-router";
import { LectioScreen } from "@/features/lectio/LectioScreen";
import { localToday } from "@/features/lectio/liturgy";

export const Route = createFileRoute("/_authenticated/lectio")({
  validateSearch: (s: Record<string, unknown>): { date?: string; step?: number } => {
    const out: { date?: string; step?: number } = {};
    if (typeof s["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s["date"]))
      out.date = s["date"];
    const step = Number(s["step"]);
    if (Number.isInteger(step) && step >= 0 && step <= 3) out.step = step;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Lectio divina — Caminho" },
      {
        name: "description",
        content: "Leitura, meditação, oração e contemplação do texto do dia.",
      },
      { property: "og:title", content: "Lectio divina — Caminho" },
      {
        property: "og:description",
        content: "Leitura, meditação, oração e contemplação do texto do dia.",
      },
    ],
  }),
  component: LectioPage,
});

function LectioPage() {
  const { date, step } = Route.useSearch();
  const d = date ?? localToday();
  return <LectioScreen key={`${d}-${step ?? ""}`} date={d} initialStep={step} />;
}
