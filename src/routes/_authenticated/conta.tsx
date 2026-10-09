import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, KeyRound, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { idbPersister } from "@/lib/query-persister";

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

function ContaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const row = "flex w-full items-center gap-3 px-4 py-4 text-left";

  return (
    <section>
      <h1 className="text-3xl">Conta</h1>
      {me.data && (
        <p className="mt-2 font-serif text-lg text-muted-foreground">
          {me.data.name ? `${me.data.name} · ` : ""}
          {me.data.email}
        </p>
      )}

      <ul className="mt-6 divide-y rounded-2xl border bg-card">
        <li>
          <Link to="/senha" className={row}>
            <KeyRound className="h-5 w-5 text-primary" />
            <span className="flex-1">Alterar senha</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </li>
        {me.data?.isOwner && (
          <li>
            <Link to="/pessoas" className={row}>
              <Users className="h-5 w-5 text-primary" />
              <span className="flex-1">Pessoas e acessos</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </li>
        )}
        <li>
          <button onClick={() => void signOut()} className={row}>
            <LogOut className="h-5 w-5 text-primary" />
            <span className="flex-1">Sair</span>
          </button>
        </li>
      </ul>
    </section>
  );
}
