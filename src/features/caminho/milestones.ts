// Marcos do caminho: celebrações suaves, sem pontos. Calculados no aparelho a partir
// das datas com lectio concluída. Um dia perdido não apaga nada do que foi vivido.

import { addDays, liturgicalYear, type SeasonId } from "./liturgical-calendar";

export type Milestone = {
  /** Estável, para lembrar quais já foram celebrados. */
  id: string;
  date: string;
  title: string;
  verse: string;
  reference: string;
};

const COUNT_MARKS: { n: number; title: string; verse: string; reference: string }[] = [
  {
    n: 1,
    title: "Primeiro passo",
    verse: "Tua palavra é lâmpada para os meus pés e luz para o meu caminho.",
    reference: "Sl 119,105",
  },
  { n: 7, title: "7 lectios", verse: "Sete vezes por dia eu te louvo.", reference: "Sl 119,164" },
  {
    n: 30,
    title: "30 lectios",
    verse: "Permanecei em mim, e eu permanecerei em vós.",
    reference: "Jo 15,4",
  },
  {
    n: 100,
    title: "100 lectios",
    verse: "A palavra de Deus é viva, eficaz e mais penetrante que qualquer espada.",
    reference: "Hb 4,12",
  },
];

const STREAK_MARKS: { n: number; title: string; verse: string; reference: string }[] = [
  {
    n: 7,
    title: "7 dias seguidos",
    verse: "Perseverai na oração, vigiando com ação de graças.",
    reference: "Cl 4,2",
  },
  {
    n: 40,
    title: "40 dias seguidos",
    verse: "Jesus foi conduzido pelo Espírito ao deserto, e jejuou quarenta dias.",
    reference: "Mt 4,1-2",
  },
];

const SEASON_MARKS: Record<SeasonId, { verse: string; reference: string }> = {
  advento: {
    verse: "Preparai o caminho do Senhor, endireitai as suas veredas.",
    reference: "Mc 1,3",
  },
  natal: { verse: "E o Verbo se fez carne e habitou entre nós.", reference: "Jo 1,14" },
  comum: { verse: "Eu sou o caminho, a verdade e a vida.", reference: "Jo 14,6" },
  quaresma: { verse: "Convertei-vos e crede no Evangelho.", reference: "Mc 1,15" },
  triduo: { verse: "Tudo está consumado.", reference: "Jo 19,30" },
  pascoa: { verse: "Não está aqui. Ressuscitou, como havia dito.", reference: "Mt 28,6" },
};

/** Parte de um tempo com lectio para contar como "percorrido". */
const SEASON_SHARE = 0.75;

export function computeMilestones(doneDates: string[], today: string): Milestone[] {
  const dates = [...new Set(doneDates)].filter((d) => d <= today).sort();
  const out: Milestone[] = [];

  for (const m of COUNT_MARKS) {
    const date = dates[m.n - 1];
    if (date)
      out.push({
        id: `lectios-${m.n}`,
        date,
        title: m.title,
        verse: m.verse,
        reference: m.reference,
      });
  }

  // Sequências: cada vez que a pessoa alcança 7 ou 40 dias seguidos.
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    run = i > 0 && addDays(dates[i - 1]!, 1) === dates[i] ? run + 1 : 1;
    for (const m of STREAK_MARKS) {
      if (run === m.n) {
        out.push({
          id: `seguidos-${m.n}-${dates[i]}`,
          date: dates[i]!,
          title: m.title,
          verse: m.verse,
          reference: m.reference,
        });
      }
    }
  }

  // Tempos litúrgicos já terminados neste ano e no anterior.
  const set = new Set(dates);
  const thisYear = liturgicalYear(today);
  const lastYear = liturgicalYear(addDays(thisYear.start, -1));
  for (const season of [...lastYear.seasons, ...thisYear.seasons]) {
    if (season.end >= today) continue;
    let total = 0;
    let done = 0;
    for (let d = season.start; d <= season.end; d = addDays(d, 1)) {
      total++;
      if (set.has(d)) done++;
    }
    if (done / total >= SEASON_SHARE) {
      const text = SEASON_MARKS[season.id];
      out.push({
        id: `tempo-${season.id}-${season.start}`,
        date: season.end,
        title: `${season.name} percorrido`,
        verse: text.verse,
        reference: text.reference,
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

const SEEN_KEY = "caminho-marcos-vistos";

/**
 * Marco recente ainda não celebrado neste aparelho. Marcos antigos (de antes desta
 * versão ou de mais de 3 dias atrás) são só registrados, sem celebração atrasada.
 */
export function nextCelebration(milestones: Milestone[], today: string): Milestone | null {
  let seen: string[] = [];
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[];
  } catch {
    // sem armazenamento: celebra de novo, sem problema
  }
  const fresh = milestones.filter((m) => !seen.includes(m.id));
  const recent = addDays(today, -3);
  const stale = fresh.filter((m) => m.date < recent).map((m) => m.id);
  if (stale.length) markSeen(stale);
  return fresh.filter((m) => m.date >= recent).at(-1) ?? null;
}

export function markSeen(ids: string[]) {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[];
    localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...seen, ...ids])]));
  } catch {
    // sem armazenamento
  }
}
