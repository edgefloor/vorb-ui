import {
  ORB_SCALES,
  type OrbCloudMode,
  type OrbControlAppearance,
  type OrbControlPosition,
  type OrbScale,
  type OrbState,
  type OrbTheme,
} from "vorb-ui";

export type SignalSource = "manual" | "simulation" | "microphone";

export const STATES: Array<{ value: OrbState; label: string }> = [
  { value: "idle", label: "Idle" },
  { value: "connecting", label: "Connecting" },
  { value: "listening", label: "Listening" },
  { value: "thinking", label: "Thinking" },
  { value: "speaking", label: "Speaking" },
  { value: "error", label: "Error" },
];

export const THEMES: Array<{ value: OrbTheme; label: string }> = [
  { value: "radial", label: "Radial" },
  { value: "cloud", label: "Cloud" },
  { value: "circle", label: "Circle" },
  { value: "bars", label: "Bars" },
  { value: "debug", label: "Debug" },
];

export const CLOUD_MODES: Array<{ value: OrbCloudMode; label: string }> = [
  { value: "shell", label: "Shell" },
  { value: "gas", label: "Gas" },
  { value: "vapor", label: "Vapor" },
];

export const CONTROL_POSITIONS: Array<{ value: OrbControlPosition; label: string }> = [
  { value: "bottom", label: "Below" },
  { value: "top", label: "Above" },
  { value: "overlay-bottom", label: "Overlay bottom" },
  { value: "overlay-center", label: "Overlay center" },
  { value: "overlay-top", label: "Overlay top" },
];

export const CONTROL_APPEARANCES: Array<{ value: OrbControlAppearance; label: string }> = [
  { value: "minimal", label: "Minimal" },
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
];

export const SIGNAL_SOURCES: Array<{ value: SignalSource; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "simulation", label: "Simulated call" },
  { value: "microphone", label: "Microphone" },
];

const CUSTOM_SCALE: OrbScale = {
  base: "crystal",
  colors: {
    main: {
      deepest: "#171126",
      deep: "#3d245e",
      base: "#7860c7",
      bright: "#9ee8dc",
      lightest: "#f5f2ff",
    },
  },
  states: {
    listening: { audioResponse: 0.95 },
    speaking: { glowIntensity: 1, expansion: 0.82 },
  },
};

export const SCALE_OPTIONS: Array<{
  name: string;
  code: string;
  scale: OrbScale;
  swatch: string;
}> = [
  {
    name: ORB_SCALES.crystal.label,
    code: '"crystal"',
    scale: "crystal",
    swatch: ORB_SCALES.crystal.colors.main.base,
  },
  {
    name: ORB_SCALES.ember.label,
    code: '"ember"',
    scale: "ember",
    swatch: ORB_SCALES.ember.colors.main.base,
  },
  {
    name: ORB_SCALES.iris.label,
    code: '"iris"',
    scale: "iris",
    swatch: ORB_SCALES.iris.colors.main.base,
  },
  {
    name: ORB_SCALES.lagoon.label,
    code: '"lagoon"',
    scale: "lagoon",
    swatch: ORB_SCALES.lagoon.colors.main.base,
  },
  {
    name: "Custom",
    code: "{ customScale }",
    scale: CUSTOM_SCALE,
    swatch: "#7860c7",
  },
];
