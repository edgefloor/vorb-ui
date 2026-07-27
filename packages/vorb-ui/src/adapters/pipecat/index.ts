import { createManagedAdapter, type ManagedAdapter } from "../shared";
import type { OutputVolumeCalibrationSource, OutputVolumeSample } from "../audio-level";

type Listener = (...args: unknown[]) => void;
export interface PipecatClientLike {
  on(event: string, listener: Listener): unknown;
  off?(event: string, listener: Listener): unknown;
  removeListener?(event: string, listener: Listener): unknown;
  connect(...args: unknown[]): Promise<unknown>;
  disconnect(): void | Promise<void>;
  state?: string;
  tracks?(): PipecatTracksLike;
}
export interface PipecatParticipantLike {
  id?: string;
  name?: string;
  local?: boolean;
}
export interface PipecatTracksLike {
  local?: { audio?: MediaStreamTrack };
  bot?: { audio?: MediaStreamTrack };
}
export interface PipecatAdapterOptions {
  connect?: () => void | Promise<unknown>;
  disconnect?: () => void | Promise<void>;
  isBotParticipant?: (participant: PipecatParticipantLike) => boolean;
  playRemoteAudio?: boolean;
  createAudioElement?: () => HTMLAudioElement;
  createAudioContext?: () => AudioContext | undefined;
  outputVolumeCalibration?: OutputVolumeCalibrationSource;
  onOutputVolumeSample?: (sample: OutputVolumeSample) => void;
}
export interface PipecatOrbAdapter extends ManagedAdapter {}

export function createPipecatAdapter(
  client: PipecatClientLike,
  options: PipecatAdapterOptions = {},
): PipecatOrbAdapter {
  return createManagedAdapter(async (emit) => {
    const bindings: Array<[string, Listener]> = [
      ["connected", () => emit({ state: "listening" })],
      ["botStartedSpeaking", () => emit({ state: "speaking" })],
      ["botStoppedSpeaking", () => emit({ state: "listening" })],
      ["botLlmStarted", () => emit({ state: "thinking" })],
      ["userStartedSpeaking", () => emit({ state: "listening" })],
      ["localAudioLevel", (value) => emit({ state: "listening", inputVolume: Number(value) || 0 })],
      [
        "remoteAudioLevel",
        (value) => emit({ state: "speaking", outputVolume: Number(value) || 0 }),
      ],
      ["error", (error) => emit({ state: "error", error })],
    ];
    bindings.forEach(([event, listener]) => client.on(event, listener));
    await (options.connect?.() ?? client.connect());
    return async () => {
      bindings.forEach(([event, listener]) =>
        (client.off ?? client.removeListener)?.call(client, event, listener),
      );
      await (options.disconnect?.() ?? client.disconnect());
    };
  });
}
