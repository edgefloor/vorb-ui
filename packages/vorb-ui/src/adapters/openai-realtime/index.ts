import { createManagedAdapter, type ManagedAdapter } from "../shared";
import type { OutputVolumeCalibrationSource, OutputVolumeSample } from "../audio-level";

export interface OpenAIRealtimeClientSecret {
  value: string;
}
export interface OpenAIRealtimeAdapterConfig {
  getClientSecret(): Promise<string | OpenAIRealtimeClientSecret>;
  callsUrl?: string;
  mediaStreamConstraints?: MediaStreamConstraints;
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createPeerConnection?: () => RTCPeerConnection;
  fetch?: typeof fetch;
  createAudioElement?: () => HTMLAudioElement;
  createAudioContext?: () => AudioContext | undefined;
  outputVolumeCalibration?: OutputVolumeCalibrationSource;
  onOutputVolumeSample?: (sample: OutputVolumeSample) => void;
}
export interface OpenAIRealtimeOrbAdapter extends ManagedAdapter {}

export function createOpenAIRealtimeAdapter(
  config: OpenAIRealtimeAdapterConfig,
): OpenAIRealtimeOrbAdapter {
  return createManagedAdapter(async (emit) => {
    const secret = await config.getClientSecret();
    const key = typeof secret === "string" ? secret : secret.value;
    if (!key) throw new Error("getClientSecret returned an empty value");
    const getUserMedia =
      config.getUserMedia ?? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const stream = await getUserMedia(config.mediaStreamConstraints ?? { audio: true });
    const peer = config.createPeerConnection?.() ?? new RTCPeerConnection();
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    const channel = peer.createDataChannel("oai-events");
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as { type?: string; error?: unknown };
        if (message.type?.includes("speech_started")) emit({ state: "listening" });
        if (message.type?.includes("speech_stopped")) emit({ state: "thinking" });
        if (message.type?.includes("audio.delta")) emit({ state: "speaking" });
        if (message.type === "error") emit({ state: "error", error: message.error });
      } catch {
        /* provider payloads may be non-JSON */
      }
    };
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const response = await (config.fetch ?? fetch)(
      config.callsUrl ?? "https://api.openai.com/v1/realtime/calls",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      },
    );
    if (!response.ok) throw new Error(`OpenAI Realtime call failed (${response.status})`);
    await peer.setRemoteDescription({ type: "answer", sdp: await response.text() });
    return () => {
      channel.close();
      peer.close();
      stream.getTracks().forEach((track) => track.stop());
    };
  });
}
