import { describe, expect, it, vi } from "vitest";
import type { OrbSignal } from "./types";
import { createManagedAdapter } from "./shared";

describe("createManagedAdapter", () => {
  it("publishes complete snapshots to multiple listeners with idempotent unsubscribe", () => {
    const adapter = createManagedAdapter(() => undefined);
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribe = adapter.subscribe(first);
    adapter.subscribe(second);

    expect(first).toHaveBeenLastCalledWith({
      state: "idle",
      volume: 0,
      inputVolume: 0,
      outputVolume: 0,
    });
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribe();
    unsubscribe();
  });

  it("deduplicates starts and runs asynchronous cleanup exactly once", async () => {
    let resolveStart!: (cleanup: () => Promise<void>) => void;
    const cleanup = vi.fn(async () => undefined);
    const startSession = vi.fn(
      () =>
        new Promise<() => Promise<void>>((resolve) => {
          resolveStart = resolve;
        }),
    );
    const adapter = createManagedAdapter(startSession);

    const first = adapter.start();
    const second = adapter.start();
    expect(startSession).toHaveBeenCalledTimes(1);
    resolveStart(cleanup);
    await Promise.all([first, second]);
    await Promise.all([adapter.stop(), adapter.stop()]);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("cancels and disposes a session that resolves after stop", async () => {
    let resolveStart!: (cleanup: () => void) => void;
    const cleanup = vi.fn();
    const signals: OrbSignal[] = [];
    const adapter = createManagedAdapter(
      () =>
        new Promise<() => void>((resolve) => {
          resolveStart = resolve;
        }),
    );
    adapter.subscribe((signal) => signals.push(signal));

    const starting = adapter.start();
    const stopping = adapter.stop();
    resolveStart(cleanup);
    await Promise.all([starting, stopping]);

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(signals.at(-1)?.state).toBe("idle");
    expect(signals.some((signal) => signal.state === "listening")).toBe(false);
  });

  it("emits an error and permits a later successful retry", async () => {
    const failure = new Error("first start failed");
    const startSession = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    const signals: OrbSignal[] = [];
    const adapter = createManagedAdapter(startSession);
    adapter.subscribe((signal) => signals.push(signal));

    await expect(adapter.start()).rejects.toBe(failure);
    expect(signals.at(-1)).toMatchObject({ state: "error", error: failure });
    await expect(adapter.start()).resolves.toBeUndefined();
    expect(signals.at(-1)?.state).toBe("listening");
  });
});
