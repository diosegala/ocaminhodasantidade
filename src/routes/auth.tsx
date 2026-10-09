import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/app/PasswordInput";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Caminho" },
      {
        name: "description",
        content: "Entre no Caminho para continuar seus estudos e sua lectio.",
      },
      { property: "og:title", content: "Entrar — Caminho" },
      {
        property: "og:description",
        content: "Entre no Caminho para continuar seus estudos e sua lectio.",
      },
    ],
  }),
  component: AuthPage,
});

function friendly(msg: string) {
  if (msg.includes("Invalid login")) return "E-mail ou senha incorretos.";
  if (msg.toLowerCase().includes("fetch"))
    return "Sem conexão. Verifique a internet e tente de novo.";
  return msg;
}

// Contas são criadas pelo dono do app (tela Pessoas); não há cadastro nem e-mails.
function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(friendly(error.message));
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-[max(env(safe-area-inset-top),2rem)]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img
            src="/apple-touch-icon.png"
            alt=""
            className="h-20 w-20 rounded-[22px] shadow-card"
          />
          <h1 className="title-large mt-5">Caminho</h1>
          <p className="reading mt-1 text-muted-foreground">Catequese, Palavra e oração.</p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-[52px] w-full rounded-xl bg-card px-4 text-base shadow-card outline-none focus:ring-2 focus:ring-ring"
          />
          <PasswordInput
            required
            autoComplete="current-password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" size="lg" disabled={busy} className="!mt-5">
            {busy ? "Aguarde…" : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          {forgot ? (
            <p className="rounded-2xl bg-secondary p-4 text-left text-[15px] leading-relaxed text-muted-foreground">
              Peça a quem te convidou para redefinir a sua senha. Você vai receber uma senha
              temporária e, ao entrar, cria uma nova.
            </p>
          ) : (
            <button onClick={() => setForgot(true)} className="text-[15px] text-primary">
              Esqueci minha senha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
