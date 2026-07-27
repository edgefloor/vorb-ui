import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type CSSProperties,
  type SVGProps,
} from "react";
import { cn } from "../../../lib/utils";
import { clampVolume, deriveVoiceOrbState, deriveVoiceOrbVolume, normalizeSignal } from "./signals";
import { useAudioMeter } from "./use-audio-meter";
import { useVoiceOrbRenderer } from "./use-voice-orb-renderer";
import { DEFAULT_VOICE_ORB_SCALE, resolveVoiceOrbScale } from "./voice-orb-scales";
import {
  DEFAULT_VOICE_ORB_LABELS,
  DEFAULT_VOICE_ORB_MOTION,
  type VoiceOrbProps,
  type VoiceOrbSignal,
  type VoiceOrbState,
  type VoiceOrbStyle,
} from "./voice-orb.types";
import "./voice-orb.css";

const DEFAULT_ERROR =
  "The voice session could not be started. Check your connection and permissions, then try again.";

type VoiceOrbInternalStyle = VoiceOrbStyle &
  Record<`--${string}`, string | number | undefined> & {
    "--voice-orb-tone-deepest": string;
    "--voice-orb-tone-deep": string;
    "--voice-orb-tone-base": string;
    "--voice-orb-tone-bright": string;
    "--voice-orb-tone-lightest": string;
    "--voice-orb-warning-deepest": string;
    "--voice-orb-warning-deep": string;
    "--voice-orb-warning-base": string;
    "--voice-orb-warning-bright": string;
    "--voice-orb-warning-lightest": string;
  };

const stableCoordinate = (value: number) => Number(value.toFixed(6));

const CIRCLE_PARTICLES = Array.from({ length: 84 }, (_, index) => {
  const count = 84;
  const progress = (index + 0.5) / count;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const longitude = index * goldenAngle;
  const sphereY = 1 - 2 * progress;
  const sphereRadius = Math.sqrt(1 - sphereY * sphereY);
  const sphereX = Math.cos(longitude) * sphereRadius;
  const sphereZ = Math.sin(longitude) * sphereRadius;

  const torusMajor = 0.58;
  const torusMinor = 0.24;
  const torusU = longitude;
  const torusV = index * 1.61803398875;
  const torusRadius = torusMajor + torusMinor * Math.cos(torusV);
  const torusX = Math.cos(torusU) * torusRadius;
  const torusY = Math.sin(torusU) * torusRadius * 0.66 + Math.sin(torusV) * torusMinor * 0.34;

  const spiralRadius = 0.12 + progress * 0.76;
  const spiralAngle = longitude * 1.18;
  const spiralX = Math.cos(spiralAngle) * spiralRadius;
  const spiralY = Math.sin(spiralAngle) * spiralRadius * 0.72;

  const helixX = Math.sin(progress * Math.PI * 5.5) * (0.18 + progress * 0.2);
  const helixY = (progress - 0.5) * 1.45;
  const fractureDirection = sphereX < 0 ? -1 : 1;
  const fractureJitter = Math.sin(index * 12.9898) * 0.08;

  const point = (value: number) => stableCoordinate(50 + value * 42);
  return {
    index,
    depth: stableCoordinate((sphereZ + 1) / 2),
    driftX: stableCoordinate(Math.cos(longitude)),
    driftY: stableCoordinate(Math.sin(longitude)),
    sphereX: point(sphereX * 0.82),
    sphereY: point(sphereY * 0.82),
    torusX: point(torusX),
    torusY: point(torusY),
    spiralX: point(spiralX),
    spiralY: point(spiralY),
    helixX: point(helixX),
    helixY: point(helixY),
    bloomX: point(sphereX),
    bloomY: point(sphereY),
    fractureX: point(sphereX * 0.76 + fractureDirection * 0.18 + fractureJitter),
    fractureY: point(sphereY * 0.72 + fractureJitter),
  };
});

function MagicalThemeVisual({
  theme,
  state,
  inputVolume,
  outputVolume,
}: {
  theme: Exclude<import("./voice-orb.types").OrbTheme, "cloud">;
  state: VoiceOrbState;
  inputVolume: number;
  outputVolume: number;
}) {
  if (theme === "bars") {
    const weights = [0.52, 0.74, 0.91, 1, 0.86, 0.68, 0.48];
    return (
      <div className="voice-orb__shards">
        <div className="voice-orb__spectrum">
          {weights.map((weight, index) => (
            <span
              className="voice-orb__spectrum-bar"
              key={index}
              style={
                {
                  "--shard-index": index,
                  "--shard-weight": weight,
                } as CSSProperties
              }
            >
              <span className="voice-orb__spectrum-fill" />
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (theme === "debug") {
    const activeVolume =
      state === "listening" ? inputVolume : state === "speaking" ? outputVolume : 0;
    return (
      <div className="voice-orb__instrument">
        <div className="voice-orb__instrument-header">
          <span className="voice-orb__sigil" />
          <span>ORB SIGNAL</span>
          <span className="voice-orb__instrument-state">{state}</span>
        </div>
        <dl>
          <div>
            <dt>input</dt>
            <dd>{inputVolume.toFixed(2)}</dd>
          </div>
          <div
            className="voice-orb__meter"
            style={{ "--meter-level": inputVolume } as CSSProperties}
          >
            <span />
          </div>
          <div>
            <dt>output</dt>
            <dd>{outputVolume.toFixed(2)}</dd>
          </div>
          <div
            className="voice-orb__meter"
            style={{ "--meter-level": outputVolume } as CSSProperties}
          >
            <span />
          </div>
        </dl>
        <div className="voice-orb__state-rail" aria-hidden="true">
          {(["idle", "connecting", "listening", "thinking", "speaking", "error"] as const).map(
            (item) => (
              <span key={item} data-active={item === state || undefined} />
            ),
          )}
        </div>
        <div
          className="voice-orb__instrument-pulse"
          style={{ "--meter-level": activeVolume } as CSSProperties}
        />
      </div>
    );
  }

  if (theme === "circle") {
    return (
      <div className="voice-orb__circle">
        <span className="voice-orb__circle-aura" />
        <span className="voice-orb__circle-void" />
        <span className="voice-orb__circle-swarm">
          {CIRCLE_PARTICLES.map((particle) => (
            <i
              key={particle.index}
              style={
                {
                  "--particle-index": particle.index,
                  "--particle-depth": particle.depth,
                  "--particle-drift-x": particle.driftX,
                  "--particle-drift-y": particle.driftY,
                  "--particle-sphere-x": particle.sphereX,
                  "--particle-sphere-y": particle.sphereY,
                  "--particle-torus-x": particle.torusX,
                  "--particle-torus-y": particle.torusY,
                  "--particle-spiral-x": particle.spiralX,
                  "--particle-spiral-y": particle.spiralY,
                  "--particle-helix-x": particle.helixX,
                  "--particle-helix-y": particle.helixY,
                  "--particle-bloom-x": particle.bloomX,
                  "--particle-bloom-y": particle.bloomY,
                  "--particle-fracture-x": particle.fractureX,
                  "--particle-fracture-y": particle.fractureY,
                } as CSSProperties
              }
            />
          ))}
        </span>
      </div>
    );
  }

  return (
    <div className="voice-orb__radial">
      <span className="voice-orb__radial-field voice-orb__radial-field--a" />
      <span className="voice-orb__radial-field voice-orb__radial-field--b" />
      <span className="voice-orb__radial-ring" />
    </div>
  );
}

function toCssSize(value: number | string) {
  return typeof value === "number" ? `${value}px` : value;
}

function clampScale(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function humanizeError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return "Microphone permission was declined. Allow access in your browser and retry.";
    }
    if (error.name === "NotFoundError") {
      return "No microphone was found. Connect one and try again.";
    }
    if (error.name === "NotReadableError") {
      return "The microphone is being used by another application. Close it and retry.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return DEFAULT_ERROR;
}

function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M7.2 4.6 10 8.1a1.6 1.6 0 0 1-.12 2.12l-1.15 1.15a14.2 14.2 0 0 0 3.9 3.9l1.15-1.15A1.6 1.6 0 0 1 15.9 14l3.5 2.8a1.6 1.6 0 0 1 .35 2.05l-.45.74a2.4 2.4 0 0 1-2.45 1.1A15.9 15.9 0 0 1 3.31 7.15a2.4 2.4 0 0 1 1.1-2.45l.74-.45A1.6 1.6 0 0 1 7.2 4.6Z" />
    </svg>
  );
}

function RetryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19.25 8.25A8 8 0 1 0 19.7 15" />
      <path d="M19.25 4.5v3.75H15.5" />
    </svg>
  );
}

function LoadingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      {...props}
    >
      <circle cx="12" cy="12" r="8.25" opacity=".24" />
      <path d="M12 3.75a8.25 8.25 0 0 1 8.25 8.25" />
    </svg>
  );
}

export const VoiceOrb = forwardRef<HTMLDivElement, VoiceOrbProps>(function VoiceOrb(
  {
    signal: signalProp,
    state: stateProp,
    volume: volumeProp,
    adapter,
    theme = "radial",
    cloudMode = "shell",
    control,
    audioStream,
    requestMicrophone = false,
    interactive: interactiveProp = true,
    disabled = false,
    onStart,
    onStop,
    onVoiceError,
    size = 200,
    ballScale: ballScaleProp = 0.96,
    smokeScale: smokeScaleProp = 0.94,
    scale: scaleProp = DEFAULT_VOICE_ORB_SCALE,
    motion: motionProp,
    labels: labelsProp,
    status,
    showStatus = true,
    errorMessage,
    className,
    style,
    ...htmlProps
  },
  forwardedRef,
) {
  const [adapterSignal, setAdapterSignal] = useState<VoiceOrbSignal>({
    state: "idle",
  });
  const [localState, setLocalState] = useState<VoiceOrbState>("idle");
  const [localError, setLocalError] = useState("");
  const [ownedStream, setOwnedStream] = useState<MediaStream | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ownedStreamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const reportedErrorRef = useRef<unknown>(undefined);
  const onVoiceErrorRef = useRef(onVoiceError);
  onVoiceErrorRef.current = onVoiceError;

  const scale = useMemo(() => resolveVoiceOrbScale(scaleProp), [scaleProp]);
  const motion = useMemo(() => ({ ...DEFAULT_VOICE_ORB_MOTION, ...motionProp }), [motionProp]);
  const labels = useMemo(() => ({ ...DEFAULT_VOICE_ORB_LABELS, ...labelsProp }), [labelsProp]);
  const ballScale = clampScale(ballScaleProp, 0.7, 1);
  const smokeScale = clampScale(smokeScaleProp, 0.5, 1.1);

  useEffect(() => {
    setAdapterSignal({ state: "idle" });
    if (!adapter) return;

    try {
      return adapter.subscribe((nextSignal) => {
        setAdapterSignal(normalizeSignal(nextSignal) ?? { state: "idle" });
      });
    } catch (error) {
      setAdapterSignal({ state: "error", error });
      onVoiceErrorRef.current?.(error);
    }
  }, [adapter]);

  const explicitSignal = normalizeSignal(signalProp);
  const activeSignal = explicitSignal ?? (adapter ? adapterSignal : undefined);
  const effectiveState = deriveVoiceOrbState(
    stateProp,
    explicitSignal,
    adapter ? adapterSignal : undefined,
    localState,
  );

  useEffect(() => {
    const error = activeSignal?.error;
    if (error === undefined || error === reportedErrorRef.current) return;
    reportedErrorRef.current = error;
    onVoiceErrorRef.current?.(error);
  }, [activeSignal?.error]);

  const meteredVolume = useAudioMeter(audioStream ?? ownedStream, {
    sensitivity: 1,
    attack: motion.attack,
    release: motion.release,
  });
  const effectiveVolume = deriveVoiceOrbVolume(
    volumeProp,
    effectiveState,
    activeSignal,
    meteredVolume,
  );
  const inputVolume = clampVolume(
    activeSignal?.inputVolume ?? (effectiveState === "listening" ? meteredVolume : 0),
  );
  const outputVolume = clampVolume(
    activeSignal?.outputVolume ?? (effectiveState === "speaking" ? meteredVolume : 0),
  );

  const webglReady = useVoiceOrbRenderer({
    canvasRef,
    enabled: theme === "cloud",
    state: effectiveState,
    volume: effectiveVolume,
    inputVolume,
    outputVolume,
    scale,
    motion,
    ballScale,
    smokeScale,
    cloudMode,
  });

  const stopOwnedStream = useCallback(() => {
    const stream = ownedStreamRef.current;
    if (!stream) return false;
    ownedStreamRef.current = null;
    setOwnedStream(null);
    stream.getTracks().forEach((track) => track.stop());
    return true;
  }, []);

  const reportLocalError = useCallback((error: unknown) => {
    setLocalError(humanizeError(error));
    setLocalState("error");
    onVoiceErrorRef.current?.(error);
  }, []);

  const startMicrophone = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLocalError("");
    setLocalState("connecting");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported by this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      stopOwnedStream();
      ownedStreamRef.current = stream;
      setOwnedStream(stream);
      setLocalState("listening");
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      reportLocalError(error);
    }
  }, [reportLocalError, stopOwnedStream]);

  const handleStart = useCallback(async () => {
    if (disabled || actionPending) return;
    setActionPending(true);
    setLocalError("");

    try {
      if (!onStart && !adapter?.start && requestMicrophone) {
        await startMicrophone();
        return;
      }

      const start = onStart ?? adapter?.start;
      if (!start) return;
      if (!stateProp && !signalProp && !adapter) {
        setLocalState("connecting");
      }
      await start();
      if (mountedRef.current && !stateProp && !signalProp && !adapter) {
        setLocalState("listening");
      }
    } catch (error) {
      if (mountedRef.current) reportLocalError(error);
    } finally {
      if (mountedRef.current) setActionPending(false);
    }
  }, [
    actionPending,
    adapter,
    disabled,
    onStart,
    reportLocalError,
    requestMicrophone,
    signalProp,
    startMicrophone,
    stateProp,
  ]);

  const handleStop = useCallback(async () => {
    if (disabled || actionPending) return;
    requestIdRef.current += 1;
    setActionPending(true);
    stopOwnedStream();

    try {
      const stop = onStop ?? adapter?.stop;
      await stop?.();
      if (!stateProp && !signalProp && !adapter) setLocalState("idle");
    } catch (error) {
      if (mountedRef.current) reportLocalError(error);
    } finally {
      if (mountedRef.current) setActionPending(false);
    }
  }, [
    actionPending,
    adapter,
    disabled,
    onStop,
    reportLocalError,
    signalProp,
    stateProp,
    stopOwnedStream,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    const onPageHide = () => {
      requestIdRef.current += 1;
      stopOwnedStream();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      window.removeEventListener("pagehide", onPageHide);
      stopOwnedStream();
    };
  }, [stopOwnedStream]);

  const active =
    effectiveState === "listening" ||
    effectiveState === "thinking" ||
    effectiveState === "speaking";
  const hasStart = Boolean(onStart || adapter?.start || requestMicrophone);
  const hasStop = Boolean(onStop || adapter?.stop || ownedStream);
  const canInteract =
    effectiveState === "connecting" ? hasStart || hasStop : active ? hasStop : hasStart;
  const interactive = interactiveProp && canInteract;
  const controlDisabled = disabled || actionPending || effectiveState === "connecting";
  const statusMessage =
    effectiveState === "error"
      ? errorMessage ||
        localError ||
        (activeSignal?.error ? humanizeError(activeSignal.error) : DEFAULT_ERROR)
      : "";
  const buttonLabel =
    htmlProps["aria-label"] ??
    (effectiveState === "error"
      ? labels.retry
      : active
        ? labels.stop
        : effectiveState === "connecting"
          ? labels.connecting
          : labels.start);
  const controlPosition = control?.position ?? "bottom";
  const controlAppearance = control?.appearance ?? "glass";
  const componentStyle: VoiceOrbInternalStyle = {
    ...style,
    "--vorb-ui-size": toCssSize(size),
    "--voice-orb-size": toCssSize(size),
    ...(control?.size !== undefined ? { "--vorb-ui-control-size": toCssSize(control.size) } : {}),
    ...(control?.gap !== undefined ? { "--vorb-ui-control-gap": toCssSize(control.gap) } : {}),
    ...(control?.offsetX !== undefined
      ? { "--vorb-ui-control-offset-x": toCssSize(control.offsetX) }
      : {}),
    ...(control?.offsetY !== undefined
      ? { "--vorb-ui-control-offset-y": toCssSize(control.offsetY) }
      : {}),
    "--voice-orb-ball-scale": ballScale,
    "--voice-orb-tone-deepest": scale.colors.main.deepest,
    "--voice-orb-tone-deep": scale.colors.main.deep,
    "--voice-orb-tone-base": scale.colors.main.base,
    "--voice-orb-tone-bright": scale.colors.main.bright,
    "--voice-orb-tone-lightest": scale.colors.main.lightest,
    "--voice-orb-warning-deepest": scale.colors.warning.deepest,
    "--voice-orb-warning-deep": scale.colors.warning.deep,
    "--voice-orb-warning-base": scale.colors.warning.base,
    "--voice-orb-warning-bright": scale.colors.warning.bright,
    "--voice-orb-warning-lightest": scale.colors.warning.lightest,
    "--orb-state-turbulence": scale.states[effectiveState].turbulence,
    "--orb-state-flow-speed": scale.states[effectiveState].flowSpeed,
    "--orb-state-vortex-count": scale.states[effectiveState].vortexCount,
    "--orb-state-vortex-strength": scale.states[effectiveState].vortexStrength,
    "--orb-state-expansion": scale.states[effectiveState].expansion,
    "--orb-state-center-pull": scale.states[effectiveState].centerPull,
    "--orb-state-audio-response": scale.states[effectiveState].audioResponse,
    "--orb-state-smoke-density": scale.states[effectiveState].smokeDensity,
    "--orb-state-glow-intensity": scale.states[effectiveState].glowIntensity,
    "--orb-state-glow-pulse-speed": scale.states[effectiveState].glowPulseSpeed,
    "--orb-state-warning-distortion": scale.states[effectiveState].warningDistortion,
    "--orb-state-tone-position": scale.states[effectiveState].tonePosition,
    "--orb-active-volume": effectiveVolume,
    "--orb-motion-speed": motion.speed,
    "--orb-motion-intensity": motion.intensity,
  };

  const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.key !== "Escape" || !active || !interactive) {
      return;
    }
    event.preventDefault();
    void handleStop();
  };
  const activate = () => {
    if (active) void handleStop();
    else void handleStart();
  };
  const artwork = (
    <div className="voice-orb__visual" aria-hidden="true">
      {theme === "cloud" ? (
        <>
          <canvas
            ref={canvasRef}
            data-cloud-surface=""
            className={cn("voice-orb__canvas", webglReady && "voice-orb__canvas--ready")}
          />
        </>
      ) : (
        <MagicalThemeVisual
          theme={theme}
          state={effectiveState}
          inputVolume={inputVolume}
          outputVolume={outputVolume}
        />
      )}
    </div>
  );

  return (
    <div
      {...htmlProps}
      ref={forwardedRef}
      className={cn("voice-orb", `voice-orb--${theme}`, className)}
      data-state={effectiveState}
      data-theme={theme}
      data-cloud-mode={theme === "cloud" ? cloudMode : undefined}
      data-scale={scale.name}
      data-interactive={interactive || undefined}
      data-control-position={interactive ? controlPosition : undefined}
      data-control-appearance={interactive ? controlAppearance : undefined}
      style={componentStyle}
      onKeyDown={handleRootKeyDown}
    >
      <div
        className="voice-orb__artwork"
        data-control-position={interactive ? controlPosition : undefined}
      >
        {artwork}

        {interactive && (
          <div className="voice-orb__control-slot" data-position={controlPosition}>
            <button
              type="button"
              className={cn("voice-orb__control", control?.className)}
              data-appearance={controlAppearance}
              data-mode={effectiveState === "error" ? "retry" : active ? "end" : "start"}
              style={control?.style}
              aria-label={buttonLabel}
              disabled={controlDisabled}
              onClick={activate}
            >
              <span className="voice-orb__icon" aria-hidden="true">
                {effectiveState === "connecting" || actionPending ? (
                  <LoadingIcon className="voice-orb__loading-icon" />
                ) : effectiveState === "error" ? (
                  <RetryIcon />
                ) : (
                  <PhoneIcon className={active ? "voice-orb__hangup" : ""} />
                )}
              </span>
            </button>
          </div>
        )}
      </div>

      {showStatus && (
        <div className="voice-orb__status">
          <p className="voice-orb__status-line" aria-live="polite" aria-atomic="true">
            <span className="voice-orb__status-dot" aria-hidden="true" />
            <span>{status || labels[effectiveState]}</span>
          </p>
          {effectiveState === "error" && (
            <div className="voice-orb__error">
              <p role="alert">{statusMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/** Canonical vorb-ui component. Its default theme matches upstream orb-ui. */
export const Orb = forwardRef<HTMLDivElement, VoiceOrbProps>(function Orb(
  { theme = "debug", showStatus = false, ...props },
  ref,
) {
  return <VoiceOrb ref={ref} theme={theme} showStatus={showStatus} {...props} />;
});
