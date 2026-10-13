import { describe, expect, it } from "vitest";
import { addDays } from "./liturgical-calendar";
import { computeMilestones } from "./milestones";

const run = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i));

describe("marcos do caminho", () => {
  it("celebra a primeira lectio e as contagens", () => {
    const ids = computeMilestones(run("2026-09-01", 8), "2026-10-13").map((m) => m.id);
    expect(ids).toContain("lectios-1");
    expect(ids).toContain("lectios-7");
    expect(ids).not.toContain("lectios-30");
  });

  it("marca 7 dias seguidos na data em que foram alcançados", () => {
    const m = computeMilestones(run("2026-09-01", 9), "2026-10-13").find((x) =>
      x.id.startsWith("seguidos-7"),
    );
    expect(m?.date).toBe("2026-09-07");
  });

  it("não celebra sequência quebrada", () => {
    const dates = [...run("2026-09-01", 6), ...run("2026-09-08", 6)];
    expect(computeMilestones(dates, "2026-10-13").some((m) => m.id.startsWith("seguidos-7"))).toBe(
      false,
    );
  });

  it("dá o tempo litúrgico como percorrido com 75% dos dias", () => {
    // Quaresma de 2026: 18/02 a 01/04 (43 dias); 33 dias = 77%.
    const ids = computeMilestones(run("2026-02-18", 33), "2026-10-13").map((m) => m.id);
    expect(ids).toContain("tempo-quaresma-2026-02-18");
    const few = computeMilestones(run("2026-02-18", 20), "2026-10-13").map((m) => m.id);
    expect(few).not.toContain("tempo-quaresma-2026-02-18");
  });

  it("ignora datas futuras", () => {
    expect(computeMilestones(["2026-12-01"], "2026-10-13")).toEqual([]);
  });
});
