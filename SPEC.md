# Voice Orb v2 Specification

Status: Implemented  
Target: Source-owned React component for this Bun/Vite project  
Reference: [`alexanderqchen/orb-ui` at `408547b`](https://github.com/alexanderqchen/orb-ui/tree/408547bc8b5a4aeee655fa1b19a452d3dbc2dcf9)  
Reference inspected: 2026-07-27

## 1. Summary

Voice Orb v2 is a provider-neutral, audio-reactive React component for realtime
voice interfaces. It presents one polished Ember WebGL visual and a consistent
six-state conversation model.

The component must work in three integration modes:

1. **Controlled:** the application passes a normalized signal.
2. **Adapter-backed:** a provider adapter publishes normalized signals and
   optionally owns session start/stop.
3. **Standalone microphone:** an explicitly enabled convenience mode requests
   microphone access and visualizes local input.

The visual must not infer that an assistant is thinking or speaking merely
because the user stopped talking. Conversation state comes from the application
or adapter. This is the central logic change from the current prototype.

## 2. Goals

- Provide one stable UI API independent of the voice provider.
- Preserve the current Ember WebGL appearance and responsive call control.
- Distinguish user input volume from assistant output volume.
- Support both interactive and passive/status-only layouts.
- Make all meaningful appearance and motion values adjustable.
- Never request microphone permission implicitly.
- Keep the component source-owned and easy to copy, shadcn-style.
- Handle React Strict Mode, unmounting, async cancellation, WebGL failure, and
  externally owned streams correctly.
- Provide enough seams for a second visual theme later without exposing a
  premature public theme system.

## 3. Non-goals

- Publishing an npm package.
- Shipping first-party Vapi, ElevenLabs, LiveKit, Pipecat, OpenAI, or Gemini
  adapters in v2.
- Owning provider authentication, tokens, WebRTC signaling, transcripts,
  mute controls, or audio playback.
- Automatically detecting `thinking` or `speaking` from microphone silence.
- Shipping multiple visual themes before a second production-quality design
  exists.
- Matching the reference repository API byte-for-byte.

## 4. State and signal model

```ts
export type VoiceOrbState =
  "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

export interface VoiceOrbSignal {
  state: VoiceOrbState;
  /** Compatibility value when direction-specific levels are unavailable. */
  volume?: number;
  /** Normalized local/user level from 0–1. */
  inputVolume?: number;
  /** Normalized remote/assistant level from 0–1. */
  outputVolume?: number;
  error?: unknown;
}
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

| State        | Meaning                  | Visual behavior                                                    | Primary action |
| ------------ | ------------------------ | ------------------------------------------------------------------ | -------------- |
| `idle`       | Available, not recording | Nearly full smoke rests inside stable glass with quiet drift       | Start          |
| `connecting` | Session is starting      | Smoke contracts while pigment gathers into a central rising plume  | Disabled       |
| `listening`  | User owns the turn       | A contained smoke mass draws gently toward an input-reactive focus | Stop           |
| `thinking`   | Agent is processing      | Two medium smoke masses fold past one another without spinning     | Stop           |
| `speaking`   | Assistant owns the turn  | Smoke expands as output releases soft pressure from a low source   | Stop           |
| `error`      | Session or media failed  | Contracted smoke loses coherence across a muted fracture           | Retry          |

Visual differences must not be the only state signal. When `showStatus` is
enabled, readable status text is always present.

The crystal shell remains stable across all states. Audio activity may change
smoke flow speed, reach, density, and local brightness, but it must not produce
whole-orb pulsing, hard radial flashes, or reveal the procedural field.
Listening and speaking use independently smoothed input and output envelopes.

## 6. Adapter boundary

```ts
export type VoiceOrbSignalListener = (signal: VoiceOrbSignal) => void;

export interface VoiceOrbAdapter {
  subscribe(listener: VoiceOrbSignalListener): () => void;
  start?: () => void | Promise<void>;
  stop?: () => void | Promise<void>;
}
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
may be added without editing the Ember renderer.

## 7. Public component API

```ts
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

export interface VoiceOrbProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onError"
> {
  signal?: VoiceOrbSignal;
  state?: VoiceOrbState;
  volume?: number;
  adapter?: VoiceOrbAdapter;

  /**
   * Optional externally owned stream to meter. The component must never stop
   * its tracks.
   */
  audioStream?: MediaStream | null;

  /**
   * Opt-in standalone mode. When true and no adapter/onStart is present,
   * activating the control requests microphone access.
   */
  requestMicrophone?: boolean;

  interactive?: boolean;
  disabled?: boolean;
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  onVoiceError?: (error: unknown) => void;

  size?: number | string;
  /** Crystal-ball diameter relative to the canvas, clamped to 0.7–1. */
  ballScale?: number;
  /** Painted-smoke radius relative to the ball, clamped to 0.5–1.1. */
  smokeScale?: number;
  colors?: Partial<VoiceOrbColors>;
  motion?: Partial<VoiceOrbMotion>;
  labels?: Partial<VoiceOrbLabels>;
  /** Precise live copy for tool use, transcription, handoff, and similar events. */
  status?: string;
  showStatus?: boolean;
  errorMessage?: string;
}
```

### Defaults

| Prop                 | Default                                        |
| -------------------- | ---------------------------------------------- |
| `state`              | derived, otherwise `"idle"`                    |
| `volume`             | derived, otherwise `0`                         |
| `requestMicrophone`  | `false`                                        |
| `interactive`        | `true`, but only when a start/stop path exists |
| `disabled`           | `false`                                        |
| `size`               | `"clamp(18rem, 48vw, 25rem)"`                  |
| `ballScale`          | `0.96`                                         |
| `smokeScale`         | `0.94`                                         |
| `colors`             | current Ember palette                          |
| `motion.speed`       | `1`                                            |
| `motion.intensity`   | `1`                                            |
| `motion.sensitivity` | `1`                                            |
| `motion.attack`      | `0.65`                                         |
| `motion.release`     | `0.22`                                         |
| `showStatus`         | `true`                                         |

### Interaction rules

- The component is interactive only if `interactive !== false` and a valid
  lifecycle path exists.
- A valid start path is `onStart`, `adapter.start`, or
  `requestMicrophone={true}`.
- A valid stop path is `onStop`, `adapter.stop`, or an internally owned
  microphone stream.
- Passive mode renders no inert button. The artwork remains a non-interactive
  status surface.
- The session control is a separate layout element below the artwork. It must
  not obscure the ball or smoke.
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

The current 900-line component must be separated into focused modules:

```text
src/components/ui/voice-orb/
├── index.ts
├── voice-orb.tsx              # Public API and state/interaction orchestration
├── voice-orb.types.ts         # Public types
├── voice-orb.css              # Layout, controls, fallback, state styles
├── signals.ts                 # State/volume precedence and normalization
├── use-audio-meter.ts         # Stream metering and ownership-safe cleanup
├── use-voice-orb-renderer.ts  # WebGL lifecycle and animation loop
├── ember-shaders.ts           # Shader source
└── voice-orb.test.tsx
```

Responsibilities:

- `voice-orb.tsx` must not contain shader source, audio sampling loops, or
  provider-specific state inference.
- `signals.ts` is pure and fully unit tested.
- `use-audio-meter.ts` accepts a stream and returns normalized level data. It
  does not mutate conversation state.
- `use-voice-orb-renderer.ts` accepts state, input/output volume, colors, and
  motion values. It owns WebGL allocation and cleanup.
- The renderer must expose an internal visual-props seam so a future second
  renderer can be added without changing signal or adapter logic.
- Do not add a public `theme` prop until there are at least two supported,
  production-ready visuals.

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
- Cache parsed colors and uniform locations.
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

- State selector for all six states
- Separate input and output volume sliders
- Canvas size, ball scale, smoke fill, speed, intensity, sensitivity, attack,
  and release controls
- Ember, Iris, and Lagoon palettes
- Interactive/passive toggle
- Reduced-motion preview
- Controlled signal example
- Adapter example using a local simulated adapter
- Optional standalone microphone example with explicit explanatory copy

Simulation belongs in the demo adapter, not in `VoiceOrb`.

## 15. Testing and verification

Use Bun for all commands.

### Unit tests

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

### Visual/browser checks

- Desktop at 1440×900
- Mobile at 390×844
- Minimum supported orb size
- Every state
- Every palette
- WebGL disabled/failure fallback
- Keyboard start, stop, retry, and focus
- No horizontal overflow

### Required commands

```bash
bun run test
bun run build
```

The project must add Vitest and a `test` script before v2 is considered
complete.

## 16. Migration from the current component

| Current API/behavior                            | v2                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `onEnd`                                         | Rename to `onStop`                                                |
| `onStart` may return a `MediaStream`            | `onStart` owns lifecycle only; pass streams through `audioStream` |
| Implicit microphone request                     | Require `requestMicrophone={true}`                                |
| `autoConversation`                              | Remove from production component; move to demo adapter            |
| Top-level `speed`, `intensity`, `sensitivity`   | Group under `motion`                                              |
| One generic live audio level                    | Add `signal.inputVolume` and `signal.outputVolume`                |
| Internal state and visual rendering in one file | Split controller, signals, meter, and renderer                    |
| Error preview inside production component       | Move simulated preview to demo                                    |

Because this is currently a local source-owned component, these changes do not
need a backwards-compatibility layer. Update the demo and README in the same
change.

## 17. Acceptance criteria

Voice Orb v2 is complete when:

1. The public signal and adapter interfaces above are implemented.
2. Controlled, adapter-backed, passive, and opt-in microphone modes work.
3. Listening responds to input volume and speaking responds to output volume.
4. The production component contains no silence-based conversation simulation.
5. The existing Ember appearance is preserved or improved.
6. WebGL and audio resources clean up without leaks or ownership violations.
7. The component remains usable without WebGL and with reduced motion.
8. Unit tests and desktop/mobile browser checks pass.
9. `bun run test` and `bun run build` pass.
10. README usage examples match the final API.

## 18. Reference-derived decisions

The reference repository informed these decisions:

- **Adopt:** one normalized signal across controlled and provider-backed modes.
- **Adopt:** separate input and output levels.
- **Adopt:** a minimal subscribe/start/stop adapter contract.
- **Adopt:** interactive and passive variants.
- **Adopt:** state and scalar prop precedence that remains easy to test.
- **Adopt:** themes should consume normalized signals, not provider events.
- **Defer:** multiple themes and public theme names.
- **Defer:** first-party provider adapters.
- **Reject for this project:** npm packaging, Changesets, and a monorepo.
- **Improve:** microphone permission becomes explicit and conversation state is
  never inferred from silence.
