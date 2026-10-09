import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/app/PasswordInput";
import { ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/senha")({
  head: () => ({
    meta: [
      { title: "Senha — Caminho" },
      { name: "description", content: "Crie ou altere a sua senha." },
      { property: "og:title", content: "Senha — Caminho" },
      { property: "og:description", content: "Crie ou altere a sua senha." },
    ],
  }),
  component: SenhaPage,
});

function friendly(msg: string) {
  if (msg.includes("different from the old")) return "A nova senha precisa ser diferente da atual.";
  if (msg.toLowerCase().includes("fetch"))
    return "Sem conexão. Verifique a internet e tente de novo.";
  return "Não foi possível salvar a senha. Tente de novo.";
}

function SenhaPage() {
  const navigate = useNavigate();
  const [mustChange, setMustChange] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) =>
        setMustChange(!!data.session?.user.user_metadata?.["must_change_password"]),
      );
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As duas senhas não são iguais.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setBusy(false);
    if (error) {
      toast.error(friendly(error.message));
      return;
    }
    toast.success("Senha salva.");
    navigate({ to: mustChange ? "/" : "/conta" });
  }

  return (
    <section>
      <ScreenHeader
        title={mustChange ? "Crie a sua senha" : "Alterar senha"}
        {...(mustChange ? { action: <span /> } : { back: { label: "Conta", to: "/conta" } })}
      />
      {mustChange && (
        <p className="reading -mt-2 text-muted-foreground">
          Você entrou com uma senha temporária. Escolha uma senha só sua para continuar.
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-3">
        <PasswordInput
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Nova senha (mín. 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordInput
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Repita a nova senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" size="lg" disabled={busy} className="!mt-5">
          {busy ? "Aguarde…" : "Salvar senha"}
        </Button>
      </form>
    </section>
  );
}
