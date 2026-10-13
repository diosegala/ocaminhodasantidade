import { createFileRoute, redirect } from "@tanstack/react-router";

// O histórico virou o tabuleiro do ano em /caminho; este endereço continua valendo.
export const Route = createFileRoute("/_authenticated/historico")({
  beforeLoad: () => {
    throw redirect({ to: "/caminho", replace: true });
  },
});
