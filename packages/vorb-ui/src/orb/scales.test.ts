import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORB_SCALE,
  ORB_SCALES,
  getOrbTransitionDuration,
  interpolateOrbVisualState,
  resolveOrbScale,
} from "./scales";

describe("orb scales", () => {
  it("ships an immutable crystal default and four named scales", () => {
    expect(DEFAULT_ORB_SCALE).toBe("crystal");
    expect(Object.keys(ORB_SCALES)).toEqual(["crystal", "ember", "iris", "lagoon"]);
    expect(Object.isFrozen(ORB_SCALES.crystal.states.thinking)).toBe(true);
  });

  it("deeply extends a built-in without changing its source definition", () => {
    const resolved = resolveOrbScale({
      base: "crystal",
      colors: { main: { base: "rebeccapurple" } },
      states: { thinking: { turbulence: 0.42 } },
      transitions: { defaultMs: 360 },
    });

    expect(resolved.colors.main.base).toBe("rebeccapurple");
    expect(resolved.colors.main.deep).toBe("#263b72");
    expect(resolved.states.thinking.turbulence).toBe(0.42);
    expect(resolved.states.thinking.vortexCount).toBe(3);
    expect(resolved.transitions.defaultMs).toBe(360);
    expect(ORB_SCALES.crystal.colors.main.base).toBe("#5b7cda");
  });

  it("clamps custom state and transition values", () => {
    const resolved = resolveOrbScale({
      base: "lagoon",
      states: {
        thinking: {
          turbulence: 4,
          flowSpeed: Number.NaN,
          vortexCount: 12,
        },
      },
      transitions: { errorOnsetMs: 9000 },
    });

    expect(resolved.states.thinking.turbulence).toBe(1);
    expect(resolved.states.thinking.flowSpeed).toBe(0);
    expect(resolved.states.thinking.vortexCount).toBe(3);
    expect(resolved.transitions.errorOnsetMs).toBe(3000);
  });

  it("selects transition timings by state relationship", () => {
    const timings = ORB_SCALES.crystal.transitions;
    expect(getOrbTransitionDuration("idle", "listening", timings)).toBe(700);
    expect(getOrbTransitionDuration("thinking", "speaking", timings)).toBe(400);
    expect(getOrbTransitionDuration("speaking", "error", timings)).toBe(150);
    expect(getOrbTransitionDuration("error", "idle", timings)).toBe(950);
  });

  it("interpolates every visual value without mutating endpoints", () => {
    const from = ORB_SCALES.crystal.states.idle;
    const to = ORB_SCALES.crystal.states.thinking;
    const result = interpolateOrbVisualState(from, to, 0.5);

    expect(result.turbulence).toBeCloseTo(0.4);
    expect(result.vortexCount).toBe(2);
    expect(result.tonePosition).toBeCloseTo(0.57);
    expect(from.turbulence).toBe(0.15);
    expect(to.turbulence).toBe(0.65);
  });
});
