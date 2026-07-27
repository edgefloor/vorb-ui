import { describe, expect, it } from "vitest";
import {
  clampVolume,
  deriveVoiceOrbState,
  deriveVoiceOrbVolume,
  normalizeSignal,
} from "./signals";

describe("voice orb signals", () => {
  it("uses scalar, signal, adapter, microphone, then idle state precedence", () => {
    expect(
      deriveVoiceOrbState(
        "thinking",
        { state: "speaking" },
        { state: "listening" },
        "connecting",
      ),
    ).toBe("thinking");
    expect(
      deriveVoiceOrbState(
        undefined,
        { state: "speaking" },
        { state: "listening" },
        "connecting",
      ),
    ).toBe("speaking");
    expect(
      deriveVoiceOrbState(
        undefined,
        undefined,
        { state: "listening" },
        "connecting",
      ),
    ).toBe("listening");
    expect(
      deriveVoiceOrbState(undefined, undefined, undefined, "connecting"),
    ).toBe("connecting");
    expect(
      deriveVoiceOrbState(undefined, undefined, undefined, undefined),
    ).toBe("idle");
  });

  it("chooses direction-aware volume with scalar precedence", () => {
    const signal = {
      state: "speaking" as const,
      volume: 0.2,
      inputVolume: 0.35,
      outputVolume: 0.8,
    };

    expect(deriveVoiceOrbVolume(0.5, "speaking", signal, 0.1)).toBe(0.5);
    expect(deriveVoiceOrbVolume(undefined, "listening", signal, 0.1)).toBe(
      0.35,
    );
    expect(deriveVoiceOrbVolume(undefined, "speaking", signal, 0.1)).toBe(0.8);
    expect(deriveVoiceOrbVolume(undefined, "thinking", signal, 0.1)).toBe(0.2);
    expect(
      deriveVoiceOrbVolume(undefined, "listening", undefined, 0.45),
    ).toBe(0.45);
  });

  it("clamps volumes and converts non-finite values to zero", () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(Number.NaN)).toBe(0);
    expect(clampVolume(Number.POSITIVE_INFINITY)).toBe(0);
    expect(
      normalizeSignal({
        state: "listening",
        volume: -1,
        inputVolume: 2,
        outputVolume: Number.NaN,
      }),
    ).toEqual({
      state: "listening",
      volume: 0,
      inputVolume: 1,
      outputVolume: 0,
    });
  });
});
