import { forwardRef, useMemo, useRef, type KeyboardEvent, type SVGProps } from "react";
import { DEFAULT_ORB_SCALE, resolveOrbScale } from "./scales";
import { OrbArtwork } from "./themes/artwork";
import { useCloudRenderer } from "./themes/cloud/use-cloud-renderer";
import { DEFAULT_ORB_LABELS, DEFAULT_ORB_MOTION, type OrbProps, type OrbStyle } from "./types";
import { useOrbSession } from "./use-orb-session";
import "./styles/orb.css";

type OrbInternalStyle = OrbStyle &
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

function toCssSize(value: number | string) {
  return typeof value === "number" ? `${value}px` : value;
}

function clampScale(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

export const Orb = forwardRef<HTMLDivElement, OrbProps>(function Orb(
  {
    signal: signalProp,
    state: stateProp,
    volume: volumeProp,
    adapter,
    theme = "debug",
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
    scale: scaleProp = DEFAULT_ORB_SCALE,
    motion: motionProp,
    labels: labelsProp,
    status,
    showStatus = false,
    errorMessage,
    className,
    style,
    ...htmlProps
  },
  forwardedRef,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = useMemo(() => resolveOrbScale(scaleProp), [scaleProp]);
  const motion = useMemo(() => ({ ...DEFAULT_ORB_MOTION, ...motionProp }), [motionProp]);
  const labels = useMemo(() => ({ ...DEFAULT_ORB_LABELS, ...labelsProp }), [labelsProp]);
  const ballScale = clampScale(ballScaleProp, 0.7, 1);
  const smokeScale = clampScale(smokeScaleProp, 0.5, 1.1);
  const session = useOrbSession({
    signal: signalProp,
    state: stateProp,
    volume: volumeProp,
    adapter,
    audioStream,
    requestMicrophone,
    interactive: interactiveProp,
    disabled,
    onStart,
    onStop,
    onVoiceError,
    motion,
  });

  const webglReady = useCloudRenderer({
    canvasRef,
    enabled: theme === "cloud",
    state: session.state,
    volume: session.volume,
    inputVolume: session.inputVolume,
    outputVolume: session.outputVolume,
    scale,
    motion,
    ballScale,
    smokeScale,
    cloudMode,
  });

  const statusMessage = session.state === "error" ? errorMessage || session.errorMessage : "";
  const buttonLabel =
    htmlProps["aria-label"] ??
    (session.state === "error"
      ? labels.retry
      : session.active
        ? labels.stop
        : session.state === "connecting"
          ? labels.connecting
          : labels.start);
  const controlPosition = control?.position ?? "bottom";
  const controlAppearance = control?.appearance ?? "glass";
  const componentStyle: OrbInternalStyle = {
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
    "--orb-state-turbulence": scale.states[session.state].turbulence,
    "--orb-state-flow-speed": scale.states[session.state].flowSpeed,
    "--orb-state-vortex-count": scale.states[session.state].vortexCount,
    "--orb-state-vortex-strength": scale.states[session.state].vortexStrength,
    "--orb-state-expansion": scale.states[session.state].expansion,
    "--orb-state-center-pull": scale.states[session.state].centerPull,
    "--orb-state-audio-response": scale.states[session.state].audioResponse,
    "--orb-state-smoke-density": scale.states[session.state].smokeDensity,
    "--orb-state-glow-intensity": scale.states[session.state].glowIntensity,
    "--orb-state-glow-pulse-speed": scale.states[session.state].glowPulseSpeed,
    "--orb-state-warning-distortion": scale.states[session.state].warningDistortion,
    "--orb-state-tone-position": scale.states[session.state].tonePosition,
    "--orb-active-volume": session.volume,
    "--orb-motion-speed": motion.speed,
    "--orb-motion-intensity": motion.intensity,
  };

  const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.defaultPrevented ||
      event.key !== "Escape" ||
      !session.active ||
      !session.interactive
    ) {
      return;
    }
    event.preventDefault();
    void session.stop();
  };
  const activate = () => {
    if (session.active) void session.stop();
    else void session.start();
  };
  const artwork = (
    <div className="voice-orb__visual" aria-hidden="true">
      {theme === "cloud" ? (
        <>
          <canvas
            ref={canvasRef}
            data-cloud-surface=""
            className={["voice-orb__canvas", webglReady && "voice-orb__canvas--ready"]
              .filter(Boolean)
              .join(" ")}
          />
          <div className="voice-orb__canvas-fallback" />
        </>
      ) : (
        <OrbArtwork
          theme={theme}
          state={session.state}
          inputVolume={session.inputVolume}
          outputVolume={session.outputVolume}
        />
      )}
    </div>
  );

  return (
    <div
      {...htmlProps}
      ref={forwardedRef}
      className={["voice-orb", `voice-orb--${theme}`, className].filter(Boolean).join(" ")}
      data-state={session.state}
      data-theme={theme}
      data-cloud-mode={theme === "cloud" ? cloudMode : undefined}
      data-scale={scale.name}
      data-interactive={session.interactive || undefined}
      data-control-position={session.interactive ? controlPosition : undefined}
      data-control-appearance={session.interactive ? controlAppearance : undefined}
      style={componentStyle}
      onKeyDown={handleRootKeyDown}
    >
      <div
        className="voice-orb__artwork"
        data-control-position={session.interactive ? controlPosition : undefined}
      >
        {artwork}

        {session.interactive && (
          <div className="voice-orb__control-slot" data-position={controlPosition}>
            <button
              type="button"
              className={["voice-orb__control", control?.className].filter(Boolean).join(" ")}
              data-appearance={controlAppearance}
              data-mode={session.state === "error" ? "retry" : session.active ? "end" : "start"}
              style={control?.style}
              aria-label={buttonLabel}
              disabled={session.controlDisabled}
              onClick={activate}
            >
              <span className="voice-orb__icon" aria-hidden="true">
                {session.state === "connecting" || session.actionPending ? (
                  <LoadingIcon className="voice-orb__loading-icon" />
                ) : session.state === "error" ? (
                  <RetryIcon />
                ) : (
                  <PhoneIcon className={session.active ? "voice-orb__hangup" : ""} />
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
            <span>{status || labels[session.state]}</span>
          </p>
          {session.state === "error" && (
            <div className="voice-orb__error">
              <p role="alert">{statusMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/** @deprecated Use Orb. */
export const VoiceOrb = forwardRef<HTMLDivElement, OrbProps>(function VoiceOrb(
  { theme = "radial", showStatus = true, ...props },
  ref,
) {
  return <Orb ref={ref} theme={theme} showStatus={showStatus} {...props} />;
});
