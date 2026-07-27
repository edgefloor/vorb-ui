import { useCallback, useEffect, useRef, useState } from "react";
import { clampVolume, deriveOrbState, deriveOrbVolume, normalizeSignal } from "./signals";
import type { OrbMotion, OrbProps, OrbSignal, OrbState } from "./types";
import { useAudioMeter } from "./use-audio-meter";

const DEFAULT_ERROR =
  "The voice session could not be started. Check your connection and permissions, then try again.";

interface OrbSessionOptions {
  signal: OrbProps["signal"];
  state: OrbProps["state"];
  volume: OrbProps["volume"];
  adapter: OrbProps["adapter"];
  audioStream: OrbProps["audioStream"];
  requestMicrophone: boolean;
  interactive: boolean;
  disabled: boolean;
  onStart: OrbProps["onStart"];
  onStop: OrbProps["onStop"];
  onVoiceError: OrbProps["onVoiceError"];
  motion: OrbMotion;
}

export interface OrbSession {
  state: OrbState;
  volume: number;
  inputVolume: number;
  outputVolume: number;
  active: boolean;
  interactive: boolean;
  actionPending: boolean;
  controlDisabled: boolean;
  errorMessage: string;
  start(): Promise<void>;
  stop(): Promise<void>;
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

export function useOrbSession({
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
}: OrbSessionOptions): OrbSession {
  const [adapterSignal, setAdapterSignal] = useState<OrbSignal>({ state: "idle" });
  const [localState, setLocalState] = useState<OrbState>("idle");
  const [localError, setLocalError] = useState("");
  const [ownedStream, setOwnedStream] = useState<MediaStream | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const ownedStreamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const reportedErrorRef = useRef<unknown>(undefined);
  const onVoiceErrorRef = useRef(onVoiceError);
  onVoiceErrorRef.current = onVoiceError;

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
  const state = deriveOrbState(
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
  const volume = deriveOrbVolume(volumeProp, state, activeSignal, meteredVolume);
  const inputVolume = clampVolume(
    activeSignal?.inputVolume ?? (state === "listening" ? meteredVolume : 0),
  );
  const outputVolume = clampVolume(
    activeSignal?.outputVolume ?? (state === "speaking" ? meteredVolume : 0),
  );

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

  const start = useCallback(async () => {
    if (disabled || actionPending) return;
    setActionPending(true);
    setLocalError("");

    try {
      if (!onStart && !adapter?.start && requestMicrophone) {
        await startMicrophone();
        return;
      }

      const startSession = onStart ?? adapter?.start;
      if (!startSession) return;
      if (!stateProp && !signalProp && !adapter) setLocalState("connecting");
      await startSession();
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

  const stop = useCallback(async () => {
    if (disabled || actionPending) return;
    requestIdRef.current += 1;
    setActionPending(true);
    stopOwnedStream();

    try {
      const stopSession = onStop ?? adapter?.stop;
      await stopSession?.();
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

  const active = state === "listening" || state === "thinking" || state === "speaking";
  const hasStart = Boolean(onStart || adapter?.start || requestMicrophone);
  const hasStop = Boolean(onStop || adapter?.stop || ownedStream);
  const canInteract = state === "connecting" ? hasStart || hasStop : active ? hasStop : hasStart;

  return {
    state,
    volume,
    inputVolume,
    outputVolume,
    active,
    interactive: interactiveProp && canInteract,
    actionPending,
    controlDisabled: disabled || actionPending || state === "connecting",
    errorMessage:
      localError || (activeSignal?.error ? humanizeError(activeSignal.error) : DEFAULT_ERROR),
    start,
    stop,
  };
}
