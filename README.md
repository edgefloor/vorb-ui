# vorb-ui

A stateful React visual system for realtime voice interfaces.

This repository is a Bun workspace with two clear boundaries:

```text
apps/
  web/          Next.js product site, playground, and Fumadocs
packages/
  vorb-ui/      Publishable React component and provider adapters
```

The web app keeps the product surfaces together:

- `/` — landing and live renderer previews
- `/playground` — the full signal and appearance workbench
- `/docs` — Fumadocs-powered guides and API concepts

## Development

```bash
bun install
bun run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Verification

```bash
bun run check
```

The check runs formatting, linting, type checks, component tests, both production builds, package
consumer checks, and the built-package browser fixture.

## Package

```tsx
import { Orb } from "vorb-ui";

export function VoiceStatus() {
  return <Orb theme="circle" state="thinking" size={240} interactive={false} />;
}
```

See the [package README](./packages/vorb-ui/README.md) for the complete component and adapter surface.
