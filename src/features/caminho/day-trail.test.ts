import { describe, expect, it } from "vitest";
import { stationsDone } from "./DayTrail";

const empty = {
  reading_mark: null,
  meditation: null,
  prayer: null,
  contemplation: null,
  completed_at: null,
};

describe("trilha do dia", () => {
  it("começa com tudo apagado", () => {
    expect(stationsDone(null, false)).toEqual([false, false, false, false, false, false]);
  });

  it("conta passos anteriores como feitos quando um seguinte tem texto", () => {
    expect(stationsDone({ ...empty, prayer: "Obrigado" }, false)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it("acende a lectio inteira quando concluída, e a reflexão à parte", () => {
    expect(stationsDone({ ...empty, completed_at: "2026-10-10T12:00:00Z" }, true)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it("acende os passos rezados sem texto", () => {
    expect(stationsDone({ ...empty, steps_done: 2 }, false)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });
});
