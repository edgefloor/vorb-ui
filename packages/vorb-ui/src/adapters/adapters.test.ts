import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrbSignal } from "./types";
import { createElevenLabsAdapter } from "./elevenlabs";
import { createLiveKitAdapter } from "./livekit";
import { createVapiAdapter, type VapiClient } from "./vapi";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Vapi adapter", () => {
  it("maps lifecycle and output volume and removes every provider listener", async () => {
    const handlers = new Map<string, (...args: any[]) => void>();
    const client: VapiClient = {
      on: vi.fn((event, listener) => handlers.set(event, listener)),
      removeListener: vi.fn((event) => handlers.delete(event)),
      start: vi.fn(async () => undefined),
      stop: vi.fn(),
    };
    const adapter = createVapiAdapter(client, { assistantId: "assistant-id" });
    const signals: OrbSignal[] = [];
    const unsubscribe = adapter.subscribe((signal) => signals.push(signal));

    await adapter.start?.();
    expect(client.start).toHaveBeenCalledWith("assistant-id");
    handlers.get("call-start")?.();
    handlers.get("speech-start")?.();
    handlers.get("volume-level")?.(1);
    expect(signals.at(-1)).toMatchObject({ state: "speaking" });
    expect(signals.at(-1)?.outputVolume).toBeGreaterThan(0);
    handlers.get("speech-end")?.();
    expect(signals.at(-1)).toMatchObject({ state: "listening", outputVolume: 0 });
    unsubscribe();
    unsubscribe();
    expect(client.removeListener).toHaveBeenCalledTimes(6);
  });
});

describe("ElevenLabs adapter", () => {
  it("deduplicates starts, polls directional levels, and awaits owned cleanup", async () => {
    vi.useFakeTimers();
    const endSession = vi.fn(async () => undefined);
    let onModeChange: ((value: { mode: "speaking" | "listening" }) => void) | undefined;
    const Conversation = {
      startSession: vi.fn(async (options) => {
        onModeChange = options.onModeChange;
        return {
          endSession,
          getInputVolume: () => 0.25,
          getOutputVolume: () => 0.75,
          getInputByteFrequencyData: () => new Uint8Array(),
          getOutputByteFrequencyData: () => new Uint8Array(),
        };
      }),
    };
    const adapter = createElevenLabsAdapter(Conversation, { agentId: "agent-id" });
    const signals: OrbSignal[] = [];
    adapter.subscribe((signal) => signals.push(signal));

    await Promise.all([adapter.start(), adapter.start()]);
    expect(Conversation.startSession).toHaveBeenCalledTimes(1);
    onModeChange?.({ mode: "speaking" });
    await vi.advanceTimersByTimeAsync(40);
    expect(signals.at(-1)).toMatchObject({
      state: "speaking",
      inputVolume: 0.25,
      outputVolume: 0.75,
    });
    await adapter.stop();
    expect(endSession).toHaveBeenCalledTimes(1);
  });
});

describe("advanced LiveKit adapter", () => {
  it("resolves token options and detaches room listeners on stop", async () => {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const room = {
      connect: vi.fn(async () => undefined),
      disconnect: vi.fn(),
      on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        handlers.set(event, listener);
      }),
      off: vi.fn((event: string) => handlers.delete(event)),
    };
    const tokenSource = {
      fetch: vi.fn(async () => ({
        serverUrl: "wss://livekit.example",
        participantToken: "token",
      })),
    };
    const adapter = createLiveKitAdapter({
      room,
      tokenSource,
      tokenOptions: {
        roomName: () => "fresh-room",
        agentName: "support-agent",
      },
    });

    await adapter.start();
    expect(tokenSource.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ roomName: "fresh-room", agentName: "support-agent" }),
    );
    handlers.get("activeSpeakersChanged")?.([{}]);
    await adapter.stop();
    expect(room.off).toHaveBeenCalledTimes(3);
    expect(room.disconnect).toHaveBeenCalledTimes(1);
  });
});
