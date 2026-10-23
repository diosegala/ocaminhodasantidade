// Mensagens dentro do app: boas-vindas uma vez por dia e pausas depois de um tempo de uso.

export type Message = {
  eyebrow: string;
  title: string;
  body: string;
  /** Botão principal; sem ele, a mensagem só tem "Amém". */
  action?: { label: string; to: "lectio" | "caminho" | "reflexao" };
};

export function greeting(hour: number) {
  return hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

export function welcomeFor(opts: {
  hour: number;
  name: string;
  seasonName: string;
  lectioDoneToday: boolean;
  /** Dias seguidos até ontem (ou até hoje, se já fez). */
  streak: number;
}): Message {
  const first = opts.name.trim().split(/\s+/)[0];
  const title = first ? `${greeting(opts.hour)}, ${first}` : greeting(opts.hour);
  const eyebrow = opts.seasonName;

  if (opts.lectioDoneToday) {
    return {
      eyebrow,
      title,
      body:
        opts.streak > 1
          ? `Você já rezou a lectio de hoje: são ${opts.streak} dias seguidos. Que a Palavra siga com você.`
          : "Você já rezou a lectio de hoje. Que a Palavra siga com você ao longo do dia.",
      action: { label: "Ver meu caminho", to: "caminho" },
    };
  }
  const start = { label: "Começar a lectio", to: "lectio" } as const;
  if (opts.hour >= 21) {
    return {
      eyebrow,
      title,
      body: "Ainda dá tempo: ler o Evangelho do dia com calma, mesmo sem escrever, já é lectio.",
      action: start,
    };
  }
  if (opts.streak > 0) {
    return {
      eyebrow,
      title,
      body: `Você está há ${opts.streak} ${opts.streak === 1 ? "dia" : "dias seguidos"} no caminho. A lectio de hoje espera por você.`,
      action: start,
    };
  }
  return {
    eyebrow,
    title,
    body: "Que bom ter você aqui. Reserve alguns minutos para a Palavra de hoje.",
    action: start,
  };
}

/** Pausas: frases curtas da tradição da Igreja e convites simples. */
export const PAUSES: Omit<Message, "eyebrow">[] = [
  { title: "Jesus, eu confio em vós", body: "Respire fundo e repita devagar, três vezes." },
  { title: "Vinde, Espírito Santo", body: "Peça luz para entender o que você está lendo." },
  { title: "Agradeça", body: "Pense em uma coisa boa de hoje e agradeça a Deus por ela." },
  {
    title: "Meu Senhor e meu Deus",
    body: "A oração de Tomé cabe em qualquer momento do dia. Diga-a agora, com o coração.",
  },
  { title: "Uma Ave-Maria", body: "Reze uma Ave-Maria agora, por alguém que precisa." },
  {
    title: "Guarde uma palavra",
    body: "Que frase você quer levar para o resto do dia? Repita-a por dentro.",
  },
  { title: "Senhor, tende piedade", body: "Entregue a Ele o que está difícil hoje." },
  {
    title: "Escreva o que tocou você",
    body: "Se algo falou ao seu coração, guarde numa reflexão antes que passe.",
    action: { label: "Escrever uma reflexão", to: "reflexao" },
  },
  {
    title: "Pela sua catequese",
    body: "Reze pelo seu catequista e pelos colegas da turma.",
  },
  {
    title: "Sagrado Coração de Jesus",
    body: "Sagrado Coração de Jesus, eu confio em vós. Fique um instante em silêncio.",
  },
];

/** A pausa mais longa convida a descansar a vista e ficar em silêncio. */
export const LONG_PAUSE: Omit<Message, "eyebrow"> = {
  title: "Descanse um pouco",
  body: "Você está há um bom tempo por aqui. Feche os olhos por um minuto e fique em silêncio com Deus.",
};

/** Minutos de uso (com o app na tela) em que cada pausa aparece. */
export const PAUSE_MINUTES = [10, 25] as const;

/** Pausa `index` (0 ou 1) do dia: muda a cada dia, sem repetir na mesma sessão. */
export function pauseFor(date: string, index: number): Message {
  if (index >= 1) return { eyebrow: "Uma pausa", ...LONG_PAUSE };
  const day = Math.round(Date.parse(date + "T12:00:00Z") / 86400000);
  return { eyebrow: "Uma pausa", ...PAUSES[(day * 3) % PAUSES.length]! };
}

// Preferência e controle de "já mostrei hoje", guardados no aparelho.
const PREF_KEY = "mensagens-no-app";
const WELCOME_KEY = "boas-vindas-dia";

export function messagesEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) !== "desligadas";
  } catch {
    return true;
  }
}

export function setMessagesEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(PREF_KEY);
    else localStorage.setItem(PREF_KEY, "desligadas");
  } catch {
    // sem armazenamento: vale só agora
  }
}

/** true na primeira chamada do dia; registra que as boas-vindas foram mostradas. */
export function claimWelcome(date: string) {
  try {
    if (localStorage.getItem(WELCOME_KEY) === date) return false;
    localStorage.setItem(WELCOME_KEY, date);
    return true;
  } catch {
    return false;
  }
}
