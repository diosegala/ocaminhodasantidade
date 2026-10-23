import { useEffect, useRef, useState } from "react";
import { localToday } from "@/features/lectio/liturgy";
import { MessageSheet } from "./MessageSheet";
import { messagesEnabled, PAUSE_MINUTES, pauseFor, type Message } from "./messages";

const TICK = 5_000;
/** Depois de digitar, espera este tempo sem teclar antes de mostrar a pausa. */
const QUIET = 8_000;

function typing() {
  const el = document.activeElement;
  return (
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && el.type !== "button") ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

/**
 * Pausas depois de 10 e 25 minutos de uso. Só conta o tempo com o app na tela,
 * recomeça a cada abertura e nunca interrompe quem está escrevendo.
 */
export function PauseReminder() {
  const [message, setMessage] = useState<Message | null>(null);
  const activeMs = useRef(0);
  const shown = useRef(0);
  const lastKey = useRef(0);

  useEffect(() => {
    const onKey = () => (lastKey.current = Date.now());
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("input", onKey, true);

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      activeMs.current += TICK;
      const due = PAUSE_MINUTES[shown.current];
      if (due === undefined || activeMs.current < due * 60_000) return;
      if (!messagesEnabled()) return;
      if (typing() || Date.now() - lastKey.current < QUIET) return;
      // Outra gaveta aberta (marco, versículo): espera ela fechar.
      if (document.querySelector(".fixed.inset-0")) return;
      setMessage(pauseFor(localToday(), shown.current));
      shown.current++;
    }, TICK);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("input", onKey, true);
    };
  }, []);

  return message ? <MessageSheet message={message} onClose={() => setMessage(null)} /> : null;
}
