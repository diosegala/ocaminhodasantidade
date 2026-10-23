// Cartão "Para hoje" da tela Hoje: muda a cada dia, alternando um versículo com um
// convite prático e algo que a própria pessoa escreveu numa lectio anterior.
// Os versículos guardam só a referência (por extenso, para não depender da abreviação
// gravada no banco); o texto vem da Bíblia do banco (Ave-Maria).
// Salmos ficam de fora porque a numeração varia entre traduções.

export type Word = { ref: string; invite: string };

export const WORDS: Word[] = [
  {
    ref: "João 15,5",
    invite: "Sem Ele nada podemos. Comece o dia unido a Ele, nem que seja numa frase.",
  },
  { ref: "Mateus 11,28", invite: "Leve hoje a Ele o que está pesando em você." },
  {
    ref: "Lucas 10,42",
    invite: "Como Maria de Betânia, escolha a melhor parte: alguns minutos aos pés do Senhor.",
  },
  {
    ref: "Mateus 6,6",
    invite: "Procure hoje um lugar quieto para rezar, ainda que por cinco minutos.",
  },
  { ref: "Hebreus 4,12", invite: "A Palavra é viva. Deixe que ela leia você hoje." },
  {
    ref: "Isaías 55,11",
    invite: "A Palavra não volta vazia: o que você leu dá fruto no tempo de Deus.",
  },
  { ref: "Lucas 2,19", invite: "Guardar e meditar no coração, como Maria: isso é a lectio." },
  { ref: "Romanos 12,2", invite: "Deixe a Palavra renovar o seu modo de pensar hoje." },
  { ref: "Filipenses 4,6", invite: "Transforme cada preocupação de hoje em oração." },
  { ref: "Mateus 7,24", invite: "Escolha uma coisa da sua última lectio para viver ainda hoje." },
  { ref: "Tiago 1,22", invite: "Ser praticante da Palavra: o que dá para fazer hoje?" },
  { ref: "1 Tessalonicenses 5,17", invite: "Ofereça a Deus cada tarefa do dia, uma por uma." },
  { ref: "Marcos 1,35", invite: "Jesus começava o dia rezando. Que tal começar o seu também?" },
  { ref: "Lucas 24,32", invite: "Peça que o seu coração arda ao ler as Escrituras." },
  { ref: "Jeremias 29,13", invite: "Quem procura de todo o coração encontra. Procure-o hoje." },
  { ref: "Isaías 43,1", invite: "Você foi chamado pelo nome. Como vai responder hoje?" },
  { ref: "1 João 4,19", invite: "Amamos porque Ele nos amou primeiro. Agradeça por isso hoje." },
  { ref: "Mateus 28,20", invite: "Ele está com você todos os dias, também neste." },
  { ref: "João 6,68", invite: "Só Ele tem palavras de vida eterna. Volte a elas hoje." },
  { ref: "Lucas 11,1", invite: "Peça como os discípulos: Senhor, ensina-me a rezar." },
  {
    ref: "Atos 2,42",
    invite: "Ensino, comunhão, partir do pão e oração: leve a catequese para a sua semana.",
  },
  { ref: "1 Pedro 3,15", invite: "Estudamos a fé para saber dar a razão da nossa esperança." },
  { ref: "Colossenses 3,16", invite: "Que a Palavra de Cristo habite em você com abundância." },
  { ref: "Josué 1,9", invite: "Seja forte e corajoso: o Senhor está com você aonde for." },
  {
    ref: "Miqueias 6,8",
    invite: "Praticar a justiça, amar a bondade, caminhar humildemente com Deus.",
  },
  { ref: "2 Coríntios 12,9", invite: "A graça basta. Leve a sua fraqueza para a oração." },
  { ref: "Lucas 1,38", invite: "O sim de Maria pode inspirar o seu sim de hoje." },
  { ref: "Mateus 5,8", invite: "Peça hoje um coração puro, que sabe ver Deus nas coisas simples." },
  { ref: "1 Coríntios 13,4", invite: "Escolha hoje um gesto concreto de paciência." },
  { ref: "Gálatas 2,20", invite: "Deixe Cristo viver em você nas pequenas escolhas de hoje." },
  {
    ref: "João 13,34",
    invite: "Ame alguém hoje como Ele amou: com um gesto, não só com palavras.",
  },
  { ref: "Mateus 6,33", invite: "Busque primeiro o Reino: dê a Deus o primeiro momento do dia." },
];

export type MemoryEntry = {
  date: string;
  reference: string | null;
  meditation: string | null;
  prayer: string | null;
  contemplation: string | null;
};

export type Daily =
  { kind: "word"; word: Word } | { kind: "memory"; entry: MemoryEntry; text: string };

const DAY = 24 * 60 * 60 * 1000;

/** Número do dia (estável o dia todo, muda à meia-noite). */
function dayNumber(date: string) {
  return Math.round(Date.parse(date + "T12:00:00Z") / DAY);
}

/** Uma sequência que embaralha sem repetir em seguida (passo primo com o tamanho). */
function pick<T>(items: T[], n: number): T {
  return items[(n * 7) % items.length]!;
}

/** O cartão do dia. Em dias alternados, se houver, uma lectio de pelo menos 7 dias atrás. */
export function dailyFor(date: string, entries: MemoryEntry[]): Daily {
  const n = dayNumber(date);
  if (n % 2 === 0) {
    const memories = entries
      .filter((e) => dayNumber(e.date) <= n - 7)
      .map((e) => ({ entry: e, text: (e.meditation || e.contemplation || e.prayer || "").trim() }))
      .filter((m) => m.text.length >= 20)
      .sort((a, b) => a.entry.date.localeCompare(b.entry.date));
    if (memories.length) return { kind: "memory", ...pick(memories, n / 2) };
  }
  return { kind: "word", word: pick(WORDS, n) };
}

/** "há 12 dias", "há 3 semanas", "há 2 meses". */
export function timeAgo(from: string, to: string) {
  const days = dayNumber(to) - dayNumber(from);
  if (days < 14) return `há ${days} dias`;
  if (days < 60) return `há ${Math.round(days / 7)} semanas`;
  if (days < 365) return `há ${Math.round(days / 30)} meses`;
  const years = Math.round(days / 365);
  return years === 1 ? "há um ano" : `há ${years} anos`;
}
