import {
  Orb,
  VoiceOrb,
  ORB_SCALES,
  type OrbAdapter,
  type OrbScale,
  type OrbSignal,
  type OrbStyle,
} from "vorb-ui";
import {
  createElevenLabsAdapter,
  createGeminiLiveAdapter,
  createLiveKitAdapter as createAdvancedLiveKitAdapter,
  createOpenAIRealtimeAdapter,
  createPipecatAdapter,
  createVapiAdapter,
  type ElevenLabsConversationClass,
  type OutputVolumeSample,
} from "vorb-ui/adapters";
import { createLiveKitAdapter } from "vorb-ui/adapters/livekit";

const adapter: OrbAdapter = {
  subscribe(listener) {
    listener({ state: "listening", inputVolume: 0.2 });
    return () => undefined;
  },
};
const custom: OrbScale = {
  base: "crystal",
  states: {
    thinking: {
      turbulence: 0.9,
      flowSpeed: 0.7,
      vortexCount: 2,
      vortexStrength: 0.8,
      expansion: 0.4,
      centerPull: 0.7,
      audioResponse: 0.2,
      smokeDensity: 0.9,
      glowIntensity: 0.8,
      glowPulseSpeed: 0.1,
      warningDistortion: 0,
      tonePosition: 0.45,
    },
  },
};

void ORB_SCALES;
void createElevenLabsAdapter;
void createGeminiLiveAdapter;
void createOpenAIRealtimeAdapter;
void createPipecatAdapter;
void createVapiAdapter;
void createLiveKitAdapter;
void createAdvancedLiveKitAdapter;

const upstreamSignal: OrbSignal = {
  state: "speaking",
  inputVolume: 0.1,
  outputVolume: 0.7,
};
const radialStyle: OrbStyle = {
  "--vorb-ui-radial-control-surround": "#101010",
};
const outputSample: OutputVolumeSample = {
  raw: 0.1,
  shaped: 0.3,
  normalized: 0.2,
};
void upstreamSignal;
void radialStyle;
void outputSample;

const Conversation = {} as ElevenLabsConversationClass;
createElevenLabsAdapter(Conversation, { agentId: "agent-id" });
createElevenLabsAdapter(Conversation, {
  signedUrl: "https://example.com/signed-url",
});
createElevenLabsAdapter(Conversation, {
  conversationToken: "conversation-token",
});

// @ts-expect-error ElevenLabs requires exactly one authentication source.
createElevenLabsAdapter(Conversation, {});
// @ts-expect-error Signed URL sessions are websocket-only.
createElevenLabsAdapter(Conversation, {
  signedUrl: "https://example.com/signed-url",
  connectionType: "webrtc",
});
// @ts-expect-error Browser voice sessions cannot be text-only.
createElevenLabsAdapter(Conversation, { agentId: "agent-id", textOnly: true });

createLiveKitAdapter({
  tokenEndpoint: "/api/livekit-token",
  agentName: "support-agent",
  onOutputVolumeSample: ({ normalized }) => void normalized,
});
// @ts-expect-error Sandbox sessions must identify the dispatched agent.
createLiveKitAdapter({ sandboxId: "sandbox-id" });
// @ts-expect-error Endpoint and sandbox modes are mutually exclusive.
createLiveKitAdapter({
  tokenEndpoint: "/api/livekit-token",
  sandboxId: "sandbox-id",
  agentName: "support-agent",
});

export const fixture = (
  <>
    <Orb
      adapter={adapter}
      theme="cloud"
      cloudMode="vapor"
      size="clamp(12rem, 35vw, 32rem)"
      control={{
        position: "overlay-bottom",
        appearance: "minimal",
        size: "3.25rem",
        gap: "1rem",
        offsetY: -4,
        className: "call-control",
        style: { borderRadius: "1rem" },
      }}
      scale={custom}
      data-testid="orb"
    />
    <VoiceOrb state="idle" scale="lagoon" />
  </>
);
