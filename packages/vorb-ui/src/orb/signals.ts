import type { OrbSignal, OrbState } from "./types";

export function clampVolume(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function normalizeSignal(signal: OrbSignal | undefined): OrbSignal | undefined {
  if (!signal) return undefined;
  return {
    ...signal,
    volume: signal.volume === undefined ? undefined : clampVolume(signal.volume),
    inputVolume: signal.inputVolume === undefined ? undefined : clampVolume(signal.inputVolume),
    outputVolume: signal.outputVolume === undefined ? undefined : clampVolume(signal.outputVolume),
  };
}

export function deriveOrbState(
  state: OrbState | undefined,
  signal: OrbSignal | undefined,
  adapterSignal: OrbSignal | undefined,
  microphoneState: OrbState | undefined,
): OrbState {
  return state ?? signal?.state ?? adapterSignal?.state ?? microphoneState ?? "idle";
}

export function deriveOrbVolume(
  volume: number | undefined,
  state: OrbState,
  signal: OrbSignal | undefined,
  meteredVolume = 0,
): number {
  if (volume !== undefined) return clampVolume(volume);
  if (state === "listening") {
    return clampVolume(signal?.inputVolume ?? signal?.volume ?? meteredVolume);
  }
  if (state === "speaking") {
    return clampVolume(signal?.outputVolume ?? signal?.volume ?? meteredVolume);
  }
  return clampVolume(signal?.volume ?? meteredVolume);
}

/** @deprecated Use deriveOrbState. */
export const deriveVoiceOrbState = deriveOrbState;
/** @deprecated Use deriveOrbVolume. */
export const deriveVoiceOrbVolume = deriveOrbVolume;
