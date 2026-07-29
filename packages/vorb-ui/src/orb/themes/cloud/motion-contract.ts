export const CLOUD_MOTION_SPEED_MAX = 3;
export const CLOUD_MOTION_INTENSITY_MIN = 0.25;
export const CLOUD_MOTION_INTENSITY_MAX = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveMotionSpeed(speed: number) {
  return clamp(Number.isFinite(speed) ? speed : 0, 0, CLOUD_MOTION_SPEED_MAX);
}

export function resolveMotionAmplitude(intensity: number) {
  return clamp(
    Number.isFinite(intensity) ? intensity : 1,
    CLOUD_MOTION_INTENSITY_MIN,
    CLOUD_MOTION_INTENSITY_MAX,
  );
}

export function resolveCloudPhaseRate(flowSpeed: number, speed: number) {
  const materialRate = 0.18 + clamp(flowSpeed, 0, 1) * 1.28;
  return materialRate * resolveMotionSpeed(speed);
}

export function resolveThinkingPhaseRate(flowSpeed: number, speed: number, presence: number) {
  const materialRate = 0.62 + clamp(flowSpeed, 0, 1) * 1.3;
  return materialRate * resolveMotionSpeed(speed) * clamp(presence, 0, 1);
}

export function resolveTransitionDuration(durationMs: number, speed: number) {
  const resolvedSpeed = resolveMotionSpeed(speed);
  if (resolvedSpeed === 0) return 0;
  return Math.max(0, durationMs) / resolvedSpeed;
}

export function resolveFlowDuration(flowSpeed: number, speed: number, baseSeconds = 12) {
  const rate = resolveCloudPhaseRate(flowSpeed, speed);
  return rate > 0 ? baseSeconds / rate : baseSeconds;
}

export function resolveGlowDuration(glowPulseSpeed: number, speed: number, baseSeconds = 8) {
  const materialRate = 0.1 + clamp(glowPulseSpeed, 0, 1) * 0.9;
  const rate = materialRate * resolveMotionSpeed(speed);
  return rate > 0 ? baseSeconds / rate : baseSeconds;
}
