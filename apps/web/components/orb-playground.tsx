"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Orb,
  type OrbCloudMode,
  type OrbControlAppearance,
  type OrbControlPosition,
  type OrbSignal,
  type OrbState,
  type OrbTheme,
} from "vorb-ui";
import { DemoVoiceAdapter } from "./orb-playground/demo-voice-adapter";
import {
  CLOUD_MODES,
  CONTROL_APPEARANCES,
  CONTROL_POSITIONS,
  SCALE_OPTIONS,
  SIGNAL_SOURCES,
  STATES,
  THEMES,
  type SignalSource,
} from "./orb-playground/options";

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

const CODE_TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*")|\b(Orb)\b|([A-Za-z]\w*)(?=\s*[=:])|(\b\d+(?:\.\d+)?\b)|([<>{}=,:/]+)/g;

function HighlightedCode({ code }: { code: string }) {
  return code.split("\n").map((line, lineIndex) => {
    const tokens: ReactNode[] = [];
    let cursor = 0;

    for (const match of line.matchAll(CODE_TOKEN_PATTERN)) {
      const start = match.index;
      if (start > cursor) tokens.push(line.slice(cursor, start));

      const className = match[1]
        ? "workbench__code-token--string"
        : match[2]
          ? "workbench__code-token--component"
          : match[3]
            ? "workbench__code-token--property"
            : match[4]
              ? "workbench__code-token--number"
              : "workbench__code-token--punctuation";

      tokens.push(
        <span className={className} key={`${lineIndex}-${start}`}>
          {match[0]}
        </span>,
      );
      cursor = start + match[0].length;
    }

    if (cursor < line.length) tokens.push(line.slice(cursor));

    return (
      <span className="workbench__code-line" key={lineIndex}>
        <span className="workbench__code-line-number" aria-hidden="true">
          {String(lineIndex + 1).padStart(2, "0")}
        </span>
        <span>{tokens}</span>
      </span>
    );
  });
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
      [
        `theme="${theme}"`,
        ...(theme === "cloud" ? [`cloudMode="${cloudMode}"`] : []),
        `scale=${selectedScale.code}`,
        `size={${size}}`,
      ].join(" "),
      ...(theme === "cloud"
        ? [`ballScale={${ballScale.toFixed(2)}} smokeScale={${smokeScale.toFixed(2)}}`]
        : []),
      sourceProp,
      showCallControl
        ? `control={{ position: "${controlPosition}", appearance: "${controlAppearance}", size: ${controlSize}, gap: ${controlGap} }}`
        : "interactive={false}",
      `motion={{ speed: ${reducedMotion ? 0 : speed.toFixed(1)}, intensity: ${intensity.toFixed(2)}, sensitivity: ${sensitivity.toFixed(1)}, attack: ${attack.toFixed(2)}, release: ${release.toFixed(2)} }}`,
    ];
    return `<Orb\n  ${props.join("\n  ")}\n/>`;
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

      <section className="workbench__stage" aria-label="Orb demo">
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
            source === "manual" && manualState === "error"
              ? "The simulated connection failed. Choose another state or retry."
              : undefined
          }
        />
        <div className="workbench__readout" aria-label="Current component configuration">
          <div className="workbench__readout-header">
            <span>Orb preview</span>
            <button
              type="button"
              aria-label="Copy component configuration"
              onClick={() => void copyCode()}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16">
                <rect x="5.25" y="5.25" width="7.5" height="7.5" rx="1.25" />
                <path d="M10.5 5.25V4.5c0-.69-.56-1.25-1.25-1.25H4.5c-.69 0-1.25.56-1.25 1.25v4.75c0 .69.56 1.25 1.25 1.25h.75" />
              </svg>
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <pre tabIndex={0}>
            <code>
              <HighlightedCode code={codeExample} />
            </code>
          </pre>
        </div>
      </section>

      <aside className="inspector" id="api" aria-label="Orb settings">
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
            max={3}
            step={0.1}
            onChange={setSpeed}
          />
          <Setting
            label="Motion intensity"
            value={intensity}
            displayValue={`${intensity.toFixed(2)}×`}
            min={0.25}
            max={2}
            step={0.05}
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
