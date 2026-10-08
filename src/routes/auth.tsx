import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Caminho" },
      { name: "description", content: "Entre no Caminho para continuar seus estudos e sua lectio." },
      { property: "og:title", content: "Entrar — Caminho" },
      { property: "og:description", content: "Entre no Caminho para continuar seus estudos e sua lectio." },
    ],
  }),
  component: AuthPage,
});

type Mode = "entrar" | "criar" | "esqueci";

function friendly(msg: string) {
  if (msg.includes("EMAIL_NOT_ALLOWED") || msg.toLowerCase().includes("database error saving new user"))
    return "Este e-mail ainda não foi liberado para criar conta.";
  if (msg.includes("Invalid login")) return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed")) return "Confirme seu e-mail pelo link que enviamos.";
  return msg;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/" });
        else toast.success("Conta criada. Confirme pelo link enviado ao seu e-mail.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link para criar uma nova senha.");
        setMode("entrar");
      }
    } catch (err) {
      toast.error(friendly((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = { entrar: "Entrar", criar: "Criar conta", esqueci: "Nova senha" };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl">Caminho</h1>
        <p className="mt-2 font-serif text-muted-foreground">Catequese, Palavra e oração.</p>

        <form onSubmit={submit} className="mt-10 space-y-4">
          <h2 className="text-xl">{titles[mode]}</h2>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border bg-card px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-ring"
          />
          {mode !== "esqueci" && (
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "criar" ? "new-password" : "current-password"}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border bg-card px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          )}
          <button
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3.5 font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Aguarde…" : mode === "esqueci" ? "Enviar link" : titles[mode]}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          {mode !== "entrar" && <button onClick={() => setMode("entrar")} className="block underline">Já tenho conta</button>}
          {mode !== "criar" && <button onClick={() => setMode("criar")} className="block underline">Criar conta (e-mail liberado)</button>}
          {mode !== "esqueci" && <button onClick={() => setMode("esqueci")} className="block underline">Esqueci minha senha</button>}
        </div>
      </div>
    </div>
  );
}
