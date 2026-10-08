import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Criar nova senha — Caminho" },
      { name: "description", content: "Defina uma nova senha para entrar no Caminho." },
      { property: "og:title", content: "Criar nova senha — Caminho" },
      { property: "og:description", content: "Defina uma nova senha para entrar no Caminho." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar. Abra o link do e-mail de novo.");
      return;
    }
    toast.success("Senha atualizada.");
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl">Nova senha</h1>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Nova senha (mín. 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border bg-card px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-ring"
        />
        <button disabled={busy} className="w-full rounded-xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-60">
          Salvar senha
        </button>
      </form>
    </div>
  );
}
