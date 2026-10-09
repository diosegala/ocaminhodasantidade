import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/app/PasswordInput";

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
      {!mustChange && (
        <Link to="/conta" className="flex items-center gap-1 text-sm text-primary">
          <span aria-hidden>‹</span> Conta
        </Link>
      )}
      <h1 className="mt-4 text-3xl">{mustChange ? "Crie a sua senha" : "Alterar senha"}</h1>
      {mustChange && (
        <p className="mt-3 font-serif text-lg leading-relaxed text-muted-foreground">
          Você entrou com uma senha temporária. Escolha uma senha só sua para continuar.
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4">
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
        <button
          disabled={busy}
          className="w-full rounded-xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Aguarde…" : "Salvar senha"}
        </button>
      </form>
    </section>
  );
}
