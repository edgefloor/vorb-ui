import type { CSSProperties, HTMLAttributes } from "react";

export type VoiceOrbState =
  "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface VoiceOrbSignal {
  state: VoiceOrbState;
  /** Compatibility level when direction-specific levels are unavailable. */
  volume?: number;
  /** Normalized local/user volume from 0–1. */
  inputVolume?: number;
  /** Normalized remote/assistant volume from 0–1. */
  outputVolume?: number;
  error?: unknown;
}

export type VoiceOrbSignalListener = (signal: VoiceOrbSignal) => void;

export interface VoiceOrbAdapter {
  subscribe(listener: VoiceOrbSignalListener): () => void;
  start?: () => void | Promise<void>;
  stop?: () => void | Promise<void>;
}

export interface VoiceOrbColors {
  primary: string;
  secondary: string;
  highlight: string;
  accent: string;
}

export interface VoiceOrbMotion {
  speed: number;
  intensity: number;
  sensitivity: number;
  attack: number;
  release: number;
}

export interface VoiceOrbLabels {
  idle: string;
  connecting: string;
  listening: string;
  thinking: string;
  speaking: string;
  error: string;
  start: string;
  stop: string;
  retry: string;
}

export type VoiceOrbStyle = CSSProperties & {
  "--voice-orb-size"?: string;
  "--voice-orb-ball-scale"?: number;
  "--voice-orb-primary"?: string;
  "--voice-orb-secondary"?: string;
  "--voice-orb-highlight"?: string;
  "--voice-orb-accent"?: string;
};

export interface VoiceOrbProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onError" | "onStart"
> {
  signal?: VoiceOrbSignal;
  state?: VoiceOrbState;
  volume?: number;
  adapter?: VoiceOrbAdapter;
  /** Externally owned stream. Its tracks are never stopped by VoiceOrb. */
  audioStream?: MediaStream | null;
  /**
   * Enables the built-in microphone lifecycle when no adapter or custom start
   * handler owns the session.
   */
  requestMicrophone?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  onVoiceError?: (error: unknown) => void;
  size?: number | string;
  /** Crystal-ball diameter relative to the canvas. Clamped to 0.7–1. */
  ballScale?: number;
  /** Painted-smoke radius relative to the ball. Clamped to 0.5–1.1. */
  smokeScale?: number;
  colors?: Partial<VoiceOrbColors>;
  motion?: Partial<VoiceOrbMotion>;
  labels?: Partial<VoiceOrbLabels>;
  /** Precise live copy that refines the current core visual state. */
  status?: string;
  showStatus?: boolean;
  errorMessage?: string;
  style?: VoiceOrbStyle;
}

export const DEFAULT_VOICE_ORB_COLORS: VoiceOrbColors = {
  primary: "#ff7626",
  secondary: "#e8412c",
  highlight: "#fff3d2",
  accent: "#ef6426",
};

export const DEFAULT_VOICE_ORB_MOTION: VoiceOrbMotion = {
  speed: 1,
  intensity: 1,
  sensitivity: 1,
  attack: 0.65,
  release: 0.22,
};

export const DEFAULT_VOICE_ORB_LABELS: VoiceOrbLabels = {
  idle: "Ready",
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Voice session unavailable",
  start: "Start voice session",
  stop: "Stop voice session",
  retry: "Retry voice session",
};
