import { describe, expect, it } from "vitest";
import {
  adventStart,
  baptism,
  easter,
  epiphany,
  liturgicalYear,
  seasonOf,
} from "./liturgical-calendar";

describe("calendário litúrgico", () => {
  it("calcula a Páscoa", () => {
    expect(easter(2024)).toBe("2024-03-31");
    expect(easter(2025)).toBe("2025-04-20");
    expect(easter(2026)).toBe("2026-04-05");
    expect(easter(2027)).toBe("2027-03-28");
  });

  it("calcula o 1º Domingo do Advento", () => {
    expect(adventStart(2024)).toBe("2024-12-01");
    expect(adventStart(2025)).toBe("2025-11-30");
    expect(adventStart(2026)).toBe("2026-11-29");
  });

  it("põe a Epifania no domingo e o Batismo na segunda quando cai em 7 ou 8", () => {
    expect(epiphany(2026)).toBe("2026-01-04");
    expect(baptism(2026)).toBe("2026-01-11");
    expect(epiphany(2024)).toBe("2024-01-07");
    expect(baptism(2024)).toBe("2024-01-08");
    expect(epiphany(2023)).toBe("2023-01-08");
    expect(baptism(2023)).toBe("2023-01-09");
  });

  it("delimita o ano litúrgico pelo Advento", () => {
    const y = liturgicalYear("2026-10-10");
    expect(y.start).toBe("2025-11-30");
    expect(y.end).toBe("2026-11-28");
    expect(liturgicalYear("2026-11-29").start).toBe("2026-11-29");
  });

  it("identifica os tempos e os domingos rosa", () => {
    expect(seasonOf("2026-10-10").id).toBe("comum");
    expect(seasonOf("2027-02-10").id).toBe("quaresma"); // Cinzas de 2027
    expect(seasonOf("2026-04-03").id).toBe("triduo"); // Sexta-feira Santa
    expect(seasonOf("2026-04-05").id).toBe("pascoa");
    expect(seasonOf("2026-05-24").id).toBe("pascoa"); // Pentecostes
    expect(seasonOf("2026-05-25").id).toBe("comum");
    expect(seasonOf("2026-12-25").id).toBe("natal");
    expect(seasonOf("2026-12-13").dayColor).toBe("rosa"); // Gaudete
    expect(seasonOf("2026-12-14").dayColor).toBe("roxo");
  });

  it("lista as festas dentro do ano", () => {
    const names = liturgicalYear("2026-10-10").feasts.map((f) => `${f.date} ${f.name}`);
    expect(names).toContain("2026-10-12 Nossa Senhora Aparecida");
    expect(names).toContain("2026-11-22 Cristo Rei");
    expect(names).toContain("2026-05-17 Ascensão do Senhor");
  });
});
