import type { CSSProperties } from "react";

const stableCoordinate = (value: number) => Number(value.toFixed(6));

const PARTICLES = Array.from({ length: 84 }, (_, index) => {
  const progress = (index + 0.5) / 84;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const longitude = index * goldenAngle;
  const sphereY = 1 - 2 * progress;
  const sphereRadius = Math.sqrt(1 - sphereY * sphereY);
  const sphereX = Math.cos(longitude) * sphereRadius;
  const sphereZ = Math.sin(longitude) * sphereRadius;

  const torusMinor = 0.24;
  const torusV = index * 1.61803398875;
  const torusRadius = 0.58 + torusMinor * Math.cos(torusV);
  const torusX = Math.cos(longitude) * torusRadius;
  const torusY = Math.sin(longitude) * torusRadius * 0.66 + Math.sin(torusV) * torusMinor * 0.34;

  const spiralRadius = 0.12 + progress * 0.76;
  const spiralAngle = longitude * 1.18;
  const spiralX = Math.cos(spiralAngle) * spiralRadius;
  const spiralY = Math.sin(spiralAngle) * spiralRadius * 0.72;

  const helixX = Math.sin(progress * Math.PI * 5.5) * (0.18 + progress * 0.2);
  const helixY = (progress - 0.5) * 1.45;
  const fractureDirection = sphereX < 0 ? -1 : 1;
  const fractureJitter = Math.sin(index * 12.9898) * 0.08;

  const point = (value: number) => stableCoordinate(50 + value * 42);
  return {
    index,
    depth: stableCoordinate((sphereZ + 1) / 2),
    driftX: stableCoordinate(Math.cos(longitude)),
    driftY: stableCoordinate(Math.sin(longitude)),
    sphereX: point(sphereX * 0.82),
    sphereY: point(sphereY * 0.82),
    torusX: point(torusX),
    torusY: point(torusY),
    spiralX: point(spiralX),
    spiralY: point(spiralY),
    helixX: point(helixX),
    helixY: point(helixY),
    bloomX: point(sphereX),
    bloomY: point(sphereY),
    fractureX: point(sphereX * 0.76 + fractureDirection * 0.18 + fractureJitter),
    fractureY: point(sphereY * 0.72 + fractureJitter),
  };
});

export function CircleArtwork() {
  return (
    <div className="voice-orb__circle">
      <span className="voice-orb__circle-aura" />
      <span className="voice-orb__circle-void" />
      <span className="voice-orb__circle-swarm">
        {PARTICLES.map((particle) => (
          <i
            key={particle.index}
            style={
              {
                "--particle-index": particle.index,
                "--particle-depth": particle.depth,
                "--particle-drift-x": particle.driftX,
                "--particle-drift-y": particle.driftY,
                "--particle-sphere-x": particle.sphereX,
                "--particle-sphere-y": particle.sphereY,
                "--particle-torus-x": particle.torusX,
                "--particle-torus-y": particle.torusY,
                "--particle-spiral-x": particle.spiralX,
                "--particle-spiral-y": particle.spiralY,
                "--particle-helix-x": particle.helixX,
                "--particle-helix-y": particle.helixY,
                "--particle-bloom-x": particle.bloomX,
                "--particle-bloom-y": particle.bloomY,
                "--particle-fracture-x": particle.fractureX,
                "--particle-fracture-y": particle.fractureY,
              } as CSSProperties
            }
          />
        ))}
      </span>
    </div>
  );
}
