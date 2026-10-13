import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  catechismQueryOptions,
  parseParagraphNumber,
  searchCatechism,
  type Catechism,
} from "./data";

let cat: Catechism;

beforeAll(async () => {
  const json = readFileSync("public/catecismo.json", "utf-8");
  vi.stubGlobal("fetch", async () => new Response(json));
  cat = await (catechismQueryOptions.queryFn as () => Promise<Catechism>)();
  vi.unstubAllGlobals();
});

describe("Catecismo", () => {
  it("tem os 2865 parágrafos, cada um num capítulo", () => {
    expect(cat.searchable).toHaveLength(2865);
    expect(cat.chapterOf.size).toBe(2865);
  });

  it("traz o Prólogo corrigido", () => {
    const p1 = cat.searchable.find((p) => p.n === 1)!;
    expect(p1.text.startsWith("Deus, infinitamente perfeito")).toBe(true);
  });

  it("põe os parágrafos de fronteira no capítulo certo", () => {
    expect(cat.chapters[cat.chapterOf.get(1699)!]!.title).toBe("A dignidade da pessoa humana");
    expect(cat.chapters[cat.chapterOf.get(2759)!]!.title).toContain("Pai Nosso");
  });

  it("busca sem acentos e com a grafia do Brasil", () => {
    const r = searchCatechism(cat, "batismo porta");
    expect(r.some((p) => p.n === 1213)).toBe(true);
    expect(searchCatechism(cat, "acao de gracas").length).toBeGreaterThan(0);
  });

  it("entende o número do parágrafo", () => {
    expect(parseParagraphNumber("§ 1213")).toBe(1213);
    expect(parseParagraphNumber("CIC 27")).toBe(27);
    expect(parseParagraphNumber("3000")).toBeNull();
    expect(parseParagraphNumber("graça")).toBeNull();
  });
});
