import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/app/PasswordInput";
import { Card, ScreenHeader } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import {
  addPerson,
  listPeople,
  resetPassword,
  type Person,
} from "@/features/conta/people.functions";

export const Route = createFileRoute("/_authenticated/pessoas")({
  head: () => ({
    meta: [
      { title: "Pessoas e acessos — Caminho" },
      { name: "description", content: "Crie acessos e redefina senhas." },
      { property: "og:title", content: "Pessoas e acessos — Caminho" },
      { property: "og:description", content: "Crie acessos e redefina senhas." },
    ],
  }),
  component: PessoasPage,
});

const WORDS = ["luz", "paz", "fe", "ceu", "vida", "pao", "graca", "amor", "rocha", "fonte"];

/** Senha temporária fácil de ditar ou mandar por mensagem, ex.: "paz-fonte-4821". */
function tempPassword() {
  const n = new Uint32Array(3);
  crypto.getRandomValues(n);
  return `${WORDS[n[0]! % WORDS.length]}-${WORDS[n[1]! % WORDS.length]}-${String(n[2]! % 10000).padStart(4, "0")}`;
}

type Shared = { name: string; email: string; password: string };

function PessoasPage() {
  const queryClient = useQueryClient();
  const people = useQuery({
    queryKey: ["people"],
    queryFn: () => listPeople(),
    networkMode: "always",
    retry: false,
  });
  const [shared, setShared] = useState<Shared | null>(null);
  const [adding, setAdding] = useState(false);

  const onDone = (s: Shared) => {
    setShared(s);
    void queryClient.invalidateQueries({ queryKey: ["people"] });
  };

  return (
    <section>
      <ScreenHeader title="Pessoas e acessos" back={{ label: "Conta", to: "/conta" }} />
      <p className="-mt-2 text-[15px] leading-relaxed text-muted-foreground">
        Crie o acesso de cada pessoa e envie a senha temporária por mensagem. No primeiro acesso,
        ela cria a própria senha.
      </p>

      {shared && <ShareCard shared={shared} onClose={() => setShared(null)} />}

      {adding ? (
        <AddForm
          onCancel={() => setAdding(false)}
          onDone={(s) => {
            setAdding(false);
            onDone(s);
          }}
        />
      ) : (
        <Button
          size="lg"
          className="mt-6"
          onClick={() => {
            setShared(null);
            setAdding(true);
          }}
        >
          <UserPlus /> Adicionar pessoa
        </Button>
      )}

      {people.isLoading && <p className="mt-6 text-muted-foreground">Carregando…</p>}
      {people.isError && (
        <p className="mt-6 text-muted-foreground">{(people.error as Error).message}</p>
      )}

      <ul className="mt-7 space-y-3">
        {(people.data ?? []).map((p) => (
          <PersonRow key={p.id} person={p} onReset={onDone} />
        ))}
      </ul>
    </section>
  );
}

function ShareCard({ shared, onClose }: { shared: Shared; onClose: () => void }) {
  const text = `Olá, ${shared.name}! Seu acesso ao Caminho:\nE-mail: ${shared.email}\nSenha temporária: ${shared.password}\nAo entrar, você vai criar a sua própria senha.`;
  return (
    <Card className="mt-6 ring-2 ring-primary">
      <p className="eyebrow text-primary">Envie para {shared.name}</p>
      <p className="mt-2 whitespace-pre-wrap text-[17px] leading-relaxed">{text}</p>
      <div className="mt-4 flex gap-3">
        <Button
          size="md"
          className="flex-1"
          onClick={() =>
            void navigator.clipboard.writeText(text).then(
              () => toast.success("Mensagem copiada."),
              () => toast.error("Não consegui copiar. Selecione o texto e copie."),
            )
          }
        >
          <Copy /> Copiar mensagem
        </Button>
        <Button variant="secondary" size="md" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Card>
  );
}

// Dentro de cartões, os campos ficam em cinza claro, sem sombra.
const inputClass =
  "h-[52px] w-full rounded-xl bg-secondary px-4 text-base outline-none focus:ring-2 focus:ring-ring";
const passwordClass = "bg-secondary shadow-none";

function AddForm({ onCancel, onDone }: { onCancel: () => void; onDone: (s: Shared) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(tempPassword);
  const add = useMutation({
    mutationFn: () => addPerson({ data: { name, email, password } }),
    networkMode: "always",
    onSuccess: () => onDone({ name: name.trim(), email: email.trim().toLowerCase(), password }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    add.mutate();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 rounded-[20px] bg-card p-5 shadow-card">
      <h2 className="title">Nova pessoa</h2>
      <input
        required
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
      />
      <input
        required
        type="email"
        autoCapitalize="none"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <label className="eyebrow block pt-1">Senha temporária</label>
      <PasswordInput
        className={passwordClass}
        required
        minLength={8}
        defaultVisible
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex gap-3 pt-1">
        <Button type="submit" size="md" className="flex-1" disabled={add.isPending}>
          {add.isPending ? "Criando…" : "Criar acesso"}
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function PersonRow({ person, onReset }: { person: Person; onReset: (s: Shared) => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(tempPassword);
  const reset = useMutation({
    mutationFn: () => resetPassword({ data: { userId: person.id, password } }),
    networkMode: "always",
    onSuccess: () => {
      setOpen(false);
      onReset({ name: person.name, email: person.email, password });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const lastSeen = person.lastSignInAt
    ? `Último acesso em ${new Date(person.lastSignInAt).toLocaleDateString("pt-BR")}`
    : "Ainda não entrou";

  return (
    <li className="rounded-[20px] bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{person.name}</span>
        {person.isOwner ? (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
            Dono
          </span>
        ) : person.mustChangePassword ? (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
            Senha temporária
          </span>
        ) : null}
      </div>
      <p className="text-[15px] text-muted-foreground">{person.email}</p>
      <p className="text-[15px] text-muted-foreground">{lastSeen}</p>

      {!person.isOwner &&
        (open ? (
          <div className="mt-3 space-y-3">
            <label className="eyebrow block">Nova senha temporária</label>
            <PasswordInput
              className={passwordClass}
              required
              minLength={8}
              defaultVisible
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-3">
              <Button
                size="md"
                className="flex-1"
                onClick={() => reset.mutate()}
                disabled={reset.isPending || password.length < 8}
              >
                {reset.isPending ? "Salvando…" : "Redefinir senha"}
              </Button>
              <Button variant="secondary" size="md" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setOpen(true)} className="mt-2 text-[15px] text-primary">
            Redefinir senha
          </button>
        ))}
    </li>
  );
}

function errorMessage(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  // Erros de validação do zod chegam como JSON com a lista de problemas.
  try {
    const issues = JSON.parse(msg) as { message: string }[];
    if (Array.isArray(issues) && issues[0]?.message) return issues[0].message;
  } catch {
    // não era JSON
  }
  return msg;
}
