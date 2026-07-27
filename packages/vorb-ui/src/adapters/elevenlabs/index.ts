import { createManagedAdapter, type ManagedAdapter } from "../shared";

export type ElevenLabsMode = "speaking" | "listening";
export type ElevenLabsStatus = "disconnected" | "connecting" | "connected" | "disconnecting";
export type ElevenLabsConnectionType = "websocket" | "webrtc";
export interface ElevenLabsCallbacks {
  onConnect?: (props: { conversationId: string }) => void;
  onDisconnect?: (details: unknown) => void;
  onError?: (message: string, context?: unknown) => void;
  onModeChange?: (prop: { mode: ElevenLabsMode }) => void;
  onStatusChange?: (prop: { status: ElevenLabsStatus }) => void;
  onVadScore?: (props: { vadScore: number }) => void;
}
export interface ElevenLabsConversation {
  endSession(): Promise<void>;
  getInputVolume(): number;
  getOutputVolume(): number;
  getInputByteFrequencyData(): Uint8Array;
  getOutputByteFrequencyData(): Uint8Array;
}
type Auth =
  | {
      agentId: string;
      signedUrl?: never;
      conversationToken?: never;
      connectionType?: ElevenLabsConnectionType;
    }
  | { signedUrl: string; agentId?: never; conversationToken?: never; connectionType?: "websocket" }
  | { conversationToken: string; agentId?: never; signedUrl?: never; connectionType?: "webrtc" };
export type ElevenLabsConfig = Auth & { textOnly?: false; [key: string]: unknown };
export type ElevenLabsStartSessionOptions = ElevenLabsConfig & ElevenLabsCallbacks;
export interface ElevenLabsConversationClass {
  startSession(options: ElevenLabsStartSessionOptions): Promise<ElevenLabsConversation>;
}
export interface ElevenLabsOrbAdapter extends ManagedAdapter {}

export function createElevenLabsAdapter(
  ConversationClass: ElevenLabsConversationClass,
  config: ElevenLabsConfig,
): ElevenLabsOrbAdapter {
  return createManagedAdapter(async (emit) => {
    let mode: ElevenLabsMode = "listening";
    const conversation = await ConversationClass.startSession({
      ...config,
      onModeChange: ({ mode: next }) => {
        mode = next;
        emit({ state: next === "speaking" ? "speaking" : "listening" });
      },
      onError: (message, context) => emit({ state: "error", error: context ?? new Error(message) }),
    });
    const interval = setInterval(() => {
      const inputVolume = conversation.getInputVolume();
      const outputVolume = conversation.getOutputVolume();
      emit({
        state: mode === "speaking" ? "speaking" : "listening",
        volume: mode === "speaking" ? outputVolume : inputVolume,
        inputVolume,
        outputVolume,
      });
    }, 33);
    return async () => {
      clearInterval(interval);
      await conversation.endSession();
    };
  });
}
