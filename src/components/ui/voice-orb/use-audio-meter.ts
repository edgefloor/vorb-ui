import { useEffect, useState } from "react";

export interface AudioMeterOptions {
  sensitivity: number;
  attack: number;
  release: number;
  noiseFloor?: number;
  gain?: number;
  exponent?: number;
}

export function calibrateAudioLevel(
  rawValue: number,
  previous: number,
  options: AudioMeterOptions,
) {
  const raw = Number.isFinite(rawValue)
    ? Math.min(1, Math.max(0, rawValue))
    : 0;
  const noiseFloor = Math.min(
    1,
    Math.max(0, options.noiseFloor ?? 0.008),
  );
  const gain = Math.max(0, options.gain ?? 5);
  const exponent = Math.max(0.01, options.exponent ?? 0.72);
  const gated = raw <= noiseFloor ? 0 : raw - noiseFloor;
  const shaped = Math.pow(
    Math.min(1, Math.max(0, gated * gain * options.sensitivity)),
    exponent,
  );
  const rate = shaped > previous ? options.attack : options.release;
  return Math.min(1, Math.max(0, previous + (shaped - previous) * rate));
}

export function useAudioMeter(
  stream: MediaStream | null | undefined,
  options: AudioMeterOptions,
) {
  const [level, setLevel] = useState(0);
  const { sensitivity, attack, release, noiseFloor, gain, exponent } = options;

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    const AudioContextClass = (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).AudioContext ??
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) {
      setLevel(0);
      return;
    }

    let context: AudioContext | null = null;
    let interval = 0;
    let cancelled = false;
    let previous = 0;

    try {
      context = new AudioContextClass();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);

      if (context.state === "suspended") {
        void context.resume().catch(() => undefined);
      }

      interval = window.setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        let sumSquares = 0;
        for (const sample of samples) sumSquares += sample * sample;
        const raw = Math.sqrt(sumSquares / samples.length);
        previous = calibrateAudioLevel(raw, previous, {
          sensitivity,
          attack,
          release,
          noiseFloor,
          gain,
          exponent,
        });
        if (!cancelled) setLevel(previous);
      }, 33);

      return () => {
        cancelled = true;
        window.clearInterval(interval);
        source.disconnect();
        analyser.disconnect();
        if (context?.state !== "closed") void context?.close();
      };
    } catch {
      cancelled = true;
      window.clearInterval(interval);
      if (context?.state !== "closed") void context?.close();
      setLevel(0);
    }
  }, [
    stream,
    sensitivity,
    attack,
    release,
    noiseFloor,
    gain,
    exponent,
  ]);

  return level;
}
