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
