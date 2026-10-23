import { describe, expect, it } from "vitest";
import { greeting, pauseFor, PAUSES, welcomeFor } from "./messages";

const base = { name: "Maria Clara", seasonName: "Tempo Comum", streak: 0, lectioDoneToday: false };

describe("welcomeFor", () => {
  it("cumprimenta pela hora e pelo primeiro nome", () => {
    expect(welcomeFor({ ...base, hour: 8 }).title).toBe("Bom dia, Maria");
    expect(welcomeFor({ ...base, hour: 15 }).title).toBe("Boa tarde, Maria");
    expect(welcomeFor({ ...base, hour: 20, name: "" }).title).toBe("Boa noite");
    expect(greeting(2)).toBe("Boa noite");
  });

  it("convida para a lectio quando ainda não foi feita", () => {
    const m = welcomeFor({ ...base, hour: 9, streak: 4 });
    expect(m.body).toContain("4 dias seguidos");
    expect(m.action?.to).toBe("lectio");
  });

  it("à noite, lembra que ainda dá tempo", () => {
    expect(welcomeFor({ ...base, hour: 22 }).body).toContain("Ainda dá tempo");
  });

  it("depois da lectio, só acompanha", () => {
    const m = welcomeFor({ ...base, hour: 9, lectioDoneToday: true, streak: 7 });
    expect(m.body).toContain("7 dias seguidos");
    expect(m.action?.to).toBe("caminho");
  });
});

describe("pauseFor", () => {
  it("muda a cada dia e a segunda pausa convida a descansar", () => {
    const titles = new Set(
      Array.from(
        { length: PAUSES.length },
        (_, i) => pauseFor(`2026-11-${String(i + 1).padStart(2, "0")}`, 0).title,
      ),
    );
    expect(titles.size).toBe(PAUSES.length);
    expect(pauseFor("2026-11-01", 1).title).toBe("Descanse um pouco");
  });
});
