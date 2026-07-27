# vorb-ui

A successor to `orb-ui` 0.7.0 with five independent renderers and
customizable visual behavior for every state.

```tsx
import { Orb } from "vorb-ui";

<Orb adapter={adapter} theme="cloud" scale="crystal" />;
```

The cloud theme can also render the animated entity without its crystal shell:

```tsx
<Orb theme="cloud" cloudMode="gas" state="thinking" />
```

For a softer treatment, use diffuse gas floating freely in space:

```tsx
<Orb theme="cloud" cloudMode="vapor" state="thinking" />
```

Artwork and session-control layout can be tuned independently. Numeric values
are pixels; CSS lengths can be responsive:

```tsx
<Orb
  size="clamp(12rem, 42vw, 36rem)"
  control={{
    position: "overlay-bottom",
    appearance: "minimal",
    size: "clamp(2.75rem, 9vw, 4.5rem)",
    gap: "6%",
    offsetX: 12,
    offsetY: -8,
    className: "my-call-control",
    style: { borderRadius: "1rem" },
  }}
/>
```

Control positions are `bottom`, `top`, `overlay-bottom`, `overlay-center`, and
`overlay-top`. Appearances are `glass`, `solid`, and `minimal`; `className` and
`style` remain the escape hatch for a fully custom button.

The package exposes the same three entry points:

- `vorb-ui`
- `vorb-ui/adapters`
- `vorb-ui/adapters/livekit`

Detailed setup and ownership notes are in
[Provider adapters](https://github.com/edgefloor/vorb-ui/blob/main/apps/web/content/docs/providers.mdx).
Existing users can follow the
[migration guide](https://github.com/edgefloor/vorb-ui/blob/main/apps/web/content/docs/migration.mdx).

## Themes and states

`debug`, `circle`, `bars`, `cloud`, and `radial` all consume the same resolved
visual state. The state action remains recognizable across themes:

| State        | Visual action                               |
| ------------ | ------------------------------------------- |
| `idle`       | Smoke rests and circulates                  |
| `connecting` | Strands assemble into a stable pathway      |
| `listening`  | Phrase energy travels inward                |
| `thinking`   | Soft vortices mix, exchange, and reconnect  |
| `speaking`   | Organized phrase energy travels outward     |
| `error`      | A localized warm fracture disrupts the flow |

Listening reads `inputVolume`; speaking reads `outputVolume`. The entity does
not bounce, flash, vibrate, or resize globally in response to audio.

## Fully customizable state settings

Each of the twelve renderer-neutral values can be overridden independently for
each state. Missing values inherit from the selected built-in:

```tsx
<Orb
  state="thinking"
  theme="cloud"
  scale={{
    base: "crystal",
    colors: {
      main: { base: "#7860c7", bright: "#9ee8dc" },
    },
    states: {
      thinking: {
        turbulence: 0.72,
        flowSpeed: 0.66,
        vortexCount: 2,
        vortexStrength: 0.88,
        expansion: 0.32,
        centerPull: 0.61,
        audioResponse: 0,
        smokeDensity: 0.78,
        glowIntensity: 0.7,
        glowPulseSpeed: 0.18,
        warningDistortion: 0,
        tonePosition: 0.42,
      },
      listening: { audioResponse: 0.95, centerPull: 0.3 },
      speaking: { audioResponse: 0.82, expansion: 0.8 },
    },
    transitions: {
      defaultMs: 850,
      thinkingToSpeakingMs: 500,
    },
  }}
/>
```

Normalized values are clamped to `0–1`, `vortexCount` to `1–3`, and transition
durations to `0–3000ms`. Built-ins are `crystal`, `ember`, `iris`, and
`lagoon`, available through `ORB_SCALES`.

## Adapters

```tsx
import { Orb } from "vorb-ui";
import {
  createVapiAdapter,
  createElevenLabsAdapter,
  createLiveKitAdapter,
  createPipecatAdapter,
  createOpenAIRealtimeAdapter,
  createGeminiLiveAdapter,
} from "vorb-ui/adapters";
```

All adapters emit the same `OrbSignal` and keep provider-specific lifecycle
details outside the visual component. The OpenAI browser adapter accepts only a
fresh client-secret callback; do not expose standard API keys in the browser.

The `vorb-ui/adapters/livekit` entry is isolated from the root package:

```ts
import { createLiveKitAdapter } from "vorb-ui/adapters/livekit";
const adapter = createLiveKitAdapter({ tokenEndpoint: "/api/livekit-token" });
```

## Controlled and passive usage

```tsx
<Orb
  signal={{
    state: "listening",
    inputVolume: microphoneLevel,
    outputVolume: assistantLevel,
  }}
  theme="circle"
  interactive={false}
/>
```

State precedence is explicit `state`, explicit `signal`, adapter signal,
standalone microphone state, then `idle`. Passive themes render no inert
button.

## Migration

Upstream `Orb` consumers can swap package resolution without changing imports.
Existing users of this repository can keep `VoiceOrb` and `VoiceOrb*` types;
they are deprecated aliases. `VoiceOrb` keeps its historical `radial` default,
while canonical `Orb` keeps upstream's `debug` default and `200px` size.

The old `colors` prop is intentionally removed. Move color and behavior changes
into `scale`, where each state can inherit or override settings safely.

## Development and verification

```bash
bun install
bun run dev
bun run check
```

The compatibility contract is in
[SPEC.md](https://github.com/edgefloor/vorb-ui/blob/main/SPEC.md), and the completed implementation
sequence is documented in
[ORB_UI_DROP_IN_PLAN.md](https://github.com/edgefloor/vorb-ui/blob/main/ORB_UI_DROP_IN_PLAN.md).
