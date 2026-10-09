import { Link, useRouter } from "@tanstack/react-router";
import { useIsRestoring, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CloudOff, GraduationCap, NotebookPen, Sunrise } from "lucide-react";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { booksQueryOptions } from "@/features/biblia/queries";
import { syncPending } from "@/lib/sync-pending";

const tabs = [
  { to: "/", label: "Hoje", icon: Sunrise },
  { to: "/aulas", label: "Aulas", icon: GraduationCap },
  { to: "/biblia", label: "Bíblia", icon: BookOpen },
  { to: "/reflexoes", label: "Reflexões", icon: NotebookPen },
] as const;

// Telas carregadas com antecedência, para abrirem mesmo sem internet.
const WARM_ROUTES = [
  "/",
  "/aulas",
  "/biblia",
  "/biblia/destaques",
  "/reflexoes",
  "/lectio",
  "/historico",
  "/conta",
  "/senha",
] as const;

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const online = useOnline();
  const restoring = useIsRestoring();

  // Envia o que foi escrito offline assim que o cache do aparelho é lido e há internet.
  useEffect(() => {
    if (online && !restoring) void syncPending(queryClient);
  }, [online, restoring, queryClient]);

  useEffect(() => {
    if (!online) return;
    const id = window.setTimeout(() => {
      for (const to of WARM_ROUTES) void router.preloadRoute({ to }).catch(() => {});
      // O editor de reflexão tem parâmetro; qualquer id carrega o código da tela.
      void router.preloadRoute({ to: "/reflexoes/$id", params: { id: "_" } }).catch(() => {});
      void queryClient.prefetchQuery(booksQueryOptions);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [online, router, queryClient]);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      {!online && (
        <p className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0.5rem)] z-20 mx-auto flex w-fit items-center gap-2 rounded-full bg-glass px-4 py-1.5 text-sm text-muted-foreground shadow-card backdrop-blur-xl backdrop-saturate-150">
          <CloudOff className="h-4 w-4 shrink-0" /> Sem internet · mostrando o que está no aparelho
        </p>
      )}

      {/* Espaço de baixo: altura da barra flutuante + margem + área do gesto do iPhone. */}
      <main className="flex-1 px-5 pb-[calc(max(env(safe-area-inset-bottom),0.75rem)+6rem)] pt-[max(env(safe-area-inset-top),0.75rem)]">
        {children}
      </main>

      <nav
        style={{ viewTransitionName: "tabbar" }}
        className="fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-10 mx-auto w-[calc(100%-2rem)] max-w-md rounded-full bg-glass p-1.5 shadow-card backdrop-blur-xl backdrop-saturate-150"
      >
        <ul className="flex">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="pressable flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:bg-primary/12 data-[status=active]:font-semibold data-[status=active]:text-primary"
              >
                <Icon className="h-6 w-6" strokeWidth={1.8} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
