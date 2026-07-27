import type {
  OrbScale,
  OrbScaleDefinition,
  OrbScaleName,
  OrbState,
  OrbToneRamp,
  OrbTransitions,
  OrbVisualState,
} from "./types";

export const DEFAULT_ORB_SCALE: OrbScaleName = "crystal";
/** @deprecated Use DEFAULT_ORB_SCALE. */
export const DEFAULT_VOICE_ORB_SCALE = DEFAULT_ORB_SCALE;

const WARNING_RAMP: OrbToneRamp = {
  deepest: "#3f1d18",
  deep: "#7c2d1f",
  base: "#e76f51",
  bright: "#ffb38a",
  lightest: "#fff0e8",
};

const CRYSTAL_STATES: Record<OrbState, OrbVisualState> = {
  idle: {
    turbulence: 0.15,
    flowSpeed: 0.12,
    vortexCount: 1,
    vortexStrength: 0.1,
    expansion: 0.2,
    centerPull: 0.1,
    audioResponse: 0,
    smokeDensity: 0.4,
    glowIntensity: 0.25,
    glowPulseSpeed: 0.1,
    warningDistortion: 0,
    tonePosition: 0.72,
  },
  connecting: {
    turbulence: 0.3,
    flowSpeed: 0.35,
    vortexCount: 1,
    vortexStrength: 0.35,
    expansion: 0.1,
    centerPull: 0.55,
    audioResponse: 0,
    smokeDensity: 0.45,
    glowIntensity: 0.45,
    glowPulseSpeed: 0.8,
    warningDistortion: 0,
    tonePosition: 0.62,
  },
  listening: {
    turbulence: 0.2,
    flowSpeed: 0.2,
    vortexCount: 1,
    vortexStrength: 0.12,
    expansion: 0.45,
    centerPull: 0.15,
    audioResponse: 0.8,
    smokeDensity: 0.5,
    glowIntensity: 0.5,
    glowPulseSpeed: 0.2,
    warningDistortion: 0,
    tonePosition: 0.58,
  },
  thinking: {
    turbulence: 0.65,
    flowSpeed: 0.8,
    vortexCount: 3,
    vortexStrength: 0.9,
    expansion: 0.25,
    centerPull: 0.6,
    audioResponse: 0,
    smokeDensity: 0.65,
    glowIntensity: 0.7,
    glowPulseSpeed: 0.55,
    warningDistortion: 0,
    tonePosition: 0.42,
  },
  speaking: {
    turbulence: 0.3,
    flowSpeed: 0.55,
    vortexCount: 1,
    vortexStrength: 0.25,
    expansion: 0.75,
    centerPull: 0.1,
    audioResponse: 0.65,
    smokeDensity: 0.55,
    glowIntensity: 0.85,
    glowPulseSpeed: 0.4,
    warningDistortion: 0,
    tonePosition: 0.7,
  },
  error: {
    turbulence: 0.8,
    flowSpeed: 0.15,
    vortexCount: 1,
    vortexStrength: 0.05,
    expansion: 0.15,
    centerPull: 0.3,
    audioResponse: 0,
    smokeDensity: 0.5,
    glowIntensity: 0.65,
    glowPulseSpeed: 0.15,
    warningDistortion: 0.8,
    tonePosition: 0.35,
  },
};

const CRYSTAL_TRANSITIONS: OrbTransitions = {
  defaultMs: 700,
  thinkingToSpeakingMs: 400,
  errorOnsetMs: 150,
  errorRecoveryMs: 950,
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function mapStates(transform: (state: OrbVisualState, name: OrbState) => OrbVisualState) {
  return Object.fromEntries(
    Object.entries(CRYSTAL_STATES).map(([name, state]) => [
      name,
      transform({ ...state }, name as OrbState),
    ]),
  ) as Record<OrbState, OrbVisualState>;
}

function scaleTransitions(factor: number): OrbTransitions {
  return {
    defaultMs: CRYSTAL_TRANSITIONS.defaultMs * factor,
    thinkingToSpeakingMs: CRYSTAL_TRANSITIONS.thinkingToSpeakingMs * factor,
    errorOnsetMs: CRYSTAL_TRANSITIONS.errorOnsetMs * factor,
    errorRecoveryMs: CRYSTAL_TRANSITIONS.errorRecoveryMs * factor,
  };
}

const definitions: Record<OrbScaleName, OrbScaleDefinition> = {
  crystal: {
    name: "crystal",
    label: "Crystal",
    colors: {
      main: {
        deepest: "#11162f",
        deep: "#263b72",
        base: "#5b7cda",
        bright: "#9adcf7",
        lightest: "#f1f1ff",
      },
      warning: WARNING_RAMP,
    },
    states: mapStates((state) => state),
    transitions: CRYSTAL_TRANSITIONS,
  },
  ember: {
    name: "ember",
    label: "Ember",
    colors: {
      main: {
        deepest: "#681a0d",
        deep: "#e8412c",
        base: "#ff7626",
        bright: "#ffbd3c",
        lightest: "#fff3d2",
      },
      warning: {
        deepest: "#4c180d",
        deep: "#8a2f1c",
        base: "#e45a36",
        bright: "#ff9d68",
        lightest: "#fff1e8",
      },
    },
    states: mapStates((state) => ({
      ...state,
      turbulence: state.turbulence * 1.15,
      flowSpeed: state.flowSpeed * 1.15,
    })),
    transitions: scaleTransitions(0.9),
  },
  iris: {
    name: "iris",
    label: "Iris",
    colors: {
      main: {
        deepest: "#241144",
        deep: "#5b21b6",
        base: "#a855f7",
        bright: "#c084fc",
        lightest: "#f3e8ff",
      },
      warning: WARNING_RAMP,
    },
    states: mapStates((state, name) => ({
      ...state,
      smokeDensity: state.smokeDensity * 1.1,
      vortexStrength:
        name === "thinking" ? Math.min(1, state.vortexStrength * 1.15) : state.vortexStrength,
    })),
    transitions: CRYSTAL_TRANSITIONS,
  },
  lagoon: {
    name: "lagoon",
    label: "Lagoon",
    colors: {
      main: {
        deepest: "#083344",
        deep: "#0f766e",
        base: "#22d3ee",
        bright: "#67e8f9",
        lightest: "#ecfeff",
      },
      warning: WARNING_RAMP,
    },
    states: mapStates((state) => ({
      ...state,
      turbulence: state.turbulence * 0.85,
      flowSpeed: state.flowSpeed * 0.9,
      audioResponse: state.audioResponse * 1.1,
    })),
    transitions: CRYSTAL_TRANSITIONS,
  },
};

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((entry) => deepFreeze(entry));
  }
  return value;
}

export const ORB_SCALES = deepFreeze(definitions) as Readonly<
  Record<OrbScaleName, OrbScaleDefinition>
>;
/** @deprecated Use ORB_SCALES. */
export const VOICE_ORB_SCALES = ORB_SCALES;

function clampVisualState(state: OrbVisualState): OrbVisualState {
  return {
    turbulence: clamp(state.turbulence, 0, 1),
    flowSpeed: clamp(state.flowSpeed, 0, 1),
    vortexCount: Math.round(clamp(state.vortexCount, 1, 3)),
    vortexStrength: clamp(state.vortexStrength, 0, 1),
    expansion: clamp(state.expansion, 0, 1),
    centerPull: clamp(state.centerPull, 0, 1),
    audioResponse: clamp(state.audioResponse, 0, 1),
    smokeDensity: clamp(state.smokeDensity, 0, 1),
    glowIntensity: clamp(state.glowIntensity, 0, 1),
    glowPulseSpeed: clamp(state.glowPulseSpeed, 0, 1),
    warningDistortion: clamp(state.warningDistortion, 0, 1),
    tonePosition: clamp(state.tonePosition, 0, 1),
  };
}

function clampTransitions(transitions: OrbTransitions): OrbTransitions {
  return {
    defaultMs: clamp(transitions.defaultMs, 0, 3000),
    thinkingToSpeakingMs: clamp(transitions.thinkingToSpeakingMs, 0, 3000),
    errorOnsetMs: clamp(transitions.errorOnsetMs, 0, 3000),
    errorRecoveryMs: clamp(transitions.errorRecoveryMs, 0, 3000),
  };
}

export function resolveOrbScale(scale: OrbScale = DEFAULT_ORB_SCALE): OrbScaleDefinition {
  if (typeof scale === "string") {
    return ORB_SCALES[scale] ?? ORB_SCALES.crystal;
  }

  const base = ORB_SCALES[scale.base] ?? ORB_SCALES.crystal;
  const states = Object.fromEntries(
    Object.entries(base.states).map(([name, state]) => [
      name,
      clampVisualState({
        ...state,
        ...scale.states?.[name as OrbState],
      }),
    ]),
  ) as Record<OrbState, OrbVisualState>;

  return {
    name: base.name,
    label: base.label,
    colors: {
      main: { ...base.colors.main, ...scale.colors?.main },
      warning: { ...base.colors.warning, ...scale.colors?.warning },
    },
    states,
    transitions: clampTransitions({
      ...base.transitions,
      ...scale.transitions,
    }),
  };
}

/** @deprecated Use resolveOrbScale. */
export const resolveVoiceOrbScale = resolveOrbScale;

export function getOrbTransitionDuration(
  from: OrbState,
  to: OrbState,
  transitions: OrbTransitions,
) {
  if (to === "error") return transitions.errorOnsetMs;
  if (from === "error") return transitions.errorRecoveryMs;
  if (from === "thinking" && to === "speaking") {
    return transitions.thinkingToSpeakingMs;
  }
  return transitions.defaultMs;
}

/** @deprecated Use getOrbTransitionDuration. */
export const getVoiceOrbTransitionDuration = getOrbTransitionDuration;

export function interpolateOrbVisualState(
  from: OrbVisualState,
  to: OrbVisualState,
  progress: number,
): OrbVisualState {
  const t = clamp(progress, 0, 1);
  const mix = (start: number, end: number) => start + (end - start) * t;
  return {
    turbulence: mix(from.turbulence, to.turbulence),
    flowSpeed: mix(from.flowSpeed, to.flowSpeed),
    vortexCount: mix(from.vortexCount, to.vortexCount),
    vortexStrength: mix(from.vortexStrength, to.vortexStrength),
    expansion: mix(from.expansion, to.expansion),
    centerPull: mix(from.centerPull, to.centerPull),
    audioResponse: mix(from.audioResponse, to.audioResponse),
    smokeDensity: mix(from.smokeDensity, to.smokeDensity),
    glowIntensity: mix(from.glowIntensity, to.glowIntensity),
    glowPulseSpeed: mix(from.glowPulseSpeed, to.glowPulseSpeed),
    warningDistortion: mix(from.warningDistortion, to.warningDistortion),
    tonePosition: mix(from.tonePosition, to.tonePosition),
  };
}

/** @deprecated Use interpolateOrbVisualState. */
export const interpolateVoiceOrbVisualState = interpolateOrbVisualState;
