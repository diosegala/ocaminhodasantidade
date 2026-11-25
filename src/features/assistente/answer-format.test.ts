import { describe, expect, it } from "vitest";
import { parseAnswer, parseInline } from "./answer-format";

describe("formato da resposta do assistente", () => {
  it("liga parágrafos do Catecismo e trechos da Bíblia", () => {
    expect(parseInline("Veja § 1213 e [[Jo 3,5]].")).toEqual([
      { kind: "text", text: "Veja " },
      { kind: "cic", text: "§ 1213", n: 1213 },
      { kind: "text", text: " e " },
      { kind: "bible", text: "Jo 3,5", ref: "Jo 3,5" },
      { kind: "text", text: "." },
    ]);
  });

  it("aceita intervalo de parágrafos e ignora números fora do Catecismo", () => {
    expect(parseInline("§§ 1213-1216")[0]).toEqual({ kind: "cic", text: "§§ 1213-1216", n: 1213 });
    expect(parseInline("§ 9999")).toEqual([{ kind: "text", text: "§ 9999" }]);
  });

  it("separa parágrafos e listas, e tira negrito e títulos", () => {
    const blocks = parseAnswer("# Título\nUm **ponto**.\n\n- primeiro\n- segundo\nfim");
    expect(blocks.map((b) => b.kind)).toEqual(["p", "list", "p"]);
    expect(blocks[0]).toEqual({ kind: "p", parts: [{ kind: "text", text: "Título Um ponto." }] });
  });
});
