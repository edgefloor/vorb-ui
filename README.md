# Voice Orb v2

A source-owned, shadcn-style React component for realtime voice interfaces.
Voice Orb provides one polished Ember WebGL visual, a CSS fallback, normalized
input/output signals, and an optional provider adapter boundary.

## Run the playground

```bash
bun install
bun run dev
```

The playground demonstrates:

- Controlled signals
- A local simulated adapter
- Explicit standalone microphone access
- All six conversation states
- Separate user and assistant volume levels
- Independent ball/smoke sizing, motion, sensitivity, smoothing, and palettes
- Interactive, passive, and reduced-motion variants

## Controlled usage

Controlled mode is the universal integration path. Your voice runtime owns the
session and passes complete signal snapshots:

```tsx
import { VoiceOrb, type VoiceOrbSignal } from "@/components/ui/voice-orb";

export function VoiceAssistant({ signal }: { signal: VoiceOrbSignal }) {
  return (
    <VoiceOrb
      signal={signal}
      onStart={() => voiceClient.start()}
      onStop={() => voiceClient.stop()}
      size="min(80vw, 24rem)"
    />
  );
}
```

```ts
type VoiceOrbSignal = {
  state:
    "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
  volume?: number;
  inputVolume?: number;
  outputVolume?: number;
  error?: unknown;
};
```

`listening` uses `inputVolume`; `speaking` uses `outputVolume`. All levels are
normalized and clamped to `0–1`.

## Support state language

The six states have continuous, distinct motion:

| State        | Motion signature                                         | User-facing meaning                         |
| ------------ | -------------------------------------------------------- | ------------------------------------------- |
| `idle`       | Nearly full smoke rests inside stable glass              | The assistant is ready                      |
| `connecting` | Smoke contracts into a central plume                     | The session is starting                     |
| `listening`  | A contained mass draws gently toward the input           | The user has the floor                      |
| `thinking`   | Two medium smoke masses fold past one another            | The assistant is processing or using a tool |
| `speaking`   | Smoke expands and releases soft output pressure          | The assistant is answering                  |
| `error`      | Contracted smoke loses coherence across a muted fracture | The session needs attention                 |

Keep transient events on the closest core state and provide precise copy through
`status`:

```tsx
<VoiceOrb
  state="thinking"
  status="Looking up your order…"
  interactive={false}
/>
```

This keeps the visual language stable for events such as transcribing, tool
activity, interruption, or human handoff while the live label explains the
specific action.

## Adapter usage

Use an adapter when a provider SDK owns the voice lifecycle:

```tsx
import {
  VoiceOrb,
  type VoiceOrbAdapter,
  type VoiceOrbSignal,
} from "@/components/ui/voice-orb";

const adapter: VoiceOrbAdapter = {
  subscribe(listener) {
    const unsubscribe = client.onSignal((signal: VoiceOrbSignal) => {
      listener(signal);
    });
    return unsubscribe;
  },
  start: () => client.start(),
  stop: () => client.stop(),
};

export function VoiceAssistant() {
  return <VoiceOrb adapter={adapter} />;
}
```

Adapters normalize provider events. The component does not know about provider
tokens, SDK events, transcripts, signaling, or playback.

## Standalone microphone

Microphone access is always opt-in and starts only after user activation:

```tsx
<VoiceOrb requestMicrophone />
```

Standalone mode visualizes local input and remains in `listening` until stopped.
It does not guess that the assistant is thinking or speaking from silence.

## Passive visual

When controls live elsewhere, disable the orb control:

```tsx
<VoiceOrb signal={signal} interactive={false} />
```

Passive mode renders no inert button.

## Appearance and motion

```tsx
<VoiceOrb
  signal={signal}
  size={360}
  ballScale={0.96}
  smokeScale={0.94}
  colors={{
    primary: "#22d3ee",
    secondary: "#0f766e",
    highlight: "#ecfeff",
    accent: "#2dd4bf",
  }}
  motion={{
    speed: 1,
    intensity: 1,
    sensitivity: 1.2,
    attack: 0.65,
    release: 0.22,
  }}
/>
```

`ballScale` is clamped to `0.7–1`; `smokeScale` is clamped to `0.5–1.1`.
Values above `1` softly overfill the crystal interior without changing the
glass silhouette. The two dimensions can still be tuned independently.
Appearance objects accept partial values and merge with the defaults.

## Externally owned streams

An existing stream can drive the visual:

```tsx
<VoiceOrb
  state="speaking"
  audioStream={assistantOutputStream}
  interactive={false}
/>
```

Voice Orb disconnects its meter on cleanup but never stops externally supplied
tracks. It stops only microphone streams it created itself.

## Source files

```text
src/components/ui/voice-orb/
├── index.ts
├── voice-orb.tsx
├── voice-orb.types.ts
├── voice-orb.css
├── signals.ts
├── use-audio-meter.ts
├── use-voice-orb-renderer.ts
└── ember-shaders.ts
```

Copy the directory plus `src/lib/utils.ts`, or replace `cn` with your existing
shadcn utility.

## Verification

```bash
bun run test
bun run build
```

The detailed product and engineering contract is in [SPEC.md](./SPEC.md).
