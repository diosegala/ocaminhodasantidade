import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { InstallApp } from "@/components/app/InstallApp";
import { Button } from "@/components/ui/button";
import {
  currentSubscription,
  disablePush,
  enablePush,
  pushSupport,
  saveHour,
  type PushSupport,
} from "./push-client";
import { getPushHour, sendTestPush } from "./push.functions";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5h às 22h
const DEFAULT_HOUR = 7;

type State =
  | { kind: "carregando" }
  | { kind: "suporte"; support: Exclude<PushSupport, "ok"> }
  | { kind: "bloqueadas" }
  | { kind: "desligadas" }
  | { kind: "ligadas"; sub: PushSubscription };

function message(e: unknown) {
  return e instanceof Error ? e.message : "Não deu certo. Tente de novo.";
}

/** Aviso diário no celular: ligar, escolher a hora, testar e desligar. */
export function NotificationsSheet({
  onClose,
  onReminderFallback,
}: {
  onClose: () => void;
  /** Sem suporte a notificações: mostra o passo a passo do app Lembretes. */
  onReminderFallback: () => void;
}) {
  const [state, setState] = useState<State>({ kind: "carregando" });
  const [hour, setHour] = useState(DEFAULT_HOUR);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const support = pushSupport();
    if (support !== "ok") return setState({ kind: "suporte", support });
    if (Notification.permission === "denied") return setState({ kind: "bloqueadas" });
    void currentSubscription().then(async (sub) => {
      if (!sub) return setState({ kind: "desligadas" });
      setState({ kind: "ligadas", sub });
      const saved = await getPushHour({ data: { endpoint: sub.endpoint } }).catch(() => null);
      if (saved !== null) setHour(saved);
      // Inscrito no aparelho mas não no servidor (ex.: apagado): salva de novo.
      else await saveHour(sub, DEFAULT_HOUR).catch(() => {});
    });
  }, []);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      if (message(e) === "negada") setState({ kind: "bloqueadas" });
      else toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }

  const turnOn = () =>
    run(async () => {
      const sub = await enablePush(hour);
      setState({ kind: "ligadas", sub });
      toast.success(`Pronto: todo dia às ${hour}h, se a lectio ainda não tiver sido feita.`);
    });

  const changeHour = (h: number) => {
    setHour(h);
    if (state.kind === "ligadas")
      void run(async () => {
        await saveHour(state.sub, h);
        toast.success(`Aviso mudado para as ${h}h.`);
      });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notificacoes-titulo"
        className="mx-auto w-full max-w-xl rounded-t-[28px] bg-card px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 id="notificacoes-titulo" className="title flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" /> Aviso diário
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="pressable rounded-full bg-secondary p-1.5 text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Uma notificação por dia, na hora da sua oração, com uma palavra para o dia. Se a lectio já
          foi feita, o Caminho não incomoda.
        </p>

        {state.kind === "carregando" && <p className="mt-5 text-muted-foreground">Verificando…</p>}

        {state.kind === "suporte" && state.support === "ios-instalar" && (
          <div className="mt-5 space-y-3">
            <p className="reading">
              No iPhone, as notificações só funcionam com o Caminho instalado na Tela de Início.
              Instale e ative por lá, em Conta → Aviso diário.
            </p>
            <InstallApp>
              {(open) => (
                <Button size="lg" onClick={open}>
                  Como instalar
                </Button>
              )}
            </InstallApp>
          </div>
        )}

        {state.kind === "suporte" && state.support === "sem-suporte" && (
          <div className="mt-5 space-y-3">
            <p className="reading">
              Este navegador não recebe notificações. Você pode criar um lembrete no próprio
              celular.
            </p>
            <Button size="lg" onClick={onReminderFallback}>
              Usar o app Lembretes
            </Button>
          </div>
        )}

        {state.kind === "bloqueadas" && (
          <p className="reading mt-5">
            As notificações do Caminho estão bloqueadas neste aparelho. No iPhone, libere em Ajustes
            → Notificações → Caminho; no Android, nas informações do app. Depois, volte aqui.
          </p>
        )}

        {(state.kind === "desligadas" || state.kind === "ligadas") && (
          <div className="mt-5 space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
              <span>Horário</span>
              <select
                value={hour}
                disabled={busy}
                onChange={(e) => changeHour(Number(e.target.value))}
                className="bg-transparent text-right text-[17px] font-semibold text-primary outline-none"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}h
                  </option>
                ))}
              </select>
            </label>

            {state.kind === "desligadas" ? (
              <Button size="lg" disabled={busy} onClick={() => void turnOn()}>
                {busy ? "Ativando…" : "Ativar notificações"}
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await sendTestPush({ data: { endpoint: state.sub.endpoint } });
                      toast.success("Enviado. A notificação deve chegar em instantes.");
                    })
                  }
                >
                  Enviar um teste agora
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  className="w-full text-destructive"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await disablePush(state.sub);
                      setState({ kind: "desligadas" });
                    })
                  }
                >
                  Desativar neste aparelho
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
