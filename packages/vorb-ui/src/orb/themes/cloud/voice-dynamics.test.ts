import { describe, expect, it } from "vitest";
import { createVoiceDynamicsState, stepVoiceDynamics } from "./voice-dynamics";

const defaults = {
  active: true,
  attack: 0.65,
  release: 0.22,
  deltaFrames: 1,
};

function stepMany(sample: number, count: number, deltaFrames = 1) {
  const state = createVoiceDynamicsState();
  for (let index = 0; index < count; index += 1) {
    stepVoiceDynamics(state, sample, { ...defaults, deltaFrames });
  }
  return state;
}

describe("voice dynamics", () => {
  it("creates a transient on an onset that settles under a sustained level", () => {
    const state = createVoiceDynamicsState();
    stepVoiceDynamics(state, 0.8, defaults);
    const onset = state.transient;

    for (let index = 0; index < 180; index += 1) {
      stepVoiceDynamics(state, 0.8, defaults);
    }

    expect(onset).toBeGreaterThan(0.35);
    expect(state.drive).toBeGreaterThan(0.7);
    expect(state.transient).toBeLessThan(0.02);
  });

  it("responds more strongly to rising energy than a falling sample", () => {
    const state = stepMany(0.25, 90);
    stepVoiceDynamics(state, 0.9, defaults);
    const risingTransient = state.transient;
    stepVoiceDynamics(state, 0.2, defaults);

    expect(risingTransient).toBeGreaterThan(0.3);
    expect(state.transient).toBeLessThan(risingTransient);
  });

  it("decays and clears stale sample history while inactive", () => {
    const state = stepMany(0.9, 20);
    for (let index = 0; index < 120; index += 1) {
      stepVoiceDynamics(state, 0.9, { ...defaults, active: false });
    }

    expect(state.drive).toBeLessThan(0.02);
    expect(state.transient).toBeLessThan(0.001);
    expect(state.lastSample).toBe(0);
  });

  it("clamps invalid and out-of-range samples", () => {
    const high = createVoiceDynamicsState();
    const invalid = createVoiceDynamicsState();
    stepVoiceDynamics(high, 4, defaults);
    stepVoiceDynamics(invalid, Number.NaN, defaults);

    expect(high.lastSample).toBe(1);
    expect(high.drive).toBeLessThanOrEqual(1);
    expect(invalid.lastSample).toBe(0);
    expect(invalid.drive).toBe(0);
  });

  it("is stable across equivalent frame intervals", () => {
    const sixtyFps = stepMany(0.68, 120, 1);
    const thirtyFps = stepMany(0.68, 60, 2);

    expect(thirtyFps.drive).toBeCloseTo(sixtyFps.drive, 2);
    expect(thirtyFps.fast).toBeCloseTo(sixtyFps.fast, 2);
    expect(thirtyFps.slow).toBeCloseTo(sixtyFps.slow, 2);
  });
});
