import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type SVGProps,
} from "react";
import { cn } from "../../../lib/utils";
import {
  clampVolume,
  deriveVoiceOrbState,
  deriveVoiceOrbVolume,
  normalizeSignal,
} from "./signals";
import { useAudioMeter } from "./use-audio-meter";
import { useVoiceOrbRenderer } from "./use-voice-orb-renderer";
import {
  DEFAULT_VOICE_ORB_COLORS,
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

function toCssSize(value: number | string) {
  return typeof value === "number" ? `${value}px` : value;
}

function clampScale(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function humanizeError(error: unknown) {
  if (error instanceof DOMException) {
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
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

export const VoiceOrb = forwardRef<HTMLDivElement, VoiceOrbProps>(
  function VoiceOrb(
    {
      signal: signalProp,
      state: stateProp,
      volume: volumeProp,
      adapter,
      audioStream,
      requestMicrophone = false,
      interactive: interactiveProp = true,
      disabled = false,
      onStart,
      onStop,
      onVoiceError,
      size = "clamp(18rem, 48vw, 25rem)",
      ballScale: ballScaleProp = 0.96,
      smokeScale: smokeScaleProp = 0.94,
      colors: colorsProp,
      motion: motionProp,
      labels: labelsProp,
      status,
      showStatus = true,
      errorMessage,
      className,
      style,
      onKeyDown,
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

    const colors = useMemo(
      () => ({ ...DEFAULT_VOICE_ORB_COLORS, ...colorsProp }),
      [colorsProp],
    );
    const motion = useMemo(
      () => ({ ...DEFAULT_VOICE_ORB_MOTION, ...motionProp }),
      [motionProp],
    );
    const labels = useMemo(
      () => ({ ...DEFAULT_VOICE_ORB_LABELS, ...labelsProp }),
      [labelsProp],
    );
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
    const activeSignal =
      explicitSignal ?? (adapter ? adapterSignal : undefined);
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
      activeSignal?.inputVolume ??
        (effectiveState === "listening" ? meteredVolume : 0),
    );
    const outputVolume = clampVolume(
      activeSignal?.outputVolume ??
        (effectiveState === "speaking" ? meteredVolume : 0),
    );

    const webglReady = useVoiceOrbRenderer({
      canvasRef,
      state: effectiveState,
      volume: effectiveVolume,
      inputVolume,
      outputVolume,
      colors,
      motion,
      ballScale,
      smokeScale,
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
          throw new Error(
            "Microphone access is not supported by this browser.",
          );
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
      effectiveState === "connecting"
        ? hasStart || hasStop
        : active
          ? hasStop
          : hasStart;
    const interactive = interactiveProp && canInteract;
    const controlDisabled =
      disabled || actionPending || effectiveState === "connecting";
    const statusMessage =
      effectiveState === "error"
        ? errorMessage ||
          localError ||
          (activeSignal?.error
            ? humanizeError(activeSignal.error)
            : DEFAULT_ERROR)
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
    const componentStyle: VoiceOrbStyle = {
      ...style,
      "--voice-orb-size": toCssSize(size),
      "--voice-orb-ball-scale": ballScale,
      "--voice-orb-primary": colors.primary,
      "--voice-orb-secondary": colors.secondary,
      "--voice-orb-highlight": colors.highlight,
      "--voice-orb-accent": colors.accent,
    };

    const handleRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (
        event.defaultPrevented ||
        event.key !== "Escape" ||
        !active ||
        !interactive
      ) {
        return;
      }
      event.preventDefault();
      void handleStop();
    };

    return (
      <div
        {...htmlProps}
        ref={forwardedRef}
        className={cn("voice-orb", className)}
        data-state={effectiveState}
        data-interactive={interactive || undefined}
        style={componentStyle}
        onKeyDown={handleRootKeyDown}
      >
        <div className="voice-orb__visual">
          <canvas
            ref={canvasRef}
            className={cn(
              "voice-orb__canvas",
              webglReady && "voice-orb__canvas--ready",
            )}
            aria-hidden="true"
          />
        </div>

        {interactive && (
          <button
            type="button"
            className="voice-orb__control"
            data-mode={
              effectiveState === "error" ? "retry" : active ? "end" : "start"
            }
            aria-label={buttonLabel}
            disabled={controlDisabled}
            onClick={() => {
              if (active) void handleStop();
              else void handleStart();
            }}
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
        )}

        {showStatus && (
          <div className="voice-orb__status">
            <p
              className="voice-orb__status-line"
              aria-live="polite"
              aria-atomic="true"
            >
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
  },
);
