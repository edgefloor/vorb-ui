import type { CSSProperties } from "react";
import type { ThemeArtworkProps } from "./types";

export function DebugArtwork({ state, inputVolume, outputVolume }: ThemeArtworkProps) {
  const activeVolume =
    state === "listening" ? inputVolume : state === "speaking" ? outputVolume : 0;

  return (
    <div className="voice-orb__instrument">
      <div className="voice-orb__instrument-header">
        <span className="voice-orb__sigil" />
        <span>ORB SIGNAL</span>
        <span className="voice-orb__instrument-state">{state}</span>
      </div>
      <dl>
        <div>
          <dt>input</dt>
          <dd>{inputVolume.toFixed(2)}</dd>
        </div>
        <div className="voice-orb__meter" style={{ "--meter-level": inputVolume } as CSSProperties}>
          <span />
        </div>
        <div>
          <dt>output</dt>
          <dd>{outputVolume.toFixed(2)}</dd>
        </div>
        <div
          className="voice-orb__meter"
          style={{ "--meter-level": outputVolume } as CSSProperties}
        >
          <span />
        </div>
      </dl>
      <div className="voice-orb__state-rail" aria-hidden="true">
        {(["idle", "connecting", "listening", "thinking", "speaking", "error"] as const).map(
          (item) => (
            <span key={item} data-active={item === state || undefined} />
          ),
        )}
      </div>
      <div
        className="voice-orb__instrument-pulse"
        style={{ "--meter-level": activeVolume } as CSSProperties}
      />
    </div>
  );
}
