import { describe, expect, it } from "vitest";
import { calibrateAudioLevel } from "./use-audio-meter";

const options = {
  sensitivity: 1,
  attack: 0.8,
  release: 0.2,
  noiseFloor: 0.01,
  gain: 5,
  exponent: 1,
};

describe("orb audio level calibration", () => {
  it("gates the noise floor and clamps invalid samples", () => {
    expect(calibrateAudioLevel(0.005, 0, options)).toBe(0);
    expect(calibrateAudioLevel(Number.NaN, 0, options)).toBe(0);
    expect(calibrateAudioLevel(10, 0, options)).toBeLessThanOrEqual(1);
  });

  it("uses a faster attack than release", () => {
    const rising = calibrateAudioLevel(0.1, 0, options);
    const falling = calibrateAudioLevel(0, rising, options);
    expect(rising).toBeGreaterThan(0.3);
    expect(falling).toBeGreaterThan(0);
    expect(falling).toBeLessThan(rising);
  });
});
