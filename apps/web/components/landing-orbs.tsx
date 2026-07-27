"use client";

import { useEffect, useState } from "react";
import { Orb, type OrbCloudMode, type OrbScaleName, type OrbState, type OrbTheme } from "vorb-ui";

type SimulationChannel = "input" | "output" | null;

interface SimulationPhase {
  state: OrbState;
  label: string;
  duration: number;
  channel: SimulationChannel;
  seed: number;
}

interface SimulationFrame {
  state: OrbState;
  label: string;
  phaseIndex: number;
  progress: number;
  inputVolume: number;
  outputVolume: number;
}

const SIMULATION_PHASES: SimulationPhase[] = [
  {
    state: "connecting",
    label: "Opening channel",
    duration: 850,
    channel: null,
    seed: 0,
  },
  {
    state: "listening",
    label: "Listening to a request",
    duration: 4800,
    channel: "input",
    seed: 0.31,
  },
  {
    state: "thinking",
    label: "Composing a response",
    duration: 2100,
    channel: null,
    seed: 0,
  },
  {
    state: "speaking",
    label: "Speaking the answer",
    duration: 5600,
    channel: "output",
    seed: 0.77,
  },
  {
    state: "idle",
    label: "Turn complete",
    duration: 1200,
    channel: null,
    seed: 0,
  },
];

const SIMULATION_DURATION = SIMULATION_PHASES.reduce((total, phase) => total + phase.duration, 0);

const INITIAL_SIMULATION_FRAME: SimulationFrame = {
  state: "connecting",
  label: "Opening channel",
  phaseIndex: 0,
  progress: 0,
  inputVolume: 0,
  outputVolume: 0,
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function simulateSpeechActivity(elapsed: number, duration: number, seed: number) {
  const attack = clamp(elapsed / 320);
  const release = clamp((duration - elapsed) / 420);
  const envelope = Math.min(attack, release);
  const syllables = Math.pow(Math.max(0, Math.sin(elapsed * 0.011 + seed * 9)), 0.72);
  const texture = 0.5 + Math.sin(elapsed * 0.027 + seed * 17) * 0.18;
  const phrase = clamp((Math.sin(elapsed * 0.0037 + seed * 5) + 0.72) * 1.15, 0.12, 1);

  return clamp(envelope * phrase * (0.1 + syllables * 0.58 + texture * 0.18), 0, 0.86);
}

function resolveSimulationFrame(elapsed: number): SimulationFrame {
  let phaseTime = elapsed % SIMULATION_DURATION;
  let phase = SIMULATION_PHASES[0];
  let phaseIndex = 0;

  for (const [index, candidate] of SIMULATION_PHASES.entries()) {
    phase = candidate;
    phaseIndex = index;
    if (phaseTime < candidate.duration) break;
    phaseTime -= candidate.duration;
  }

  const volume =
    phase.channel === null ? 0 : simulateSpeechActivity(phaseTime, phase.duration, phase.seed);

  return {
    state: phase.state,
    label: phase.label,
    phaseIndex,
    progress: clamp(phaseTime / phase.duration),
    inputVolume: phase.channel === "input" ? volume : 0,
    outputVolume: phase.channel === "output" ? volume : 0,
  };
}

function useHeroSimulation() {
  const [frame, setFrame] = useState<SimulationFrame>(INITIAL_SIMULATION_FRAME);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let startedAt = performance.now();
    let lastUpdate = 0;

    const animate = (now: number) => {
      animationFrame = window.requestAnimationFrame(animate);
      if (mediaQuery.matches) {
        if (lastUpdate !== -1) {
          lastUpdate = -1;
          setFrame({
            state: "listening",
            label: "Listening to a request",
            phaseIndex: 1,
            progress: 0.42,
            inputVolume: 0.34,
            outputVolume: 0,
          });
        }
        return;
      }
      if (now - lastUpdate < 40) return;
      lastUpdate = now;
      setFrame(resolveSimulationFrame(now - startedAt));
    };

    const handleMotionChange = () => {
      startedAt = performance.now();
      lastUpdate = 0;
    };

    mediaQuery.addEventListener("change", handleMotionChange);
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return frame;
}

function HeroSignalIndicator({ simulation }: { simulation: SimulationFrame }) {
  const inputLevel = Math.round(simulation.inputVolume * 100);
  const outputLevel = Math.round(simulation.outputVolume * 100);

  return (
    <section
      className="hero-signal"
      data-state={simulation.state}
      aria-label="Simulated realtime voice signal"
    >
      <header className="hero-signal__header">
        <div className="hero-signal__identity" role="status" aria-live="polite">
          <span className="hero-signal__beacon" aria-hidden="true" />
          <div>
            <span>Simulated turn</span>
            <strong>{simulation.label}</strong>
          </div>
        </div>
        <code>
          {simulation.state}
          <span>{String(Math.round(simulation.progress * 100)).padStart(2, "0")}</span>
        </code>
      </header>

      <div className="hero-signal__channels" aria-hidden="true">
        <div className="hero-signal__channel" data-active={inputLevel > 0 || undefined}>
          <span>IN / USER</span>
          <i>
            <b style={{ transform: `scaleX(${simulation.inputVolume})` }} />
          </i>
          <output>{String(inputLevel).padStart(2, "0")}</output>
        </div>
        <div className="hero-signal__channel" data-active={outputLevel > 0 || undefined}>
          <span>OUT / AGENT</span>
          <i>
            <b style={{ transform: `scaleX(${simulation.outputVolume})` }} />
          </i>
          <output>{String(outputLevel).padStart(2, "0")}</output>
        </div>
      </div>

      <div className="hero-signal__trace" aria-hidden="true">
        {SIMULATION_PHASES.map((phase, index) => {
          const progress =
            index < simulation.phaseIndex
              ? 1
              : index === simulation.phaseIndex
                ? simulation.progress
                : 0;

          return (
            <i
              data-current={index === simulation.phaseIndex || undefined}
              key={phase.state}
              style={{ flexGrow: phase.duration }}
            >
              <span style={{ transform: `scaleX(${progress})` }} />
            </i>
          );
        })}
      </div>
    </section>
  );
}

const THEMES: Array<{
  theme: OrbTheme;
  name: string;
  note: string;
  state: OrbState;
  flagship?: boolean;
}> = [
  {
    theme: "cloud",
    name: "Cloud",
    note: "Free vapor · flagship",
    state: "listening",
    flagship: true,
  },
  {
    theme: "radial",
    name: "Radial",
    note: "Directional field",
    state: "speaking",
  },
  {
    theme: "circle",
    name: "Circle",
    note: "State topology",
    state: "thinking",
  },
  {
    theme: "bars",
    name: "Bars",
    note: "Minimal levels",
    state: "speaking",
  },
];

interface CloudStudy {
  mode: OrbCloudMode;
  scale: OrbScaleName;
  state: OrbState;
  inputVolume?: number;
  outputVolume?: number;
}

const CLOUD_STUDIES: CloudStudy[] = [
  {
    mode: "vapor",
    scale: "crystal",
    state: "listening",
    inputVolume: 0.48,
  },
  {
    mode: "gas",
    scale: "ember",
    state: "thinking",
  },
  {
    mode: "shell",
    scale: "iris",
    state: "speaking",
    outputVolume: 0.58,
  },
  {
    mode: "vapor",
    scale: "lagoon",
    state: "idle",
  },
  {
    mode: "gas",
    scale: "crystal",
    state: "connecting",
  },
];

function CloudStudyCard({ index, study }: { index: number; study: CloudStudy }) {
  return (
    <article className="cloud-study" data-mode={study.mode} data-scale={study.scale}>
      <header>
        <span>{study.mode}</span>
        <span>{String(index + 1).padStart(2, "0")}</span>
      </header>
      <div className="cloud-study__visual">
        <Orb
          cloudMode={study.mode}
          interactive={false}
          motion={{ speed: 0.68, intensity: 0.92 }}
          scale={study.scale}
          signal={{
            state: study.state,
            inputVolume: study.inputVolume ?? 0,
            outputVolume: study.outputVolume ?? 0,
          }}
          size="clamp(10rem, 14vw, 12.5rem)"
          theme="cloud"
        />
      </div>
      <footer>
        <h3>{study.scale}</h3>
        <p>{study.state}</p>
      </footer>
    </article>
  );
}

function CloudStudyGroup({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="cloud-marquee__group" aria-hidden={duplicate || undefined}>
      {CLOUD_STUDIES.map((study, index) => (
        <CloudStudyCard index={index} key={`${study.mode}-${study.scale}`} study={study} />
      ))}
    </div>
  );
}

export function CloudMarquee() {
  return (
    <section className="cloud-gallery" aria-labelledby="cloud-gallery-title">
      <div className="cloud-gallery__heading">
        <div>
          <h2 id="cloud-gallery-title">One signal. Many atmospheres.</h2>
        </div>
        <p>
          Shift the material from contained crystal to rough gas or free vapor, then tune its
          character with a named scale.
        </p>
      </div>
      <div className="cloud-marquee">
        <div className="cloud-marquee__track">
          <CloudStudyGroup />
          <CloudStudyGroup duplicate />
        </div>
      </div>
    </section>
  );
}

export function HeroOrb() {
  const simulation = useHeroSimulation();
  const { state, inputVolume, outputVolume } = simulation;

  return (
    <div className="hero-orb">
      <div className="hero-orb__stage" data-state={state}>
        <Orb
          cloudMode="vapor"
          interactive={false}
          signal={{
            state,
            inputVolume,
            outputVolume,
          }}
          ballScale={0.84}
          smokeScale={0.78}
          size="min(21rem, 68vw)"
          theme="cloud"
        />
      </div>
      <HeroSignalIndicator simulation={simulation} />
    </div>
  );
}

export function ThemeGrid() {
  return (
    <div className="theme-grid">
      {THEMES.map((item) => (
        <article
          className={`theme-card${item.flagship ? " theme-card--flagship" : ""}`}
          key={item.theme}
        >
          <div className="theme-card__visual">
            <Orb
              cloudMode={item.theme === "cloud" ? "vapor" : undefined}
              interactive={false}
              signal={{
                state: item.state,
                inputVolume: item.state === "listening" ? 0.48 : 0,
                outputVolume: item.state === "speaking" ? 0.62 : 0,
              }}
              size={item.flagship ? 320 : 176}
              theme={item.theme}
            />
          </div>
          <div className="theme-card__caption">
            <h3>{item.name}</h3>
            <p>{item.note}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
