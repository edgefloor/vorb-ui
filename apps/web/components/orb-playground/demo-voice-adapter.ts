import type { OrbAdapter, OrbSignal } from "vorb-ui";

export class DemoVoiceAdapter implements OrbAdapter {
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
    const syllables =
      role === "listening"
        ? [
            [0.16, 0.11, 0.42],
            [0.43, 0.14, 0.58],
            [0.74, 0.12, 0.48],
            [1.2, 0.16, 0.62],
            [1.53, 0.12, 0.44],
            [2.02, 0.15, 0.56],
            [2.31, 0.11, 0.38],
            [2.7, 0.17, 0.6],
          ]
        : [
            [0.14, 0.1, 0.62],
            [0.37, 0.12, 0.78],
            [0.66, 0.15, 0.7],
            [1.06, 0.12, 0.86],
            [1.31, 0.1, 0.58],
            [1.66, 0.16, 0.82],
            [2.08, 0.13, 0.72],
            [2.34, 0.1, 0.52],
            [2.66, 0.15, 0.88],
            [2.91, 0.09, 0.56],
          ];
    const phrase = syllables.reduce((level, [center, width, strength]) => {
      const distance = (seconds - center) / width;
      return level + Math.exp(-distance * distance * 1.7) * strength;
    }, 0);
    const articulation =
      0.84 + Math.sin(seconds * 18.7 + 0.4) * 0.1 + Math.sin(seconds * 31.3 + 1.1) * 0.06;
    const voice = phrase < 0.025 ? 0 : phrase * articulation;
    const maximum = role === "listening" ? 0.6 : 0.92;
    return Math.min(maximum, Math.max(0, voice * envelope));
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
