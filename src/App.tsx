import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  VoiceOrb,
  type VoiceOrbAdapter,
  type VoiceOrbColors,
  type VoiceOrbSignal,
  type VoiceOrbState,
} from "./components/ui/voice-orb";
import "./app.css";

const STATES: VoiceOrbState[] = [
  "idle",
  "connecting",
  "listening",
  "thinking",
  "speaking",
  "error",
];

const PALETTES: Array<{ name: string; colors: VoiceOrbColors }> = [
  {
    name: "Ember",
    colors: {
      primary: "#ff7626",
      secondary: "#e8412c",
      highlight: "#fff3d2",
      accent: "#ef6426",
    },
  },
  {
    name: "Iris",
    colors: {
      primary: "#a855f7",
      secondary: "#5b21b6",
      highlight: "#f3e8ff",
      accent: "#c084fc",
    },
  },
  {
    name: "Lagoon",
    colors: {
      primary: "#22d3ee",
      secondary: "#0f766e",
      highlight: "#ecfeff",
      accent: "#2dd4bf",
    },
  },
];

type DemoMode = "controlled" | "adapter" | "microphone";

class DemoVoiceAdapter implements VoiceOrbAdapter {
  private listeners = new Set<(signal: VoiceOrbSignal) => void>();
  private signal: VoiceOrbSignal = { state: "idle" };
  private connectTimer = 0;
  private animationTimer = 0;
  private startedAt = 0;

  subscribe(listener: (signal: VoiceOrbSignal) => void) {
    this.listeners.add(listener);
    listener(this.signal);
    return () => this.listeners.delete(listener);
  }

  start = async () => {
    this.clearTimers();
    this.emit({ state: "connecting" });
    this.connectTimer = window.setTimeout(() => {
      this.startedAt = performance.now();
      this.tick();
    }, 650);
  };

  stop = async () => {
    this.clearTimers();
    this.emit({ state: "idle" });
  };

  private tick = () => {
    const elapsed = performance.now() - this.startedAt;
    const cycle = elapsed % 7600;
    if (cycle < 3100) {
      this.emit({
        state: "listening",
        inputVolume: this.simulatedVolume(cycle, 3100, "listening"),
      });
    } else if (cycle < 4550) {
      this.emit({ state: "thinking" });
    } else {
      this.emit({
        state: "speaking",
        outputVolume: this.simulatedVolume(cycle - 4550, 3050, "speaking"),
      });
    }
    this.animationTimer = window.requestAnimationFrame(this.tick);
  };

  private simulatedVolume(
    elapsed: number,
    duration: number,
    role: "listening" | "speaking",
  ) {
    const seconds = elapsed / 1000;
    const envelope = Math.min(
      1,
      elapsed / 220,
      Math.max(0, duration - elapsed) / 220,
    );
    const voice =
      role === "listening"
        ? 0.25 +
          Math.sin(seconds * 7.7) * 0.09 +
          Math.sin(seconds * 13.1 + 0.8) * 0.06 +
          Math.sin(seconds * 21.2) * 0.035
        : 0.5 +
          Math.sin(seconds * 8.4) * 0.17 +
          Math.sin(seconds * 15.6 + 1.2) * 0.1 +
          Math.sin(seconds * 25.2) * 0.05;
    const minimum = role === "listening" ? 0.025 : 0.05;
    const maximum = role === "listening" ? 0.6 : 0.92;
    return Math.min(maximum, Math.max(minimum, voice * envelope));
  }

  private emit(signal: VoiceOrbSignal) {
    this.signal = signal;
    this.listeners.forEach((listener) => listener(signal));
  }

  private clearTimers() {
    window.clearTimeout(this.connectTimer);
    window.cancelAnimationFrame(this.animationTimer);
    this.connectTimer = 0;
    this.animationTimer = 0;
  }
}

function Setting({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="setting" data-disabled={disabled || undefined}>
      <span>
        <span>{label}</span>
        <output>{displayValue}</output>
      </span>
      <input
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function App() {
  const [mode, setMode] = useState<DemoMode>("controlled");
  const [state, setState] = useState<VoiceOrbState>("idle");
  const [inputVolume, setInputVolume] = useState(0.35);
  const [outputVolume, setOutputVolume] = useState(0.62);
  const [size, setSize] = useState(360);
  const [ballScale, setBallScale] = useState(0.96);
  const [smokeScale, setSmokeScale] = useState(0.94);
  const [speed, setSpeed] = useState(1);
  const [intensity, setIntensity] = useState(1);
  const [sensitivity, setSensitivity] = useState(1);
  const [attack, setAttack] = useState(0.65);
  const [release, setRelease] = useState(0.22);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [interactive, setInteractive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const adapter = useMemo(() => new DemoVoiceAdapter(), []);
  const palette = PALETTES[paletteIndex];

  useEffect(() => {
    if (mode !== "adapter") return;
    const unsubscribe = adapter.subscribe((signal) => setState(signal.state));
    return () => {
      unsubscribe();
      void adapter.stop();
    };
  }, [adapter, mode]);

  const controlledSignal: VoiceOrbSignal = {
    state,
    inputVolume,
    outputVolume,
    error:
      state === "error"
        ? new Error("The demo connection was interrupted.")
        : undefined,
  };
  const supportStatus =
    mode === "microphone"
      ? undefined
      : state === "connecting"
        ? "Starting support session…"
        : state === "thinking"
          ? "Looking up your order…"
          : state === "error"
            ? "Session needs attention"
            : undefined;

  return (
    <main className="showcase">
      <div className="showcase__ambient" aria-hidden="true" />
      <header className="showcase__header">
        <span>Voice Orb v2</span>
        <a href="#api">Signal playground</a>
      </header>

      <section className="showcase__stage" aria-label="Voice orb demo">
        <VoiceOrb
          signal={mode === "controlled" ? controlledSignal : undefined}
          adapter={mode === "adapter" ? adapter : undefined}
          requestMicrophone={mode === "microphone"}
          onStart={
            mode === "controlled" ? () => setState("listening") : undefined
          }
          onStop={mode === "controlled" ? () => setState("idle") : undefined}
          interactive={interactive}
          size={size}
          ballScale={ballScale}
          smokeScale={smokeScale}
          colors={palette.colors}
          motion={{
            speed: reducedMotion ? 0 : speed,
            intensity,
            sensitivity,
            attack,
            release,
          }}
          className={reducedMotion ? "voice-orb--reduced-motion" : undefined}
          status={supportStatus}
          errorMessage={
            mode === "controlled" && state === "error"
              ? "The simulated connection failed. Choose another state or retry."
              : undefined
          }
        />
      </section>

      <aside className="controls" id="api" aria-label="Voice orb settings">
        <div className="controls__heading">
          <div>
            <p>Voice orb</p>
            <span>Normalized signal playground</span>
          </div>
          <span className="controls__state">{state}</span>
        </div>

        <div className="mode-tabs" aria-label="Integration mode">
          {(["controlled", "adapter", "microphone"] as DemoMode[]).map(
            (item) => (
              <button
                key={item}
                type="button"
                className={mode === item ? "is-active" : ""}
                aria-pressed={mode === item}
                onClick={() => {
                  setMode(item);
                  setState("idle");
                }}
              >
                {item}
              </button>
            ),
          )}
        </div>

        {mode === "microphone" && (
          <p className="controls__note">
            Microphone access is requested only after you press start.
          </p>
        )}

        <div className="controls__group">
          <label className="select-setting">
            <span>State</span>
            <select
              aria-label="State"
              value={state}
              disabled={mode !== "controlled"}
              onChange={(event) =>
                setState(event.target.value as VoiceOrbState)
              }
            >
              {STATES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <Setting
            label="Input volume"
            value={inputVolume}
            displayValue={inputVolume.toFixed(2)}
            min={0}
            max={1.1}
            step={0.01}
            disabled={mode !== "controlled"}
            onChange={setInputVolume}
          />
          <Setting
            label="Output volume"
            value={outputVolume}
            displayValue={outputVolume.toFixed(2)}
            min={0}
            max={1}
            step={0.01}
            disabled={mode !== "controlled"}
            onChange={setOutputVolume}
          />
          <Setting
            label="Size"
            value={size}
            displayValue={`${size}px`}
            min={220}
            max={440}
            step={4}
            onChange={setSize}
          />
          <Setting
            label="Ball scale"
            value={ballScale}
            displayValue={`${ballScale.toFixed(2)}×`}
            min={0.7}
            max={1}
            step={0.01}
            onChange={setBallScale}
          />
          <Setting
            label="Smoke fill"
            value={smokeScale}
            displayValue={`${smokeScale.toFixed(2)}×`}
            min={0.5}
            max={1}
            step={0.01}
            onChange={setSmokeScale}
          />
          <Setting
            label="Motion"
            value={speed}
            displayValue={`${speed.toFixed(1)}×`}
            min={0}
            max={2}
            step={0.1}
            onChange={setSpeed}
          />
          <Setting
            label="Intensity"
            value={intensity}
            displayValue={`${intensity.toFixed(1)}×`}
            min={0.5}
            max={1.5}
            step={0.1}
            onChange={setIntensity}
          />
          <Setting
            label="Sensitivity"
            value={sensitivity}
            displayValue={`${sensitivity.toFixed(1)}×`}
            min={0.5}
            max={2}
            step={0.1}
            onChange={setSensitivity}
          />
          <Setting
            label="Attack"
            value={attack}
            displayValue={attack.toFixed(2)}
            min={0.05}
            max={1}
            step={0.05}
            onChange={setAttack}
          />
          <Setting
            label="Release"
            value={release}
            displayValue={release.toFixed(2)}
            min={0.05}
            max={1}
            step={0.01}
            onChange={setRelease}
          />
        </div>

        <div className="controls__group controls__group--row">
          <span>Palette</span>
          <div className="palette-list" aria-label="Color palette">
            {PALETTES.map((item, index) => (
              <button
                key={item.name}
                type="button"
                className={index === paletteIndex ? "is-active" : ""}
                style={{ "--swatch": item.colors.primary } as CSSProperties}
                aria-label={`Use ${item.name} palette`}
                aria-pressed={index === paletteIndex}
                onClick={() => setPaletteIndex(index)}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <label className="toggle">
          <span>
            <span>Interactive</span>
            <small>Render the session control when a lifecycle exists</small>
          </span>
          <input
            type="checkbox"
            checked={interactive}
            onChange={(event) => setInteractive(event.target.checked)}
          />
        </label>

        <label className="toggle">
          <span>
            <span>Reduced-motion preview</span>
            <small>Freeze decorative movement and UI transitions</small>
          </span>
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(event) => setReducedMotion(event.target.checked)}
          />
        </label>
      </aside>
    </main>
  );
}
