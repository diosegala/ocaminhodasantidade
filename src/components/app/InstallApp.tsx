import { useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Instalar na Tela de Início. No Android (Chrome) o navegador entrega um evento que
// abre a instalação de verdade. No iPhone não existe isso: nenhum site pode instalar
// sozinho, então o botão abre um guia com os toques no menu Compartilhar do Safari.

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** "ios" (mostrar guia), "prompt" (Android: instalação de verdade) ou null (já instalado / não dá). */
export function useInstallMode(): "ios" | "prompt" | null {
  return useSyncExternalStore(
    subscribe,
    () => (isStandalone() ? null : deferred ? "prompt" : isIOS() ? "ios" : null),
    () => null,
  );
}

/** Abre a instalação (Android) ou o guia (iPhone). `children` recebe a função de abrir. */
export function InstallApp({ children }: { children: (open: () => void) => React.ReactNode }) {
  const mode = useInstallMode();
  const [guide, setGuide] = useState(false);
  if (!mode) return null;

  async function open() {
    if (mode === "prompt" && deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      notify();
    } else setGuide(true);
  }

  return (
    <>
      {children(() => void open())}
      {guide && <IOSGuide onClose={() => setGuide(false)} />}
    </>
  );
}

export function InstallButton({ className }: { className?: string }) {
  return (
    <InstallApp>
      {(open) => (
        <Button variant="secondary" size="lg" className={className} onClick={open}>
          <Download /> Instalar o app no celular
        </Button>
      )}
    </InstallApp>
  );
}

function IOSGuide({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Share,
      text: "No Safari, toque em Compartilhar. Fica na barra de baixo; no iOS mais novo, toque antes em ••• (no canto de baixo).",
    },
    { icon: SquarePlus, text: "Role a lista e toque em Adicionar à Tela de Início." },
    {
      icon: Download,
      text: "Toque em Adicionar. O Caminho aparece com o ícone na sua Tela de Início.",
    },
  ];
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-xl rounded-t-[28px] bg-card px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <div className="flex items-center justify-between">
          <h2 className="title">Instalar no iPhone</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="pressable rounded-full bg-secondary p-1.5 text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-[15px] text-muted-foreground">
          O iPhone não deixa um site se instalar sozinho, mas são só três toques. Depois, abra o
          Caminho pelo ícone: ele abre em tela cheia e funciona sem internet.
        </p>
        <ol className="mt-4 space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="pt-1">
                <span className="font-semibold">{i + 1}.</span> {s.text}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-muted-foreground">
          Usa o Chrome no iPhone? O Compartilhar fica na barra de endereço, no alto.
        </p>
        <Button size="lg" className="mt-5" onClick={onClose}>
          Entendi
        </Button>
      </div>
    </div>
  );
}
