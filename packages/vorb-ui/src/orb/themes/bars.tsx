import type { CSSProperties } from "react";

const WEIGHTS = [0.52, 0.74, 0.91, 1, 0.86, 0.68, 0.48];

export function BarsArtwork() {
  return (
    <div className="voice-orb__shards">
      <div className="voice-orb__spectrum">
        {WEIGHTS.map((weight, index) => (
          <span
            className="voice-orb__spectrum-bar"
            key={index}
            style={
              {
                "--shard-index": index,
                "--shard-weight": weight,
              } as CSSProperties
            }
          >
            <span className="voice-orb__spectrum-fill" />
          </span>
        ))}
      </div>
    </div>
  );
}
