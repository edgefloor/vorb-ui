import type { OrbAdapter, OrbSignal, OrbSignalListener, OrbState } from "./types";

export interface ManagedAdapter extends OrbAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
}

type AdapterCleanup = () => void | Promise<void>;

/**
 * Concentrates the lifecycle invariants shared by provider adapters:
 * snapshot subscriptions, duplicate-start protection, serialized stop,
 * cancellation of late starts, retry after failure, and cleanup exactly once.
 */
export function createManagedAdapter(
  startSession: (
    emit: (signal: OrbSignal) => void,
  ) => void | AdapterCleanup | Promise<void | AdapterCleanup>,
): ManagedAdapter {
  const listeners = new Set<OrbSignalListener>();
  let signal: OrbSignal = {
    state: "idle",
    volume: 0,
    inputVolume: 0,
    outputVolume: 0,
  };
  let cleanup: AdapterCleanup | undefined;
  let startPromise: Promise<void> | undefined;
  let stopPromise: Promise<void> | undefined;
  let generation = 0;

  const emit = (next: OrbSignal) => {
    signal = { ...signal, ...next };
    listeners.forEach((listener) => listener(signal));
  };
  const setState = (state: OrbState, error?: unknown) =>
    emit({ state, volume: 0, inputVolume: 0, outputVolume: 0, error });

  const adapter: ManagedAdapter = {
    subscribe(listener) {
      listeners.add(listener);
      listener(signal);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
      };
    },

    async start() {
      if (cleanup) return;
      if (startPromise) return startPromise;
      if (stopPromise) {
        await stopPromise;
        return adapter.start();
      }

      const activeGeneration = ++generation;
      setState("connecting");
      const operation = Promise.resolve(startSession(emit))
        .then(async (dispose) => {
          if (activeGeneration !== generation) {
            await dispose?.();
            return;
          }
          cleanup = dispose || undefined;
          if (signal.state === "connecting") setState("listening");
        })
        .catch((error) => {
          if (activeGeneration !== generation) return;
          setState("error", error);
          throw error;
        })
        .finally(() => {
          if (startPromise === operation) startPromise = undefined;
        });
      startPromise = operation;
      return operation;
    },

    async stop() {
      if (stopPromise) return stopPromise;
      generation += 1;
      const operation = (async () => {
        await startPromise?.catch(() => undefined);
        const dispose = cleanup;
        cleanup = undefined;
        await dispose?.();
        setState("idle");
      })().finally(() => {
        if (stopPromise === operation) stopPromise = undefined;
      });
      stopPromise = operation;
      return operation;
    },
  };

  return adapter;
}
