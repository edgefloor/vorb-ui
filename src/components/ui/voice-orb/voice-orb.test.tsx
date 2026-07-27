import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceOrb } from "./voice-orb";
import type {
  VoiceOrbAdapter,
  VoiceOrbSignalListener,
  VoiceOrbState,
} from "./voice-orb.types";

vi.mock("./use-voice-orb-renderer", () => ({
  useVoiceOrbRenderer: () => false,
}));

vi.mock("./use-audio-meter", () => ({
  useAudioMeter: () => 0,
}));

afterEach(() => {
  cleanup();
});

function createAdapter(initialState: VoiceOrbState = "idle") {
  let listener: VoiceOrbSignalListener | undefined;
  const unsubscribe = vi.fn();
  const adapter: VoiceOrbAdapter = {
    subscribe: vi.fn((nextListener) => {
      listener = nextListener;
      nextListener({ state: initialState });
      return unsubscribe;
    }),
    start: vi.fn(),
    stop: vi.fn(),
  };
  return {
    adapter,
    unsubscribe,
    emit(state: VoiceOrbState) {
      listener?.({ state });
    },
  };
}

describe("VoiceOrb", () => {
  it("renders passive artwork without an inert button", () => {
    const view = render(<VoiceOrb state="idle" />);
    expect(view.queryByRole("button")).toBeNull();
    expect(view.getByText("Ready")).toBeTruthy();
  });

  it("renders an accessible control when a lifecycle exists", () => {
    const view = render(<VoiceOrb state="idle" onStart={() => undefined} />);
    expect(
      view.getByRole("button", { name: "Start voice session" }),
    ).toBeTruthy();
  });

  it("keeps the session control outside the ball artwork", () => {
    const view = render(<VoiceOrb state="idle" onStart={() => undefined} />);
    const visual = view.container.querySelector(".voice-orb__visual");
    const button = view.getByRole("button");
    expect(visual?.contains(button)).toBe(false);
  });

  it("clamps the crystal ball scale to its supported range", () => {
    const view = render(
      <VoiceOrb state="idle" ballScale={2} data-testid="orb" />,
    );
    expect(
      view.getByTestId("orb").style.getPropertyValue("--voice-orb-ball-scale"),
    ).toBe("1");
  });

  it("honors interactive false even when an adapter can start", () => {
    const { adapter } = createAdapter();
    const view = render(<VoiceOrb adapter={adapter} interactive={false} />);
    expect(view.queryByRole("button")).toBeNull();
  });

  it("lets callbacks override adapter lifecycle methods", async () => {
    const { adapter, emit } = createAdapter();
    const onStart = vi.fn();
    const onStop = vi.fn();
    const view = render(
      <VoiceOrb adapter={adapter} onStart={onStart} onStop={onStop} />,
    );

    fireEvent.click(view.getByRole("button", { name: "Start voice session" }));
    await waitFor(() => expect(onStart).toHaveBeenCalledOnce());
    expect(adapter.start).not.toHaveBeenCalled();

    act(() => emit("listening"));
    fireEvent.click(view.getByRole("button", { name: "Stop voice session" }));
    await waitFor(() => expect(onStop).toHaveBeenCalledOnce());
    expect(adapter.stop).not.toHaveBeenCalled();
  });

  it("subscribes and unsubscribes when adapter identity changes", () => {
    const first = createAdapter();
    const second = createAdapter();
    const view = render(<VoiceOrb adapter={first.adapter} />);
    expect(first.adapter.subscribe).toHaveBeenCalledOnce();

    view.rerender(<VoiceOrb adapter={second.adapter} />);
    expect(first.unsubscribe).toHaveBeenCalledOnce();
    expect(second.adapter.subscribe).toHaveBeenCalledOnce();

    view.unmount();
    expect(second.unsubscribe).toHaveBeenCalledOnce();
  });

  it.each([
    ["idle", "Ready"],
    ["connecting", "Connecting"],
    ["listening", "Listening"],
    ["thinking", "Thinking"],
    ["speaking", "Speaking"],
    ["error", "Voice session unavailable"],
  ] satisfies Array<[VoiceOrbState, string]>)(
    "renders %s with adjacent status copy",
    (state, label) => {
      const view = render(<VoiceOrb state={state} />);
      expect(view.getByText(label)).toBeTruthy();
    },
  );

  it("keeps core visual state while allowing precise support status copy", () => {
    const view = render(
      <VoiceOrb state="thinking" status="Looking up your order…" />,
    );
    expect(view.getByText("Looking up your order…")).toBeTruthy();
    expect(view.container.firstElementChild?.getAttribute("data-state")).toBe(
      "thinking",
    );
  });

  it("forwards root attributes and custom styles", () => {
    const view = render(
      <VoiceOrb
        state="idle"
        id="assistant-orb"
        data-testid="orb"
        title="Assistant"
        style={{ border: "1px solid red" }}
      />,
    );
    const root = view.getByTestId("orb");
    expect(root.id).toBe("assistant-orb");
    expect(root.title).toBe("Assistant");
    expect(root.style.border).toBe("1px solid red");
    expect(root.getAttribute("data-state")).toBe("idle");
  });

  it("does not fire disabled or connecting controls", () => {
    const disabledStart = vi.fn();
    const disabledView = render(
      <VoiceOrb state="idle" onStart={disabledStart} disabled />,
    );
    fireEvent.click(disabledView.getByRole("button"));
    expect(disabledStart).not.toHaveBeenCalled();
    disabledView.unmount();

    const connectingStart = vi.fn();
    const connectingView = render(
      <VoiceOrb state="connecting" onStart={connectingStart} />,
    );
    expect(
      connectingView.container.querySelector(".voice-orb__loading-icon"),
    ).toBeTruthy();
    expect(
      connectingView.container.querySelector(".voice-orb__loading-icon circle"),
    ).toBeTruthy();
    fireEvent.click(connectingView.getByRole("button"));
    expect(connectingStart).not.toHaveBeenCalled();
  });

  it("keeps the CSS fallback and status usable without WebGL", () => {
    const view = render(<VoiceOrb state="idle" onStart={() => undefined} />);
    const canvas = view.container.querySelector("canvas");
    expect(canvas?.classList.contains("voice-orb__canvas--ready")).toBe(false);
    expect(view.getByText("Ready")).toBeTruthy();
    expect(view.getByRole("button")).toBeTruthy();
  });

  it("never stops tracks from an external stream", () => {
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream;
    const view = render(
      <VoiceOrb state="listening" audioStream={stream} interactive={false} />,
    );
    view.unmount();
    expect(stop).not.toHaveBeenCalled();
  });

  it("stops an internally created microphone stream exactly once", async () => {
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });

    const view = render(<VoiceOrb requestMicrophone />);
    fireEvent.click(view.getByRole("button", { name: "Start voice session" }));
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Stop voice session" }),
      ).toBeTruthy(),
    );
    fireEvent.click(view.getByRole("button", { name: "Stop voice session" }));
    await waitFor(() => expect(stop).toHaveBeenCalledOnce());
    view.unmount();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("stops a late microphone result after unmount", async () => {
    let resolveStream: ((stream: MediaStream) => void) | undefined;
    const streamPromise = new Promise<MediaStream>((resolve) => {
      resolveStream = resolve;
    });
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }],
    } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => streamPromise) },
    });

    const view = render(<VoiceOrb requestMicrophone />);
    fireEvent.click(view.getByRole("button", { name: "Start voice session" }));
    view.unmount();
    await act(async () => {
      resolveStream?.(stream);
      await streamPromise;
    });
    expect(stop).toHaveBeenCalledOnce();
  });

  it("stops an active session with Escape from inside the component", async () => {
    const onStop = vi.fn();
    const view = render(<VoiceOrb state="listening" onStop={onStop} />);
    fireEvent.keyDown(view.container.firstElementChild!, { key: "Escape" });
    await waitFor(() => expect(onStop).toHaveBeenCalledOnce());
  });
});
