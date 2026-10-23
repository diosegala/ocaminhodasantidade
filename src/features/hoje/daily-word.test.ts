import { describe, expect, it } from "vitest";
import { dailyFor, timeAgo, WORDS, type MemoryEntry } from "./daily-word";

const entry = (date: string, meditation: string | null): MemoryEntry => ({
  date,
  reference: "Jo 15,1-8",
  meditation,
  prayer: null,
  contemplation: null,
});

describe("dailyFor", () => {
  it("é o mesmo o dia todo e muda no dia seguinte", () => {
    const a = dailyFor("2026-10-23", []);
    expect(dailyFor("2026-10-23", [])).toEqual(a);
    expect(dailyFor("2026-10-24", [])).not.toEqual(a);
  });

  it("não repete a mesma palavra em dias seguidos durante o mês", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 31; d++) {
      const day = dailyFor(`2026-10-${String(d).padStart(2, "0")}`, []);
      if (day.kind === "word") seen.add(day.word.ref);
    }
    expect(seen.size).toBe(31);
  });

  it("alterna com lembranças de pelo menos uma semana atrás", () => {
    const entries = [
      entry("2026-10-01", "Senti que preciso confiar mais e controlar menos."),
      entry("2026-10-20", "Recente demais para lembrar agora, tem só três dias."),
      entry("2026-09-15", "curto"),
    ];
    const kinds = ["2026-10-22", "2026-10-23"].map((d) => dailyFor(d, entries));
    const memory = kinds.find((k) => k.kind === "memory");
    expect(memory).toBeDefined();
    expect(memory?.kind === "memory" && memory.entry.date).toBe("2026-10-01");
    expect(kinds.some((k) => k.kind === "word")).toBe(true);
  });

  it("todas as palavras têm livro, capítulo e versículo", () => {
    for (const w of WORDS) expect(w.ref).toMatch(/^[1-3]? ?[A-ZÀ-Ú][a-zà-ú]+ \d+,\d+$/);
  });
});

describe("timeAgo", () => {
  it("fala de um jeito natural", () => {
    expect(timeAgo("2026-10-13", "2026-10-23")).toBe("há 10 dias");
    expect(timeAgo("2026-10-02", "2026-10-23")).toBe("há 3 semanas");
    expect(timeAgo("2026-07-23", "2026-10-23")).toBe("há 3 meses");
    expect(timeAgo("2025-10-23", "2026-10-23")).toBe("há um ano");
  });
});
