import { createManagedAdapter, type ManagedAdapter } from "../shared";
import type { OutputVolumeCalibrationSource, OutputVolumeSample } from "../audio-level";

export interface GeminiLiveInlineData {
  data?: string;
  mimeType?: string;
}
export interface GeminiLiveServerMessage {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: GeminiLiveInlineData }> };
    turnComplete?: boolean;
    generationComplete?: boolean;
    interrupted?: boolean;
    waitingForInput?: boolean;
  };
}
export interface GeminiLiveCallbacks {
  onopen?: () => void;
  onmessage: (message: GeminiLiveServerMessage) => void;
  onerror?: (error: unknown) => void;
  onclose?: (event: unknown) => void;
}
export interface GeminiLiveSession {
  sendRealtimeInput(input: {
    audio?: { data: string; mimeType: string };
    audioStreamEnd?: boolean;
    activityStart?: Record<string, never>;
    activityEnd?: Record<string, never>;
  }): void;
  close(): void;
}
export interface GeminiLiveAdapterConfig {
  connect(callbacks: GeminiLiveCallbacks): Promise<GeminiLiveSession>;
  mediaStreamConstraints?: MediaStreamConstraints;
  inputSampleRate?: number;
  speechThreshold?: number;
  speechEndDelayMs?: number;
  activityDetection?: "client" | "server";
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createAudioContext?: () => AudioContext;
  outputVolumeCalibration?: OutputVolumeCalibrationSource;
  onOutputVolumeSample?: (sample: OutputVolumeSample) => void;
}
export interface GeminiLiveOrbAdapter extends ManagedAdapter {}

export function createGeminiLiveAdapter(config: GeminiLiveAdapterConfig): GeminiLiveOrbAdapter {
  return createManagedAdapter(async (emit) => {
    const session = await config.connect({
      onmessage(message) {
        const content = message.serverContent;
        if (content?.modelTurn) emit({ state: "speaking" });
        else if (content?.turnComplete || content?.waitingForInput) emit({ state: "listening" });
        else if (content?.interrupted) emit({ state: "listening" });
      },
      onerror: (error) => emit({ state: "error", error }),
      onclose: () => emit({ state: "idle" }),
    });
    return () => session.close();
  });
}
