import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { KeyRound, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { idbPersister } from "@/lib/query-persister";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme";
import { ListGroup, Row, rowClass, ScreenHeader, SegmentedControl } from "@/components/app/ui";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Conta — Caminho" },
      { name: "description", content: "Sua conta no Caminho." },
      { property: "og:title", content: "Conta — Caminho" },
      { property: "og:description", content: "Sua conta no Caminho." },
    ],
  }),
  component: ContaPage,
});

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

function ContaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<ThemeMode>("system");

  useEffect(() => setTheme(getThemeMode()), []);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      const { data: roles } = await supabase.from("user_roles").select("role");
      return {
        email: user?.email ?? "",
        name: (user?.user_metadata?.["name"] as string | undefined) ?? "",
        isOwner: (roles ?? []).some((r) => r.role === "owner"),
      };
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await idbPersister.removeClient();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <section>
      <ScreenHeader
        title="Conta"
        subtitle={me.data ? [me.data.name, me.data.email].filter(Boolean).join(" · ") : undefined}
        back={{ label: "Voltar", to: "/" }}
      />

      <section>
        <h2 className="eyebrow mb-2 px-4">Aparência</h2>
        <SegmentedControl
          options={THEMES}
          value={theme}
          onChange={(mode) => {
            setTheme(mode);
            setThemeMode(mode);
          }}
        />
      </section>

      <ListGroup className="mt-7">
        <Link to="/senha" className={rowClass}>
          <Row icon={KeyRound} title="Alterar senha" chevron />
        </Link>
        {me.data?.isOwner && (
          <Link to="/pessoas" className={rowClass}>
            <Row icon={Users} title="Pessoas e acessos" chevron />
          </Link>
        )}
      </ListGroup>

      <ListGroup className="mt-7">
        <button onClick={() => void signOut()} className={`${rowClass} text-destructive`}>
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="flex-1">Sair</span>
        </button>
      </ListGroup>
    </section>
  );
}
