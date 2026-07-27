import type { ComponentType } from "react";
import type { OrbTheme } from "../types";
import { BarsArtwork } from "./bars";
import { CircleArtwork } from "./circle";
import { DebugArtwork } from "./debug";
import { RadialArtwork } from "./radial";
import type { ThemeArtworkProps } from "./types";

interface ArtworkProps extends ThemeArtworkProps {
  theme: Exclude<OrbTheme, "cloud">;
}

const ARTWORK: Record<ArtworkProps["theme"], ComponentType<ThemeArtworkProps>> = {
  bars: BarsArtwork,
  circle: CircleArtwork,
  debug: DebugArtwork,
  radial: RadialArtwork,
};

export function OrbArtwork({ theme, ...props }: ArtworkProps) {
  const Artwork = ARTWORK[theme];
  return <Artwork {...props} />;
}
