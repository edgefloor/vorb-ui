# Magical Orb UI Drop-in Replacement Plan

Status: Ready for implementation
Compatibility baseline: `orb-ui` 0.7.0, commit
`408547bc8b5a4aeee655fa1b19a452d3dbc2dcf9`
Companion contract: [SPEC.md](./SPEC.md)

## Outcome

Turn the current crystal-ball prototype into a distributable library that can
replace upstream `orb-ui` for an existing React consumer without source
changes. Preserve the current renderer as the flagship `cloud` theme, add the
remaining compatibility themes in the same magical visual language, ship all
provider adapters and public types, and retain the current `VoiceOrb*`
extensions as deprecated aliases.

The external seam remains small:

```tsx
import { Orb } from "vorb-ui";

<Orb adapter={adapter} theme="cloud" scale="crystal" />;
```

All provider complexity, audio normalization, scale resolution, state
precedence, interaction rules, resource ownership, and renderer lifecycle stay
behind that interface.

## Compatibility inventory

| Area            | Current repository              | Required result                                                  |
| --------------- | ------------------------------- | ---------------------------------------------------------------- |
| Root component  | `VoiceOrb`                      | Canonical `Orb` plus `VoiceOrb` alias                            |
| Core types      | `VoiceOrb*`                     | Canonical upstream `Orb*` types plus aliases                     |
| Themes          | One crystal renderer            | `debug`, `circle`, `bars`, `cloud`, `radial`                     |
| Package         | Private Vite app                | ESM/CJS/declarations library plus playground                     |
| Entry points    | Source barrel only              | `.`, `./adapters`, `./adapters/livekit`                          |
| Adapters        | Generic interface and demo fake | Vapi, ElevenLabs, LiveKit, Pipecat, OpenAI Realtime, Gemini Live |
| Provider types  | None                            | Full documented upstream adapter type surface                    |
| Package tests   | None                            | Built-package ESM, CJS, declarations, SSR, and E2E fixtures      |
| Visual language | Crystal ball only               | Five related magical manifestations                              |

## Module design

### External seam

`Orb` owns prop precedence, adapter subscription, lifecycle decisions,
accessibility, and selection of a theme adapter. `OrbProps` includes the
upstream-compatible surface plus optional magical extensions.

### Shared presentation module

Create one renderer-neutral resolved model:

```ts
interface ResolvedOrbPresentation {
  state: OrbState;
  inputVolume: number;
  outputVolume: number;
  activeVolume: number;
  scale: OrbScaleDefinition;
  motion: OrbMotion;
  interactive: boolean;
  disabled: boolean;
  reducedMotion: boolean;
  label: string;
  status?: string;
}
```

This is an internal seam. Theme adapters receive this model and render it.
They do not subscribe to providers or resolve precedence independently.

### Provider seam

Every provider factory returns `OrbAdapter`. Provider-specific structural
types stay in their adapter module. Shared audio calibration and browser
metering live under `src/adapters/audio-level.ts`.

### Distribution seam

The library build has three entries:

- `src/index.ts`
- `src/adapters/index.ts`
- `src/adapters/livekit/browser.ts`

The playground consumes the built-compatible source interface rather than
private theme files.

## Implementation sequence

Each step is intended to be a small reviewable commit. Every commit must keep
existing tests green and add the tests needed for its new interface.

### 1. Freeze the compatibility baseline

- Add a checked-in compatibility manifest recording upstream version, commit,
  root exports, subpath exports, theme names, defaults, and public type names.
- Add source-level consumer fixtures for all currently documented upstream
  imports.
- Add negative type fixtures for invalid ElevenLabs auth combinations and
  invalid LiveKit endpoint/sandbox combinations.
- Do not copy upstream implementation tests; test observable compatibility.

Verification:

- Compatibility manifest matches the pinned repository snapshot.
- Fixtures fail against the current package, documenting the gap.

### 2. Split library build from playground

- Make the package distributable while retaining the current Vite playground.
- Add library entries for root, adapters, and LiveKit browser adapter.
- Externalize React, React DOM, React JSX runtime, and optional LiveKit.
- Generate declarations and add export maps and `typesVersions`.
- Move package-only and demo-only dependencies to the correct dependency class.
- Keep Bun as the repository command runner.

Verification:

- ESM and CJS can import the built root.
- A Node process can import the root without browser globals.
- The playground still runs independently.

### 3. Introduce the canonical `Orb` interface

- Add exact canonical core types: `Orb`, `OrbProps`, `OrbState`, `OrbTheme`,
  `OrbSignal`, `OrbSignalListener`, `OrbAdapter`, `OrbStyle`, and
  `OrbHtmlAttributes`.
- Preserve `VoiceOrb`, `VoiceOrbProps`, and all existing `VoiceOrb*` types as
  deprecated aliases.
- Preserve state and volume precedence.
- Match upstream defaults for `theme`, numeric `size`, `disabled`, and
  `interactive`.
- Keep responsive string sizes and the current advanced props as additive
  extensions.
- Forward only documented HTML, ARIA, and data attributes.

Verification:

- Upstream core consumer fixtures compile unchanged.
- Existing prototype usage compiles through aliases.
- Interaction and precedence tests pass through `Orb`, not internal helpers.

### 4. Extract the shared presentation module

- Move scale resolution, labels, motion defaults, reduced-motion policy, and
  resolved state/volume into one deep module.
- Rename canonical scale exports to `ORB_SCALES` and
  `DEFAULT_ORB_SCALE`.
- Preserve `VOICE_ORB_SCALES` and `DEFAULT_VOICE_ORB_SCALE` as aliases.
- Define canonical `OrbScale*`, `OrbMotion`, `OrbLabels`, and visual state
  types, with `VoiceOrb*` aliases.
- Ensure theme changes do not recreate adapter subscriptions or owned audio.

Verification:

- All themes can be driven from one `ResolvedOrbPresentation` fixture.
- Scale and state interpolation tests remain renderer-independent.

### 5. Promote the current renderer to magical `cloud`

- Move the existing crystal-ball renderer under `themes/cloud`.
- Use the shared dedicated session control when interactive, with disabled,
  passive, and accessible-name behavior identical across themes.
- Preserve the current state narrative, scales, WebGL fallback, resource
  cleanup, and reduced-motion behavior.
- Keep shader and WebGL details private to the cloud adapter.

Verification:

- Existing crystal visual regression cases pass under `theme="cloud"`.
- Upstream cloud JSX fixtures compile and behave correctly.

### 6. Add four magical compatibility themes

Implement each as a real theme adapter, not a wrapper that ignores `theme`:

- `radial`: planar living energy with layered rotating rays.
- `circle`: compact scrying lens.
- `bars`: five levitating spectral shards.
- `debug`: arcane diagnostic panel with readable raw state and levels.

All themes use the same scale, state action, interaction, labels, and
reduced-motion policy. Prefer CSS/canvas where WebGL adds no leverage.

Verification:

- Six states × five themes × four built-in scales remain legible.
- Listening and speaking respond to the correct directional volume.
- Error and reduced-motion states retain non-color cues.

### 7. Add shared adapter audio utilities

- Add `OutputVolumeCalibration`,
  `OutputVolumeCalibrationSource`, `OutputVolumeSample`, and
  `DEFAULT_OUTPUT_VOLUME_CALIBRATION`.
- Implement deterministic calibration, attack/release smoothing, and
  media-track metering.
- Make browser dependencies injectable for tests.
- Document ownership: created contexts/elements/tracks are cleaned up; supplied
  resources are detached only.

Verification:

- Calibration edge cases and non-finite values are covered.
- Meters stop once and allocate no arrays per sample.

### 8. Add Vapi and ElevenLabs adapters

- Implement Vapi event mapping, output normalization, speaking-to-listening
  debounce, assistant ID forwarding, and listener cleanup.
- Implement ElevenLabs auth discriminated unions, callback injection,
  session ownership, input/output polling, duplicate-start protection, and
  recoverable errors.
- Export the complete ElevenLabs public type surface.

Verification:

- Structural SDK fakes exercise the factories without hard SDK dependencies.
- Auth type fixtures accept and reject the same shapes as upstream.

### 9. Add Pipecat adapter

- Implement transport and bot event mapping.
- Support transport-specific connect/disconnect overrides.
- Support sparse level events and browser-track fallback metering.
- Handle participant filtering and remote audio element ownership.
- Export all Pipecat public types.

Verification:

- Daily, SmallWebRTC-style, and sparse-event fixtures normalize to the same
  `OrbSignal`.

### 10. Add OpenAI Realtime and Gemini Live adapters

- OpenAI: fetch a fresh client secret per start, create the WebRTC call,
  manage microphone and remote playback, map server events, meter both sides,
  and clean up retryably.
- Gemini: accept a caller-owned official Live connection factory, capture and
  resample microphone PCM, support client/server activity detection, decode
  output audio, handle interruption, and clean up retryably.
- Export every documented config, callback, message, session, and adapter type.

Verification:

- Network, media, peer connection, audio context, and session dependencies are
  injectable and fully faked.
- Standard long-lived API keys never appear in browser examples.

### 11. Add advanced and browser LiveKit adapters

- Implement the advanced adapter for existing rooms, token sources, connection
  callbacks, and static credentials.
- Implement `vorb-ui/adapters/livekit` with endpoint and sandbox discriminated
  unions, fresh room names, optional agent dispatch metadata, microphone
  ownership, playback, analysers, and calibration hooks.
- Keep `livekit-client` isolated to the browser subpath and optional peer.
- Export all advanced and browser public types.

Verification:

- Root import works when LiveKit is absent.
- Browser subpath consumer works with the supported LiveKit peer range.
- Endpoint/sandbox type exclusions match upstream.

### 12. Add built-package compatibility gates

- Compile the pinned upstream-style consumer fixture against `dist`.
- Add ESM, CommonJS, Node SSR-import, and browser-render smoke tests.
- Add E2E tests for interactive/passive controls, theme switching, adapter
  switching, cleanup, WebGL fallback, and keyboard behavior.
- Compare the generated export/type inventory with the checked-in
  compatibility manifest.

Verification:

- A package-resolution-only swap passes.
- No test imports private source paths.

### 13. Finish documentation and release hygiene

- Rewrite README around `Orb` and the three package entrypoints.
- Add provider setup guides with security notes.
- Document magical scales and theme interpretations.
- Add a migration guide for upstream users and current `VoiceOrb` users.
- Preserve the upstream MIT notice for any adapted source.
- Add changelog/release tooling only if this package will be published; it is
  not required for local alias or workspace distribution.

Verification:

- Every documentation snippet is typechecked.
- The full repository `check` command passes.

## Test matrix

| Dimension   | Coverage                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------- |
| State       | idle, connecting, listening, thinking, speaking, error                                             |
| Theme       | debug, circle, bars, cloud, radial                                                                 |
| Scale       | crystal, ember, iris, lagoon, custom extension                                                     |
| Integration | scalar controlled, signal controlled, custom adapter, six provider adapters, standalone microphone |
| Interaction | interactive, passive, disabled, missing start/stop capability                                      |
| Motion      | default, zero, maximum, OS reduced motion                                                          |
| Rendering   | WebGL, CSS/canvas themes, WebGL failure, context loss/recovery                                     |
| Runtime     | React 18, React 19 playground, ESM, CommonJS, SSR import                                           |
| Viewport    | 390×844, 1440×900, minimum supported size                                                          |

## Principal risks

| Risk                                            | Mitigation                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| Package compatibility drifts from upstream      | Pin the audited commit and compare built exports/types to a manifest |
| Five themes duplicate orchestration             | Resolve presentation once and keep themes as adapters                |
| Provider SDK changes leak into root             | Use structural interfaces and isolate optional peers by subpath      |
| Browser resource leaks                          | Centralize ownership rules and test repeated start/stop/unmount      |
| Magical extensions break upstream props         | Keep all extensions optional and compile upstream consumer fixtures  |
| Visual variety weakens state language           | Use one state-action contract and cross-theme visual QA              |
| Type parity exists but runtime semantics differ | Pair type fixtures with behavior and built-package E2E tests         |

## Definition of done

The refactor is complete only when:

1. Existing upstream 0.7.0 examples compile with a package-resolution-only swap.
2. Every documented root and subpath export resolves from the built package.
3. All provider adapters meet the shared signal and ownership invariants.
4. All five themes feel like manifestations of one magical entity.
5. Existing `VoiceOrb` consumers remain source compatible through aliases.
6. The full matrix and repository `check` command pass.
