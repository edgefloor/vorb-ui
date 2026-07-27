export interface VoiceDynamicsState {
  fast: number;
  slow: number;
  transient: number;
  drive: number;
  lastSample: number;
}

export interface VoiceDynamicsStep {
  active: boolean;
  attack: number;
  release: number;
  deltaFrames: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothRate(rate: number, deltaFrames: number) {
  return 1 - Math.pow(1 - clamp(rate, 0, 1), clamp(deltaFrames, 0.25, 3));
}

export function createVoiceDynamicsState(): VoiceDynamicsState {
  return {
    fast: 0,
    slow: 0,
    transient: 0,
    drive: 0,
    lastSample: 0,
  };
}

/**
 * Turns a scalar volume stream into a body envelope and a short articulation
 * transient. Mutating the supplied state keeps this suitable for an animation
 * loop without allocating on every frame.
 */
export function stepVoiceDynamics(
  state: VoiceDynamicsState,
  sample: number,
  { active, attack, release, deltaFrames }: VoiceDynamicsStep,
) {
  const target = active && Number.isFinite(sample) ? clamp(sample, 0, 1) : 0;
  const rising = target > state.fast;
  const fastBaseRate = clamp((rising ? attack : release) * (rising ? 0.24 : 0.18), 0.008, 0.4);
  state.fast += (target - state.fast) * smoothRate(fastBaseRate, deltaFrames);

  const slowBaseRate = target > state.slow ? 0.028 : 0.018;
  state.slow += (target - state.slow) * smoothRate(slowBaseRate, deltaFrames);

  const sampleRise = active ? Math.max(0, target - state.lastSample) : 0;
  const envelopeSeparation = Math.max(0, state.fast - state.slow);
  const transientTarget = active ? clamp(sampleRise * 2.8 + envelopeSeparation * 0.55, 0, 1) : 0;
  const transientBaseRate = transientTarget > state.transient ? 0.5 : active ? 0.12 : 0.24;
  state.transient +=
    (transientTarget - state.transient) * smoothRate(transientBaseRate, deltaFrames);

  state.drive = clamp(state.fast * 0.72 + state.slow * 0.28 + state.transient * 0.08, 0, 1);
  state.lastSample = active ? target : 0;
  return state;
}
