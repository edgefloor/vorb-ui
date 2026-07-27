import { Room, TokenSource } from "livekit-client";
import { createLiveKitAdapter as createAdvancedLiveKitAdapter } from "./index";
import type { LiveKitOrbAdapter, LiveKitTokenOptions } from "./index";
import type { OutputVolumeCalibrationSource, OutputVolumeSample } from "../audio-level";

interface Base extends Omit<LiveKitTokenOptions, "agentName" | "roomName"> {
  agentName?: LiveKitTokenOptions["agentName"];
  roomName?: LiveKitTokenOptions["roomName"];
  connectOptions?: Record<string, unknown>;
  enableMicrophone?: boolean;
  outputVolumeCalibration?: OutputVolumeCalibrationSource;
  onOutputVolumeSample?: (sample: OutputVolumeSample) => void;
}
export type LiveKitTokenEndpointOptions = Omit<RequestInit, "body">;
export interface LiveKitSandboxOptions {
  baseUrl?: string;
}
export interface LiveKitEndpointAdapterConfig extends Base {
  tokenEndpoint: string;
  tokenEndpointOptions?: LiveKitTokenEndpointOptions;
  sandboxId?: never;
  sandboxOptions?: never;
}
export interface LiveKitSandboxAdapterConfig extends Base {
  sandboxId: string;
  agentName: NonNullable<LiveKitTokenOptions["agentName"]>;
  sandboxOptions?: LiveKitSandboxOptions;
  tokenEndpoint?: never;
  tokenEndpointOptions?: never;
}
export type LiveKitBrowserAdapterConfig =
  LiveKitEndpointAdapterConfig | LiveKitSandboxAdapterConfig;

export function createLiveKitAdapter(config: LiveKitBrowserAdapterConfig): LiveKitOrbAdapter {
  const tokenSource =
    config.tokenEndpoint !== undefined
      ? TokenSource.endpoint(config.tokenEndpoint, config.tokenEndpointOptions)
      : TokenSource.sandboxTokenServer(config.sandboxId, config.sandboxOptions);
  return createAdvancedLiveKitAdapter({
    RoomClass: Room as unknown as new (...args: any[]) => import("./index").LiveKitRoomLike,
    tokenSource,
    tokenOptions: {
      roomName: config.roomName,
      participantName: config.participantName,
      participantIdentity: config.participantIdentity,
      participantMetadata: config.participantMetadata,
      participantAttributes: config.participantAttributes,
      agentName: config.agentName,
      agentMetadata: config.agentMetadata,
      deployment: config.deployment,
    },
    connectOptions: config.connectOptions,
    enableMicrophone: config.enableMicrophone,
    outputVolumeCalibration: config.outputVolumeCalibration,
    onOutputVolumeSample: config.onOutputVolumeSample,
  });
}
export type { LiveKitOrbAdapter } from "./index";
