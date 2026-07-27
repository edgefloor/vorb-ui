import { useEffect, useRef, useState, type RefObject } from "react";
import { ORB_SCALES, getOrbTransitionDuration } from "../../scales";
import type {
  OrbCloudMode,
  OrbMotion,
  OrbScaleDefinition,
  OrbState,
  OrbToneRamp,
  OrbVisualState,
} from "../../types";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";
import { createVoiceDynamicsState, stepVoiceDynamics } from "./voice-dynamics";

type Rgb = [number, number, number];
type RgbToneRamp = Record<keyof OrbToneRamp, Rgb>;

type Uniforms = Record<
  | "time"
  | "thinkingPhase"
  | "resolution"
  | "intensity"
  | "main0"
  | "main1"
  | "main2"
  | "main3"
  | "main4"
  | "warning0"
  | "warning1"
  | "warning2"
  | "warning3"
  | "warning4"
  | "visual0"
  | "visual1"
  | "visual2"
  | "glowRadius"
  | "ballScale"
  | "shellVisibility"
  | "gasRoughness"
  | "inputEnergy"
  | "outputEnergy"
  | "audioBands"
  | "articulation"
  | "voiceDynamics"
  | "stateA"
  | "stateB"
  | "unavailable",
  WebGLUniformLocation | null
>;

interface Renderer {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  uniforms: Uniforms;
}

interface RendererConfig {
  state: OrbState;
  volume: number;
  inputVolume: number;
  outputVolume: number;
  scale: OrbScaleDefinition;
  colors: {
    main: RgbToneRamp;
    warning: RgbToneRamp;
  };
  motion: OrbMotion;
  ballScale: number;
  smokeScale: number;
  cloudMode: OrbCloudMode;
}

interface UseCloudRendererOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled?: boolean;
  state: OrbState;
  volume: number;
  inputVolume: number;
  outputVolume: number;
  scale: OrbScaleDefinition;
  motion: OrbMotion;
  ballScale: number;
  smokeScale: number;
  cloudMode?: OrbCloudMode;
}

const COLOR_CACHE = new Map<string, Rgb>();
const RAMP_KEYS: Array<keyof OrbToneRamp> = ["deepest", "deep", "base", "bright", "lightest"];
const VISUAL_KEYS: Array<keyof OrbVisualState> = [
  "turbulence",
  "flowSpeed",
  "vortexCount",
  "vortexStrength",
  "expansion",
  "centerPull",
  "audioResponse",
  "smokeDensity",
  "glowIntensity",
  "glowPulseSpeed",
  "warningDistortion",
  "tonePosition",
];

function hexToRgb(color: string): Rgb {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match) return [0, 0, 0];
  return [
    Number.parseInt(match[1], 16) / 255,
    Number.parseInt(match[2], 16) / 255,
    Number.parseInt(match[3], 16) / 255,
  ];
}

function hexRampToRgb(ramp: OrbToneRamp): RgbToneRamp {
  return Object.fromEntries(RAMP_KEYS.map((key) => [key, hexToRgb(ramp[key])])) as RgbToneRamp;
}

const FALLBACK_MAIN = hexRampToRgb(ORB_SCALES.crystal.colors.main);
const FALLBACK_WARNING = hexRampToRgb(ORB_SCALES.crystal.colors.warning);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cssColorToRgb(color: string, fallback: Rgb): Rgb {
  const cacheKey = `${color}|${fallback.join(",")}`;
  const cached = COLOR_CACHE.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return fallback;
  const fallbackColor = `rgb(${fallback[0] * 255} ${fallback[1] * 255} ${fallback[2] * 255})`;
  context.fillStyle = fallbackColor;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const pixel = context.getImageData(0, 0, 1, 1).data;
  const rgb: Rgb = [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255];
  COLOR_CACHE.set(cacheKey, rgb);
  return rgb;
}

function parseToneRamp(ramp: OrbToneRamp, fallback: RgbToneRamp): RgbToneRamp {
  return Object.fromEntries(
    RAMP_KEYS.map((key) => [key, cssColorToRgb(ramp[key], fallback[key])]),
  ) as RgbToneRamp;
}

function cloneRgbRamp(ramp: RgbToneRamp): RgbToneRamp {
  return Object.fromEntries(RAMP_KEYS.map((key) => [key, [...ramp[key]] as Rgb])) as RgbToneRamp;
}

function approachRgbRamp(current: RgbToneRamp, target: RgbToneRamp, rate: number) {
  RAMP_KEYS.forEach((key) => {
    for (let channel = 0; channel < 3; channel += 1) {
      current[key][channel] += (target[key][channel] - current[key][channel]) * rate;
    }
  });
}

function approachVisualState(current: OrbVisualState, target: OrbVisualState, rate: number) {
  VISUAL_KEYS.forEach((key) => {
    current[key] += (target[key] - current[key]) * rate;
  });
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create the Orb shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Orb shader failed: ${message ?? "Unknown error"}`);
  }
  return shader;
}

function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  let vertexShader: WebGLShader | null = null;
  let fragmentShader: WebGLShader | null = null;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;

  try {
    vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = gl.createProgram();
    buffer = gl.createBuffer();
    if (!program || !buffer) throw new Error("Could not initialize WebGL.");

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Orb program failed: ${gl.getProgramInfoLog(program) ?? "Unknown error"}`);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uniform = (name: string) => gl.getUniformLocation(program!, name);
    return {
      gl,
      program,
      buffer,
      vertexShader,
      fragmentShader,
      uniforms: {
        time: uniform("uTime"),
        thinkingPhase: uniform("uThinkingPhase"),
        resolution: uniform("uResolution"),
        intensity: uniform("uIntensity"),
        main0: uniform("uMain0"),
        main1: uniform("uMain1"),
        main2: uniform("uMain2"),
        main3: uniform("uMain3"),
        main4: uniform("uMain4"),
        warning0: uniform("uWarning0"),
        warning1: uniform("uWarning1"),
        warning2: uniform("uWarning2"),
        warning3: uniform("uWarning3"),
        warning4: uniform("uWarning4"),
        visual0: uniform("uVisual0"),
        visual1: uniform("uVisual1"),
        visual2: uniform("uVisual2"),
        glowRadius: uniform("uGlowRadius"),
        ballScale: uniform("uBallScale"),
        shellVisibility: uniform("uShellVisibility"),
        gasRoughness: uniform("uGasRoughness"),
        inputEnergy: uniform("uInputEnergy"),
        outputEnergy: uniform("uOutputEnergy"),
        audioBands: uniform("uAudioBands"),
        articulation: uniform("uArticulation"),
        voiceDynamics: uniform("uVoiceDynamics"),
        stateA: uniform("uStateA"),
        stateB: uniform("uStateB"),
        unavailable: uniform("uUnavailable"),
      },
    };
  } catch (error) {
    console.warn(error);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }
}

function destroyRenderer(renderer: Renderer) {
  const { gl } = renderer;
  gl.deleteBuffer(renderer.buffer);
  gl.deleteProgram(renderer.program);
  gl.deleteShader(renderer.vertexShader);
  gl.deleteShader(renderer.fragmentShader);
}

function smoothRate(rate: number, deltaFrames: number) {
  return 1 - Math.pow(1 - clamp(rate, 0, 1), deltaFrames);
}

export function useCloudRenderer({
  canvasRef,
  enabled = true,
  state,
  volume,
  inputVolume,
  outputVolume,
  scale,
  motion,
  ballScale,
  smokeScale,
  cloudMode = "shell",
}: UseCloudRendererOptions) {
  const [webglReady, setWebglReady] = useState(false);
  const configRef = useRef<RendererConfig>({
    state,
    volume,
    inputVolume,
    outputVolume,
    scale,
    colors: {
      main: FALLBACK_MAIN,
      warning: FALLBACK_WARNING,
    },
    motion,
    ballScale,
    smokeScale,
    cloudMode,
  });

  configRef.current.state = state;
  configRef.current.volume = volume;
  configRef.current.inputVolume = inputVolume;
  configRef.current.outputVolume = outputVolume;
  configRef.current.scale = scale;
  configRef.current.motion = motion;
  configRef.current.ballScale = ballScale;
  configRef.current.smokeScale = smokeScale;
  configRef.current.cloudMode = cloudMode;

  useEffect(() => {
    configRef.current.colors = {
      main: parseToneRamp(scale.colors.main, FALLBACK_MAIN),
      warning: parseToneRamp(scale.colors.warning, FALLBACK_WARNING),
    };
  }, [scale]);

  useEffect(() => {
    if (!enabled) {
      setWebglReady(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setWebglReady(false);
      return;
    }

    let renderer: Renderer | null = null;
    let frame = 0;
    let stopped = false;
    let contextLost = false;
    let firstFrameDrawn = false;
    let lastTime = 0;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const runtime = {
      inputDynamics: createVoiceDynamicsState(),
      outputDynamics: createVoiceDynamicsState(),
      unavailable: 0,
      articulation: 0.12,
      low: 0.15,
      mid: 0.14,
      high: 0.12,
      phase: 0,
      thinkingPhase: 0,
      speechScale: 1,
      visual: { ...scale.states[state] },
      main: cloneRgbRamp(configRef.current.colors.main),
      warning: cloneRgbRamp(configRef.current.colors.warning),
      lastState: state,
      lastScale: scale,
      transitionMs: 0,
      idle: Number(state === "idle"),
      listening: Number(state === "listening"),
      thinking: Number(state === "thinking"),
      speaking: Number(state === "speaking"),
      connecting: Number(state === "connecting"),
      error: Number(state === "error"),
    };

    const resize = () => {
      if (!renderer) return;
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * pixelRatio));
      const height = Math.max(1, Math.round(rect.height * pixelRatio));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      renderer.gl.viewport(0, 0, width, height);
    };

    const draw = (time: number) => {
      if (stopped || !renderer) return;
      frame = requestAnimationFrame(draw);
      if (document.hidden) return;
      resize();

      const config = configRef.current;
      const motionDisabled = reducedMotion || config.motion.speed <= 0;
      const deltaFrames = lastTime ? clamp((time - lastTime) / 16.667, 0.25, 3) : 1;
      lastTime = time;
      if (config.state !== runtime.lastState || config.scale !== runtime.lastScale) {
        if (config.state === "thinking" && runtime.lastState !== "thinking") {
          runtime.thinkingPhase = 0;
        }
        runtime.transitionMs =
          config.state === runtime.lastState
            ? config.scale.transitions.defaultMs
            : getOrbTransitionDuration(runtime.lastState, config.state, config.scale.transitions);
        runtime.lastState = config.state;
        runtime.lastScale = config.scale;
      }
      const transitionRate =
        motionDisabled || runtime.transitionMs <= 0
          ? 1
          : 1 - Math.exp(-(deltaFrames * 16.667) / Math.max(1, runtime.transitionMs / 3));
      approachVisualState(runtime.visual, config.scale.states[config.state], transitionRate);
      approachRgbRamp(runtime.main, config.colors.main, transitionRate);
      approachRgbRamp(runtime.warning, config.colors.warning, transitionRate);

      const inputSample = clamp(
        Math.max(config.inputVolume, config.state === "listening" ? config.volume : 0) *
          config.motion.sensitivity,
        0,
        1,
      );
      const outputSample = clamp(
        Math.max(config.outputVolume, config.state === "speaking" ? config.volume : 0) *
          config.motion.sensitivity,
        0,
        1,
      );
      stepVoiceDynamics(runtime.inputDynamics, inputSample, {
        active: config.state === "listening",
        attack: config.motion.attack,
        release: config.motion.release,
        deltaFrames,
      });
      stepVoiceDynamics(runtime.outputDynamics, outputSample, {
        active: config.state === "speaking",
        attack: config.motion.attack,
        release: config.motion.release,
        deltaFrames,
      });
      const speechScaleTarget =
        !motionDisabled && config.state === "speaking"
          ? 0.82 + Math.pow(outputSample, 0.75) * 0.42
          : 1;
      const speechScaleRate = smoothRate(
        speechScaleTarget > runtime.speechScale ? 0.38 : 0.26,
        deltaFrames,
      );
      runtime.speechScale += (speechScaleTarget - runtime.speechScale) * speechScaleRate;

      const targetUnavailable = config.state === "error" ? 1 : 0;
      const targetArticulation = 0.1 + runtime.visual.turbulence * 0.62;
      runtime.idle += (Number(config.state === "idle") - runtime.idle) * transitionRate;
      runtime.listening +=
        (Number(config.state === "listening") - runtime.listening) * transitionRate;
      runtime.thinking += (Number(config.state === "thinking") - runtime.thinking) * transitionRate;
      runtime.speaking += (Number(config.state === "speaking") - runtime.speaking) * transitionRate;
      runtime.connecting +=
        (Number(config.state === "connecting") - runtime.connecting) * transitionRate;
      runtime.error += (Number(config.state === "error") - runtime.error) * transitionRate;
      runtime.unavailable += (targetUnavailable - runtime.unavailable) * transitionRate;
      runtime.articulation +=
        (targetArticulation - runtime.articulation) * smoothRate(0.04, deltaFrames);

      const listening = runtime.inputDynamics.drive;
      const speaking = runtime.outputDynamics.drive;
      const lowTarget = 0.08 + listening * 0.76 + speaking * 0.42;
      const midTarget = 0.07 + listening * 0.48 + speaking * 0.75;
      const highTarget = 0.06 + listening * 0.28 + speaking * 0.58;
      const bandRate = smoothRate(0.075, deltaFrames);
      runtime.low += (lowTarget - runtime.low) * bandRate;
      runtime.mid += (midTarget - runtime.mid) * bandRate;
      runtime.high += (highTarget - runtime.high) * bandRate;

      if (!motionDisabled) {
        const motionSpeed = clamp(config.motion.speed, 0, 3);
        const phaseSpeed = (0.18 + runtime.visual.flowSpeed * 1.28) * motionSpeed;
        runtime.phase += (deltaFrames / 60) * phaseSpeed;
        // Keep the calm default intact, but let the upper half of the Motion
        // control accelerate thinking enough for vortex rotation to read.
        const thinkingMotionSpeed = motionSpeed <= 1 ? motionSpeed : 1 + (motionSpeed - 1) * 2;
        const thinkingPhaseSpeed = (0.28 + runtime.visual.flowSpeed * 0.82) * thinkingMotionSpeed;
        runtime.thinkingPhase += (deltaFrames / 60) * thinkingPhaseSpeed * runtime.thinking;
      }
      const { gl, uniforms } = renderer;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(renderer.program);
      gl.uniform1f(uniforms.time, runtime.phase);
      gl.uniform1f(uniforms.thinkingPhase, runtime.thinkingPhase);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.intensity, 1.24 * clamp(config.motion.intensity, 0.25, 2));
      gl.uniform3fv(uniforms.main0, runtime.main.deepest);
      gl.uniform3fv(uniforms.main1, runtime.main.deep);
      gl.uniform3fv(uniforms.main2, runtime.main.base);
      gl.uniform3fv(uniforms.main3, runtime.main.bright);
      gl.uniform3fv(uniforms.main4, runtime.main.lightest);
      gl.uniform3fv(uniforms.warning0, runtime.warning.deepest);
      gl.uniform3fv(uniforms.warning1, runtime.warning.deep);
      gl.uniform3fv(uniforms.warning2, runtime.warning.base);
      gl.uniform3fv(uniforms.warning3, runtime.warning.bright);
      gl.uniform3fv(uniforms.warning4, runtime.warning.lightest);
      gl.uniform4f(
        uniforms.visual0,
        runtime.visual.turbulence,
        runtime.visual.flowSpeed,
        runtime.visual.vortexCount,
        runtime.visual.vortexStrength,
      );
      gl.uniform4f(
        uniforms.visual1,
        runtime.visual.expansion,
        runtime.visual.centerPull,
        runtime.visual.audioResponse,
        runtime.visual.smokeDensity,
      );
      gl.uniform4f(
        uniforms.visual2,
        runtime.visual.glowIntensity,
        motionDisabled ? 0 : runtime.visual.glowPulseSpeed,
        runtime.visual.warningDistortion,
        runtime.visual.tonePosition,
      );
      const safeBallScale = clamp(config.ballScale, 0.7, 1);
      const safeSmokeScale = clamp(config.smokeScale, 0.5, 1.1);
      gl.uniform1f(
        uniforms.glowRadius,
        0.47 * safeBallScale * safeSmokeScale * runtime.speechScale,
      );
      gl.uniform1f(uniforms.ballScale, safeBallScale);
      gl.uniform1f(uniforms.shellVisibility, config.cloudMode === "shell" ? 1 : 0);
      gl.uniform1f(uniforms.gasRoughness, config.cloudMode === "gas" ? 1 : 0);
      gl.uniform1f(uniforms.inputEnergy, motionDisabled ? 0.18 : runtime.inputDynamics.fast);
      gl.uniform1f(uniforms.outputEnergy, motionDisabled ? 0.18 : runtime.outputDynamics.fast);
      gl.uniform3f(
        uniforms.audioBands,
        motionDisabled ? 0.16 : runtime.low,
        motionDisabled ? 0.14 : runtime.mid,
        motionDisabled ? 0.12 : runtime.high,
      );
      gl.uniform1f(uniforms.articulation, runtime.articulation);
      gl.uniform4f(
        uniforms.voiceDynamics,
        motionDisabled ? 0.18 : runtime.inputDynamics.drive,
        motionDisabled ? 0 : runtime.inputDynamics.transient,
        motionDisabled ? 0.18 : runtime.outputDynamics.drive,
        motionDisabled ? 0 : runtime.outputDynamics.transient,
      );
      gl.uniform3f(uniforms.stateA, runtime.idle, runtime.listening, runtime.thinking);
      gl.uniform3f(uniforms.stateB, runtime.speaking, runtime.connecting, runtime.error);
      gl.uniform1f(uniforms.unavailable, runtime.unavailable);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!firstFrameDrawn) {
        firstFrameDrawn = true;
        setWebglReady(true);
      }
    };

    const setup = () => {
      if (stopped) return;
      setWebglReady(false);
      firstFrameDrawn = false;
      renderer = createRenderer(canvas);
      if (!renderer) return;
      contextLost = false;
      resize();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
      renderer = null;
      setWebglReady(false);
    };
    const onContextRestored = () => setup();
    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };
    const onWindowResize = () => resize();

    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    mediaQuery.addEventListener("change", onMotionChange);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);
    if (!resizeObserver) {
      window.addEventListener("resize", onWindowResize, { passive: true });
    }

    setup();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onWindowResize);
      mediaQuery.removeEventListener("change", onMotionChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      if (renderer && !contextLost) destroyRenderer(renderer);
      renderer = null;
      setWebglReady(false);
    };
  }, [canvasRef, enabled]);

  return webglReady;
}
