import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Orb, VoiceOrb } from "./voice-orb";
import type { VoiceOrbAdapter, VoiceOrbSignalListener, VoiceOrbState } from "./voice-orb.types";

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
  it("keeps the upstream debug default on Orb and radial default on VoiceOrb", () => {
    const canonical = render(<Orb state="idle" />);
    expect(canonical.container.firstElementChild?.getAttribute("data-theme")).toBe("debug");
    canonical.unmount();
    const legacy = render(<VoiceOrb state="idle" />);
    expect(legacy.container.firstElementChild?.getAttribute("data-theme")).toBe("radial");
  });

  it.each(["debug", "circle", "bars", "cloud", "radial"] as const)(
    "renders the %s magical theme",
    (theme) => {
      const view = render(<Orb state="thinking" theme={theme} />);
      expect(view.container.querySelector(`[data-theme="${theme}"]`)).toBeTruthy();
    },
  );

  it("maps the crystal canvas to cloud and keeps radial canvas-free", () => {
    const cloud = render(<Orb state="thinking" theme="cloud" />);
    expect(cloud.container.querySelector("[data-cloud-surface]")).toBeTruthy();
    expect(cloud.container.querySelector(".voice-orb__radial")).toBeNull();
    cloud.unmount();

    const radial = render(<Orb state="thinking" theme="radial" />);
    expect(radial.container.querySelector("canvas")).toBeNull();
    expect(radial.container.querySelector(".voice-orb__radial")).toBeTruthy();
  });

  it("exposes shell and gas cloud modes without changing the canvas contract", () => {
    const view = render(<Orb state="thinking" theme="cloud" />);
    const root = view.container.firstElementChild;
    expect(root?.getAttribute("data-cloud-mode")).toBe("shell");
    expect(view.container.querySelector("[data-cloud-surface]")).toBeTruthy();

    view.rerender(<Orb state="thinking" theme="cloud" cloudMode="gas" />);
    expect(root?.getAttribute("data-cloud-mode")).toBe("gas");
    expect(view.container.querySelector("[data-cloud-surface]")).toBeTruthy();

    view.rerender(<Orb state="thinking" theme="cloud" cloudMode="vapor" />);
    expect(root?.getAttribute("data-cloud-mode")).toBe("vapor");
    expect(view.container.querySelector("[data-cloud-surface]")).toBeTruthy();
  });

  it("keeps every theme mounted across the complete state matrix", () => {
    const themes = {
      cloud: "[data-cloud-surface]",
      radial: ".voice-orb__radial",
      circle: ".voice-orb__circle",
      bars: ".voice-orb__shards",
      debug: ".voice-orb__instrument",
    } as const;
    const states: VoiceOrbState[] = [
      "idle",
      "connecting",
      "listening",
      "thinking",
      "speaking",
      "error",
    ];

    for (const [theme, marker] of Object.entries(themes)) {
      const view = render(
        <Orb state="idle" theme={theme as keyof typeof themes} onStart={() => undefined} />,
      );
      for (const state of states) {
        view.rerender(
          <Orb
            state={state}
            theme={theme as keyof typeof themes}
            onStart={() => undefined}
            onStop={() => undefined}
          />,
        );
        expect(view.container.querySelector(marker)).toBeTruthy();
        expect(view.container.firstElementChild?.getAttribute("data-state")).toBe(state);
        expect(view.getByRole("button")).toBeTruthy();
      }
      view.unmount();
    }
  });

  it("uses the same dedicated control for every interactive theme", () => {
    for (const theme of ["cloud", "circle", "bars", "radial", "debug"] as const) {
      const view = render(<Orb state="idle" theme={theme} onStart={() => undefined} />);
      const control = view.getByRole("button", {
        name: "Start voice session",
      });
      expect(control.classList.contains("voice-orb__control")).toBe(true);
      expect(control.querySelector(".voice-orb__visual")).toBeNull();
      view.unmount();
    }
  });

  it("keeps the detailed constellation and spectrum structures intact", () => {
    const circle = render(<Orb state="thinking" theme="circle" />);
    expect(circle.container.querySelectorAll(".voice-orb__circle-swarm i")).toHaveLength(84);
    expect(circle.container.querySelector(".voice-orb__circle-void")).toBeTruthy();
    circle.unmount();

    const bars = render(<Orb state="speaking" theme="bars" />);
    expect(bars.container.querySelectorAll(".voice-orb__spectrum-bar")).toHaveLength(7);
  });

  it("keeps radial's phone control separate from its artwork", () => {
    const view = render(<Orb state="idle" theme="radial" onStart={() => undefined} />);
    const control = view.getByRole("button", {
      name: "Start voice session",
    });
    expect(control.classList.contains("voice-orb__control")).toBe(true);
    expect(control.querySelector(".voice-orb__visual")).toBeNull();
  });

  it("customizes responsive artwork sizing and the control layout", () => {
    const view = render(
      <Orb
        state="idle"
        theme="cloud"
        onStart={() => undefined}
        size="clamp(12rem, 40vw, 36rem)"
        control={{
          position: "overlay-center",
          appearance: "minimal",
          size: "clamp(2.5rem, 10vw, 5rem)",
          gap: 18,
          offsetX: "1rem",
          offsetY: -6,
          className: "custom-control",
          style: { borderRadius: "1rem" },
        }}
      />,
    );
    const root = view.container.firstElementChild as HTMLElement;
    const slot = view.container.querySelector(".voice-orb__control-slot") as HTMLElement;
    const control = view.getByRole("button");

    expect(root.style.getPropertyValue("--vorb-ui-size")).toBe("clamp(12rem, 40vw, 36rem)");
    expect(root.style.getPropertyValue("--vorb-ui-control-size")).toBe("clamp(2.5rem, 10vw, 5rem)");
    expect(root.style.getPropertyValue("--vorb-ui-control-gap")).toBe("18px");
    expect(root.style.getPropertyValue("--vorb-ui-control-offset-x")).toBe("1rem");
    expect(root.style.getPropertyValue("--vorb-ui-control-offset-y")).toBe("-6px");
    expect(root.getAttribute("data-control-position")).toBe("overlay-center");
    expect(slot.getAttribute("data-position")).toBe("overlay-center");
    expect(control.getAttribute("data-appearance")).toBe("minimal");
    expect(control.classList.contains("custom-control")).toBe(true);
    expect(control.style.borderRadius).toBe("1rem");
  });

  it("keeps canonical Orb status-free unless requested", () => {
    const view = render(<Orb state="idle" theme="circle" />);
    expect(view.queryByText("Ready")).toBeNull();
    view.rerender(<Orb state="idle" theme="circle" showStatus />);
    expect(view.getByText("Ready")).toBeTruthy();
  });

  it("projects fully customized state settings into renderer-neutral tokens", () => {
    const view = render(
      <Orb
        state="thinking"
        theme="cloud"
        scale={{
          base: "crystal",
          states: {
            thinking: {
              turbulence: 0.91,
              flowSpeed: 0.82,
              vortexCount: 2,
              vortexStrength: 0.73,
              expansion: 0.64,
              centerPull: 0.55,
              audioResponse: 0.46,
              smokeDensity: 0.87,
              glowIntensity: 0.78,
              glowPulseSpeed: 0.19,
              warningDistortion: 0.11,
              tonePosition: 0.32,
            },
          },
        }}
      />,
    );
    const root = view.container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--orb-state-turbulence")).toBe("0.91");
    expect(root.style.getPropertyValue("--orb-state-vortex-count")).toBe("2");
    expect(root.style.getPropertyValue("--orb-state-smoke-density")).toBe("0.87");
    expect(root.style.getPropertyValue("--orb-state-tone-position")).toBe("0.32");
  });
  it("renders every passive theme without an inert button", () => {
    for (const theme of ["cloud", "radial", "circle", "bars", "debug"] as const) {
      const view = render(<VoiceOrb state="idle" theme={theme} />);
      expect(view.queryByRole("button")).toBeNull();
      expect(view.getByText("Ready")).toBeTruthy();
      view.unmount();
    }
  });

  it("renders an accessible control when a lifecycle exists", () => {
    const view = render(<VoiceOrb state="idle" theme="cloud" onStart={() => undefined} />);
    expect(view.getByRole("button", { name: "Start voice session" })).toBeTruthy();
  });

  it("keeps the session control outside the ball artwork", () => {
    const view = render(<VoiceOrb state="idle" onStart={() => undefined} />);
    const visual = view.container.querySelector(".voice-orb__visual");
    const button = view.getByRole("button");
    expect(visual?.contains(button)).toBe(false);
  });

  it("clamps the crystal ball scale to its supported range", () => {
    const view = render(<VoiceOrb state="idle" ballScale={2} data-testid="orb" />);
    expect(view.getByTestId("orb").style.getPropertyValue("--voice-orb-ball-scale")).toBe("1");
  });

  it("uses the crystal scale by default", () => {
    const view = render(<VoiceOrb state="idle" data-testid="orb" />);
    const root = view.getByTestId("orb");
    expect(root.getAttribute("data-scale")).toBe("crystal");
    expect(root.style.getPropertyValue("--voice-orb-tone-base")).toBe("#5b7cda");
  });

  it("selects named scales and deeply extends them", () => {
    const view = render(<VoiceOrb state="idle" scale="ember" data-testid="orb" />);
    const root = view.getByTestId("orb");
    expect(root.getAttribute("data-scale")).toBe("ember");
    expect(root.style.getPropertyValue("--voice-orb-tone-base")).toBe("#ff7626");

    view.rerender(
      <VoiceOrb
        state="thinking"
        scale={{
          base: "lagoon",
          colors: { main: { bright: "rebeccapurple" } },
          states: { thinking: { turbulence: 0.42 } },
        }}
        data-testid="orb"
      />,
    );
    expect(root.getAttribute("data-scale")).toBe("lagoon");
    expect(root.style.getPropertyValue("--voice-orb-tone-bright")).toBe("rebeccapurple");
    expect(root.style.getPropertyValue("--voice-orb-tone-deep")).toBe("#0f766e");
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
    const view = render(<VoiceOrb adapter={adapter} onStart={onStart} onStop={onStop} />);

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
    const view = render(<VoiceOrb state="thinking" status="Looking up your order…" />);
    expect(view.getByText("Looking up your order…")).toBeTruthy();
    expect(view.container.firstElementChild?.getAttribute("data-state")).toBe("thinking");
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
    const disabledView = render(<VoiceOrb state="idle" onStart={disabledStart} disabled />);
    fireEvent.click(disabledView.getByRole("button"));
    expect(disabledStart).not.toHaveBeenCalled();
    disabledView.unmount();

    const connectingStart = vi.fn();
    const connectingView = render(<VoiceOrb state="connecting" onStart={connectingStart} />);
    expect(connectingView.container.querySelector(".voice-orb__loading-icon")).toBeTruthy();
    expect(connectingView.container.querySelector(".voice-orb__loading-icon circle")).toBeTruthy();
    fireEvent.click(connectingView.getByRole("button"));
    expect(connectingStart).not.toHaveBeenCalled();
  });

  it("keeps the CSS fallback and status usable without WebGL", () => {
    const view = render(<VoiceOrb state="idle" theme="cloud" onStart={() => undefined} />);
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
    const view = render(<VoiceOrb state="listening" audioStream={stream} interactive={false} />);
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
      expect(view.getByRole("button", { name: "Stop voice session" })).toBeTruthy(),
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
