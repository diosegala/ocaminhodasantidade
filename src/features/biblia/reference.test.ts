import { describe, expect, it } from "vitest";
import {
  describeReference,
  parseBook,
  parseReference,
  suggestBooks,
  type BookLite,
} from "./reference";

// Livros na ordem da Bíblia católica: [abreviação, nome, capítulos].
const RAW: [string, string, number][] = [
  ["Gn", "Gênesis", 50],
  ["Ex", "Êxodo", 40],
  ["Lv", "Levítico", 27],
  ["Nm", "Números", 36],
  ["Dt", "Deuteronômio", 34],
  ["Js", "Josué", 24],
  ["Jz", "Juízes", 21],
  ["Rt", "Rute", 4],
  ["1Sm", "I Samuel", 31],
  ["2Sm", "II Samuel", 24],
  ["1Rs", "I Reis", 22],
  ["2Rs", "II Reis", 25],
  ["Tb", "Tobias", 14],
  ["Jó", "Jó", 42],
  ["Sl", "Salmos", 150],
  ["Pr", "Provérbios", 31],
  ["Ecl", "Eclesiastes", 12],
  ["Ct", "Cântico dos Cânticos", 8],
  ["Sb", "Sabedoria", 19],
  ["Eclo", "Eclesiástico", 51],
  ["Is", "Isaías", 66],
  ["Jr", "Jeremias", 52],
  ["Jl", "Joel", 4],
  ["Jn", "Jonas", 4],
  ["Ml", "Malaquias", 3],
  ["Mt", "Mateus", 28],
  ["Mc", "Marcos", 16],
  ["Lc", "Lucas", 24],
  ["Jo", "João", 21],
  ["At", "Atos dos Apóstolos", 28],
  ["Rm", "Romanos", 16],
  ["1Cor", "I Coríntios", 16],
  ["2Cor", "II Coríntios", 13],
  ["Fl", "Filipenses", 4],
  ["2Tm", "II Timóteo", 4],
  ["Hb", "Hebreus", 13],
  ["1Jo", "I João", 5],
  ["Ap", "Apocalipse", 22],
];

const books: BookLite[] = RAW.map(([abbreviation, name, chapter_count], i) => ({
  id: i + 1,
  abbreviation,
  name,
  chapter_count,
  testament: i < 25 ? "AT" : "NT",
  book_order: i + 1,
}));

const ref = (input: string) => {
  const r = parseReference(input, books);
  return r && describeReference(r);
};

describe("parseReference", () => {
  it.each([
    ["Jo 15,1-8", "João 15,1-8"],
    ["jo 15, 1 - 8", "João 15,1-8"],
    ["João 3:16", "João 3,16"],
    ["joao 3 16", "João 3,16"],
    ["Jo3,16", "João 3,16"],
    ["Jo 3.16", "João 3,16"],
    ["Jo 15,1 a 8", "João 15,1-8"],
    ["Jo 15,1 até 8", "João 15,1-8"],
    ["Jo 15,1–8", "João 15,1-8"],
    ["Jo 15", "João 15"],
    ["2Tm 3,14-17", "II Timóteo 3,14-17"],
    ["2 Tm 3,14", "II Timóteo 3,14"],
    ["2 timoteo 3", "II Timóteo 3"],
    ["1 cor 13,4-7", "I Coríntios 13,4-7"],
    ["1cor 13", "I Coríntios 13"],
    ["I Coríntios 13", "I Coríntios 13"],
    ["1ª Coríntios 13", "I Coríntios 13"],
    ["Primeira carta aos Coríntios 13, 4 a 7", "I Coríntios 13,4-7"],
    ["Evangelho segundo São João 3,16", "João 3,16"],
    ["Evangelho de Mateus 5", "Mateus 5"],
    ["mat 5,3", "Mateus 5,3"],
    ["mateos 5", "Mateus 5"],
    ["Lucas cap 15 vers 11", "Lucas 15,11"],
    ["Salmo 23", "Salmos 23"],
    ["sl 23,1", "Salmos 23,1"],
    ["salmos 119, 105", "Salmos 119,105"],
    ["Jó 1", "Jó 1"],
    ["job 1", "Jó 1"],
    ["1 Jo 4,8", "I João 4,8"],
    ["Atos 2,42", "Atos dos Apóstolos 2,42"],
    ["Cântico 2", "Cântico dos Cânticos 2"],
    ["Ecl 3,1", "Eclesiastes 3,1"],
    ["Eclo 3,1", "Eclesiástico 3,1"],
    ["apocalipse 21", "Apocalipse 21"],
    ["Jo 3,16.18", "João 3,16"],
    ["genisis 1", "Gênesis 1"],
  ])("%s → %s", (input, expected) => {
    expect(ref(input)).toBe(expected);
  });

  it.each([
    ["Jo 22", "capítulo que não existe"],
    ["ma 1", "livro ambíguo (Malaquias, Mateus, Marcos)"],
    ["cor 13", "sem dizer se é 1 ou 2 Coríntios"],
    ["ecles 1", "Eclesiastes ou Eclesiástico"],
    ["amor", "só uma palavra"],
    ["xyz 3", "livro desconhecido"],
  ])("não adivinha: %s (%s)", (input) => {
    expect(parseReference(input, books)).toBeNull();
  });
});

describe("parseBook", () => {
  it("reconhece só o livro", () => {
    expect(parseBook("joão", books)?.abbreviation).toBe("Jo");
    expect(parseBook("salmos", books)?.abbreviation).toBe("Sl");
    expect(parseBook("1 cor", books)?.abbreviation).toBe("1Cor");
  });
  it("não confunde com busca de palavras", () => {
    expect(parseBook("amor", books)).toBeNull();
    expect(parseBook("Jo 3", books)).toBeNull();
  });
});

describe("suggestBooks", () => {
  it("sugere os livros possíveis", () => {
    expect(suggestBooks("cor 13", books).map((b) => b.abbreviation)).toEqual(["1Cor", "2Cor"]);
    expect(suggestBooks("ecles", books).map((b) => b.abbreviation)).toEqual(["Ecl", "Eclo"]);
    expect(suggestBooks("j", books)).toEqual([]);
  });
});
