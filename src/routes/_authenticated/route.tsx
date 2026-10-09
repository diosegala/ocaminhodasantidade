import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // getSession lê a sessão guardada no aparelho, então o app abre mesmo sem internet.
    // A segurança continua no banco: cada consulta é validada pelas regras de RLS.
    const { data, error } = await supabase.auth.getSession();
    if (!data.session) {
      // Sem internet o token vencido não renova, mas a sessão continua guardada:
      // deixa entrar e mostra o que já está no aparelho.
      if (error && isAuthRetryableFetchError(error)) return;
      throw redirect({ to: "/auth" });
    }
    // Quem entrou com senha temporária precisa criar a própria antes de usar o app.
    if (data.session.user.user_metadata?.["must_change_password"] && location.pathname !== "/senha") {
      throw redirect({ to: "/senha" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
