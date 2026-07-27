# vorb-ui

A React visual for realtime voice interfaces.

```tsx
import { Orb } from "vorb-ui";

<Orb state="thinking" theme="circle" size={240} interactive={false} />;
```

## Install

```bash
bun add vorb-ui
```

React 18 or newer is required. `livekit-client` is an optional peer dependency used only by the
managed LiveKit browser adapter.

## Entry points

- `vorb-ui` — `Orb`, signals, scales, motion settings, and deprecated `VoiceOrb` aliases
- `vorb-ui/adapters` — Vapi, ElevenLabs, LiveKit, Pipecat, OpenAI Realtime, and Gemini Live
- `vorb-ui/adapters/livekit` — the managed LiveKit browser adapter

## Signals

Use a controlled signal when your application owns the voice lifecycle:

```tsx
import { Orb, type OrbSignal } from "vorb-ui";

const signal: OrbSignal = {
  state: "listening",
  inputVolume: 0.42,
  outputVolume: 0,
};

<Orb signal={signal} theme="radial" interactive={false} />;
```

Listening uses `inputVolume`; speaking uses `outputVolume`. Values are normalized from `0` to `1`.

Pass an adapter when the provider should drive state and session controls:

```tsx
import { Orb } from "vorb-ui";
import { createVapiAdapter } from "vorb-ui/adapters";

const adapter = createVapiAdapter({ client });

<Orb adapter={adapter} theme="cloud" cloudMode="vapor" />;
```

## Themes and scales

Themes are `debug`, `circle`, `bars`, `cloud`, and `radial`. Built-in color scales are `crystal`,
`ember`, `iris`, and `lagoon`.

The cloud theme supports `shell`, `gas`, and `vapor` treatments:

```tsx
<Orb theme="cloud" cloudMode="vapor" state="speaking" outputVolume={0.7} />
```

## Compatibility

`VoiceOrb` and the `VoiceOrb*` types remain available as deprecated aliases. New code should use
`Orb` and the canonical `Orb*` names.

See the maintained documentation in
[`apps/web/content/docs`](https://github.com/edgefloor/vorb-ui/tree/main/apps/web/content/docs) for
provider setup, customization, themes, and migration guidance.

## Development

From the repository root:

```bash
bun install
bun run dev
bun run check
```
