import { describe, expect, it } from "vitest";
import { computeStreak, markRanges, normalizeLiturgy, splitVerseNumbers } from "./liturgy";

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
      {
        evangelho: { referencia: "Jo 1,1", texto: "No princípio" },
        segundaLeitura: "Não há segunda leitura hoje!",
      },
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

describe("splitVerseNumbers", () => {
  it("separa os números colados nas palavras", () => {
    expect(
      splitVerseNumbers("Naquele tempo, 37enquanto Jesus falava. 38O fariseu ficou admirado."),
    ).toEqual([
      { verse: null, text: "Naquele tempo, " },
      { verse: 37, text: "enquanto Jesus falava. " },
      { verse: 38, text: "O fariseu ficou admirado." },
    ]);
  });

  it("aceita aspas e números no começo da linha", () => {
    expect(splitVerseNumbers("1“Felizes os pobres\n2 Bem-aventurados")).toEqual([
      { verse: 1, text: "“Felizes os pobres\n" },
      { verse: 2, text: "Bem-aventurados" },
    ]);
  });

  it("funciona com textos reais da liturgia", () => {
    expect(
      splitVerseNumbers("Irmãos, 1é para a liberdade. 2Eis que eu").map((p) => p.verse),
    ).toEqual([null, 1, 2]);
    expect(splitVerseNumbers("dizendo: 2“O reino dos céus").at(-1)).toEqual({
      verse: 2,
      text: "“O reino dos céus",
    });
  });

  it("não mexe em números que fazem parte da frase", () => {
    expect(splitVerseNumbers("Jejuou 40 dias e 40 noites.")).toEqual([
      { verse: null, text: "Jejuou 40 dias e 40 noites." },
    ]);
  });
});

describe("markRanges", () => {
  const segs = splitVerseNumbers(
    "Naquele tempo, 9Pedi e recebereis. 10Pois todo aquele que pede, recebe.",
  );

  it("acha a frase dentro de um versículo", () => {
    expect(markRanges(segs, "pedi e recebereis")).toEqual([null, [0, 17], null]);
  });

  it("atravessa versículos, mesmo com o número colado na seleção", () => {
    expect(markRanges(segs, "recebereis. 10Pois todo")).toEqual([null, [7, 19], [0, 9]]);
  });

  it("não marca nada quando a frase não está no texto", () => {
    expect(markRanges(segs, "outra coisa")).toEqual([null, null, null]);
  });
});
