import type { AriaAttributes, CSSProperties } from "react";

export type OrbState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export type OrbTheme = "debug" | "circle" | "bars" | "cloud" | "radial";
export type OrbCloudMode = "shell" | "gas" | "vapor";
export type OrbControlPosition =
  "bottom" | "top" | "overlay-bottom" | "overlay-center" | "overlay-top";
export type OrbControlAppearance = "glass" | "solid" | "minimal";

export interface OrbControlOptions {
  position?: OrbControlPosition;
  appearance?: OrbControlAppearance;
  size?: number | string;
  gap?: number | string;
  offsetX?: number | string;
  offsetY?: number | string;
  className?: string;
  style?: CSSProperties;
}

export interface OrbSignal {
  state: OrbState;
  volume?: number;
  inputVolume?: number;
  outputVolume?: number;
  error?: unknown;
}

export type OrbSignalListener = (signal: OrbSignal) => void;

export interface OrbAdapter {
  subscribe(listener: OrbSignalListener): () => void;
  start?: () => void | Promise<void>;
  stop?: () => void | Promise<void>;
}

export type OrbToneRamp = {
  deepest: string;
  deep: string;
  base: string;
  bright: string;
  lightest: string;
};

/**
 * Complete renderer-neutral behavior for one conversational state.
 * Every field is independently customizable through `scale.states`.
 */
export interface OrbVisualState {
  turbulence: number;
  flowSpeed: number;
  vortexCount: number;
  vortexStrength: number;
  expansion: number;
  centerPull: number;
  audioResponse: number;
  smokeDensity: number;
  glowIntensity: number;
  glowPulseSpeed: number;
  warningDistortion: number;
  tonePosition: number;
}

export interface OrbTransitions {
  defaultMs: number;
  thinkingToSpeakingMs: number;
  errorOnsetMs: number;
  errorRecoveryMs: number;
}

export type OrbScaleName = "crystal" | "ember" | "iris" | "lagoon";

export interface OrbScaleDefinition {
  name: OrbScaleName;
  label: string;
  colors: { main: OrbToneRamp; warning: OrbToneRamp };
  states: Record<OrbState, OrbVisualState>;
  transitions: OrbTransitions;
}

export interface OrbScaleOverride {
  base: OrbScaleName;
  colors?: {
    main?: Partial<OrbToneRamp>;
    warning?: Partial<OrbToneRamp>;
  };
  states?: Partial<Record<OrbState, Partial<OrbVisualState>>>;
  transitions?: Partial<OrbTransitions>;
}

export type OrbScale = OrbScaleName | OrbScaleOverride;

export interface OrbMotion {
  speed: number;
  intensity: number;
  sensitivity: number;
  attack: number;
  release: number;
}

export interface OrbLabels {
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

type DataAttributeValue = string | number | boolean | null | undefined;

export interface OrbHtmlAttributes extends AriaAttributes {
  id?: string;
  title?: string;
  role?: string;
  tabIndex?: number;
  [dataAttribute: `data-${string}`]: DataAttributeValue;
}

export type OrbStyle = CSSProperties & {
  "--vorb-ui-size"?: string;
  "--vorb-ui-radial-control-surround"?: string;
  "--vorb-ui-control-size"?: string;
  "--vorb-ui-control-gap"?: string;
  "--vorb-ui-control-offset-x"?: string;
  "--vorb-ui-control-offset-y"?: string;
  /** @deprecated Use `--vorb-ui-size`. */
  "--orb-ui-size"?: string;
  /** @deprecated Use `--vorb-ui-radial-control-surround`. */
  "--orb-ui-radial-control-surround"?: string;
  /** @deprecated Use `--vorb-ui-control-size`. */
  "--orb-ui-control-size"?: string;
  /** @deprecated Use `--vorb-ui-control-gap`. */
  "--orb-ui-control-gap"?: string;
  /** @deprecated Use `--vorb-ui-control-offset-x`. */
  "--orb-ui-control-offset-x"?: string;
  /** @deprecated Use `--vorb-ui-control-offset-y`. */
  "--orb-ui-control-offset-y"?: string;
  /** @deprecated Use `--vorb-ui-size`. */
  "--voice-orb-size"?: string;
  /** @deprecated Radial implementation detail. */
  "--voice-orb-ball-scale"?: number;
};

export interface OrbProps extends OrbHtmlAttributes {
  signal?: OrbSignal;
  state?: OrbState;
  volume?: number;
  adapter?: OrbAdapter;
  theme?: OrbTheme;
  /** Cloud rendering treatment. `gas` is rough; `vapor` is soft and shell-free. */
  cloudMode?: OrbCloudMode;
  /** Layout and presentation for the optional session control. */
  control?: OrbControlOptions;
  size?: number | string;
  className?: string;
  style?: OrbStyle;
  disabled?: boolean;
  interactive?: boolean;
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  audioStream?: MediaStream | null;
  requestMicrophone?: boolean;
  onVoiceError?: (error: unknown) => void;
  ballScale?: number;
  smokeScale?: number;
  scale?: OrbScale;
  motion?: Partial<OrbMotion>;
  labels?: Partial<OrbLabels>;
  status?: string;
  showStatus?: boolean;
  errorMessage?: string;
}

export const DEFAULT_ORB_MOTION: OrbMotion = {
  speed: 1,
  intensity: 1,
  sensitivity: 1,
  attack: 0.65,
  release: 0.22,
};

export const DEFAULT_ORB_LABELS: OrbLabels = {
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

/** @deprecated Use OrbState. */
export type VoiceOrbState = OrbState;
/** @deprecated Use OrbSignal. */
export type VoiceOrbSignal = OrbSignal;
/** @deprecated Use OrbCloudMode. */
export type VoiceOrbCloudMode = OrbCloudMode;
/** @deprecated Use OrbControlPosition. */
export type VoiceOrbControlPosition = OrbControlPosition;
/** @deprecated Use OrbControlAppearance. */
export type VoiceOrbControlAppearance = OrbControlAppearance;
/** @deprecated Use OrbControlOptions. */
export type VoiceOrbControlOptions = OrbControlOptions;
/** @deprecated Use OrbSignalListener. */
export type VoiceOrbSignalListener = OrbSignalListener;
/** @deprecated Use OrbAdapter. */
export type VoiceOrbAdapter = OrbAdapter;
/** @deprecated Use OrbToneRamp. */
export type VoiceOrbToneRamp = OrbToneRamp;
/** @deprecated Use OrbVisualState. */
export type VoiceOrbVisualState = OrbVisualState;
/** @deprecated Use OrbTransitions. */
export type VoiceOrbTransitions = OrbTransitions;
/** @deprecated Use OrbScaleName. */
export type VoiceOrbScaleName = OrbScaleName;
/** @deprecated Use OrbScaleDefinition. */
export type VoiceOrbScaleDefinition = OrbScaleDefinition;
/** @deprecated Use OrbScaleOverride. */
export type VoiceOrbScaleOverride = OrbScaleOverride;
/** @deprecated Use OrbScale. */
export type VoiceOrbScale = OrbScale;
/** @deprecated Use OrbMotion. */
export type VoiceOrbMotion = OrbMotion;
/** @deprecated Use OrbLabels. */
export type VoiceOrbLabels = OrbLabels;
/** @deprecated Use OrbStyle. */
export type VoiceOrbStyle = OrbStyle;
/** @deprecated Use OrbProps. */
export type VoiceOrbProps = OrbProps;

/** @deprecated Use DEFAULT_ORB_MOTION. */
export const DEFAULT_VOICE_ORB_MOTION = DEFAULT_ORB_MOTION;
/** @deprecated Use DEFAULT_ORB_LABELS. */
export const DEFAULT_VOICE_ORB_LABELS = DEFAULT_ORB_LABELS;
