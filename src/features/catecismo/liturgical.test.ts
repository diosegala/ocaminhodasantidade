import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { addDays, liturgicalYear } from "@/features/caminho/liturgical-calendar";
import { catechismOfDay, FEASTS, feastOf, SEASONS } from "./liturgical";

const raw = JSON.parse(readFileSync("public/catecismo.json", "utf8")) as {
  partes: { c: { p: [number, string][] }[] }[];
};
const existing = new Set(raw.partes.flatMap((p) => p.c.flatMap((c) => c.p.map(([n]) => n))));

const sections = [...Object.values(FEASTS), ...Object.values(SEASONS)].flat();
const years = ["2026-12-15", "2027-12-15", "2028-12-15", "2031-12-15"].map(liturgicalYear);

describe("Catecismo de hoje", () => {
  it("só usa parágrafos que existem no texto do app", () => {
    for (const sec of sections) {
      expect(sec.from <= sec.to).toBe(true);
      for (let n = sec.from; n <= sec.to; n++) expect(existing.has(n), `§ ${n}`).toBe(true);
    }
  });

  it("todo dia tem pelo menos um parágrafo, em vários anos", () => {
    for (const y of years) {
      for (let d = y.start; d <= y.end; d = addDays(d, 1)) {
        expect(catechismOfDay(d).paragraphs.length, d).toBeGreaterThan(0);
      }
    }
  });

  it("percorre o roteiro de cada tempo inteiro, uma vez e em ordem", () => {
    for (const y of years) {
      for (const season of y.seasons) {
        const plan = SEASONS[season.id];
        if (!plan) continue;
        const read: number[] = [];
        for (let d = season.start; d <= season.end; d = addDays(d, 1)) {
          const day = catechismOfDay(d);
          if (day.source === "tempo") read.push(...day.paragraphs);
        }
        const all = plan.flatMap((sec) =>
          Array.from({ length: sec.to - sec.from + 1 }, (_, i) => sec.from + i),
        );
        expect(read, `${season.id} ${season.start}`).toEqual(all);
      }
    }
  });

  it("usa o trecho próprio nas festas, inclusive no Tríduo", () => {
    expect(feastOf("2026-12-08")).toBe("Imaculada Conceição");
    expect(catechismOfDay("2026-12-08").paragraphs).toEqual([490, 491, 492, 493]);
    // Páscoa de 2027: 28/03.
    expect(feastOf("2027-03-25")).toBe("Quinta-feira Santa");
    expect(feastOf("2027-03-26")).toBe("Sexta-feira da Paixão");
    expect(feastOf("2027-03-27")).toBe("Sábado Santo");
    expect(catechismOfDay("2027-03-28").source).toBe("festa");
  });

  it("começa a leitura contínua no § 1 e segue 3 por dia", () => {
    expect(catechismOfDay("2026-11-23").paragraphs).toEqual([1, 2, 3]);
    expect(catechismOfDay("2026-11-24").paragraphs).toEqual([4, 5, 6]);
  });

  it("retoma a leitura contínua depois dos tempos fortes, de onde parou", () => {
    // Último dia comum antes do Advento de 2026 (29/11) é 28/11: 6º dia, §§ 16-18.
    expect(catechismOfDay("2026-11-28").paragraphs).toEqual([16, 17, 18]);
    // Batismo do Senhor em 2027 é 10/01; o Tempo Comum começa em 11/01.
    expect(catechismOfDay("2027-01-11").paragraphs).toEqual([19, 20, 21]);
  });
});
