export type ReadingKind = "primeira" | "salmo" | "segunda" | "evangelho";

export type Reading = {
  kind: ReadingKind;
  label: string;
  referencia: string;
  titulo?: string | undefined;
  refrao?: string | undefined;
  texto: string;
};

export type Liturgy = {
  date: string; // AAAA-MM-DD
  liturgia: string;
  cor: string;
  readings: Reading[];
};

const LABELS: Record<ReadingKind, string> = {
  primeira: "Primeira leitura",
  salmo: "Salmo",
  segunda: "Segunda leitura",
  evangelho: "Evangelho",
};

type RawReading = { referencia?: unknown; titulo?: unknown; refrao?: unknown; texto?: unknown };

function asList(v: unknown): RawReading[] {
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object") as RawReading[];
  if (v && typeof v === "object") return [v as RawReading];
  return []; // strings like "Não há segunda leitura hoje!"
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Converte a resposta de qualquer uma das duas APIs para um formato único. */
export function normalizeLiturgy(raw: unknown, date: string): Liturgy | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const src = (r["leituras"] && typeof r["leituras"] === "object" ? r["leituras"] : r) as Record<
    string,
    unknown
  >;
  const map: [ReadingKind, unknown][] = [
    ["primeira", src["primeiraLeitura"]],
    ["salmo", src["salmo"]],
    ["segunda", src["segundaLeitura"]],
    ["evangelho", src["evangelho"]],
  ];
  const readings: Reading[] = [];
  for (const [kind, value] of map) {
    // Quando há mais de uma opção (ex.: forma longa/breve), usa a primeira.
    const first = asList(value).find((x) => str(x.texto));
    if (!first) continue;
    readings.push({
      kind,
      label: LABELS[kind],
      referencia: str(first.referencia),
      titulo: str(first.titulo) || undefined,
      refrao: str(first.refrao) || undefined,
      texto: str(first.texto),
    });
  }
  if (!readings.some((x) => x.kind === "evangelho")) return null;
  return { date, liturgia: str(r["liturgia"]), cor: str(r["cor"]), readings };
}

/** Dias seguidos com lectio concluída, terminando hoje ou ontem. */
export function computeStreak(doneDates: string[], today: string): number {
  const set = new Set(doneDates);
  let d = new Date(today + "T12:00:00Z");
  if (!set.has(toISO(d))) d = new Date(d.getTime() - 86400000);
  let n = 0;
  while (set.has(toISO(d))) {
    n++;
    d = new Date(d.getTime() - 86400000);
  }
  return n;
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Data local do aparelho em AAAA-MM-DD. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type VerseSegment = { verse: number | null; text: string };

/**
 * A API da liturgia cola o número do versículo na palavra ("37enquanto"). Separa em
 * trechos com o número de cada versículo, para mostrá-lo pequeno como na Bíblia.
 * Conta como número de versículo: 1 a 3 dígitos grudados numa letra ou aspas, ou no
 * começo de uma linha seguidos de espaço e maiúscula. "40 dias" fica como está.
 */
export function splitVerseNumbers(text: string): VerseSegment[] {
  const re = /(^|[^\p{L}\p{N}])(\d{1,3})(?=[\p{L}“"'«(])|(^|\n)[ \t]*(\d{1,3})[ \t]+(?=\p{Lu})/gu;
  const parts: VerseSegment[] = [];
  let verse: number | null = null;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const prefix = m[1] ?? m[3] ?? "";
    const start = m.index + prefix.length;
    parts.push({ verse, text: text.slice(last, start) });
    verse = Number(m[2] ?? m[4]);
    last = m.index + m[0].length;
  }
  parts.push({ verse, text: text.slice(last) });
  return parts.filter((p) => p.verse !== null || p.text);
}
