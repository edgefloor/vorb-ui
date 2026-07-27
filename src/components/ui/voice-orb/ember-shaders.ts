export const VERTEX_SHADER = `
  attribute vec2 aPosition;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uIntensity;
  uniform vec3 uColor0;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uGlowRadius;
  uniform float uBallScale;
  uniform float uEnergy;
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

    // The renderer supplies accumulated phase rather than wall-clock time.
    // Audio-driven speed changes therefore stay continuous instead of jumping.
    float phaseTime = uTime;
    float motionTime = phaseTime;
    float thinkingTime = phaseTime * 3.2;
    float unavailable = uUnavailable;
    float density = mix(
      wIdle * 0.43 +
        wConnect * 0.58 +
        wListen * 0.52 +
        wThink * 0.68 +
        wSpeak * 0.57 +
        wError * 0.36,
      0.32,
      unavailable * 0.62
    );
    float turbulence = mix(
      wIdle * 0.14 +
        wConnect * 0.34 +
        wListen * (0.2 + uInputEnergy * 0.24) +
        wThink * 0.55 +
        wSpeak * (0.28 + uOutputEnergy * 0.2) +
        wError * 0.08,
      0.07,
      unavailable * 0.7
    );

    // State changes resize the suspended paint slowly inside a fixed shell.
    // The weights are already damped by the renderer, so this remains a
    // deliberate inhale/exhale rather than a periodic pulse.
    float stateSize =
      wIdle * 0.006 -
      wConnect * 0.052 -
      wListen * (0.028 + uInputEnergy * 0.018) -
      wThink * 0.012 +
      wSpeak * (0.032 + uOutputEnergy * 0.018) -
      wError * 0.044;
    float stateContour =
      wThink * sin(angle * 2.0 - motionTime * 0.38) * 0.004 +
      wSpeak * sin(angle * 3.0 + motionTime * 0.24) * 0.003;
    float radiusMotion = stateSize + stateContour;

    float organic =
      noise(
        uv * (6.8 + wThink * 1.4) +
          vec2(motionTime * 0.035, -motionTime * 0.029)
      ) -
      0.5;
    float broadVariance =
      sin(
        angle * (5.0 + wListen * 2.0 + wThink) +
          motionTime * 0.22
      ) *
      (0.42 + low * 0.26);
    float mediumVariance =
      sin(
        angle * (9.0 + wSpeak * 2.0) -
          motionTime * 0.2
      ) *
      (0.18 + mid * 0.18);
    float fineVariance =
      sin(angle * 16.0 + motionTime * 0.18) *
      (0.06 + high * 0.1);
    float variance = clamp(
      0.5 +
        (broadVariance +
          mediumVariance +
          fineVariance +
          organic * (0.38 + wThink * 0.18)) *
          0.32,
      0.0,
      1.0
    );

    float inwardCut =
      variance *
      (
        0.006 +
        wListen * uInputEnergy * 0.005 +
        wSpeak * uOutputEnergy * 0.002
      ) *
      ballScale;
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
      (2.65 + wThink * 0.62 + wConnect * 0.28);
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
        connectDelta / (length(connectDelta) + 0.16) * 0.06 +
        vec2(0.0, 0.018)
      ) *
      wConnect;

    vec2 listenFocus =
      vec2(
        -0.055 + sin(motionTime * 0.23) * 0.012,
        0.035 + cos(motionTime * 0.19) * 0.01
      ) *
      ballScale;
    vec2 listenDelta = listenFocus - uv;
    float listeningDrift =
      0.58 +
      fbm(
        uv * 2.4 +
          vec2(motionTime * 0.045, -motionTime * 0.035) +
          2.7
      ) *
      0.42;
    vec2 listeningField =
      listenDelta /
      (length(listenDelta) + 0.12) *
      listeningDrift *
      wListen *
      (0.034 + uInputEnergy * 0.068);

    vec2 thoughtCenterA =
      vec2(
        sin(thinkingTime * 0.83) * 0.22,
        cos(thinkingTime * 1.07) * 0.18
      ) *
      ballScale;
    vec2 thoughtCenterB =
      vec2(
        cos(thinkingTime * 1.19 + 2.1) * 0.21,
        sin(thinkingTime * 0.91 + 1.4) * 0.2
      ) *
      ballScale;
    vec2 thoughtCenterC =
      vec2(
        sin(thinkingTime * 1.31 + 4.0) * 0.17,
        cos(thinkingTime * 0.73 + 2.8) * 0.23
      ) *
      ballScale;
    vec2 thoughtDeltaA =
      uv - thoughtCenterA;
    vec2 thoughtDeltaB =
      uv - thoughtCenterB;
    vec2 thoughtDeltaC =
      uv - thoughtCenterC;
    float thoughtFalloffA =
      1.0 - smoothstep(0.08, 0.46, length(thoughtDeltaA));
    float thoughtFalloffB =
      1.0 - smoothstep(0.07, 0.43, length(thoughtDeltaB));
    float thoughtFalloffC =
      1.0 - smoothstep(0.06, 0.4, length(thoughtDeltaC));
    vec2 thinkingField =
      (
        vec2(-thoughtDeltaA.y, thoughtDeltaA.x) *
          thoughtFalloffA *
          0.34 -
        vec2(-thoughtDeltaB.y, thoughtDeltaB.x) *
          thoughtFalloffB *
          0.31 +
        vec2(-thoughtDeltaC.y, thoughtDeltaC.x) *
          thoughtFalloffC *
          0.28
      ) *
      wThink;

    vec2 speakSource =
      vec2(
        0.02 + sin(motionTime * 0.31) * 0.012,
        -0.1 + cos(motionTime * 0.26) * 0.01
      ) *
      ballScale;
    vec2 speakDelta = uv - speakSource;
    float speakingDrift =
      0.56 +
      fbm(
        uv * 2.3 -
          vec2(motionTime * 0.052, motionTime * 0.038) +
          7.4
      ) *
      0.44;
    vec2 speakingField =
      speakDelta /
      (length(speakDelta) + 0.11) *
      speakingDrift *
      wSpeak *
      (0.03 + uOutputEnergy * 0.07);

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
    float thoughtLobeA =
      1.0 -
      smoothstep(0.025, 0.21, length(thoughtDeltaA));
    float thoughtLobeB =
      1.0 -
      smoothstep(0.025, 0.19, length(thoughtDeltaB));
    float thoughtLobeC =
      1.0 -
      smoothstep(0.025, 0.18, length(thoughtDeltaC));
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
      listenDelta /
      (length(listenDelta) + 0.16) *
      (low * 0.09 + mid * 0.055) *
      wListen *
      uInputEnergy;
    vec2 outputOffset =
      speakDelta /
      (length(speakDelta) + 0.15) *
      (mid * 0.06 + high * 0.045) *
      wSpeak *
      uOutputEnergy;
    vec2 listeningCarry =
      (
        vec2(
          fbm(base * 0.6 + vec2(motionTime * 0.043, 2.6)),
          fbm(base * 0.64 + vec2(5.2, -motionTime * 0.038))
        ) -
        0.5
      ) *
      wListen *
      (0.02 + uInputEnergy * 0.065);
    vec2 speakingCarry =
      (
        vec2(
          fbm(base * 0.58 + vec2(-motionTime * 0.05, 4.1)),
          fbm(base * 0.62 + vec2(7.6, motionTime * 0.043))
        ) -
        0.5
      ) *
      wSpeak *
      (0.025 + uOutputEnergy * 0.075);
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
      wThink *
      0.18;
    vec2 voiceOffset =
      (inputOffset + outputOffset) *
      (1.0 - unavailable * 0.82);
    vec2 warped =
      base +
      flow +
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
      wThink *
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
      listeningDrift * 0.5 + listenFocusDensity * 0.5 - 0.56;
    float thinkingComposition =
      thoughtLobeA * 0.52 +
      thoughtLobeB * 0.48 +
      thoughtLobeC * 0.44 +
      thoughtChannel * 0.24 -
      0.4;
    float speakingComposition =
      speakingDrift * 0.58 + speakBody * 0.42 - 0.43;

    backCloud = smoothstep(
      0.22,
      0.94,
      backCloud +
        density * 0.09 +
        wConnect * connectingComposition * 0.16 +
        wListen * listeningComposition * 0.11 +
        wThink * thinkingComposition * 0.14 +
        wSpeak * speakingComposition * 0.08
    );
    midCloud = smoothstep(
      0.2,
      0.92,
      midCloud +
        density * 0.08 +
        wConnect * connectingComposition * 0.26 +
        wListen *
          listeningComposition *
          (0.16 + uInputEnergy * 0.07) +
        wThink * thinkingComposition * 0.24 +
        wSpeak *
          speakingComposition *
          (0.13 + uOutputEnergy * 0.08)
    );
    frontCloud = smoothstep(
      0.28,
      0.96,
      frontCloud +
        density * 0.04 +
        wConnect * connectPlume * 0.11 +
        wListen * listenFocusDensity * (0.025 + uInputEnergy * 0.06) +
        wThink *
          (thoughtLobeA + thoughtLobeB + thoughtLobeC) *
          0.067 +
        wSpeak * speakingComposition * (0.025 + uOutputEnergy * 0.06)
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
      wThink * sin(motionTime * 0.31) * 0.18;
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
    float pigment = clamp(
      midCloud * 0.48 +
        backCloud * 0.24 +
        frontCloud * 0.16 +
        brushSweep * 0.12,
      0.0,
      1.0
    );

    vec3 color = mix(
      uColor1 * (0.48 + backCloud * 0.16),
      uColor0,
      pigment
    );
    color *= 0.66 + diffuse * 0.34;
    color = mix(
      color,
      uColor1 * 0.46,
      occlusion * (0.1 + density * 0.12) + innerShadow * 0.2
    );
    color = mix(
      color,
      uColor2,
      frontCloud *
        diffuse *
        0.08 *
        (1.0 - unavailable * 0.86)
    );

    color *= 1.0 - wConnect * 0.08;
    color = mix(color, uColor1 * 0.7, wListen * 0.07);
    color = mix(color, uColor2 * 0.62, wThink * 0.05);
    color = mix(color, uColor0 * 1.035, wSpeak * 0.06);

    // Error is a loss of coherence, not another pulsing activity state.
    float fracture =
      wError *
      (1.0 -
      smoothstep(
          0.006,
          0.04,
          abs(uv.y - uv.x * 0.3 + sin(uv.x * 9.0) * 0.012)
        )) *
      (1.0 - smoothstep(0.08, 0.4, r));
    color = mix(color, uColor1 * 0.34, wError * 0.2);
    color *= 1.0 - fracture * 0.38;

    float foregroundVeil =
      smoothstep(0.36, 0.96, frontCloud) *
      (0.06 + uArticulation * 0.09) *
      (1.0 - unavailable * 0.88);
    color += uColor2 * foregroundVeil * z;

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
          wListen * (0.12 + uInputEnergy * 0.1) +
          wSpeak * uOutputEnergy * 0.12,
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
          wThink * (thinkingComposition * 0.92 - 0.14) +
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
      uColor1 * 0.24,
      uColor0 * 0.43,
      0.34 + diffuse * 0.24
    );
    glassTint *=
      1.0 -
      wConnect * 0.13 -
      wListen * 0.07 -
      wError * 0.16;
    color = mix(glassTint, color, smokePresence);
    color +=
      uColor2 *
      (
        specular * 0.34 +
        paintedGlint * shellZ * 0.11 +
        glassBand * fresnel * 0.13
      );
    color = mix(
      color,
      uColor2 * (0.46 + diffuse * 0.18),
      fresnel * 0.075
    );
    alpha = max(
      alpha,
      shellEnvelope * (0.11 + fresnel * 0.3 + specular * 0.14)
    );
    alpha *= 1.0 - fracture * 0.24;

    color = mix(
      color,
      uColor1 * 0.58,
      unavailable * 0.08 + signalVoid * 0.34
    );
    color = mix(
      color,
      uColor0 * (0.78 + diffuse * 0.16),
      outerVapor * 0.34
    );
    color *= uIntensity * 0.78;
    gl_FragColor = vec4(color, alpha);
  }
`;
