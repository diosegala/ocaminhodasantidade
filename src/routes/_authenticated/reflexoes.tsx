import { createFileRoute } from "@tanstack/react-router";
import { NotebookPen } from "lucide-react";
import { EmptyState, ScreenHeader } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/reflexoes")({
  head: () => ({
    meta: [
      { title: "Reflexões — Caminho" },
      { name: "description", content: "Suas reflexões ligadas à Palavra." },
      { property: "og:title", content: "Reflexões — Caminho" },
      { property: "og:description", content: "Suas reflexões ligadas à Palavra." },
    ],
  }),
  component: () => (
    <section>
      <ScreenHeader title="Reflexões" />
      <EmptyState icon={NotebookPen} title="Nenhuma reflexão ainda">
        Aqui ficarão suas notas, ligadas aos versículos e às aulas.
      </EmptyState>
    </section>
  ),
});
