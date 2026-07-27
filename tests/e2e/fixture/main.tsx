import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ORB_SCALES,
  Orb,
  type OrbAdapter,
  type OrbSignal,
  type OrbState,
  type OrbTheme,
} from "vorb-ui";
import { createElevenLabsAdapter, createLiveKitAdapter, createVapiAdapter } from "vorb-ui/adapters";
import { createLiveKitAdapter as createManagedLiveKitAdapter } from "vorb-ui/adapters/livekit";

const IDLE_SIGNAL: OrbSignal = {
  state: "idle",
  volume: 0,
  inputVolume: 0,
  outputVolume: 0,
};
const THEMES: OrbTheme[] = ["debug", "circle", "bars", "cloud", "radial"];
const STATES: OrbState[] = ["idle", "connecting", "listening", "thinking", "speaking", "error"];

function App() {
  const [adapterSignal, setAdapterSignal] = useState<OrbSignal>(IDLE_SIGNAL);
  const adapter = useMemo<OrbAdapter>(() => {
    let signal = IDLE_SIGNAL;
    const listeners = new Set<(nextSignal: OrbSignal) => void>();
    const emit = (nextSignal: OrbSignal) => {
      signal = nextSignal;
      listeners.forEach((listener) => listener(nextSignal));
    };

    return {
      subscribe(listener) {
        listeners.add(listener);
        listener(signal);
        return () => listeners.delete(listener);
      },
      start() {
        emit({ state: "listening", volume: 0.42, inputVolume: 0.42, outputVolume: 0 });
      },
      stop() {
        emit(IDLE_SIGNAL);
      },
    };
  }, []);

  useEffect(() => adapter.subscribe(setAdapterSignal), [adapter]);

  const adapterExportsReady =
    typeof createVapiAdapter === "function" &&
    typeof createElevenLabsAdapter === "function" &&
    typeof createLiveKitAdapter === "function" &&
    typeof createManagedLiveKitAdapter === "function" &&
    Object.keys(ORB_SCALES).length === 4;

  return (
    <main>
      <h1>vorb-ui built consumer</h1>
      <p data-testid="adapter-exports">{adapterExportsReady ? "ready" : "missing"}</p>

      <section aria-label="Adapter lifecycle">
        <Orb adapter={adapter} data-testid="adapter-orb" size={160} theme="circle" />
        <output data-testid="adapter-state">{adapterSignal.state}</output>
        <output data-testid="adapter-input-volume">
          {(adapterSignal.inputVolume ?? 0).toFixed(2)}
        </output>
      </section>

      <section aria-label="Passive theme and state matrix" className="matrix">
        {THEMES.flatMap((theme) =>
          STATES.map((state) => (
            <article data-testid={`matrix-${theme}-${state}`} key={`${theme}-${state}`}>
              <Orb
                interactive={false}
                signal={{
                  state,
                  inputVolume: state === "listening" ? 0.58 : 0,
                  outputVolume: state === "speaking" ? 0.7 : 0,
                  error: state === "error" ? new Error("Fixture error") : undefined,
                }}
                size={128}
                theme={theme}
              />
            </article>
          )),
        )}
      </section>

      <section aria-label="External session controls">
        <Orb
          adapter={adapter}
          data-testid="external-cloud-orb"
          interactive={false}
          size={160}
          theme="cloud"
        />
        <button onClick={() => void adapter.start?.()} type="button">
          Start externally
        </button>
        <button onClick={() => void adapter.stop?.()} type="button">
          Stop externally
        </button>
      </section>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Built-consumer fixture root is missing.");
createRoot(root).render(<App />);
