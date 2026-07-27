# Magical Orb UI Drop-in Replacement Specification

Status: Proposed v3 compatibility expansion

Target: A distributable React library published as `vorb-ui`, preserving the
upstream component contract plus the existing local playground

Reference: [`alexanderqchen/orb-ui` at `408547b`](https://github.com/alexanderqchen/orb-ui/tree/408547bc8b5a4aeee655fa1b19a452d3dbc2dcf9)

Reference inspected: 2026-07-27

## 1. Summary

Magical Orb UI is a provider-neutral, audio-reactive React library for realtime
voice interfaces. It must be a consumer-compatible replacement for upstream
`orb-ui` 0.7.0 while replacing its visual implementations with one coherent
magical language: crystal, smoke, spectral light, runes, floating fragments,
and deliberate living motion.

The library keeps one deep `Orb` module at the external seam. That module must
work in three integration modes:

1. **Controlled:** the application passes a normalized signal.
2. **Adapter-backed:** a provider adapter publishes normalized signals and
   optionally owns session start/stop.
3. **Standalone microphone:** an explicitly enabled convenience mode requests
   microphone access and visualizes local input.

Conversation state comes from the application or adapter. A visual must not
infer that an assistant is thinking or speaking merely because the user stopped
talking. Every provider adapter ends at the same normalized `OrbSignal`.

Drop-in replacement means an existing upstream consumer can switch package
resolution to this library and keep its imports, JSX, provider setup, and
public type references unchanged. Magical extensions are additive and optional.

## 2. Goals

- Provide one stable UI API independent of the voice provider.
- Match the upstream `orb-ui` component and adapter surface under the `vorb-ui` package name.
- Export `Orb`, the deprecated `VoiceOrb` aliases, all upstream core types, all
  upstream provider adapter factories, and their public configuration types.
- Accept all five upstream theme identifiers with the same default and
  interaction semantics.
- Build ESM, CommonJS, and declaration output suitable for package consumers.
- Keep one consistent crystal-and-smoke visual language across every state.
- Distinguish user input volume from assistant output volume.
- Support both interactive and passive/status-only layouts.
- Make all meaningful appearance and motion values adjustable.
- Never request microphone permission implicitly.
- Keep the implementation internally modular even when distributed as a
  package.
- Handle React Strict Mode, unmounting, async cancellation, WebGL failure, and
  externally owned streams correctly.
- Make the current visual customizable through maintained scales without
  exposing shader-specific uniforms.

## 3. Non-goals

- Acting as a voice-agent platform or hosting provider.
- Owning provider authentication, tokens, WebRTC signaling, transcripts,
  prompts, speech recognition, or agent business logic.
- Automatically detecting `thinking` or `speaking` from microphone silence.
- Pixel-matching upstream theme implementations.
- Preserving upstream visual aesthetics; identifiers and behavior are
  compatible, but every renderer is deliberately re-authored in the magical
  visual language.
- Guaranteeing compatibility with undocumented upstream internals.

## 4. State and signal model

```ts
export type OrbState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface OrbSignal {
  state: OrbState;
  /** Compatibility value when direction-specific levels are unavailable. */
  volume?: number;
  /** Normalized local/user level from 0–1. */
  inputVolume?: number;
  /** Normalized remote/assistant level from 0–1. */
  outputVolume?: number;
  error?: unknown;
}

/** @deprecated Use OrbState. */
export type VoiceOrbState = OrbState;
/** @deprecated Use OrbSignal. */
export type VoiceOrbSignal = OrbSignal;
```

All volume inputs are clamped to `0–1`. Non-finite values become `0`.

### Effective state precedence

1. Explicit `state` prop
2. Explicit `signal.state`
3. Current adapter signal
4. Standalone microphone state
5. `idle`

### Effective volume precedence

1. Explicit `volume` prop
2. For `listening`: `inputVolume`, then `signal.volume`
3. For `speaking`: `outputVolume`, then `signal.volume`
4. For other states: `signal.volume`
5. Metered `audioStream` level
6. `0`

Input and output levels must not be merged when both are available. The active
state chooses the direction that drives the visual.

## 5. State behavior

| State        | Meaning                  | Visual behavior                                                  | Primary action |
| ------------ | ------------------------ | ---------------------------------------------------------------- | -------------- |
| `idle`       | Available, not recording | Low-energy smoke circulates and settles inside stable glass      | Start          |
| `connecting` | Session is starting      | Boundary strands gather toward a stable continuous pathway       | Disabled       |
| `listening`  | User owns the turn       | Phrase waves travel inward from the lower-front surface          | Stop           |
| `thinking`   | Agent is processing      | Coordinated local vortices split, exchange wisps, and reconnect  | Stop           |
| `speaking`   | Assistant owns the turn  | An organized stream carries phrase waves from the center outward | Stop           |
| `error`      | Session or media failed  | Smoke stutters once around a localized warm fracture-like flare  | Retry          |

Visual differences must not be the only state signal. When `showStatus` is
enabled, readable status text is always present.

The crystal shell remains stable across all states. Audio activity may change
the strength and reach of the directional intake/output stream, but it must not
resize the smoke envelope, change global animation speed, produce whole-orb
pulsing, or flash the lighting. Listening and speaking use independently
smoothed input and output envelopes. All states share accumulated phase and
blend their vector fields so material and momentum never reset at a transition.

## 6. Adapter boundary

```ts
export type OrbSignalListener = (signal: OrbSignal) => void;

export interface OrbAdapter {
  subscribe(listener: OrbSignalListener): () => void;
  start?: () => void | Promise<void>;
  stop?: () => void | Promise<void>;
}

/** @deprecated Use OrbSignalListener. */
export type VoiceOrbSignalListener = OrbSignalListener;
/** @deprecated Use OrbAdapter. */
export type VoiceOrbAdapter = OrbAdapter;
```

Requirements:

- `subscribe` immediately or eventually emits complete signal snapshots.
- It returns an idempotent unsubscribe function.
- The adapter owns provider event mapping and provider-specific cleanup.
- The component resets its adapter-derived signal to `idle` whenever the
  adapter identity changes.
- `onStart` and `onStop` override the corresponding adapter methods.
- Adapter errors are represented by `{ state: "error", error }`.

Provider-specific code must stay outside the visual component. A future adapter
may be added without editing the crystal-ball renderer.

## 7. Public component API

The compatibility names are canonical. Existing `VoiceOrb*` names remain
deprecated aliases so the current prototype can migrate without a flag day.

```ts
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
  style?: React.CSSProperties;
}

type DataAttributeValue = string | number | boolean | null | undefined;

export interface OrbHtmlAttributes extends React.AriaAttributes {
  id?: string;
  title?: string;
  role?: string;
  tabIndex?: number;
  [dataAttribute: `data-${string}`]: DataAttributeValue;
}

export type OrbScaleName = "crystal" | "ember" | "iris" | "lagoon";

export type OrbToneRamp = {
  deepest: string;
  deep: string;
  base: string;
  bright: string;
  lightest: string;
};

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

export interface OrbScaleDefinition {
  name: OrbScaleName;
  label: string;
  colors: {
    main: OrbToneRamp;
    warning: OrbToneRamp;
  };
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

export type OrbStyle = React.CSSProperties & {
  "--vorb-ui-radial-control-surround"?: string;
  "--vorb-ui-size"?: string;
  "--vorb-ui-control-size"?: string;
  "--vorb-ui-control-gap"?: string;
  "--vorb-ui-control-offset-x"?: string;
  "--vorb-ui-control-offset-y"?: string;
  /** @deprecated Use --vorb-ui-size. */
  "--voice-orb-size"?: string;
};

export interface OrbProps extends OrbHtmlAttributes {
  // Upstream-compatible surface.
  signal?: OrbSignal;
  state?: OrbState;
  volume?: number;
  adapter?: OrbAdapter;
  theme?: OrbTheme;
  cloudMode?: OrbCloudMode;
  control?: OrbControlOptions;
  /** Numeric values match upstream; responsive CSS strings are additive. */
  size?: number | string;
  className?: string;
  style?: OrbStyle;
  disabled?: boolean;
  interactive?: boolean;
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;

  // Additive magical extensions.
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

export function Orb(props: OrbProps): React.ReactElement;

/** @deprecated Use Orb. */
export const VoiceOrb: typeof Orb;
/** @deprecated Use OrbProps. */
export type VoiceOrbProps = OrbProps;

// The remaining VoiceOrbScale*, VoiceOrbMotion, VoiceOrbLabels, and visual
// types are deprecated aliases of their Orb* equivalents.
```

### Defaults

| Prop                 | Default                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `state`              | derived, otherwise `"idle"`                                       |
| `volume`             | derived, otherwise `0`                                            |
| `theme`              | `"debug"` for upstream compatibility                              |
| `cloudMode`          | `"shell"`; `"gas"` is rough smoke, `"vapor"` is soft floating gas |
| `control.position`   | `"bottom"`                                                        |
| `control.appearance` | `"glass"`                                                         |
| `control.size`       | responsive clamp derived from artwork size                        |
| `control.gap`        | `0.875rem`                                                        |
| `size`               | `200` pixels                                                      |
| `requestMicrophone`  | `false`                                                           |
| `interactive`        | `true`, but only when a lifecycle path exists                     |
| `disabled`           | `false`                                                           |
| `ballScale`          | `0.96`                                                            |
| `smokeScale`         | `0.94`                                                            |
| `scale`              | `"crystal"`                                                       |
| `motion.speed`       | `1`                                                               |
| `motion.intensity`   | `1`                                                               |
| `motion.sensitivity` | `1`                                                               |
| `motion.attack`      | `0.65`                                                            |
| `motion.release`     | `0.22`                                                            |
| `showStatus`         | `false` on canonical `Orb`; legacy `VoiceOrb` keeps `true`        |

### Magical themes

All upstream theme identifiers remain valid. They are adapters behind the same
normalized visual-state seam, not separate state machines.

| Theme    | Magical interpretation                                                     |
| -------- | -------------------------------------------------------------------------- |
| `radial` | A planar energy pinwheel with layered rays and a stable luminous core      |
| `cloud`  | The complete crystal cloud: glass, smoke, and internal vortices            |
| `circle` | A layered orbital signal instrument with scanning arcs and telemetry nodes |
| `bars`   | Seven minimalist spectral channels with continuous state-responsive motion |
| `debug`  | An arcane instrument panel exposing state and normalized levels            |

Every theme uses the same dedicated session control when interactive and no
inert control when passive. Every theme also uses the selected scale and the
same state action language. Theme changes may alter composition, but must not
reinterpret state meaning.

### Visual scales

- `crystal` is the default blue/lavender scale. `ember`, `iris`, and `lagoon`
  are maintained built-ins exported through `ORB_SCALES`.
- Every scale contains a five-stop main ramp, a five-stop amber/coral warning
  ramp, a complete target for each conversation state, and transition timings.
- A custom scale extends one built-in and may override any ramp stop, state
  value, or transition without restating the complete definition.
- Normalized visual values are clamped to `0–1`, `vortexCount` to `1–3`, and
  transition durations to `0–3000 ms`.
- State and scale changes interpolate in the existing render loop and never
  recreate the WebGL context.
- `motion` is applied after the selected scale as global runtime tuning.
- Scale changes do not alter state meaning. The crystal remains the assistant;
  smoke direction and rhythm remain the primary state cues.
- `VOICE_ORB_SCALES` and `DEFAULT_VOICE_ORB_SCALE` remain deprecated aliases
  for existing users of this prototype.

### Interaction rules

- The component is interactive only if `interactive !== false` and a valid
  lifecycle path exists.
- A valid start path is `onStart`, `adapter.start`, or
  `requestMicrophone={true}`.
- A valid stop path is `onStop`, `adapter.stop`, or an internally owned
  microphone stream.
- Passive mode renders no inert button. The artwork remains a non-interactive
  status surface.
- The session control defaults to a separate layout element below the artwork.
  Callers may place it above or intentionally overlay it through
  `control.position`.
- `connecting` disables the control to prevent duplicate starts.
- `idle` and `error` invoke start/retry.
- `listening`, `thinking`, and `speaking` invoke stop.
- Escape stops an active session only while focus is within the component or
  the component owns the active microphone session. Multiple orbs must not
  install conflicting global shortcuts.

## 8. Standalone microphone mode

Standalone microphone behavior is deliberately narrow:

1. The user activates the start control.
2. State becomes `connecting`.
3. The component calls `getUserMedia`.
4. On success, state becomes `listening` and input volume is metered.
5. It remains `listening` until stopped.
6. It never invents `thinking` or `speaking`.

The component stops only streams it created. Externally supplied streams are
disconnected from metering but their tracks remain active.

If permission resolves after cancellation or unmount, the newly returned tracks
are stopped immediately and the result is ignored.

## 9. Internal architecture

The package must concentrate behavior behind one external `Orb` interface.
Provider adapters and theme renderers are internal seams; callers should not
need to understand their implementations.

```text
src/
├── index.ts                         # vorb-ui root entry
├── components/Orb/
│   ├── Orb.tsx                      # Public orchestration module
│   ├── Orb.types.ts                 # Canonical public types and aliases
│   └── signals.ts                   # State/volume precedence
├── presentation/
│   ├── scales.ts                    # Built-ins and custom resolution
│   ├── motion.ts                    # Shared phase and reduced-motion policy
│   └── visual-state.ts              # Renderer-neutral normalized model
├── themes/
│   ├── cloud/                       # Full crystal-cloud renderer
│   ├── cloud/                       # Magical atmospheric renderer
│   ├── circle/                      # Magical compact renderer
│   ├── bars/                        # Magical spectral-shard renderer
│   └── debug/                       # Magical diagnostics renderer
└── adapters/
    ├── index.ts                     # vorb-ui/adapters entry
    ├── types.ts
    ├── audio-level.ts
    ├── vapi/
    ├── elevenlabs/
    ├── livekit/
    ├── pipecat/
    ├── openai-realtime/
    └── gemini-live/
```

Responsibilities:

- `Orb.tsx` must not contain shader source, audio sampling loops, or
  provider-specific state inference.
- `signals.ts` is pure and fully unit tested.
- `presentation/scales.ts` is the appearance seam. It owns built-in definitions,
  nested custom-scale resolution, clamping, and transition selection.
- The shared presentation module resolves state, input/output volume, scale,
  motion, reduced-motion policy, labels, and interaction state once.
- Theme adapters consume that resolved model. They do not subscribe to
  providers, own session state, or reinterpret signal precedence.
- Adapter implementations emit only `OrbSignal`; they never import a theme.
- Browser audio metering and calibration are shared across adapters.
- The external seam is the `Orb` interface. Theme and provider seams remain
  internal except for documented factories and configuration types.

## 10. Audio normalization

Metering uses time-domain RMS rather than averaging the entire FFT spectrum.
The meter applies:

1. Noise floor removal
2. Gain
3. Power-curve shaping
4. Separate attack and release smoothing
5. Clamp to `0–1`

The implementation must not allocate arrays per sample. Defaults must be tuned
for speech and adjustable internally without changing the public signal format.

The component samples visual frames with `requestAnimationFrame`; audio metering
may update at approximately 30 Hz.

## 11. Rendering and performance

- One animation frame loop per mounted orb.
- No canvas creation, color parsing, array allocation, or React state update per
  frame.
- Cache parsed scale colors and uniform locations.
- Cap device pixel ratio at `2`.
- Resize through `ResizeObserver`.
- Pause or substantially reduce work when the document is hidden.
- Correctly delete WebGL buffers, programs, and shaders on unmount.
- Handle `webglcontextlost` and `webglcontextrestored`.
- Never intentionally lose the context during normal or Strict Mode cleanup.
- If WebGL is unavailable or compilation fails, show the CSS fallback without
  breaking controls or status.

## 12. Accessibility

- Interactive mode uses a native `<button type="button">`.
- Passive mode does not expose button semantics.
- The control has a state-appropriate accessible name.
- Status text uses `aria-live="polite"` and `aria-atomic="true"`.
- Error detail uses `role="alert"`.
- Focus is visible at WCAG 2.2 AA contrast.
- No information depends only on color, glow, or movement.
- `prefers-reduced-motion` freezes decorative movement while preserving state
  changes and audio-independent feedback.
- `motion.speed: 0` follows the same renderer behavior: phase is frozen and
  state weights snap directly to their target instead of animating against a
  frozen phase.
- State transitions may change flow amplitude, but must never reinterpret
  accumulated time as a new rotation angle.
- Forward `id`, `title`, `role`, `tabIndex`, `aria-*`, and `data-*` attributes
  to the root/status surface without leaking internal props to the DOM.

## 13. Error behavior

The component recognizes at least:

- Permission denied
- No input device
- Device busy/not readable
- Unsupported media APIs
- Audio context failure
- WebGL initialization failure
- Adapter-emitted errors

Media/session errors set the UI to `error`, retain adjacent recovery copy, and
call `onVoiceError`. WebGL failure alone does not set conversation state to
`error`; it activates the CSS fallback.

Error recovery must be possible with keyboard alone.

## 14. Demo requirements

The existing demo remains a prop playground and must include:

- All five compatibility themes, each rendered in the magical language
- State selector for all six states
- Separate input and output volume sliders
- Canvas size, ball scale, smoke fill, speed, intensity, sensitivity, attack,
  and release controls
- Crystal, Ember, Iris, and Lagoon scales plus one custom extension
- Interactive/passive toggle
- Reduced-motion preview
- Controlled signal example
- Adapter example using a local simulated adapter
- Optional standalone microphone example with explicit explanatory copy
- Import examples for `vorb-ui`, `vorb-ui/adapters`, and
  `vorb-ui/adapters/livekit`
- Adapter contract fixtures for Vapi, ElevenLabs, LiveKit, Pipecat, OpenAI
  Realtime, Gemini Live, and custom controlled signals

Simulation belongs in the demo adapter, not in `Orb`.

## 15. Testing and verification

Use Bun for all commands.

### Unit tests

- Root `Orb` and deprecated `VoiceOrb` alias behavior
- Exact upstream theme-name and default acceptance
- State precedence: scalar state → signal → adapter → idle
- Direction-aware volume precedence
- Volume clamping and non-finite inputs
- Adapter subscribe/unsubscribe on identity changes
- `onStart`/`onStop` override adapter methods
- Passive mode has no button
- Disabled and connecting controls do not fire
- Attribute and style forwarding
- Every state renders with status copy
- External streams are never stopped
- Internally owned streams are stopped exactly once
- Late microphone permission results are cancelled safely
- Reduced-motion behavior
- WebGL fallback behavior
- Built-in scale completeness and immutability
- Custom scale merging, clamping, and transition selection
- Every provider adapter's state mapping, audio normalization, lifecycle,
  duplicate-start protection, unsubscribe behavior, and owned-resource cleanup
- Audio calibration and media-track metering
- Package export map and declaration-file smoke tests
- Type-level positive and `@ts-expect-error` compatibility fixtures copied as
  consumer scenarios, not tests of internal implementation

### Visual/browser checks

- Desktop at 1440×900
- Mobile at 390×844
- Minimum supported orb size
- Every state
- Every compatibility theme
- Every built-in scale and the custom extension
- WebGL disabled/failure fallback
- Keyboard start, stop, retry, and focus
- No horizontal overflow

### Required commands

```bash
bun run test
bun run build
bun run typecheck:package
bun run test:e2e:built
```

The final `check` script must compose formatting, lint, type checks, unit tests,
library build, demo build, package-consumer type checks, and built-package E2E
tests. Individual commands must remain runnable for focused development.

## 16. Migration from the current prototype

| Current prototype                     | Drop-in package                                                    |
| ------------------------------------- | ------------------------------------------------------------------ |
| `VoiceOrb` only                       | Add canonical `Orb`; retain `VoiceOrb` as a deprecated alias       |
| `VoiceOrb*` public types              | Add canonical `Orb*`; retain source-compatible aliases             |
| One crystal-ball renderer             | Make it `cloud`; add four magical compatibility themes             |
| Source-owned private Vite application | Split library build from playground application                    |
| No package exports                    | Add `.`, `./adapters`, and `./adapters/livekit` exports            |
| Generic custom adapter only           | Add all six first-party provider factories and public types        |
| Responsive string size default        | Preserve as extension; canonical compatibility default is `200`    |
| Crystal is visually default           | Upstream-compatible `theme="debug"` default, magically re-authored |
| `VOICE_ORB_SCALES`                    | Add `ORB_SCALES`; keep the old name as a deprecated alias          |

No compatibility layer is needed for abandoned pre-v2 prototype props. A
compatibility layer is required for the already-implemented v2 names because
they are part of this repository's documented interface.

## 17. Acceptance criteria

Magical Orb UI v3 is complete when:

1. An upstream 0.7.0 consumer fixture compiles after changing package
   resolution only.
2. `Orb`, `VoiceOrb`, all core types, every adapter factory, and every documented
   adapter type are available from the same import paths as upstream.
3. Controlled, adapter-backed, passive, and opt-in microphone modes work.
4. All five theme identifiers render a magical but behavior-compatible theme.
5. Listening responds to input volume and speaking responds to output volume.
6. The production component contains no silence-based conversation simulation.
7. Crystal is the default scale and all four scales remain legible in every
   state and theme.
8. Provider, WebGL, Web Audio, media, timer, and DOM resources clean up without
   leaks or ownership violations.
9. The component remains usable without WebGL and with reduced motion.
10. ESM, CommonJS, and declaration outputs resolve from every documented
    package entry.
11. Unit, type-level, package-consumer, and desktop/mobile browser checks pass.
12. The full `check` command passes.
13. README, adapter guides, migration notes, and examples match the final
    interface.

## 18. Reference-derived decisions

The reference repository defines the compatibility contract:

- **Adopt exactly:** root and subpath exports, core prop/type names, five theme
  identifiers, six states, signal precedence, and lifecycle semantics.
- **Adopt:** one normalized signal across controlled and provider-backed modes.
- **Adopt:** separate input and output levels.
- **Adopt:** a minimal subscribe/start/stop adapter contract.
- **Adopt:** interactive and passive variants.
- **Adopt:** state and scalar prop precedence that remains easy to test.
- **Adopt:** provider adapters and their structural SDK types without turning
  provider SDKs into hard dependencies.
- **Extend:** visual scales consume normalized signals, not provider events.
- **Extend:** named scales and motion controls customize every magical theme.
- **Re-author:** all visual themes around the magical entity language.
- **Keep optional:** Changesets and a monorepo; neither is required for consumer
  compatibility.
- **Improve:** microphone permission becomes explicit and conversation state is
  never inferred from silence.

## 19. Package compatibility contract

The package manifest must identify the distributable library and expose these
entrypoints:

| Import path                | Required contents                                        |
| -------------------------- | -------------------------------------------------------- |
| `vorb-ui`                  | `Orb`, core types, deprecated `VoiceOrb` aliases         |
| `vorb-ui/adapters`         | Six provider factories, adapter types, calibration types |
| `vorb-ui/adapters/livekit` | Managed browser LiveKit factory and browser config types |

Required output:

- ESM JavaScript
- CommonJS JavaScript
- `.d.ts` declarations for every entry
- `typesVersions` mappings matching the subpaths
- React 18+ and React DOM 18+ as peer dependencies
- `livekit-client >=2.20.0 <3` as an optional peer dependency
- No provider SDK bundled into the root entry
- No adapter imported by the root visual bundle
- The package must be side-effect safe on server import; browser globals are
  touched only during a browser lifecycle or factory start

Compatibility is verified from a clean consumer fixture importing from the
built package, not from source aliases. The fixture must cover JSX, core type
assignability, every adapter entry, CommonJS loading, ESM loading, and
server-side import without `window`.

## 20. Provider adapter and public type contract

The adapter entry must export:

| Provider         | Factory                       | Public types                                                                                                                                                                                                                  |
| ---------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vapi             | `createVapiAdapter`           | Uses a structural client interface; `assistantId` remains optional                                                                                                                                                            |
| ElevenLabs       | `createElevenLabsAdapter`     | `ElevenLabsCallbacks`, `ElevenLabsConfig`, `ElevenLabsConnectionType`, `ElevenLabsConversation`, `ElevenLabsConversationClass`, `ElevenLabsMode`, `ElevenLabsOrbAdapter`, `ElevenLabsStartSessionOptions`, `ElevenLabsStatus` |
| LiveKit advanced | `createLiveKitAdapter`        | `LiveKitAdapterConfig`, `LiveKitConnectionDetails`, `LiveKitOrbAdapter`, `LiveKitResolvedTokenOptions`, `LiveKitTokenOptions`, `LiveKitTokenSource`                                                                           |
| Pipecat          | `createPipecatAdapter`        | `PipecatAdapterOptions`, `PipecatClientLike`, `PipecatOrbAdapter`, `PipecatParticipantLike`, `PipecatTracksLike`                                                                                                              |
| OpenAI Realtime  | `createOpenAIRealtimeAdapter` | `OpenAIRealtimeAdapterConfig`, `OpenAIRealtimeClientSecret`, `OpenAIRealtimeOrbAdapter`                                                                                                                                       |
| Gemini Live      | `createGeminiLiveAdapter`     | `GeminiLiveAdapterConfig`, `GeminiLiveCallbacks`, `GeminiLiveInlineData`, `GeminiLiveOrbAdapter`, `GeminiLiveServerMessage`, `GeminiLiveSession`                                                                              |

The adapter entry also exports:

- `OrbAdapter`
- `OrbSignal`
- `OrbSignalListener`
- `OrbState`
- `DEFAULT_OUTPUT_VOLUME_CALIBRATION`
- `OutputVolumeCalibration`
- `OutputVolumeCalibrationSource`
- `OutputVolumeSample`

The LiveKit browser subpath exports:

- `createLiveKitAdapter`
- `LiveKitBrowserAdapterConfig`
- `LiveKitEndpointAdapterConfig`
- `LiveKitSandboxAdapterConfig`
- `LiveKitSandboxOptions`
- `LiveKitTokenEndpointOptions`
- `LiveKitOrbAdapter`

Provider factories must follow these shared invariants:

1. `subscribe` supports multiple listeners and returns idempotent cleanup.
2. `start` and `stop` serialize lifecycle operations and are safe under repeated
   activation.
3. Provider state maps into the six canonical states.
4. Input and output levels stay separate.
5. Provider quirks—debouncing, sparse events, gain, transport state, and
   interruption—are normalized inside the adapter.
6. Resources created by an adapter are stopped exactly once.
7. Resources supplied by an application are detached but not destroyed.
8. Authentication material is obtained through caller-provided callbacks or
   endpoints; long-lived provider secrets never enter the browser package.
9. Errors emit `{ state: "error", error }` and a later start can recover.

The implementation may improve provider behavior, but it may not narrow any
documented upstream input type or remove a documented public export.

## 21. Magical visual language

The assistant is a magical entity, not a generic data visualization. Across all
themes:

- Material appears continuous and conserved. It gathers, mixes, listens, and
  speaks rather than swapping animation clips.
- Motion is smooth, lively, and intentional. Avoid vibration, bouncing,
  flashing, whole-object pumping, and audio-driven global speed changes.
- Listening visibly receives phrase-like material from the user-facing edge.
- Thinking mixes collected material through soft self-rotating vortices with
  hidden cores and long dissolving trails.
- Speaking organizes material into an outward stream with phrase cadence.
- Error is a local loss of coherence with a warning flare, not a full recolor.
- Glass, mist, spectral light, runes, and floating fragments share the selected
  tonal scale.
- State remains understandable with motion disabled through composition,
  density, direction, labels, and localized warning structure.
- Scale customization changes mood, not the meaning of a state.

The current crystal-ball renderer becomes the reference implementation for
motion quality. Simpler themes may reduce detail, but they must retain the same
entity-like continuity and state narrative.
