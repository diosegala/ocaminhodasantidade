import { createFileRoute } from "@tanstack/react-router";
import { CatechismScreen } from "@/features/catecismo/CatechismScreen";

export const Route = createFileRoute("/_authenticated/biblia/catecismo")({
  validateSearch: (s: Record<string, unknown>): { n?: number; c?: number } => {
    const out: { n?: number; c?: number } = {};
    const n = Number(s["n"]);
    if (Number.isInteger(n) && n >= 1 && n <= 2865) out.n = n;
    const c = Number(s["c"]);
    if (Number.isInteger(c) && c >= 0 && c < 100) out.c = c;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Catecismo — Caminho" },
      { name: "description", content: "O Catecismo da Igreja Católica para estudo." },
      { property: "og:title", content: "Catecismo — Caminho" },
      { property: "og:description", content: "O Catecismo da Igreja Católica para estudo." },
    ],
  }),
  component: CatecismoPage,
});

function CatecismoPage() {
  const { n, c } = Route.useSearch();
  return <CatechismScreen key={`${n ?? ""}-${c ?? ""}`} n={n} c={c} />;
}
