import { createManagedAdapter, type ManagedAdapter } from "../shared";
import type { OutputVolumeCalibrationSource, OutputVolumeSample } from "../audio-level";

export type LiveKitTokenOptionValue = string | (() => string);
export interface LiveKitConnectionDetails {
  serverUrl: string;
  participantToken: string;
}
export interface LiveKitResolvedTokenOptions {
  roomName?: string;
  participantName?: string;
  participantIdentity?: string;
  participantMetadata?: string;
  participantAttributes?: Record<string, string>;
  agentName?: string;
  agentMetadata?: string;
  deployment?: string;
}
export interface LiveKitTokenOptions {
  roomName?: LiveKitTokenOptionValue;
  participantName?: LiveKitTokenOptionValue;
  participantIdentity?: LiveKitTokenOptionValue;
  participantMetadata?: LiveKitTokenOptionValue;
  participantAttributes?: Record<string, string> | (() => Record<string, string>);
  agentName?: LiveKitTokenOptionValue;
  agentMetadata?: LiveKitTokenOptionValue;
  deployment?: LiveKitTokenOptionValue;
}
export interface LiveKitTokenSource {
  fetch(options?: LiveKitResolvedTokenOptions, force?: boolean): Promise<LiveKitConnectionDetails>;
}
export interface LiveKitRoomLike {
  connect(serverUrl: string, token: string, options?: Record<string, unknown>): Promise<void>;
  disconnect(): void;
  on(event: string, listener: (...args: any[]) => void): unknown;
  off?(event: string, listener: (...args: any[]) => void): unknown;
}
export interface LiveKitAdapterConfig {
  room?: LiveKitRoomLike;
  RoomClass?: new (...args: any[]) => LiveKitRoomLike;
  tokenSource?: LiveKitTokenSource;
  token?: string | (() => string | Promise<string>);
  serverUrl?: string;
  getConnectionDetails?: () => Promise<LiveKitConnectionDetails>;
  tokenOptions?: LiveKitTokenOptions;
  connectOptions?: Record<string, unknown>;
  enableMicrophone?: boolean;
  createAudioAnalyser?: (...args: any[]) => unknown;
  outputVolumeCalibration?: OutputVolumeCalibrationSource;
  onOutputVolumeSample?: (sample: OutputVolumeSample) => void;
}
export interface LiveKitOrbAdapter extends ManagedAdapter {}

function resolveTokenValue(value: LiveKitTokenOptionValue | undefined) {
  return typeof value === "function" ? value() : value;
}

export function createLiveKitAdapter(config: LiveKitAdapterConfig): LiveKitOrbAdapter {
  return createManagedAdapter(async (emit) => {
    const room = config.room ?? (config.RoomClass ? new config.RoomClass() : undefined);
    if (!room) throw new Error("LiveKit requires room or RoomClass");
    const tokenOptions: LiveKitResolvedTokenOptions = {
      roomName: resolveTokenValue(config.tokenOptions?.roomName),
      participantName: resolveTokenValue(config.tokenOptions?.participantName),
      participantIdentity: resolveTokenValue(config.tokenOptions?.participantIdentity),
      participantMetadata: resolveTokenValue(config.tokenOptions?.participantMetadata),
      participantAttributes:
        typeof config.tokenOptions?.participantAttributes === "function"
          ? config.tokenOptions.participantAttributes()
          : config.tokenOptions?.participantAttributes,
      agentName: resolveTokenValue(config.tokenOptions?.agentName),
      agentMetadata: resolveTokenValue(config.tokenOptions?.agentMetadata),
      deployment: resolveTokenValue(config.tokenOptions?.deployment),
    };
    const details = config.getConnectionDetails
      ? await config.getConnectionDetails()
      : config.tokenSource
        ? await config.tokenSource.fetch(tokenOptions)
        : {
            serverUrl: config.serverUrl ?? "",
            participantToken:
              typeof config.token === "function" ? await config.token() : (config.token ?? ""),
          };
    const bindings: Array<[string, (...args: any[]) => void]> = [
      ["connected", () => emit({ state: "listening" })],
      ["disconnected", () => emit({ state: "idle" })],
      [
        "activeSpeakersChanged",
        (speakers: unknown[]) => emit({ state: speakers.length ? "speaking" : "listening" }),
      ],
    ];
    bindings.forEach(([event, listener]) => room.on(event, listener));
    await room.connect(details.serverUrl, details.participantToken, config.connectOptions);
    return () => {
      bindings.forEach(([event, listener]) => room.off?.(event, listener));
      room.disconnect();
    };
  });
}
