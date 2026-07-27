"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  ORB_SCALES,
  Orb,
  type OrbAdapter,
  type OrbCloudMode,
  type OrbControlAppearance,
  type OrbControlPosition,
  type OrbScale,
  type OrbSignal,
  type OrbState,
  type OrbTheme,
} from "vorb-ui";

const STATES: Array<{ value: OrbState; label: string }> = [
  { value: "idle", label: "Idle" },
  { value: "connecting", label: "Connecting" },
  { value: "listening", label: "Listening" },
  { value: "thinking", label: "Thinking" },
  { value: "speaking", label: "Speaking" },
  { value: "error", label: "Error" },
];
const THEMES: Array<{ value: OrbTheme; label: string }> = [
  { value: "radial", label: "Radial" },
  { value: "cloud", label: "Cloud" },
  { value: "circle", label: "Circle" },
  { value: "bars", label: "Bars" },
  { value: "debug", label: "Debug" },
];
const CLOUD_MODES: Array<{ value: OrbCloudMode; label: string }> = [
  { value: "shell", label: "Shell" },
  { value: "gas", label: "Gas" },
  { value: "vapor", label: "Vapor" },
];
const CONTROL_POSITIONS: Array<{ value: OrbControlPosition; label: string }> = [
  { value: "bottom", label: "Below" },
  { value: "top", label: "Above" },
  { value: "overlay-bottom", label: "Overlay bottom" },
  { value: "overlay-center", label: "Overlay center" },
  { value: "overlay-top", label: "Overlay top" },
];
const CONTROL_APPEARANCES: Array<{ value: OrbControlAppearance; label: string }> = [
  { value: "minimal", label: "Minimal" },
  { value: "glass", label: "Glass" },
  { value: "solid", label: "Solid" },
];

type SignalSource = "manual" | "simulation" | "microphone";

const SIGNAL_SOURCES: Array<{ value: SignalSource; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "simulation", label: "Simulated call" },
  { value: "microphone", label: "Microphone" },
];

const CUSTOM_SCALE: OrbScale = {
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
  code: string;
  scale: OrbScale;
  swatch: string;
}> = [
  {
    name: ORB_SCALES.crystal.label,
    code: '"crystal"',
    scale: "crystal",
    swatch: ORB_SCALES.crystal.colors.main.base,
  },
  {
    name: ORB_SCALES.ember.label,
    code: '"ember"',
    scale: "ember",
    swatch: ORB_SCALES.ember.colors.main.base,
  },
  {
    name: ORB_SCALES.iris.label,
    code: '"iris"',
    scale: "iris",
    swatch: ORB_SCALES.iris.colors.main.base,
  },
  {
    name: ORB_SCALES.lagoon.label,
    code: '"lagoon"',
    scale: "lagoon",
    swatch: ORB_SCALES.lagoon.colors.main.base,
  },
  {
    name: "Custom",
    code: "{ customScale }",
    scale: CUSTOM_SCALE,
    swatch: "#7860c7",
  },
];

class DemoVoiceAdapter implements OrbAdapter {
  private listeners = new Set<(signal: OrbSignal) => void>();
  private signal: OrbSignal = { state: "idle" };
  private connectTimer = 0;
  private animationTimer = 0;
  private startedAt = 0;

  subscribe(listener: (signal: OrbSignal) => void) {
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

  private emit(signal: OrbSignal) {
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
  const [source, setSource] = useState<SignalSource>("manual");
  const [manualState, setManualState] = useState<OrbState>("idle");
  const [adapterSignal, setAdapterSignal] = useState<OrbSignal>({ state: "idle" });
  const [theme, setTheme] = useState<OrbTheme>("cloud");
  const [cloudMode, setCloudMode] = useState<OrbCloudMode>("vapor");
  const [inputVolume, setInputVolume] = useState(0.35);
  const [outputVolume, setOutputVolume] = useState(0.62);
  const [size, setSize] = useState(280);
  const [controlPosition, setControlPosition] = useState<OrbControlPosition>("bottom");
  const [controlAppearance, setControlAppearance] = useState<OrbControlAppearance>("minimal");
  const [controlSize, setControlSize] = useState(44);
  const [controlGap, setControlGap] = useState(14);
  const [ballScale, setBallScale] = useState(0.84);
  const [smokeScale, setSmokeScale] = useState(0.78);
  const [speed, setSpeed] = useState(1);
  const [intensity, setIntensity] = useState(1);
  const [sensitivity, setSensitivity] = useState(1);
  const [attack, setAttack] = useState(0.65);
  const [release, setRelease] = useState(0.22);
  const [scaleIndex, setScaleIndex] = useState(0);
  const [showCallControl, setShowCallControl] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [copied, setCopied] = useState(false);
  const adapter = useMemo(() => new DemoVoiceAdapter(), []);
  const selectedScale = SCALE_OPTIONS[scaleIndex] ?? SCALE_OPTIONS[0];

  useEffect(() => {
    if (source !== "simulation") return;
    const unsubscribe = adapter.subscribe(setAdapterSignal);
    return () => {
      unsubscribe();
      void adapter.stop();
    };
  }, [adapter, source]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const manualSignal: OrbSignal = {
    state: manualState,
    inputVolume: manualState === "listening" ? inputVolume : 0,
    outputVolume: manualState === "speaking" ? outputVolume : 0,
    error: manualState === "error" ? new Error("The demo connection was interrupted.") : undefined,
  };
  const previewSignal =
    source === "simulation"
      ? adapterSignal
      : source === "manual"
        ? manualSignal
        : { state: "idle" as const };
  const sourceLabel =
    SIGNAL_SOURCES.find((item) => item.value === source)?.label ?? SIGNAL_SOURCES[0].label;
  const inputLevel = previewSignal.inputVolume ?? 0;
  const outputLevel = previewSignal.outputVolume ?? 0;

  const supportStatus =
    source === "microphone"
      ? undefined
      : previewSignal.state === "connecting"
        ? "Connecting…"
        : previewSignal.state === "thinking"
          ? "Looking up your order…"
          : previewSignal.state === "error"
            ? "Connection interrupted"
            : undefined;

  const codeExample = useMemo(() => {
    const sourceProp =
      source === "manual"
        ? `signal={{ state: "${manualState}", inputVolume: ${inputVolume.toFixed(2)}, outputVolume: ${outputVolume.toFixed(2)} }}`
        : source === "simulation"
          ? "adapter={adapter}"
          : "requestMicrophone";
    const props = [
      `theme="${theme}"`,
      ...(theme === "cloud"
        ? [
            `cloudMode="${cloudMode}"`,
            `ballScale={${ballScale.toFixed(2)}}`,
            `smokeScale={${smokeScale.toFixed(2)}}`,
          ]
        : []),
      `size={${size}}`,
      `scale=${selectedScale.code}`,
      sourceProp,
      showCallControl
        ? `control={{ position: "${controlPosition}", appearance: "${controlAppearance}", size: ${controlSize}, gap: ${controlGap} }}`
        : "interactive={false}",
      `motion={{ speed: ${reducedMotion ? 0 : speed.toFixed(1)}, intensity: ${intensity.toFixed(1)}, sensitivity: ${sensitivity.toFixed(1)}, attack: ${attack.toFixed(2)}, release: ${release.toFixed(2)} }}`,
    ];
    return `<Orb ${props.join(" ")} />`;
  }, [
    attack,
    ballScale,
    cloudMode,
    controlAppearance,
    controlGap,
    controlPosition,
    controlSize,
    inputVolume,
    intensity,
    manualState,
    outputVolume,
    reducedMotion,
    release,
    selectedScale.code,
    sensitivity,
    showCallControl,
    size,
    smokeScale,
    source,
    speed,
    theme,
  ]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeExample);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const resetPlayground = () => {
    setSource("manual");
    setManualState("idle");
    setAdapterSignal({ state: "idle" });
    setTheme("cloud");
    setCloudMode("vapor");
    setInputVolume(0.35);
    setOutputVolume(0.62);
    setSize(280);
    setControlPosition("bottom");
    setControlAppearance("minimal");
    setControlSize(44);
    setControlGap(14);
    setBallScale(0.84);
    setSmokeScale(0.78);
    setSpeed(1);
    setIntensity(1);
    setSensitivity(1);
    setAttack(0.65);
    setRelease(0.22);
    setScaleIndex(0);
    setShowCallControl(true);
    setReducedMotion(false);
    setCopied(false);
  };

  return (
    <div className="workbench">
      <header className="workbench__toolbar">
        <div className="workbench__identity">
          <span className="workbench__status" data-state={previewSignal.state} aria-hidden="true" />
          <div>
            <p>{sourceLabel}</p>
            <span>{previewSignal.state}</span>
          </div>
        </div>
        <div className="mode-tabs" aria-label="Signal source">
          {SIGNAL_SOURCES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={source === item.value ? "is-active" : ""}
              aria-pressed={source === item.value}
              onClick={() => {
                setSource(item.value);
                setManualState("idle");
                setAdapterSignal({ state: "idle" });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <section className="workbench__stage" aria-label="Voice orb demo">
        <div className="workbench__stage-meta" aria-hidden="true">
          <span>state / {previewSignal.state}</span>
          <span>
            {theme}
            {theme === "cloud" ? ` / ${cloudMode}` : ""} · in {inputLevel.toFixed(2)} · out{" "}
            {outputLevel.toFixed(2)}
          </span>
        </div>
        <Orb
          theme={theme}
          cloudMode={cloudMode}
          signal={source === "manual" ? manualSignal : undefined}
          adapter={source === "simulation" ? adapter : undefined}
          requestMicrophone={source === "microphone"}
          onStart={source === "manual" ? () => setManualState("listening") : undefined}
          onStop={source === "manual" ? () => setManualState("idle") : undefined}
          interactive={showCallControl}
          size={size}
          control={{
            position: controlPosition,
            appearance: controlAppearance,
            size: controlSize,
            gap: controlGap,
            className: "playground-call-control",
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
          labels={{
            start: "Start call",
            stop: "End call",
            retry: "Try again",
          }}
          status={supportStatus}
          errorMessage={
            source === "manual" && manualState === "error"
              ? "The simulated connection failed. Choose another state or retry."
              : undefined
          }
        />
        <div className="workbench__readout" aria-label="Current component configuration">
          <span>Props</span>
          <code>{codeExample}</code>
          <button type="button" onClick={() => void copyCode()}>
            {copied ? "Copied" : "Copy"}
          </button>
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

        {source === "microphone" && (
          <p className="inspector__note">
            Microphone access is requested only after you press Start call.
          </p>
        )}

        <InspectorSection title="Visuals" note={`${theme} · ${selectedScale.name}`} open>
          <label className="select-setting">
            <span>Theme</span>
            <select
              aria-label="Theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value as OrbTheme)}
            >
              {THEMES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="select-setting">
            <span>Cloud treatment</span>
            <select
              aria-label="Cloud treatment"
              value={cloudMode}
              disabled={theme !== "cloud"}
              onChange={(event) => setCloudMode(event.target.value as OrbCloudMode)}
            >
              {CLOUD_MODES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
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
            <span>Color scale</span>
            <div className="palette-list" aria-label="Color scale">
              {SCALE_OPTIONS.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className={index === scaleIndex ? "is-active" : ""}
                  style={{ "--swatch": item.swatch } as CSSProperties}
                  aria-label={`Use ${item.name} scale`}
                  aria-pressed={index === scaleIndex}
                  title={item.name}
                  onClick={() => setScaleIndex(index)}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <Setting
            label="Shell scale"
            value={ballScale}
            displayValue={`${ballScale.toFixed(2)}×`}
            min={0.7}
            max={1}
            step={0.01}
            disabled={theme !== "cloud"}
            onChange={setBallScale}
          />
          <Setting
            label="Vapor scale"
            value={smokeScale}
            displayValue={`${smokeScale.toFixed(2)}×`}
            min={0.5}
            max={1}
            step={0.01}
            disabled={theme !== "cloud"}
            onChange={setSmokeScale}
          />
        </InspectorSection>

        <InspectorSection title="Signal" note={sourceLabel} open>
          {source === "manual" ? (
            <>
              <div className="state-grid" aria-label="Signal state">
                {STATES.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    aria-pressed={manualState === item.value}
                    className={manualState === item.value ? "is-active" : ""}
                    onClick={() => setManualState(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <Setting
                label="Input level"
                value={inputVolume}
                displayValue={inputVolume.toFixed(2)}
                min={0}
                max={1}
                step={0.01}
                onChange={setInputVolume}
              />
              <Setting
                label="Output level"
                value={outputVolume}
                displayValue={outputVolume.toFixed(2)}
                min={0}
                max={1}
                step={0.01}
                onChange={setOutputVolume}
              />
            </>
          ) : (
            <p className="inspector__source-note">
              {source === "simulation"
                ? "Start the call to exercise connecting, listening, thinking, and speaking with live synthetic levels."
                : "Start the call to drive the listening state from your browser microphone."}
            </p>
          )}
        </InspectorSection>

        <InspectorSection title="Call button" note={showCallControl ? controlAppearance : "hidden"}>
          <label className="toggle">
            <span>
              <span>Show button</span>
              <small>Render a start, end, or retry action when one is available</small>
            </span>
            <input
              type="checkbox"
              checked={showCallControl}
              onChange={(event) => setShowCallControl(event.target.checked)}
            />
          </label>
          <label className="select-setting">
            <span>Position</span>
            <select
              aria-label="Call button position"
              value={controlPosition}
              disabled={!showCallControl}
              onChange={(event) => setControlPosition(event.target.value as OrbControlPosition)}
            >
              {CONTROL_POSITIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="select-setting">
            <span>Appearance</span>
            <select
              aria-label="Call button appearance"
              value={controlAppearance}
              disabled={!showCallControl}
              onChange={(event) => setControlAppearance(event.target.value as OrbControlAppearance)}
            >
              {CONTROL_APPEARANCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Setting
            label="Button height"
            value={controlSize}
            displayValue={`${controlSize}px`}
            min={32}
            max={72}
            step={2}
            disabled={!showCallControl}
            onChange={setControlSize}
          />
          <Setting
            label="Gap from orb"
            value={controlGap}
            displayValue={`${controlGap}px`}
            min={0}
            max={72}
            step={2}
            disabled={!showCallControl}
            onChange={setControlGap}
          />
        </InspectorSection>

        <InspectorSection title="Motion" note={reducedMotion ? "reduced" : `${speed.toFixed(1)}×`}>
          <Setting
            label="Speed"
            value={speed}
            displayValue={`${speed.toFixed(1)}×`}
            min={0}
            max={2}
            step={0.1}
            onChange={setSpeed}
          />
          <Setting
            label="Motion intensity"
            value={intensity}
            displayValue={`${intensity.toFixed(1)}×`}
            min={0.5}
            max={1.5}
            step={0.1}
            onChange={setIntensity}
          />
          <Setting
            label="Audio sensitivity"
            value={sensitivity}
            displayValue={`${sensitivity.toFixed(1)}×`}
            min={0.5}
            max={2}
            step={0.1}
            onChange={setSensitivity}
          />
          <Setting
            label="Attack smoothing"
            value={attack}
            displayValue={attack.toFixed(2)}
            min={0.05}
            max={1}
            step={0.05}
            onChange={setAttack}
          />
          <Setting
            label="Release smoothing"
            value={release}
            displayValue={release.toFixed(2)}
            min={0.05}
            max={1}
            step={0.01}
            onChange={setRelease}
          />
          <label className="toggle">
            <span>
              <span>Reduce motion</span>
              <small>Freeze decorative movement in this preview</small>
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
