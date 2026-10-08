import { createFileRoute } from "@tanstack/react-router";
import { EmptyPage } from "@/components/app/AppShell";

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
    <EmptyPage title="Aulas" intro="Nenhuma aula ainda. Logo você poderá registrar cada encontro, com transcrição, fotos e dúvidas." />
  ),
});
