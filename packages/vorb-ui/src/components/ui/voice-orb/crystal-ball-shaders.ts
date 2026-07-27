export const VERTEX_SHADER = `
  attribute vec2 aPosition;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform float uThinkingPhase;
  uniform vec2 uResolution;
  uniform float uIntensity;
  uniform vec3 uMain0;
  uniform vec3 uMain1;
  uniform vec3 uMain2;
  uniform vec3 uMain3;
  uniform vec3 uMain4;
  uniform vec3 uWarning0;
  uniform vec3 uWarning1;
  uniform vec3 uWarning2;
  uniform vec3 uWarning3;
  uniform vec3 uWarning4;
  uniform vec4 uVisual0;
  uniform vec4 uVisual1;
  uniform vec4 uVisual2;
  uniform float uGlowRadius;
  uniform float uBallScale;
  uniform float uShellVisibility;
  uniform float uGasRoughness;
  uniform float uInputEnergy;
  uniform float uOutputEnergy;
  uniform vec3 uAudioBands;
  uniform float uArticulation;
  uniform vec3 uStateA;
  uniform vec3 uStateB;
  uniform float uUnavailable;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.5 * noise(p);
    p = mat2(0.8, -0.6, 0.6, 0.8) * p * 2.03 + vec2(7.1, 3.4);
    value += 0.25 * noise(p);
    p = mat2(0.72, -0.69, 0.69, 0.72) * p * 2.01 + vec2(2.8, 9.2);
    value += 0.125 * noise(p);
    return value / 0.875;
  }

  vec2 vortexWarp(
    vec2 point,
    vec2 center,
    float radius,
    float rotation
  ) {
    vec2 delta = point - center;
    float distanceToCenter = length(delta);
    float influence =
      1.0 - smoothstep(radius * 0.12, radius, distanceToCenter);
    float angle = rotation * influence * influence;
    float sine = sin(angle);
    float cosine = cos(angle);
    return center +
      mat2(cosine, -sine, sine, cosine) * delta;
  }

  vec3 sampleRamp(
    vec3 color0,
    vec3 color1,
    vec3 color2,
    vec3 color3,
    vec3 color4,
    float position
  ) {
    float scaled = clamp(position, 0.0, 1.0) * 4.0;
    if (scaled < 1.0) return mix(color0, color1, scaled);
    if (scaled < 2.0) return mix(color1, color2, scaled - 1.0);
    if (scaled < 3.0) return mix(color2, color3, scaled - 2.0);
    return mix(color3, color4, scaled - 3.0);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
    float r = length(uv);
    float ballScale = clamp(uBallScale, 0.7, 1.0);
    float ballRadius = 0.47 * ballScale;
    float localR = r / ballScale;
    float angle = atan(uv.y, uv.x);
    vec2 direction = uv / max(r, 0.0001);
    float low = uAudioBands.x;
    float mid = uAudioBands.y;
    float high = uAudioBands.z;

    float wIdle = uStateA.x;
    float wListen = uStateA.y;
    float wThink = uStateA.z;
    float wSpeak = uStateB.x;
    float wConnect = uStateB.y;
    float wError = uStateB.z;
    float weightTotal = max(
      0.001,
      wIdle + wListen + wThink + wSpeak + wConnect + wError
    );
    wIdle /= weightTotal;
    wListen /= weightTotal;
    wThink /= weightTotal;
    wSpeak /= weightTotal;
    wConnect /= weightTotal;
    wError /= weightTotal;
    // Thinking first compresses the inherited cloud. Vortex topology and
    // higher-frequency detail join only after that material has gathered.
    float thinkingFormation =
      wThink * smoothstep(0.05, 0.68, wThink);

    float turbulenceTarget = uVisual0.x;
    float flowSpeed = uVisual0.y;
    float vortexCount = uVisual0.z;
    float vortexStrength = uVisual0.w;
    float expansion = uVisual1.x;
    float centerPull = uVisual1.y;
    float audioResponse = uVisual1.z;
    float smokeDensity = uVisual1.w;
    float glowIntensity = uVisual2.x;
    float glowPulseSpeed = uVisual2.y;
    float warningDistortion = uVisual2.z;
    float tonePosition = uVisual2.w;
    vec3 primaryColor = sampleRamp(
      uMain0,
      uMain1,
      uMain2,
      uMain3,
      uMain4,
      tonePosition
    );
    vec3 secondaryColor = sampleRamp(
      uMain0,
      uMain1,
      uMain2,
      uMain3,
      uMain4,
      tonePosition - 0.25
    );
    vec3 highlightColor = sampleRamp(
      uMain0,
      uMain1,
      uMain2,
      uMain3,
      uMain4,
      tonePosition + 0.28
    );
    vec3 warningColor = sampleRamp(
      uWarning0,
      uWarning1,
      uWarning2,
      uWarning3,
      uWarning4,
      0.42 + warningDistortion * 0.35
    );

    // The renderer supplies accumulated phase rather than wall-clock time.
    // Audio-driven speed changes therefore stay continuous instead of jumping.
    float phaseTime = uTime;
    float motionTime = phaseTime;
    float thinkingTime = uThinkingPhase;
    float unavailable = uUnavailable;
    float density = mix(smokeDensity, 0.32, unavailable * 0.62);
    float turbulence = mix(
      turbulenceTarget,
      0.07,
      unavailable * 0.7
    );

    // State changes redistribute smoke inside a fixed shell. Live audio never
    // changes this radius; it travels through the directional fields below.
    float stateSize =
      (expansion - 0.35) * 0.11 -
      centerPull * 0.035;
    float stateContour =
      thinkingFormation *
        sin(angle * 2.0 - motionTime * 0.38) *
        0.004 +
      wSpeak * sin(angle * 3.0 + motionTime * 0.24) * 0.003;
    float radiusMotion = stateSize + stateContour;

    float organic =
      noise(
        uv * (6.8 + thinkingFormation * 1.4) +
          vec2(motionTime * 0.035, -motionTime * 0.029)
      ) -
      0.5;
    float broadVariance =
      sin(
        angle * (5.0 + wListen * 2.0 + thinkingFormation) +
          motionTime * 0.22
      ) *
      (0.42 + low * 0.06);
    float mediumVariance =
      sin(
        angle * (9.0 + wSpeak * 2.0) -
          motionTime * 0.2
      ) *
      (0.18 + mid * 0.04);
    float fineVariance =
      sin(angle * 16.0 + motionTime * 0.18) *
      (0.06 + high * 0.02);
    float variance = clamp(
      0.5 +
        (broadVariance +
          mediumVariance +
          fineVariance +
          organic * (0.38 + thinkingFormation * 0.18)) *
          0.32,
      0.0,
      1.0
    );

    float inwardCut = variance * 0.006 * ballScale;
    float bodyRadius =
      min(
        ballRadius + 0.018 * ballScale,
        uGlowRadius + radiusMotion * ballScale - inwardCut
      );
    float edgeCloud = fbm(
      direction * (4.6 + wListen * 0.8) +
        vec2(motionTime * 0.042, -motionTime * 0.034)
    );
    float cloudInset =
      edgeCloud * (0.007 + high * 0.008) * ballScale;
    float cloudRadius = bodyRadius - cloudInset;
    float shapeR = length(uv + vec2(0.0, wError * 0.018));
    shapeR +=
      wError *
      smoothstep(-0.08, 0.38, uv.y) *
      (0.008 + abs(uv.x) * 0.028);
    float edgeFeather =
      (0.095 + density * 0.055 + unavailable * 0.035) * ballScale;
    float coreMask =
      1.0 -
      smoothstep(cloudRadius - edgeFeather, cloudRadius + 0.05, shapeR);

    // Each state owns a different vector field. These fields keep moving
    // after a transition settles; live input/output only strengthens the
    // appropriate field.
    vec2 base =
      uv *
      (2.65 + thinkingFormation * 0.62 + wConnect * 0.28);
    vec2 idleDrift =
      vec2(
        sin(motionTime * 0.21),
        cos(motionTime * 0.17)
      ) *
      wIdle *
      0.045;

    vec2 connectTarget =
      vec2(
        sin(motionTime * 0.2) * 0.015,
        0.025 + cos(motionTime * 0.16) * 0.012
      ) *
      ballScale;
    vec2 connectDelta = connectTarget - uv;
    vec2 connectingField =
      (
        connectDelta /
          (length(connectDelta) + 0.16) *
          (0.025 + centerPull * 0.075) +
        vec2(0.0, 0.018)
      ) *
      wConnect;

    vec2 smokeCenter =
      vec2(
        sin(motionTime * 0.12) * 0.008,
        0.035 + cos(motionTime * 0.1) * 0.006
      ) *
      ballScale;
    vec2 listenEntry = vec2(0.0, -0.41) * ballScale;
    vec2 listenAxis = normalize(smokeCenter - listenEntry);
    vec2 listenNormal = vec2(-listenAxis.y, listenAxis.x);
    vec2 listenRelative = uv - listenEntry;
    float listenLength = max(length(smokeCenter - listenEntry), 0.001);
    float listenAlong = dot(listenRelative, listenAxis);
    float listenLateral = abs(dot(listenRelative, listenNormal));
    float listenSegment =
      smoothstep(-0.025, 0.035, listenAlong) *
      (1.0 -
        smoothstep(listenLength - 0.035, listenLength + 0.07, listenAlong));
    float listenCorridor =
      (1.0 - smoothstep(0.035, 0.23, listenLateral)) *
      listenSegment;
    float listeningPhase =
      sin(
        (listenAlong / listenLength) * 8.5 -
          motionTime * 1.15
      );
    float listeningWave =
      (0.5 + 0.5 * listeningPhase) *
      listenCorridor *
      uInputEnergy *
      audioResponse;
    float listeningRibbon =
      listeningPhase *
      listenCorridor *
      (0.32 + uInputEnergy * audioResponse * 0.68);
    vec2 listenFocus = smokeCenter;
    vec2 listenDelta = listenFocus - uv;
    float listeningDrift =
      0.72 +
      fbm(
        uv * 2.4 +
          vec2(motionTime * 0.045, -motionTime * 0.035) +
          2.7
      ) *
      0.28;
    vec2 listeningField =
      (
        listenAxis *
          listenCorridor *
          (0.012 +
            listeningWave * 0.11 +
            uInputEnergy * audioResponse * 0.035) +
        listenDelta /
          (length(listenDelta) + 0.14) *
          centerPull *
          0.018
      ) *
      listeningDrift *
      wListen;

    vec2 thoughtCenterA =
      vec2(
        sin(thinkingTime * 0.38) * 0.16,
        cos(thinkingTime * 0.31) * 0.13
      ) *
      ballScale;
    vec2 thoughtCenterB =
      vec2(
        cos(thinkingTime * 0.33 + 2.1) * 0.16,
        sin(thinkingTime * 0.36 + 1.4) * 0.15
      ) *
      ballScale;
    vec2 thoughtCenterC =
      vec2(
        sin(thinkingTime * 0.29 + 4.0) * 0.13,
        cos(thinkingTime * 0.27 + 2.8) * 0.17
      ) *
      ballScale;
    vec2 thoughtDeltaA =
      uv - thoughtCenterA;
    vec2 thoughtDeltaB =
      uv - thoughtCenterB;
    vec2 thoughtDeltaC =
      uv - thoughtCenterC;
    float thoughtFalloffA =
      1.0 - smoothstep(0.3, 0.68, length(thoughtDeltaA));
    float thoughtFalloffB =
      1.0 - smoothstep(0.27, 0.64, length(thoughtDeltaB));
    float thoughtFalloffC =
      1.0 - smoothstep(0.24, 0.6, length(thoughtDeltaC));
    float thoughtRadiusA = length(thoughtDeltaA);
    float thoughtRadiusB = length(thoughtDeltaB);
    float thoughtRadiusC = length(thoughtDeltaC);
    float thoughtTailA =
      thoughtFalloffA * smoothstep(0.035, 0.14, thoughtRadiusA);
    float thoughtTailB =
      thoughtFalloffB * smoothstep(0.03, 0.13, thoughtRadiusB);
    float thoughtTailC =
      thoughtFalloffC * smoothstep(0.025, 0.12, thoughtRadiusC);
    float thoughtAngleA = atan(thoughtDeltaA.y, thoughtDeltaA.x);
    float thoughtAngleB = atan(thoughtDeltaB.y, thoughtDeltaB.x);
    float thoughtAngleC = atan(thoughtDeltaC.y, thoughtDeltaC.x);
    float thoughtSpinA =
      (0.58 + sin(thinkingTime * 0.39) * 0.1) *
      thinkingFormation *
      vortexStrength;
    float thoughtSpinB =
      -(0.5 + sin(thinkingTime * 0.33 + 1.7) * 0.09) *
      thinkingFormation *
      vortexStrength *
      smoothstep(1.25, 1.75, vortexCount);
    float thoughtSpinC =
      (0.44 + sin(thinkingTime * 0.29 + 3.4) * 0.08) *
      thinkingFormation *
      vortexStrength *
      smoothstep(2.25, 2.75, vortexCount);
    vec2 thinkingMixedUv = uv;
    thinkingMixedUv = vortexWarp(
      thinkingMixedUv,
      thoughtCenterA,
      0.64 * ballScale,
      thoughtSpinA
    );
    thinkingMixedUv = vortexWarp(
      thinkingMixedUv,
      thoughtCenterB,
      0.6 * ballScale,
      thoughtSpinB
    );
    thinkingMixedUv = vortexWarp(
      thinkingMixedUv,
      thoughtCenterC,
      0.56 * ballScale,
      thoughtSpinC
    );
    vec2 thinkingMixWarp =
      (thinkingMixedUv - uv) *
      (2.65 + thinkingFormation * 0.62);
    vec2 thinkingField =
      (
        vec2(-thoughtDeltaA.y, thoughtDeltaA.x) *
          thoughtFalloffA *
          0.34 -
        vec2(-thoughtDeltaB.y, thoughtDeltaB.x) *
          thoughtFalloffB *
          0.31 *
          smoothstep(1.25, 1.75, vortexCount) +
        vec2(-thoughtDeltaC.y, thoughtDeltaC.x) *
          thoughtFalloffC *
          0.28 *
          smoothstep(2.25, 2.75, vortexCount)
      ) *
      thinkingFormation *
      vortexStrength;

    vec2 speakSource = smokeCenter;
    vec2 speakExit = vec2(0.0, -0.42) * ballScale;
    vec2 speakAxis = normalize(speakExit - speakSource);
    vec2 speakNormal = vec2(-speakAxis.y, speakAxis.x);
    vec2 speakRelative = uv - speakSource;
    float speakLength = max(length(speakExit - speakSource), 0.001);
    float speakAlong = dot(speakRelative, speakAxis);
    float speakLateral = abs(dot(speakRelative, speakNormal));
    float speakSegment =
      smoothstep(-0.035, 0.035, speakAlong) *
      (1.0 -
        smoothstep(speakLength - 0.04, speakLength + 0.075, speakAlong));
    float speakCorridor =
      (1.0 - smoothstep(0.04, 0.22, speakLateral)) *
      speakSegment;
    float speakingPhase =
      sin(
        (speakAlong / speakLength) * 8.0 -
          motionTime * 1.2
      );
    float speakingWave =
      (0.5 + 0.5 * speakingPhase) *
      speakCorridor *
      uOutputEnergy *
      audioResponse;
    float speakingRibbon =
      speakingPhase *
      speakCorridor *
      (0.34 + uOutputEnergy * audioResponse * 0.66);
    vec2 speakDelta = uv - speakSource;
    float speakingDrift =
      0.78 +
      fbm(
        uv * 2.3 -
          vec2(motionTime * 0.052, motionTime * 0.038) +
          7.4
      ) *
      0.22;
    vec2 speakingField =
      speakAxis *
      speakCorridor *
      speakingDrift *
      wSpeak *
      (0.018 +
        expansion * 0.024 +
        speakingWave * 0.12 +
        uOutputEnergy * audioResponse * 0.035);

    // State composition masks reshape the same cloud layers used by every
    // mode. No state-specific graphic is composited over the smoke.
    float connectTexture = fbm(
      vec2(uv.x * 5.2, uv.y * 2.8 - motionTime * 0.1) +
        vec2(4.8, 7.2)
    );
    float connectPlume =
      (1.0 - smoothstep(0.045, 0.25, abs(uv.x))) *
      smoothstep(0.16, 0.82, connectTexture) *
      (1.0 - smoothstep(0.22, 0.48, r));
    float connectBody =
      1.0 -
      smoothstep(0.06 * ballScale, 0.34 * ballScale, r);
    float listenFocusDensity =
      1.0 -
      smoothstep(0.055, 0.3, length(uv - listenFocus));
    float thoughtFoldA =
      sin(
        thoughtAngleA * 2.0 -
          thoughtRadiusA * 15.0 +
          thinkingTime * 1.3
      ) *
      thoughtTailA;
    float thoughtFoldB =
      sin(
        thoughtAngleB * 2.0 +
          thoughtRadiusB * 17.0 -
          thinkingTime * 1.15 +
          1.8
      ) *
      thoughtTailB *
      smoothstep(1.25, 1.75, vortexCount);
    float thoughtFoldC =
      sin(
        thoughtAngleC * 2.0 -
          thoughtRadiusC * 19.0 +
          thinkingTime * 1.0 +
          3.6
      ) *
      thoughtTailC *
      smoothstep(2.25, 2.75, vortexCount);
    float thoughtFolds =
      thoughtFoldA * 0.44 +
      thoughtFoldB * 0.34 +
      thoughtFoldC * 0.28;
    float thoughtChannel =
      fbm(
        uv * 3.4 +
          vec2(
            sin(thinkingTime * 0.67),
            cos(thinkingTime * 0.79)
          ) *
          0.48 +
          5.1
      );
    float speakBody =
      1.0 -
      smoothstep(0.04, 0.34, length(speakDelta));

    float errorSide =
      smoothstep(-0.025, 0.025, uv.y - uv.x * 0.3) * 2.0 - 1.0;
    vec2 errorSplit =
      vec2(errorSide * 0.038, -errorSide * 0.014) * wError;
    vec2 flow =
      connectingField +
      listeningField +
      thinkingField +
      speakingField +
      errorSplit +
      idleDrift;

    float warpX = fbm(base + flow + vec2(1.7, 4.2));
    float warpY = fbm(base - flow * 0.7 + vec2(8.3, 2.1));
    vec2 inputOffset =
      listenAxis *
      listenCorridor *
      (low * 0.04 + mid * 0.025 + listeningWave * 0.07) *
      wListen *
      audioResponse;
    vec2 outputOffset =
      speakAxis *
      speakCorridor *
      (mid * 0.035 + high * 0.02 + speakingWave * 0.075) *
      wSpeak *
      audioResponse;
    float listeningEddy =
      fbm(
        base * 0.62 +
          vec2(motionTime * 0.032, -motionTime * 0.026) +
          2.6
      ) -
      0.5;
    vec2 listeningCarry =
      (
        listenAxis * listeningEddy +
        listenNormal * listeningEddy * 0.18
      ) *
      listenCorridor *
      wListen *
      (0.012 + uInputEnergy * audioResponse * 0.035);
    float speakingEddy =
      fbm(
        base * 0.6 +
          vec2(-motionTime * 0.035, motionTime * 0.028) +
          7.6
      ) -
      0.5;
    vec2 speakingCarry =
      (
        speakAxis * speakingEddy +
        speakNormal * speakingEddy * 0.12
      ) *
      speakCorridor *
      wSpeak *
      (0.014 + uOutputEnergy * audioResponse * 0.04);
    vec2 thinkingCarry =
      (
        vec2(
          fbm(
            base * 0.7 +
              vec2(
                thinkingTime * 0.18,
                sin(thinkingTime * 0.61) * 0.7
              ) +
              1.8
          ),
          fbm(
            base * 0.76 +
              vec2(
                cos(thinkingTime * 0.73) * 0.65,
                -thinkingTime * 0.16
              ) +
              6.4
          )
        ) -
        0.5
      ) *
      thinkingFormation *
      (0.035 + vortexStrength * 0.055);
    vec2 voiceOffset =
      (inputOffset + outputOffset) *
      (1.0 - unavailable * 0.82);
    vec2 warped =
      base +
      flow +
      thinkingMixWarp +
      voiceOffset +
      listeningCarry +
      thinkingCarry +
      speakingCarry +
      (vec2(warpX, warpY) - 0.5) *
        (0.65 + turbulence * 0.65);

    vec2 thinkingLayerDrift =
      vec2(
        sin(thinkingTime * 0.63),
        cos(thinkingTime * 0.77)
      ) *
      thinkingFormation *
      0.24;
    float backCloud = fbm(
      warped * 0.72 +
        vec2(-motionTime * 0.016, motionTime * 0.012) +
        thinkingLayerDrift
    );
    float midCloud = fbm(
      warped * 1.1 +
        vec2(motionTime * 0.021, -motionTime * 0.018) +
        vec2(-thinkingLayerDrift.y, thinkingLayerDrift.x) * 1.2 +
        4.7
    );
    float frontCloud = fbm(
      warped * 1.58 -
        vec2(motionTime * 0.027, motionTime * 0.022) +
        thinkingLayerDrift * 1.45 +
        9.3
    );
    float connectingComposition =
      connectPlume * 0.9 + connectBody * 0.34 - 0.38;
    float listeningComposition =
      listeningDrift * 0.28 +
      listenFocusDensity * 0.38 +
      listenCorridor * 0.18 +
      listeningWave * 0.34 -
      0.48;
    float thinkingComposition =
      thoughtFolds * 0.32 +
      (thoughtChannel - 0.5) * 0.22;
    float speakingComposition =
      speakingDrift * 0.18 +
      speakBody * 0.24 +
      speakCorridor * 0.42 +
      speakingWave * 0.62 -
      0.34;

    backCloud = smoothstep(
      0.22,
      0.94,
      backCloud +
        density * 0.09 +
        wConnect * connectingComposition * 0.16 +
        wListen * listeningComposition * 0.2 +
        thinkingFormation * thinkingComposition * 0.14 +
        wSpeak * speakingComposition * 0.17
    );
    midCloud = smoothstep(
      0.2,
      0.92,
      midCloud +
        density * 0.08 +
        wConnect * connectingComposition * 0.26 +
        wListen *
          listeningComposition *
          (0.25 + uInputEnergy * 0.1) +
        thinkingFormation * thinkingComposition * 0.24 +
        wSpeak *
          speakingComposition *
          (0.24 + uOutputEnergy * 0.11)
    );
    frontCloud = smoothstep(
      0.28,
      0.96,
      frontCloud +
        density * 0.04 +
        wConnect * connectPlume * 0.11 +
        wListen *
          (
            listenFocusDensity * 0.025 +
            listenCorridor * 0.075 +
            listeningWave * 0.15
          ) +
        thinkingFormation *
          thoughtFolds *
          0.032 +
        wSpeak *
          (
            speakingComposition * 0.055 +
            speakCorridor * 0.08 +
            speakingWave * 0.16
          )
    );

    float normalizedR = clamp(
      shapeR / max(bodyRadius, 0.001),
      0.0,
      1.0
    );
    float z = sqrt(max(0.0, 1.0 - normalizedR * normalizedR));
    vec3 normal = normalize(
      vec3(uv / max(bodyRadius, 0.001), z)
    );
    float lightOrbit =
      motionTime * 0.075 +
      sin(motionTime * 0.13) * 0.07 +
      sin(motionTime * 0.11) * glowPulseSpeed * 0.035 +
      thinkingFormation * sin(motionTime * 0.31) * 0.18;
    vec3 lightDirection = normalize(
      vec3(
        -0.42 + sin(lightOrbit) * 0.2,
        0.52 + cos(lightOrbit) * 0.16,
        0.74
      )
    );
    float diffuse =
      0.5 + 0.5 * max(0.0, dot(normal, lightDirection));
    float innerShadow =
      smoothstep(0.24, 1.0, normalizedR) * (1.0 - diffuse);
    float occlusion = backCloud * midCloud * (0.5 + frontCloud * 0.5);
    float brushSweep =
      0.5 +
      0.5 *
        sin(
          warped.y * 2.45 +
            warped.x * 0.42 +
            backCloud * 2.1 -
            motionTime * 0.075
        );
    float cloudPigment = clamp(
      midCloud * 0.48 +
        backCloud * 0.24 +
        frontCloud * 0.16 +
        brushSweep * 0.12,
      0.0,
      1.0
    );
    float vortexPigment = clamp(
      0.46 +
        thoughtFolds * 0.17 +
        (midCloud - 0.5) * 0.18 +
        (brushSweep - 0.5) * 0.11,
      0.0,
      1.0
    );
    float pigment = mix(
      cloudPigment,
      vortexPigment,
      thinkingFormation * 0.72
    );
    float listeningPigment = clamp(
      cloudPigment * 0.72 +
        0.12 +
        listenCorridor * 0.12 +
        listeningRibbon * 0.24,
      0.0,
      1.0
    );
    float speakingPigment = clamp(
      cloudPigment * 0.68 +
        0.14 +
        speakCorridor * 0.14 +
        speakingRibbon * 0.27,
      0.0,
      1.0
    );
    pigment = mix(pigment, listeningPigment, wListen * 0.8);
    pigment = mix(pigment, speakingPigment, wSpeak * 0.84);

    vec3 color = mix(
      secondaryColor * (0.48 + backCloud * 0.16),
      primaryColor,
      pigment
    );
    float materialLight = mix(
      diffuse,
      0.68,
      thinkingFormation * 0.72
    );
    color *= 0.66 + materialLight * 0.34;
    color = mix(
      color,
      secondaryColor * 0.46,
      occlusion * (0.1 + density * 0.12) + innerShadow * 0.2
    );
    color = mix(
      color,
      highlightColor,
      frontCloud *
        diffuse *
        0.08 *
        (1.0 - thinkingFormation * 0.72) *
        (1.0 - unavailable * 0.86)
    );

    color *= 1.0 - wConnect * 0.08;
    color = mix(color, secondaryColor * 0.7, wListen * 0.07);
    color = mix(
      color,
      secondaryColor * 0.82,
      thinkingFormation * 0.035
    );
    color = mix(color, primaryColor * 1.035, wSpeak * 0.06);

    // Error is a loss of coherence, not another pulsing activity state.
    float fracture =
      wError *
      warningDistortion *
      (1.0 -
      smoothstep(
          0.006,
          0.04,
          abs(uv.y - uv.x * 0.3 + sin(uv.x * 9.0) * 0.012)
        )) *
      (1.0 - smoothstep(0.08, 0.4, r));
    float warningFlare =
      wError *
      warningDistortion *
      (fracture * 0.88 +
        (1.0 -
          smoothstep(
            0.025,
            0.18,
            length(uv - vec2(0.085, 0.055))
          )) *
          0.62);
    color = mix(color, warningColor, clamp(warningFlare, 0.0, 0.86));
    color = mix(
      color,
      secondaryColor * 0.34,
      wError * (1.0 - warningDistortion) * 0.2
    );
    color *= 1.0 - fracture * 0.38;

    float foregroundVeil =
      smoothstep(0.36, 0.96, frontCloud) *
      (0.06 + uArticulation * 0.09) *
      (1.0 - thinkingFormation * 0.68) *
      (1.0 - unavailable * 0.88);
    color += highlightColor * foregroundVeil * z * (0.7 + glowIntensity);

    float outerNoise = fbm(
      uv * 6.4 +
        flow * 0.24 +
        vec2(-motionTime * 0.018, motionTime * 0.016)
    );
    float outerEnvelope =
      smoothstep(
        cloudRadius + 0.11 * ballScale,
        cloudRadius - 0.025 * ballScale,
        r
      ) -
      coreMask;
    float outerVapor =
      outerEnvelope *
      smoothstep(0.25, 0.9, outerNoise + density * 0.09) *
      (1.0 - unavailable * 0.42) *
      clamp(
        1.0 -
          wConnect * 0.34 -
          wListen * 0.12 +
          wSpeak * 0.05,
        0.48,
        1.12
      );
    float cavity =
      smoothstep(0.12, 0.9, 1.0 - backCloud) *
      midCloud *
      0.09;
    float voidNoise = fbm(uv * 2.1 + vec2(4.2, 8.1));
    float voidFalloff =
      1.0 -
      smoothstep(
        0.04 * ballScale,
        0.34 * ballScale,
        length(uv + vec2(-0.035, 0.025))
      );
    float signalVoid =
      unavailable *
      voidFalloff *
      smoothstep(0.22, 0.82, 1.0 - voidNoise);
    float alpha = clamp(
      coreMask *
        (0.82 +
          midCloud * 0.18 -
          cavity -
          signalVoid * 0.24) +
        outerVapor * 0.32,
      0.0,
      1.0
    );
    // The shell-free treatment needs a turbulent silhouette, not a softened
    // circle. Low-frequency lobes reshape the body while the higher-frequency
    // fields tear holes and filaments only into its outer band.
    vec2 gasDrift = vec2(motionTime * 0.026, -motionTime * 0.021);
    float gasEdgeCoarse = fbm(
      direction * 3.25 +
        gasDrift +
        vec2(
          sin(motionTime * 0.071) * 0.34,
          cos(motionTime * 0.057) * 0.29
        )
    );
    float gasEdgeFine = fbm(
      direction * 10.8 -
        gasDrift * 1.7 +
        uv * 2.6 +
        vec2(4.7, 1.9)
    );
    float gasLobes =
      sin(angle * 5.0 + motionTime * 0.087 + gasEdgeCoarse * 3.2) *
        0.024 +
      sin(angle * 9.0 - motionTime * 0.064) * 0.011;
    float gasBoundary =
      cloudRadius +
      0.025 * ballScale +
      (gasEdgeCoarse - 0.5) * 0.145 * ballScale +
      (gasEdgeFine - 0.5) * 0.052 * ballScale +
      gasLobes * ballScale;
    float gasEnvelope =
      1.0 -
      smoothstep(
        gasBoundary - 0.042 * ballScale,
        gasBoundary + 0.018 * ballScale,
        r
      );
    float gasEdgeBand = smoothstep(
      gasBoundary - 0.13 * ballScale,
      gasBoundary + 0.025 * ballScale,
      r
    );
    float gasFray = fbm(
      uv * 14.5 +
        direction * 2.4 +
        vec2(-motionTime * 0.041, motionTime * 0.034)
    );
    float gasEdgeBreakup = smoothstep(
      0.31,
      0.68,
      gasFray + gasEdgeFine * 0.24 + outerNoise * 0.12
    );
    float gasBreakup = mix(
      0.88 + outerNoise * 0.12,
      gasEdgeBreakup,
      gasEdgeBand * 0.92
    );
    float gasWisps =
      (1.0 -
        smoothstep(
          gasBoundary + 0.01 * ballScale,
          gasBoundary + 0.115 * ballScale,
          r
        )) *
      smoothstep(
        gasBoundary - 0.035 * ballScale,
        gasBoundary + 0.018 * ballScale,
        r
      ) *
      smoothstep(0.48, 0.79, gasFray + outerNoise * 0.24);
    float roughGasAlpha = clamp(
      (
        frontCloud * 0.72 +
        midCloud * 0.52 +
        backCloud * 0.24 +
        outerVapor * 0.82 +
        gasWisps * 0.5
      ) *
        gasEnvelope *
        gasBreakup +
        gasWisps * 0.28,
      0.0,
      0.96
    );
    roughGasAlpha = pow(roughGasAlpha, 0.72);
    float vaporBoundary =
      cloudRadius +
      0.04 * ballScale +
      (gasEdgeCoarse - 0.5) * 0.105 * ballScale +
      gasLobes * 0.58 * ballScale;
    float vaporEnvelope =
      1.0 -
      smoothstep(
        vaporBoundary - 0.12 * ballScale,
        vaporBoundary + 0.095 * ballScale,
        r
      );
    float vaporAlpha = clamp(
      (
        frontCloud * 0.64 +
        midCloud * 0.5 +
        backCloud * 0.28 +
        outerVapor * 0.72
      ) *
        vaporEnvelope *
        (0.78 + outerNoise * 0.22),
      0.0,
      0.9
    );
    vaporAlpha = pow(vaporAlpha, 0.8);
    float gasAlpha = mix(
      vaporAlpha,
      roughGasAlpha,
      clamp(uGasRoughness, 0.0, 1.0)
    );
    vec3 smokeOnlyColor =
      color * 1.12 +
      highlightColor * (frontCloud * 0.14 + outerVapor * 0.18) +
      primaryColor * midCloud * 0.08;

    // A stable crystal shell holds the painted smoke. Its highlight moves only
    // enough to feel dimensional, so state motion remains inside the sphere.
    float shellRadius = ballRadius;
    float shellR = clamp(r / shellRadius, 0.0, 1.0);
    float shellZ = sqrt(max(0.0, 1.0 - shellR * shellR));
    vec3 shellNormal = normalize(vec3(uv / shellRadius, shellZ));
    float shellEnvelope =
      1.0 -
      smoothstep(
        shellRadius - 0.075 * ballScale,
        shellRadius + 0.025 * ballScale,
        r
      );
    vec3 viewDirection = vec3(0.0, 0.0, 1.0);
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float fresnel = pow(1.0 - shellZ, 2.15);
    float specular =
      pow(max(0.0, dot(shellNormal, halfDirection)), 30.0) *
      (1.0 - unavailable * 0.5);
    float glassBand =
      smoothstep(0.58, 0.9, shellR) *
      (1.0 - smoothstep(0.94, 1.0, shellR));
    float paintedGlint =
      1.0 -
      smoothstep(
        0.025 * ballScale,
        0.17 * ballScale,
        length(
          vec2(
            (uv.x + 0.16 * ballScale) * 0.72,
            uv.y - 0.17 * ballScale
          )
        )
      );
    float statePresence =
      clamp(
        1.0 +
          wConnect * (connectingComposition * 1.15 - 0.34) +
          wListen * (listeningComposition * 0.88 - 0.16) +
          thinkingFormation * (thinkingComposition * 0.92 - 0.14) +
          wSpeak * (speakingComposition * 0.38 + 0.1) -
          wError * 0.22,
        0.28,
        1.16
      );
    float smokePresence =
      clamp(
        coreMask *
          (0.58 + pigment * 0.42) *
          statePresence +
          outerVapor * 0.68,
        0.0,
        1.0
      );
    vec3 glassTint = mix(
      secondaryColor * 0.24,
      primaryColor * 0.43,
      0.34 + diffuse * 0.24
    );
    glassTint *=
      1.0 -
      wConnect * 0.13 -
      wListen * 0.07 -
      wError * 0.16;
    color = mix(glassTint, color, smokePresence);
    color +=
      highlightColor *
      (
        specular * (0.2 + glowIntensity * 0.22) +
        paintedGlint *
          shellZ *
          0.11 *
          (1.0 - thinkingFormation * 0.78) +
        glassBand * fresnel * 0.13
      );
    color = mix(
      color,
      highlightColor * (0.46 + diffuse * 0.18),
      fresnel * 0.075
    );
    alpha = max(
      alpha,
      shellEnvelope * (0.11 + fresnel * 0.3 + specular * 0.14)
    );
    alpha *= 1.0 - fracture * 0.24;
    vec3 shelledColor = color;
    float shelledAlpha = alpha;
    float shellVisibility = clamp(uShellVisibility, 0.0, 1.0);
    color = mix(smokeOnlyColor, shelledColor, shellVisibility);
    alpha = mix(gasAlpha, shelledAlpha, shellVisibility);

    color = mix(
      color,
      secondaryColor * 0.58,
      unavailable * 0.08 + signalVoid * 0.34
    );
    color = mix(
      color,
      primaryColor * (0.78 + diffuse * 0.16),
      outerVapor * 0.34
    );
    color = mix(
      color,
      warningColor * (0.82 + glowIntensity * 0.28),
      clamp(warningFlare * 0.88, 0.0, 0.8)
    );
    color *= uIntensity * (0.7 + glowIntensity * 0.14);
    gl_FragColor = vec4(color, alpha);
  }
`;
