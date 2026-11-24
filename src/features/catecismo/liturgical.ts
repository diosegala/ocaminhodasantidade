// "Catecismo de hoje": parágrafos do Catecismo ligados ao tempo litúrgico.
// - Solenidades e dias santos têm trechos próprios (FEASTS).
// - Advento, Natal, Quaresma e Páscoa percorrem um roteiro (SEASONS), distribuído por
//   igual entre os dias do tempo que não são festa, para terminar no último dia.
// - No Tempo Comum, o Catecismo é lido em ordem, do § 1 em diante, 3 parágrafos por dia,
//   continuando de um ano para o outro.
// Todo mundo vê o mesmo trecho no mesmo dia. Os números foram conferidos no texto do app.

import {
  addDays,
  daysBetween,
  easter,
  liturgicalYear,
  seasonOf,
  type SeasonId,
} from "@/features/caminho/liturgical-calendar";

export type Section = { title: string; from: number; to: number };

export type CatechismOfDay = {
  /** Tema do trecho, para o título do cartão. */
  title: string;
  /** Números dos parágrafos, em ordem. */
  paragraphs: number[];
  /** De onde veio: festa, roteiro do tempo, ou leitura contínua do Tempo Comum. */
  source: "festa" | "tempo" | "sequencia";
};

const s = (title: string, from: number, to = from): Section => ({ title, from, to });

/** Trechos próprios de festas, pelo nome usado no calendário litúrgico do app. */
export const FEASTS: Record<string, Section[]> = {
  "Imaculada Conceição": [s("A Imaculada Conceição", 490, 493)],
  "Natal do Senhor": [s("O mistério do Natal", 525, 526)],
  "Santa Maria, Mãe de Deus": [s("Maria, Mãe de Deus", 495), s("Santa Maria, Mãe de Deus", 2677)],
  "Epifania do Senhor": [s("A Epifania", 528)],
  "Batismo do Senhor": [s("O Batismo de Jesus", 535, 537)],
  "Quarta-feira de Cinzas": [
    s("A penitência interior", 1430, 1431),
    s("Os tempos de penitência", 1438),
  ],
  "Domingo de Ramos": [s("A entrada messiânica em Jerusalém", 559, 560)],
  "Quinta-feira Santa": [s("A instituição da Eucaristia", 1337, 1340), s("A Ceia", 610, 611)],
  "Sexta-feira da Paixão": [s("O sacrifício de Cristo na cruz", 613, 618)],
  "Sábado Santo": [s("Cristo no sepulcro", 624), s("Desceu à mansão dos mortos", 631, 635)],
  "Páscoa do Senhor": [s("Ressuscitou ao terceiro dia", 638, 640)],
  "Ascensão do Senhor": [s("Subiu aos céus", 659, 664)],
  Pentecostes: [s("Pentecostes", 731, 732)],
  "Santíssima Trindade": [
    s("O mistério central da fé", 234),
    s("O dogma da Santíssima Trindade", 253, 256),
  ],
  "Corpus Christi": [s("A presença real de Cristo na Eucaristia", 1373, 1377)],
  "Nossa Senhora Aparecida": [
    s("O culto à Virgem Maria", 971),
    s("A Ave-Maria", 2676),
    s("Maria, a orante perfeita", 2679),
  ],
  "Cristo Rei": [s("Cristo reina", 668, 670)],
};

/** Roteiro de cada tempo forte, em ordem. */
export const SEASONS: Partial<Record<SeasonId, Section[]>> = {
  advento: [
    s("Ele virá de novo na glória", 671, 682),
    s("A preparação para a vinda do Filho", 522, 524),
    s("O Messias anunciado pelos profetas", 711, 716),
    s("João Batista, o precursor", 717, 720),
    s("A Anunciação", 484, 486),
    s("A missão de Maria", 487, 489),
    s("Concebido pelo Espírito Santo, nascido da Virgem Maria", 494, 494),
    s("Concebido pelo Espírito Santo, nascido da Virgem Maria", 496, 507),
  ],
  natal: [
    s("Por que o Verbo se fez carne", 456, 460),
    s("A Encarnação", 461, 463),
    s("Verdadeiro Deus e verdadeiro homem", 464, 469),
    s("A circuncisão de Jesus", 527),
    s("A apresentação no Templo", 529),
    s("A fuga para o Egito", 530),
    s("A vida oculta em Nazaré", 531, 534),
  ],
  quaresma: [
    s("As tentações de Jesus", 538, 540),
    s("A oração na vida cristã", 2558, 2565),
    s("A penitência interior", 1432, 1437),
    s("O filho pródigo", 1439),
    s("O jejum e os preceitos da Igreja", 2041, 2043),
    s("A misericórdia e o pecado", 1846, 1851),
    s("O sacramento da Penitência", 1422, 1429),
    s("Só Deus perdoa os pecados", 1440, 1449),
    s("O mistério pascal", 571, 573),
    s("A morte de Cristo no plano de Deus", 599, 605),
  ],
  pascoa: [
    s("Os testemunhos da Ressurreição", 641, 647),
    s("A Ressurreição, obra da Trindade", 648, 650),
    s("O sentido da Ressurreição", 651, 658),
    s("Cristo, cabeça da Igreja, precede-nos", 665, 667),
    s("A Páscoa, festa das festas", 1168, 1171),
    s("Os sacramentos da iniciação cristã", 1212, 1213),
    s("Os efeitos do Batismo", 1262, 1270),
    s("A Confirmação", 1285, 1289),
    s("A Eucaristia, fonte e cume", 1322, 1327),
    s("Os frutos da Comunhão", 1391, 1397),
    s("O Espírito Santo e a Igreja", 733, 741),
  ],
};

/** Primeiro dia da leitura contínua do Tempo Comum (começa no § 1). */
export const SEQUENCE_START = "2026-11-23";
export const SEQUENCE_PER_DAY = 3;
export const LAST_PARAGRAPH = 2865;

const expand = (sections: Section[]) =>
  sections.flatMap((sec) => Array.from({ length: sec.to - sec.from + 1 }, (_, i) => sec.from + i));

function titleFor(sections: Section[], n: number) {
  return sections.find((sec) => n >= sec.from && n <= sec.to)?.title ?? "";
}

/** Nome da festa do dia, incluindo os dias do Tríduo, que o calendário não lista. */
export function feastOf(date: string): string | null {
  const ea = easter(Number(date.slice(0, 4)));
  const triduo: Record<string, string> = {
    [addDays(ea, -3)]: "Quinta-feira Santa",
    [addDays(ea, -2)]: "Sexta-feira da Paixão",
    [addDays(ea, -1)]: "Sábado Santo",
  };
  if (triduo[date]) return triduo[date]!;
  const feast = liturgicalYear(date).feasts.find((f) => f.date === date);
  return feast && FEASTS[feast.name] ? feast.name : null;
}

/** Dias do intervalo [from, to] que não são festa com trecho próprio. */
function plainDays(from: string, to: string) {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (!feastOf(d)) days.push(d);
  return days;
}

export function catechismOfDay(date: string): CatechismOfDay {
  const feast = feastOf(date);
  if (feast) {
    const sections = FEASTS[feast]!;
    return { title: sections[0]!.title, paragraphs: expand(sections), source: "festa" };
  }

  const season = seasonOf(date);
  const plan = SEASONS[season.id];
  if (plan) {
    // Distribui o roteiro por igual entre os dias comuns do tempo.
    const days = plainDays(season.start, season.end);
    const all = expand(plan);
    const i = days.indexOf(date);
    const start = Math.floor((i * all.length) / days.length);
    const end = Math.floor(((i + 1) * all.length) / days.length);
    const paragraphs = all.slice(start, Math.max(end, start + 1));
    return { title: titleFor(plan, paragraphs[0]!), paragraphs, source: "tempo" };
  }

  // Tempo Comum: leitura contínua, só nos dias comuns desse tempo, desde SEQUENCE_START.
  const count = ordinaryDaysBefore(date);
  const first = ((count * SEQUENCE_PER_DAY) % LAST_PARAGRAPH) + 1;
  const paragraphs = Array.from(
    { length: SEQUENCE_PER_DAY },
    (_, i) => ((first - 1 + i) % LAST_PARAGRAPH) + 1,
  );
  return { title: "", paragraphs, source: "sequencia" };
}

/** Dias comuns do Tempo Comum de SEQUENCE_START até o dia anterior a `date`. */
function ordinaryDaysBefore(date: string) {
  let count = 0;
  let year = liturgicalYear(SEQUENCE_START);
  while (year.start < date) {
    for (const season of year.seasons) {
      if (season.id !== "comum") continue;
      const from = season.start > SEQUENCE_START ? season.start : SEQUENCE_START;
      const to = season.end < date ? season.end : addDays(date, -1);
      if (from > to) continue;
      const feasts = year.feasts.filter((f) => f.date >= from && f.date <= to && FEASTS[f.name]);
      count += daysBetween(from, to) + 1 - feasts.length;
    }
    year = liturgicalYear(addDays(year.end, 1));
  }
  return count;
}
