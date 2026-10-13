import { queryOptions } from "@tanstack/react-query";
import { stripAccents } from "@/features/biblia/reference";

// public/catecismo.json: texto do Vaticano, corrigido e sem duplicatas (ver "fonte").
// Ao trocar o arquivo, aumente a versão para o service worker baixar a nova cópia.
const URL_CATECISMO = "/catecismo.json?v=1";

type RawFile = {
  fonte: string;
  partes: { n: number; t: string; c: { t: string; p: [number, string][] }[] }[];
};

export type Chapter = {
  index: number;
  part: number;
  partTitle: string;
  title: string;
  first: number;
  last: number;
  paragraphs: { n: number; text: string }[];
};

export type Catechism = {
  chapters: Chapter[];
  /** Capítulo de cada parágrafo, pelo número (§). */
  chapterOf: Map<number, number>;
  /** Texto sem acentos, para a busca. */
  searchable: { n: number; chapter: number; plain: string; text: string }[];
};

export const catechismQueryOptions = queryOptions({
  queryKey: ["catecismo"],
  queryFn: async (): Promise<Catechism> => {
    const res = await fetch(URL_CATECISMO);
    if (!res.ok) throw new Error("Não consegui carregar o Catecismo.");
    const raw = (await res.json()) as RawFile;
    const chapters: Chapter[] = [];
    for (const part of raw.partes) {
      for (const c of part.c) {
        chapters.push({
          index: chapters.length,
          part: part.n,
          partTitle: part.t,
          title: c.t,
          first: c.p[0]![0],
          last: c.p.at(-1)![0],
          paragraphs: c.p.map(([n, text]) => ({ n, text })),
        });
      }
    }
    const chapterOf = new Map<number, number>();
    const searchable: Catechism["searchable"] = [];
    for (const ch of chapters) {
      for (const p of ch.paragraphs) {
        chapterOf.set(p.n, ch.index);
        searchable.push({ n: p.n, chapter: ch.index, plain: searchForm(p.text), text: p.text });
      }
    }
    return { chapters, chapterOf, searchable };
  },
  staleTime: Infinity,
  gcTime: Infinity,
});

/**
 * Forma de busca: sem acentos e sem as consoantes mudas do português de Portugal
 * (o texto do Vaticano escreve "Baptismo", "acção", "óptimo"). Aplicada ao texto e à
 * busca, faz "batismo" encontrar "Baptismo".
 */
export function searchForm(s: string) {
  return stripAccents(s).replace(/([aeiou])[cp](?=[ct])/g, "$1");
}

/** Busca por palavras (todas precisam aparecer), sem acentos. */
export function searchCatechism(cat: Catechism, term: string, limit = 50) {
  const words = searchForm(term)
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (!words.length) return [];
  const out: Catechism["searchable"] = [];
  for (const p of cat.searchable) {
    if (words.every((w) => p.plain.includes(w))) {
      out.push(p);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** "§ 1213", "1213" ou "CIC 1213" → 1213. */
export function parseParagraphNumber(term: string): number | null {
  const m = term.trim().match(/^(?:cic|ccc|§)?\s*(\d{1,4})$/i);
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 2865 ? n : null;
}
