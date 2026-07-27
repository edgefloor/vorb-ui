import { useEffect, useRef, useState, type RefObject } from "react";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./ember-shaders";
import type {
  VoiceOrbColors,
  VoiceOrbMotion,
  VoiceOrbState,
} from "./voice-orb.types";

type Rgb = [number, number, number];

type Uniforms = Record<
  | "time"
  | "resolution"
  | "intensity"
  | "color0"
  | "color1"
  | "color2"
  | "glowRadius"
  | "ballScale"
  | "energy"
  | "inputEnergy"
  | "outputEnergy"
  | "audioBands"
  | "articulation"
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
  state: VoiceOrbState;
  volume: number;
  inputVolume: number;
  outputVolume: number;
  colors: {
    primary: Rgb;
    secondary: Rgb;
    highlight: Rgb;
  };
  motion: VoiceOrbMotion;
  ballScale: number;
  smokeScale: number;
}

export interface UseVoiceOrbRendererOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  state: VoiceOrbState;
  volume: number;
  inputVolume: number;
  outputVolume: number;
  colors: VoiceOrbColors;
  motion: VoiceOrbMotion;
  ballScale: number;
  smokeScale: number;
}

const COLOR_CACHE = new Map<string, Rgb>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cssColorToRgb(color: string): Rgb {
  const cached = COLOR_CACHE.get(color);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [1, 0.46, 0.15];
  context.fillStyle = "#ff7626";
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const pixel = context.getImageData(0, 0, 1, 1).data;
  const rgb: Rgb = [pixel[0] / 255, pixel[1] / 255, pixel[2] / 255];
  COLOR_CACHE.set(color, rgb);
  return rgb;
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create the voice orb shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Voice orb shader failed: ${message ?? "Unknown error"}`);
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
      throw new Error(
        `Voice orb program failed: ${gl.getProgramInfoLog(program) ?? "Unknown error"}`,
      );
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
        resolution: uniform("uResolution"),
        intensity: uniform("uIntensity"),
        color0: uniform("uColor0"),
        color1: uniform("uColor1"),
        color2: uniform("uColor2"),
        glowRadius: uniform("uGlowRadius"),
        ballScale: uniform("uBallScale"),
        energy: uniform("uEnergy"),
        inputEnergy: uniform("uInputEnergy"),
        outputEnergy: uniform("uOutputEnergy"),
        audioBands: uniform("uAudioBands"),
        articulation: uniform("uArticulation"),
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

export function useVoiceOrbRenderer({
  canvasRef,
  state,
  volume,
  inputVolume,
  outputVolume,
  colors,
  motion,
  ballScale,
  smokeScale,
}: UseVoiceOrbRendererOptions) {
  const [webglReady, setWebglReady] = useState(false);
  const configRef = useRef<RendererConfig>({
    state,
    volume,
    inputVolume,
    outputVolume,
    colors: {
      primary: [1, 0.46, 0.15],
      secondary: [0.91, 0.25, 0.17],
      highlight: [1, 0.95, 0.82],
    },
    motion,
    ballScale,
    smokeScale,
  });

  configRef.current.state = state;
  configRef.current.volume = volume;
  configRef.current.inputVolume = inputVolume;
  configRef.current.outputVolume = outputVolume;
  configRef.current.motion = motion;
  configRef.current.ballScale = ballScale;
  configRef.current.smokeScale = smokeScale;

  useEffect(() => {
    configRef.current.colors = {
      primary: cssColorToRgb(colors.primary),
      secondary: cssColorToRgb(colors.secondary),
      highlight: cssColorToRgb(colors.highlight),
    };
  }, [colors.primary, colors.secondary, colors.highlight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: Renderer | null = null;
    let frame = 0;
    let stopped = false;
    let contextLost = false;
    let lastTime = 0;
    let reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const runtime = {
      energy: 0.08,
      inputEnergy: 0,
      outputEnergy: 0,
      unavailable: 0,
      articulation: 0.12,
      low: 0.15,
      mid: 0.14,
      high: 0.12,
      phase: 0,
      idle: 1,
      listening: 0,
      thinking: 0,
      speaking: 0,
      connecting: 0,
      error: 0,
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
      const deltaFrames = lastTime
        ? clamp((time - lastTime) / 16.667, 0.25, 3)
        : 1;
      lastTime = time;

      const inputSample = clamp(
        config.inputVolume * config.motion.sensitivity,
        0,
        1,
      );
      const outputSample = clamp(
        config.outputVolume * config.motion.sensitivity,
        0,
        1,
      );
      const inputTarget = config.state === "listening" ? inputSample : 0;
      const outputTarget = config.state === "speaking" ? outputSample : 0;
      const inputRate =
        inputTarget > runtime.inputEnergy
          ? config.motion.attack
          : config.motion.release;
      const outputRate =
        outputTarget > runtime.outputEnergy
          ? config.motion.attack
          : config.motion.release;
      runtime.inputEnergy +=
        (inputTarget - runtime.inputEnergy) *
        smoothRate(inputRate * 0.2, deltaFrames);
      runtime.outputEnergy +=
        (outputTarget - runtime.outputEnergy) *
        smoothRate(outputRate * 0.2, deltaFrames);

      const reactiveVolume =
        config.state === "listening"
          ? runtime.inputEnergy
          : config.state === "speaking"
            ? runtime.outputEnergy
            : clamp(config.volume * config.motion.sensitivity, 0, 1);
      const baseline =
        config.state === "idle"
          ? 0.08
          : config.state === "error"
            ? 0.04
            : config.state === "thinking" || config.state === "connecting"
              ? 0.14
              : 0.1;
      const targetEnergy =
        config.state === "listening" || config.state === "speaking"
          ? Math.max(baseline, reactiveVolume)
          : baseline;
      const energyRate =
        targetEnergy > runtime.energy
          ? config.motion.attack
          : config.motion.release;
      runtime.energy +=
        (targetEnergy - runtime.energy) *
        smoothRate(energyRate * 0.18, deltaFrames);

      const targetUnavailable = config.state === "error" ? 1 : 0;
      const targetArticulation =
        config.state === "listening"
          ? 0.46
          : config.state === "thinking" || config.state === "connecting"
            ? 0.76
            : config.state === "speaking"
              ? 0.58
              : config.state === "error"
                ? 0.14
                : 0.12;
      const transitionRate = motionDisabled ? 1 : smoothRate(0.04, deltaFrames);
      runtime.idle +=
        (Number(config.state === "idle") - runtime.idle) * transitionRate;
      runtime.listening +=
        (Number(config.state === "listening") - runtime.listening) *
        transitionRate;
      runtime.thinking +=
        (Number(config.state === "thinking") - runtime.thinking) *
        transitionRate;
      runtime.speaking +=
        (Number(config.state === "speaking") - runtime.speaking) *
        transitionRate;
      runtime.connecting +=
        (Number(config.state === "connecting") - runtime.connecting) *
        transitionRate;
      runtime.error +=
        (Number(config.state === "error") - runtime.error) * transitionRate;
      runtime.unavailable +=
        (targetUnavailable - runtime.unavailable) * transitionRate;
      runtime.articulation +=
        (targetArticulation - runtime.articulation) *
        smoothRate(0.04, deltaFrames);

      const listening = runtime.inputEnergy;
      const speaking = runtime.outputEnergy;
      const lowTarget = 0.08 + listening * 0.76 + speaking * 0.42;
      const midTarget = 0.07 + listening * 0.48 + speaking * 0.75;
      const highTarget = 0.06 + listening * 0.28 + speaking * 0.58;
      const bandRate = smoothRate(0.075, deltaFrames);
      runtime.low += (lowTarget - runtime.low) * bandRate;
      runtime.mid += (midTarget - runtime.mid) * bandRate;
      runtime.high += (highTarget - runtime.high) * bandRate;

      const visualEnergy = motionDisabled
        ? 0.12
        : runtime.energy * (1 - runtime.unavailable * 0.65);
      if (!motionDisabled) {
        const statePace =
          runtime.idle * 0.58 +
          runtime.connecting * 0.78 +
          runtime.listening * (0.84 + runtime.inputEnergy * 0.58) +
          runtime.thinking * 1.16 +
          runtime.speaking * (1.04 + runtime.outputEnergy * 0.56) +
          runtime.error * 0.36;
        const phaseSpeed =
          (0.22 + visualEnergy * 0.18) *
          statePace *
          clamp(config.motion.speed, 0, 3);
        runtime.phase += (deltaFrames / 60) * phaseSpeed;
      }
      const { gl, uniforms } = renderer;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(renderer.program);
      gl.uniform1f(uniforms.time, runtime.phase);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(
        uniforms.intensity,
        1.24 * clamp(config.motion.intensity, 0.25, 2),
      );
      gl.uniform3fv(uniforms.color0, config.colors.primary);
      gl.uniform3fv(uniforms.color1, config.colors.secondary);
      gl.uniform3fv(uniforms.color2, config.colors.highlight);
      const safeBallScale = clamp(config.ballScale, 0.7, 1);
      const safeSmokeScale = clamp(config.smokeScale, 0.5, 1.1);
      gl.uniform1f(uniforms.glowRadius, 0.47 * safeBallScale * safeSmokeScale);
      gl.uniform1f(uniforms.ballScale, safeBallScale);
      gl.uniform1f(uniforms.energy, visualEnergy);
      gl.uniform1f(
        uniforms.inputEnergy,
        motionDisabled ? 0.18 : runtime.inputEnergy,
      );
      gl.uniform1f(
        uniforms.outputEnergy,
        motionDisabled ? 0.18 : runtime.outputEnergy,
      );
      gl.uniform3f(
        uniforms.audioBands,
        motionDisabled ? 0.16 : runtime.low,
        motionDisabled ? 0.14 : runtime.mid,
        motionDisabled ? 0.12 : runtime.high,
      );
      gl.uniform1f(uniforms.articulation, runtime.articulation);
      gl.uniform3f(
        uniforms.stateA,
        runtime.idle,
        runtime.listening,
        runtime.thinking,
      );
      gl.uniform3f(
        uniforms.stateB,
        runtime.speaking,
        runtime.connecting,
        runtime.error,
      );
      gl.uniform1f(uniforms.unavailable, runtime.unavailable);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const setup = () => {
      if (stopped) return;
      renderer = createRenderer(canvas);
      setWebglReady(Boolean(renderer));
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
    };
  }, [canvasRef]);

  return webglReady;
}
