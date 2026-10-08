import { describe, expect, it } from "vitest";
import { computeStreak, normalizeLiturgy } from "./liturgy";

describe("normalizeLiturgy", () => {
  it("lê o formato da API principal (listas) e ignora segunda leitura vazia", () => {
    const lit = normalizeLiturgy(
      {
        liturgia: "5ª feira",
        cor: "Verde",
        leituras: {
          primeiraLeitura: [{ referencia: "Gl 3,1-5", titulo: "Leitura", texto: "Ó gálatas" }],
          salmo: [{ referencia: "Sl", refrao: "Bendito", texto: "– Fez surgir" }],
          segundaLeitura: [],
          evangelho: [{ referencia: "Lc 11,5-13", titulo: "Evangelho", texto: "Naquele tempo" }],
        },
      },
      "2026-10-08",
    );
    expect(lit?.readings.map((r) => r.kind)).toEqual(["primeira", "salmo", "evangelho"]);
  });

  it("lê o formato da reserva (objetos soltos, segunda leitura como frase)", () => {
    const lit = normalizeLiturgy(
      { evangelho: { referencia: "Jo 1,1", texto: "No princípio" }, segundaLeitura: "Não há segunda leitura hoje!" },
      "2026-10-08",
    );
    expect(lit?.readings).toHaveLength(1);
    expect(lit?.readings[0]?.referencia).toBe("Jo 1,1");
  });

  it("recusa resposta sem evangelho", () => {
    expect(normalizeLiturgy({ erro: "x" }, "2026-10-08")).toBeNull();
  });
});

describe("computeStreak", () => {
  it("conta dias seguidos até hoje", () => {
    expect(computeStreak(["2026-10-06", "2026-10-07", "2026-10-08"], "2026-10-08")).toBe(3);
  });
  it("continua valendo se a lectio de hoje ainda não foi feita", () => {
    expect(computeStreak(["2026-10-06", "2026-10-07"], "2026-10-08")).toBe(2);
  });
  it("zera quando falhou um dia", () => {
    expect(computeStreak(["2026-10-05"], "2026-10-08")).toBe(0);
  });
});
