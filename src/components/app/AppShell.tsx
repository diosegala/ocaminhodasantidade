import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, GraduationCap, LogOut, Moon, NotebookPen, Search, Sun, Sunrise } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

const tabs = [
  { to: "/", label: "Hoje", icon: Sunrise },
  { to: "/aulas", label: "Aulas", icon: GraduationCap },
  { to: "/biblia", label: "Bíblia", icon: BookOpen },
  { to: "/reflexoes", label: "Reflexões", icon: NotebookPen },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dark, setDark] = useState(false);

  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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
          <button onClick={signOut} aria-label="Sair" className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-xl">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground data-[status=active]:text-primary"
              >
                <Icon className="h-6 w-6" />
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
