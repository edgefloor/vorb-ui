import { describe, expect, it, vi } from "vitest";
import { calibrateOutputVolume, createMediaStreamTrackVolumeMeter } from "./audio-level";

describe("calibrateOutputVolume", () => {
  it("applies a noise floor, gain, curve, and independent attack/release rates", () => {
    const calibration = {
      noiseFloor: 0.005,
      gain: 4,
      exponent: 0.8,
      attack: 0.5,
      release: 0.1,
    };

    expect(calibrateOutputVolume(0.004, 0, calibration)).toEqual({
      raw: 0.004,
      shaped: 0,
      normalized: 0,
    });

    const attack = calibrateOutputVolume(0.05, 0, calibration);
    expect(attack.shaped).toBeGreaterThan(0.2);
    expect(attack.normalized).toBeCloseTo(attack.shaped * 0.5);

    const release = calibrateOutputVolume(0, attack.normalized, calibration);
    expect(release.normalized).toBeCloseTo(attack.normalized * 0.9);
  });

  it("clamps malformed calibration and reads live getter values", () => {
    let gain = 2;
    const getCalibration = () => ({ gain, attack: 3, release: -2 });
    const quieter = calibrateOutputVolume(Number.POSITIVE_INFINITY, 2, getCalibration);
    expect(quieter).toEqual({ raw: 0, shaped: 0, normalized: 1 });

    gain = 8;
    const louder = calibrateOutputVolume(0.05, 0, getCalibration);
    expect(louder.normalized).toBeGreaterThan(0);
  });
});

describe("createMediaStreamTrackVolumeMeter", () => {
  it("owns its timer and audio context but never stops the supplied track", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "MediaStream",
      class {
        constructor(public tracks: MediaStreamTrack[]) {}
      },
    );
    const track = { stop: vi.fn() } as unknown as MediaStreamTrack;
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const analyser = {
      fftSize: 4,
      smoothingTimeConstant: 0,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFloatTimeDomainData: vi.fn((samples: Float32Array) => samples.fill(0.5)),
    };
    const context = {
      state: "running",
      createMediaStreamSource: vi.fn(() => source),
      createAnalyser: vi.fn(() => analyser),
      close: vi.fn(async () => undefined),
    } as unknown as AudioContext;
    const onVolume = vi.fn();
    const meter = createMediaStreamTrackVolumeMeter(track, () => context, onVolume);

    await vi.advanceTimersByTimeAsync(40);
    expect(onVolume).toHaveBeenCalledWith(0.5);
    await meter?.stop();
    await meter?.stop();
    expect(source.disconnect).toHaveBeenCalledTimes(1);
    expect(analyser.disconnect).toHaveBeenCalledTimes(1);
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(track.stop).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
