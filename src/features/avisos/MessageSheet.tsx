import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Message } from "./messages";

/** Gaveta de mensagem (boas-vindas ou pausa), no mesmo estilo da dos marcos. */
export function MessageSheet({ message, onClose }: { message: Message; onClose: () => void }) {
  const navigate = useNavigate();

  function act() {
    onClose();
    const to = message.action?.to;
    if (to === "lectio") navigate({ to: "/lectio" });
    else if (to === "caminho") navigate({ to: "/caminho" });
    else if (to === "reflexao")
      navigate({ to: "/reflexoes/$id", params: { id: crypto.randomUUID() } });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mensagem-titulo"
        className="mx-auto w-full max-w-xl rounded-t-[28px] bg-card px-6 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] text-center shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-5 block h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-primary">
          <Sparkles className="h-8 w-8" strokeWidth={1.8} />
        </span>
        <p className="eyebrow mt-4">{message.eyebrow}</p>
        <h2 id="mensagem-titulo" className="title mt-1">
          {message.title}
        </h2>
        <p className="reading mt-3">{message.body}</p>
        {message.action ? (
          <>
            <Button size="lg" className="mt-6" onClick={act}>
              {message.action.label}
            </Button>
            <Button variant="ghost" size="md" className="mt-2 w-full" onClick={onClose}>
              Agora não
            </Button>
          </>
        ) : (
          <Button size="lg" className="mt-6" onClick={onClose}>
            Amém
          </Button>
        )}
      </div>
    </div>
  );
}
