import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PERSIST_MAX_AGE } from "./lib/query-persister";

export const getRouter = () => {
  // gcTime alinhado ao tempo em que o cache fica guardado no aparelho (ver query-persister).
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: PERSIST_MAX_AGE } } });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // No Caminho, o tabuleiro rola sozinho até o dia de hoje; o roteador não mexe.
    scrollRestoration: ({ location }) => location.pathname !== "/caminho",
    defaultPreloadStaleTime: 0,
    defaultViewTransition: true,
  });

  return router;
};
