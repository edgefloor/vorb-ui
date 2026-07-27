import type { OrbAdapter, OrbSignalListener } from "../types";
import { calibrateOutputVolume } from "../audio-level";

export interface VapiClient {
  on(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
  start(...args: any[]): Promise<unknown>;
  stop(): void;
}

export interface VapiAdapterOptions {
  assistantId?: string;
}

export function createVapiAdapter(client: VapiClient, options?: VapiAdapterOptions): OrbAdapter {
  return {
    start: () => client.start(options?.assistantId).then(() => undefined),
    stop: () => client.stop(),
    subscribe(listener: OrbSignalListener) {
      let output = 0;
      const bindings: Array<[string, (...args: any[]) => void]> = [
        ["call-start", () => listener({ state: "listening", outputVolume: 0 })],
        ["call-end", () => listener({ state: "idle", outputVolume: 0 })],
        ["speech-start", () => listener({ state: "speaking", outputVolume: output })],
        ["speech-end", () => listener({ state: "listening", outputVolume: 0 })],
        [
          "volume-level",
          (raw: number) => {
            output = calibrateOutputVolume(raw, output, {
              noiseFloor: 0.12,
              attack: 0.8,
              release: 0.5,
            }).normalized;
            listener({ state: "speaking", volume: output, outputVolume: output });
          },
        ],
        ["error", (error: unknown) => listener({ state: "error", error })],
      ];
      bindings.forEach(([event, handler]) => client.on(event, handler));
      listener({ state: "idle", volume: 0 });
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        bindings.forEach(([event, handler]) => client.removeListener(event, handler));
      };
    },
  };
}
