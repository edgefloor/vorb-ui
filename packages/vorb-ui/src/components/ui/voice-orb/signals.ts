import type { VoiceOrbSignal, VoiceOrbState } from "./voice-orb.types";

export function clampVolume(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function normalizeSignal(signal: VoiceOrbSignal | undefined): VoiceOrbSignal | undefined {
  if (!signal) return undefined;
  return {
    ...signal,
    volume: signal.volume === undefined ? undefined : clampVolume(signal.volume),
    inputVolume: signal.inputVolume === undefined ? undefined : clampVolume(signal.inputVolume),
    outputVolume: signal.outputVolume === undefined ? undefined : clampVolume(signal.outputVolume),
  };
}

export function deriveVoiceOrbState(
  state: VoiceOrbState | undefined,
  signal: VoiceOrbSignal | undefined,
  adapterSignal: VoiceOrbSignal | undefined,
  microphoneState: VoiceOrbState | undefined,
): VoiceOrbState {
  return state ?? signal?.state ?? adapterSignal?.state ?? microphoneState ?? "idle";
}

export function deriveVoiceOrbVolume(
  volume: number | undefined,
  state: VoiceOrbState,
  signal: VoiceOrbSignal | undefined,
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
