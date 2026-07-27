"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  VOICE_ORB_SCALES,
  Orb,
  type VoiceOrbAdapter,
  type VoiceOrbScale,
  type VoiceOrbSignal,
  type VoiceOrbState,
  type OrbCloudMode,
  type OrbControlAppearance,
  type OrbControlPosition,
  type OrbTheme,
} from "vorb-ui";

const STATES: VoiceOrbState[] = [
  "idle",
  "connecting",
  "listening",
  "thinking",
  "speaking",
  "error",
];
const THEMES: OrbTheme[] = ["radial", "cloud", "circle", "bars", "debug"];
const CONTROL_POSITIONS: OrbControlPosition[] = [
  "bottom",
  "top",
  "overlay-bottom",
  "overlay-center",
  "overlay-top",
];
const CONTROL_APPEARANCES: OrbControlAppearance[] = ["glass", "solid", "minimal"];

const CUSTOM_SCALE: VoiceOrbScale = {
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

const SCALE_OPTIONS: Array<{
  name: string;
  scale: VoiceOrbScale;
  swatch: string;
}> = [
  {
    name: VOICE_ORB_SCALES.crystal.label,
    scale: "crystal",
    swatch: VOICE_ORB_SCALES.crystal.colors.main.base,
  },
  {
    name: VOICE_ORB_SCALES.ember.label,
    scale: "ember",
    swatch: VOICE_ORB_SCALES.ember.colors.main.base,
  },
  {
    name: VOICE_ORB_SCALES.iris.label,
    scale: "iris",
    swatch: VOICE_ORB_SCALES.iris.colors.main.base,
  },
  {
    name: VOICE_ORB_SCALES.lagoon.label,
    scale: "lagoon",
    swatch: VOICE_ORB_SCALES.lagoon.colors.main.base,
  },
  {
    name: "Custom",
    scale: CUSTOM_SCALE,
    swatch: "#7860c7",
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

  private simulatedVolume(elapsed: number, duration: number, role: "listening" | "speaking") {
    const seconds = elapsed / 1000;
    const envelope = Math.min(1, elapsed / 220, Math.max(0, duration - elapsed) / 220);
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

function InspectorSection({
  title,
  note,
  open = false,
  children,
}: {
  title: string;
  note: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="inspector-section" open={open}>
      <summary>
        <span>{title}</span>
        <span>{note}</span>
      </summary>
      <div className="inspector-section__body">{children}</div>
    </details>
  );
}

export function OrbPlayground() {
  const [mode, setMode] = useState<DemoMode>("controlled");
  const [state, setState] = useState<VoiceOrbState>("idle");
  const [theme, setTheme] = useState<OrbTheme>("cloud");
  const [cloudMode, setCloudMode] = useState<OrbCloudMode>("vapor");
  const [inputVolume, setInputVolume] = useState(0.35);
  const [outputVolume, setOutputVolume] = useState(0.62);
  const [size, setSize] = useState(280);
  const [controlPosition, setControlPosition] = useState<OrbControlPosition>("bottom");
  const [controlAppearance, setControlAppearance] = useState<OrbControlAppearance>("glass");
  const [controlSize, setControlSize] = useState(48);
  const [controlGap, setControlGap] = useState(10);
  const [ballScale, setBallScale] = useState(0.84);
  const [smokeScale, setSmokeScale] = useState(0.78);
  const [speed, setSpeed] = useState(1);
  const [intensity, setIntensity] = useState(1);
  const [sensitivity, setSensitivity] = useState(1);
  const [attack, setAttack] = useState(0.65);
  const [release, setRelease] = useState(0.22);
  const [scaleIndex, setScaleIndex] = useState(0);
  const [interactive, setInteractive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const adapter = useMemo(() => new DemoVoiceAdapter(), []);
  const selectedScale = SCALE_OPTIONS[scaleIndex];

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
    error: state === "error" ? new Error("The demo connection was interrupted.") : undefined,
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

  const resetPlayground = () => {
    setMode("controlled");
    setState("idle");
    setTheme("cloud");
    setCloudMode("vapor");
    setInputVolume(0.35);
    setOutputVolume(0.62);
    setSize(280);
    setControlPosition("bottom");
    setControlAppearance("glass");
    setControlSize(48);
    setControlGap(10);
    setBallScale(0.84);
    setSmokeScale(0.78);
    setSpeed(1);
    setIntensity(1);
    setSensitivity(1);
    setAttack(0.65);
    setRelease(0.22);
    setScaleIndex(0);
    setInteractive(true);
    setReducedMotion(false);
  };

  return (
    <div className="workbench">
      <header className="workbench__toolbar">
        <div className="workbench__identity">
          <span className="workbench__status" data-state={state} aria-hidden="true" />
          <div>
            <p>Live component</p>
            <span>{state}</span>
          </div>
        </div>
        <div className="mode-tabs" aria-label="Integration mode">
          {(["controlled", "adapter", "microphone"] as DemoMode[]).map((item) => (
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
          ))}
        </div>
      </header>

      <section className="workbench__stage" aria-label="Voice orb demo">
        <div className="workbench__stage-meta" aria-hidden="true">
          <span>Preview</span>
          <span>
            {theme}
            {theme === "cloud" ? ` / ${cloudMode}` : ""}
          </span>
        </div>
        <Orb
          theme={theme}
          cloudMode={cloudMode}
          signal={mode === "controlled" ? controlledSignal : undefined}
          adapter={mode === "adapter" ? adapter : undefined}
          requestMicrophone={mode === "microphone"}
          onStart={mode === "controlled" ? () => setState("listening") : undefined}
          onStop={mode === "controlled" ? () => setState("idle") : undefined}
          interactive={interactive}
          size={size}
          control={{
            position: controlPosition,
            appearance: controlAppearance,
            size: controlSize,
            gap: controlGap,
          }}
          ballScale={ballScale}
          smokeScale={smokeScale}
          scale={selectedScale.scale}
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
        <div className="workbench__readout" aria-label="Current component configuration">
          <span>Current props</span>
          <code>
            {`<Orb theme="${theme}" state="${state}" scale="${selectedScale.name.toLowerCase()}" />`}
          </code>
        </div>
      </section>

      <aside className="inspector" id="api" aria-label="Voice orb settings">
        <div className="inspector__heading">
          <div>
            <p>Inspector</p>
            <span>Change only what you need.</span>
          </div>
          <button type="button" onClick={resetPlayground}>
            Reset
          </button>
        </div>

        {mode === "microphone" && (
          <p className="inspector__note">
            Microphone access is requested only after you press start.
          </p>
        )}

        <InspectorSection title="Appearance" note={`${theme} · ${selectedScale.name}`} open>
          <label className="select-setting">
            <span>Theme</span>
            <select
              aria-label="Theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value as OrbTheme)}
            >
              {THEMES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="select-setting">
            <span>Cloud mode</span>
            <select
              aria-label="Cloud mode"
              value={cloudMode}
              disabled={theme !== "cloud"}
              onChange={(event) => setCloudMode(event.target.value as OrbCloudMode)}
            >
              <option value="shell">Crystal shell</option>
              <option value="gas">Rough gas</option>
              <option value="vapor">Floating gas</option>
            </select>
          </label>
          <Setting
            label="Size"
            value={size}
            displayValue={`${size}px`}
            min={120}
            max={600}
            step={4}
            onChange={setSize}
          />
          <div className="palette-setting">
            <span>Scale</span>
            <div className="palette-list" aria-label="Visual scale">
              {SCALE_OPTIONS.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className={index === scaleIndex ? "is-active" : ""}
                  style={{ "--swatch": item.swatch } as CSSProperties}
                  aria-label={`Use ${item.name} scale`}
                  aria-pressed={index === scaleIndex}
                  onClick={() => setScaleIndex(index)}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <Setting
            label="Cloud shell"
            value={ballScale}
            displayValue={`${ballScale.toFixed(2)}×`}
            min={0.7}
            max={1}
            step={0.01}
            disabled={theme !== "cloud"}
            onChange={setBallScale}
          />
          <Setting
            label="Cloud fill"
            value={smokeScale}
            displayValue={`${smokeScale.toFixed(2)}×`}
            min={0.5}
            max={1}
            step={0.01}
            disabled={theme !== "cloud"}
            onChange={setSmokeScale}
          />
        </InspectorSection>

        <InspectorSection title="Signal" note={mode} open>
          <div className="state-grid" aria-label="Controlled state">
            {STATES.map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={state === item}
                className={state === item ? "is-active" : ""}
                disabled={mode !== "controlled"}
                onClick={() => setState(item)}
              >
                {item}
              </button>
            ))}
          </div>
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
        </InspectorSection>

        <InspectorSection title="Session control" note={interactive ? controlAppearance : "hidden"}>
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
          <label className="select-setting">
            <span>Position</span>
            <select
              aria-label="Button position"
              value={controlPosition}
              disabled={!interactive}
              onChange={(event) => setControlPosition(event.target.value as OrbControlPosition)}
            >
              {CONTROL_POSITIONS.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("-", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="select-setting">
            <span>Appearance</span>
            <select
              aria-label="Button style"
              value={controlAppearance}
              disabled={!interactive}
              onChange={(event) => setControlAppearance(event.target.value as OrbControlAppearance)}
            >
              {CONTROL_APPEARANCES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <Setting
            label="Button size"
            value={controlSize}
            displayValue={`${controlSize}px`}
            min={32}
            max={112}
            step={2}
            disabled={!interactive}
            onChange={setControlSize}
          />
          <Setting
            label="Button gap"
            value={controlGap}
            displayValue={`${controlGap}px`}
            min={0}
            max={72}
            step={2}
            disabled={!interactive}
            onChange={setControlGap}
          />
        </InspectorSection>

        <InspectorSection title="Motion" note={reducedMotion ? "reduced" : `${speed.toFixed(1)}×`}>
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
        </InspectorSection>
      </aside>
    </div>
  );
}
