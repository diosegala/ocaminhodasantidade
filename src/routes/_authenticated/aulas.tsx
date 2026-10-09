import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { EmptyState, ScreenHeader } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/aulas")({
  head: () => ({
    meta: [
      { title: "Aulas — Caminho" },
      { name: "description", content: "Suas aulas de catequese organizadas." },
      { property: "og:title", content: "Aulas — Caminho" },
      { property: "og:description", content: "Suas aulas de catequese organizadas." },
    ],
  }),
  component: () => (
    <section>
      <ScreenHeader title="Aulas" />
      <EmptyState icon={GraduationCap} title="Nenhuma aula ainda">
        Logo você poderá registrar cada encontro, com transcrição, fotos e dúvidas.
      </EmptyState>
    </section>
  ),
});
