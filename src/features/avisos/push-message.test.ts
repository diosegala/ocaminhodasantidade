import { describe, expect, it } from "vitest";
import { brasiliaNow, dailyPush } from "./push-message";

describe("brasiliaNow", () => {
  it("usa o horário de Brasília, não o do servidor", () => {
    // 02:30 UTC do dia 24 ainda é 23h do dia 23 em Brasília.
    expect(brasiliaNow(new Date("2026-10-24T02:30:00Z"))).toEqual({ date: "2026-10-23", hour: 23 });
    expect(brasiliaNow(new Date("2026-10-23T10:00:00Z"))).toEqual({ date: "2026-10-23", hour: 7 });
  });
});

describe("dailyPush", () => {
  it("não avisa quem já rezou hoje", () => {
    expect(dailyPush("2026-10-23", true, 5)).toBeNull();
  });
  it("convida com a palavra do dia e celebra a sequência", () => {
    const m = dailyPush("2026-10-23", false, 4)!;
    expect(m.title).toBe("4 dias seguidos no caminho");
    expect(m.url).toBe("/lectio");
    expect(dailyPush("2026-10-23", false, 0)!.title).toBe("Sua lectio de hoje");
  });
});
