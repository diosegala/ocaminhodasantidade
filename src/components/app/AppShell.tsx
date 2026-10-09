import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, CircleUser, CloudOff, GraduationCap, Moon, NotebookPen, Search, Sun, Sunrise } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { booksQueryOptions } from "@/features/biblia/queries";

const tabs = [
  { to: "/", label: "Hoje", icon: Sunrise },
  { to: "/aulas", label: "Aulas", icon: GraduationCap },
  { to: "/biblia", label: "Bíblia", icon: BookOpen },
  { to: "/reflexoes", label: "Reflexões", icon: NotebookPen },
] as const;

// Telas carregadas com antecedência, para abrirem mesmo sem internet.
const WARM_ROUTES = ["/", "/aulas", "/biblia", "/biblia/destaques", "/reflexoes", "/lectio", "/historico", "/conta", "/senha"] as const;

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const online = useOnline();
  const [dark, setDark] = useState(false);

  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  useEffect(() => {
    if (!online) return;
    const id = window.setTimeout(() => {
      for (const to of WARM_ROUTES) void router.preloadRoute({ to }).catch(() => {});
      void queryClient.prefetchQuery(booksQueryOptions);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [online, router, queryClient]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col">
      <header className="sticky top-0 z-10 bg-background/90 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur">
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-full border bg-card px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar em tudo"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button onClick={toggleTheme} aria-label="Mudar tema" className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link
            to="/conta"
            aria-label="Minha conta"
            className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary data-[status=active]:bg-accent data-[status=active]:text-primary"
          >
            <CircleUser className="h-5 w-5" />
          </Link>
        </div>
        {!online && (
          <p className="mt-2 flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm text-muted-foreground">
            <CloudOff className="h-4 w-4 shrink-0" /> Sem internet · mostrando o que já está no aparelho
          </p>
        )}
      </header>

      <main className="flex-1 px-5 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-xl">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="group flex flex-col items-center gap-0.5 pb-2 pt-2 text-xs text-muted-foreground data-[status=active]:font-semibold data-[status=active]:text-primary"
              >
                <span className="flex h-8 w-14 items-center justify-center rounded-full transition-colors group-data-[status=active]:bg-accent">
                  <Icon className="h-6 w-6" />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function EmptyPage({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <section>
      <h1 className="text-3xl">{title}</h1>
      <p className="mt-3 font-serif text-lg leading-relaxed text-muted-foreground">{intro}</p>
      {children}
    </section>
  );
}
