import { describe, expect, it } from "vitest";
import {
  CLOUD_MOTION_INTENSITY_MAX,
  CLOUD_MOTION_INTENSITY_MIN,
  CLOUD_MOTION_SPEED_MAX,
  resolveCloudPhaseRate,
  resolveFlowDuration,
  resolveGlowDuration,
  resolveMotionAmplitude,
  resolveMotionSpeed,
  resolveThinkingPhaseRate,
  resolveTransitionDuration,
} from "./motion-contract";
import { FRAGMENT_SHADER } from "./shaders";

describe("cloud motion contract", () => {
  it("applies the speed multiplier linearly at every material flow rate", () => {
    for (const flowSpeed of [0, 0.2, 0.55, 0.8, 1]) {
      const normal = resolveCloudPhaseRate(flowSpeed, 1);
      expect(resolveCloudPhaseRate(flowSpeed, 0.5)).toBeCloseTo(normal * 0.5, 8);
      expect(resolveCloudPhaseRate(flowSpeed, 2)).toBeCloseTo(normal * 2, 8);

      const thinking = resolveThinkingPhaseRate(flowSpeed, 1, 0.72);
      expect(resolveThinkingPhaseRate(flowSpeed, 0.5, 0.72)).toBeCloseTo(thinking * 0.5, 8);
      expect(resolveThinkingPhaseRate(flowSpeed, 2, 0.72)).toBeCloseTo(thinking * 2, 8);
    }
  });

  it("uses the same speed range for WebGL, transitions, and fallback durations", () => {
    expect(resolveMotionSpeed(-1)).toBe(0);
    expect(resolveMotionSpeed(8)).toBe(CLOUD_MOTION_SPEED_MAX);
    expect(resolveTransitionDuration(600, 2)).toBe(300);
    expect(resolveTransitionDuration(600, 0)).toBe(0);
    expect(resolveFlowDuration(0.7, 2)).toBeCloseTo(resolveFlowDuration(0.7, 1) / 2, 8);
    expect(resolveGlowDuration(0.4, 2)).toBeCloseTo(resolveGlowDuration(0.4, 1) / 2, 8);
  });

  it("clamps intensity as deformation amplitude without changing the color contract", () => {
    expect(resolveMotionAmplitude(-1)).toBe(CLOUD_MOTION_INTENSITY_MIN);
    expect(resolveMotionAmplitude(1)).toBe(1);
    expect(resolveMotionAmplitude(8)).toBe(CLOUD_MOTION_INTENSITY_MAX);
    expect(FRAGMENT_SHADER).toContain("float motionAmplitude = clamp(uMotionAmplitude, 0.25, 2.0)");
    expect(FRAGMENT_SHADER).not.toContain("color *= uMotionAmplitude");
  });

  it("keeps thinking vortex deformation bounded over long-running phases", () => {
    expect(FRAGMENT_SHADER).not.toMatch(/thinkingTime\s*\*\s*0\.(?:22|19|17)\s*\+/);
    expect(FRAGMENT_SHADER).toContain("sin(thinkingTime * 0.47) * 0.16");
    expect(FRAGMENT_SHADER).toContain("sin(thinkingTime * 0.41 + 1.7) * 0.14");
    expect(FRAGMENT_SHADER).toContain("sin(thinkingTime * 0.37 + 3.4) * 0.12");
  });

  it("keeps every cloud treatment inside a bounded drawable envelope", () => {
    expect(FRAGMENT_SHADER).toContain("0.48 * ballScale");
    expect(FRAGMENT_SHADER).toContain("0.475 * ballScale");
    expect(FRAGMENT_SHADER).toContain("max(min(alpha, shellEnvelope), shellSurfaceAlpha)");
  });
});
