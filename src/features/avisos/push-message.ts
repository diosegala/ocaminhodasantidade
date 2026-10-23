import { wordOfDay } from "@/features/hoje/daily-word";

export type PushMessage = { title: string; body: string; url: string; tag: string };

/** Aviso diário. Quem já rezou a lectio hoje não recebe nada. */
export function dailyPush(date: string, doneToday: boolean, streak: number): PushMessage | null {
  if (doneToday) return null;
  const word = wordOfDay(date);
  return {
    title: streak >= 2 ? `${streak} dias seguidos no caminho` : "Sua lectio de hoje",
    body: `${word.invite} A Palavra de hoje espera por você.`,
    url: "/lectio",
    tag: `lectio-${date}`,
  };
}

/** Data e hora em Brasília, de onde o servidor estiver. */
export function brasiliaNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts["year"]}-${parts["month"]}-${parts["day"]}`,
    hour: Number(parts["hour"]),
  };
}
