import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, Download, KeyRound, LogOut, Smartphone, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { idbPersister } from "@/lib/query-persister";
import { getThemeMode, setThemeMode, type ThemeMode } from "@/lib/theme";
import { ListGroup, Row, rowClass, ScreenHeader, SegmentedControl } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { buildExport, shareExport } from "@/features/conta/export";
import { InstallApp } from "@/components/app/InstallApp";

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
  const [exporting, setExporting] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  async function exportTexts() {
    setExporting(true);
    try {
      await shareExport(await buildExport());
    } catch {
      toast.error("Não consegui exportar. Verifique a internet e tente de novo.");
    } finally {
      setExporting(false);
    }
  }

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
        <InstallApp>
          {(open) => (
            <button onClick={open} className={rowClass}>
              <Row icon={Smartphone} title="Instalar no celular" chevron />
            </button>
          )}
        </InstallApp>
        <button onClick={() => setShowReminder(true)} className={rowClass}>
          <Row icon={Bell} title="Lembrete diário" chevron />
        </button>
        <button onClick={() => void exportTexts()} disabled={exporting} className={rowClass}>
          <Row
            icon={Download}
            title="Exportar meus textos"
            detail={exporting ? "preparando…" : "cópia de segurança"}
          />
        </button>
      </ListGroup>

      <ListGroup className="mt-7">
        <button onClick={() => void signOut()} className={`${rowClass} text-destructive`}>
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="flex-1">Sair</span>
        </button>
      </ListGroup>

      {showReminder && <ReminderSheet onClose={() => setShowReminder(false)} />}
    </section>
  );
}

/**
 * Passo a passo para um lembrete diário pelo app Lembretes do iPhone. (A ação "Abrir App"
 * dos Atalhos não lista apps da Tela de Início; notificações próprias do app ficam para depois.)
 */
function ReminderSheet({ onClose }: { onClose: () => void }) {
  const steps = [
    "Abra o app Lembretes e toque em Novo Lembrete.",
    "Escreva \u201cLectio no Caminho\u201d.",
    "Toque em ⓘ, ative Data e Hora e escolha o horário da sua oração.",
    "Em Repetir, escolha Diariamente e toque em OK.",
    "Pronto: todo dia, nesse horário, o iPhone avisa. É só abrir o Caminho e rezar.",
  ];
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-xl rounded-t-[28px] bg-card px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="title">Lembrete diário</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="pressable rounded-full bg-secondary p-1.5 text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Pelo app Lembretes do iPhone, você recebe um aviso todo dia no horário da sua oração.
        </p>
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
        <Button size="lg" className="mt-6" onClick={onClose}>
          Entendi
        </Button>
      </div>
    </div>
  );
}
