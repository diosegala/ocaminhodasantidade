// Calendário litúrgico (rito romano, regras do Brasil), calculado no aparelho para
// funcionar offline. Datas em "AAAA-MM-DD"; as contas usam meio-dia UTC para não
// sofrer com horário de verão.

import { stripAccents } from "@/features/biblia/reference";

export type LitColor = "verde" | "roxo" | "branco" | "vermelho" | "rosa";

export type SeasonId = "advento" | "natal" | "comum" | "quaresma" | "triduo" | "pascoa";

export type Season = { id: SeasonId; name: string; color: LitColor; start: string; end: string };

export type Feast = { date: string; name: string };

export type LiturgicalYear = {
  start: string;
  end: string;
  seasons: Season[];
  feasts: Feast[];
  roseSundays: string[];
};

const DAY = 86400000;

function utc(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parse(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return utc(y!, m!, d!);
}

export function addDays(date: string, n: number) {
  return iso(new Date(parse(date).getTime() + n * DAY));
}

export function daysBetween(from: string, to: string) {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY);
}

/** Dia da semana (0 = domingo). */
export function weekday(date: string) {
  return parse(date).getUTCDay();
}

/** Páscoa pelo algoritmo gregoriano anônimo (Meeus/Jones/Butcher). */
export function easter(y: number): string {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(utc(y, month, day));
}

/** 1º Domingo do Advento: quatro domingos antes do Natal. */
export function adventStart(y: number): string {
  const christmas = `${y}-12-25`;
  return addDays(christmas, -(weekday(christmas) || 7) - 21);
}

/** Epifania no Brasil: domingo entre 2 e 8 de janeiro. */
export function epiphany(y: number): string {
  const jan2 = `${y}-01-02`;
  return addDays(jan2, (7 - weekday(jan2)) % 7);
}

/** Batismo do Senhor: domingo após a Epifania; segunda-feira se ela cair em 7 ou 8. */
export function baptism(y: number): string {
  const ep = epiphany(y);
  return addDays(ep, Number(ep.slice(8)) >= 7 ? 1 : 7);
}

const cache = new Map<number, LiturgicalYear>();

/** Ano litúrgico que começa no Advento do ano civil `y`. */
function yearStartingIn(y: number): LiturgicalYear {
  const hit = cache.get(y);
  if (hit) return hit;
  const advent = adventStart(y);
  const nextAdvent = adventStart(y + 1);
  const ny = y + 1;
  const ea = easter(ny);
  const ash = addDays(ea, -46);
  const bap = baptism(ny);
  const pentecost = addDays(ea, 49);

  const seasons: Season[] = [
    { id: "advento", name: "Advento", color: "roxo", start: advent, end: `${y}-12-24` },
    { id: "natal", name: "Tempo do Natal", color: "branco", start: `${y}-12-25`, end: bap },
    {
      id: "comum",
      name: "Tempo Comum",
      color: "verde",
      start: addDays(bap, 1),
      end: addDays(ash, -1),
    },
    { id: "quaresma", name: "Quaresma", color: "roxo", start: ash, end: addDays(ea, -4) },
    {
      id: "triduo",
      name: "Tríduo Pascal",
      color: "vermelho",
      start: addDays(ea, -3),
      end: addDays(ea, -1),
    },
    { id: "pascoa", name: "Tempo Pascal", color: "branco", start: ea, end: pentecost },
    {
      id: "comum",
      name: "Tempo Comum",
      color: "verde",
      start: addDays(pentecost, 1),
      end: addDays(nextAdvent, -1),
    },
  ];

  const feasts: Feast[] = [
    { date: `${y}-12-08`, name: "Imaculada Conceição" },
    { date: `${y}-12-25`, name: "Natal do Senhor" },
    { date: `${ny}-01-01`, name: "Santa Maria, Mãe de Deus" },
    { date: epiphany(ny), name: "Epifania do Senhor" },
    { date: bap, name: "Batismo do Senhor" },
    { date: ash, name: "Quarta-feira de Cinzas" },
    { date: addDays(ea, -7), name: "Domingo de Ramos" },
    { date: ea, name: "Páscoa do Senhor" },
    { date: addDays(ea, 42), name: "Ascensão do Senhor" },
    { date: pentecost, name: "Pentecostes" },
    { date: addDays(ea, 56), name: "Santíssima Trindade" },
    { date: addDays(ea, 60), name: "Corpus Christi" },
    { date: `${ny}-10-12`, name: "Nossa Senhora Aparecida" },
    { date: addDays(nextAdvent, -7), name: "Cristo Rei" },
  ]
    .filter((f) => f.date >= advent && f.date < nextAdvent)
    .sort((a, b) => a.date.localeCompare(b.date));

  const year: LiturgicalYear = {
    start: advent,
    end: addDays(nextAdvent, -1),
    seasons,
    feasts,
    roseSundays: [addDays(advent, 14), addDays(ea, -21)],
  };
  cache.set(y, year);
  return year;
}

/** Ano litúrgico que contém a data (do 1º Domingo do Advento ao sábado antes do próximo). */
export function liturgicalYear(date: string): LiturgicalYear {
  const y = Number(date.slice(0, 4));
  return date >= adventStart(y) ? yearStartingIn(y) : yearStartingIn(y - 1);
}

/** Tempo litúrgico da data, com a cor do dia (rosa nos domingos Gaudete e Laetare). */
export function seasonOf(date: string): Season & { dayColor: LitColor } {
  const year = liturgicalYear(date);
  const season = year.seasons.find((s) => date >= s.start && date <= s.end)!;
  return { ...season, dayColor: year.roseSundays.includes(date) ? "rosa" : season.color };
}

/** Classes por cor, escritas por extenso para o Tailwind encontrá-las. */
export const LIT_CLASSES: Record<
  LitColor,
  { bg: string; ring: string; text: string; stroke: string }
> = {
  verde: {
    bg: "bg-lit-verde",
    ring: "ring-lit-verde",
    text: "text-lit-verde",
    stroke: "stroke-lit-verde",
  },
  roxo: {
    bg: "bg-lit-roxo",
    ring: "ring-lit-roxo",
    text: "text-lit-roxo",
    stroke: "stroke-lit-roxo",
  },
  branco: {
    bg: "bg-lit-branco",
    ring: "ring-lit-branco",
    text: "text-lit-branco",
    stroke: "stroke-lit-branco",
  },
  vermelho: {
    bg: "bg-lit-vermelho",
    ring: "ring-lit-vermelho",
    text: "text-lit-vermelho",
    stroke: "stroke-lit-vermelho",
  },
  rosa: {
    bg: "bg-lit-rosa",
    ring: "ring-lit-rosa",
    text: "text-lit-rosa",
    stroke: "stroke-lit-rosa",
  },
};

/** Converte a cor escrita pela API da liturgia ("Verde", "Roxo"…) para LitColor. */
export function parseLitColor(cor: string | undefined): LitColor | null {
  const word = stripAccents(cor ?? "").split(/\s/)[0] ?? "";
  return word in LIT_CLASSES ? (word as LitColor) : null;
}
