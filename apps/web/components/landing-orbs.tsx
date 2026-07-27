"use client";

import { useEffect, useState } from "react";
import { Orb, type OrbState, type OrbTheme } from "vorb-ui";

const STATES: Array<{ state: OrbState; label: string; duration: number }> = [
  { state: "idle", label: "Idle", duration: 1800 },
  { state: "listening", label: "Listen", duration: 2800 },
  { state: "thinking", label: "Think", duration: 2200 },
  { state: "speaking", label: "Speak", duration: 2800 },
];

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

export function HeroOrb() {
  const [stateIndex, setStateIndex] = useState(1);
  const currentState = STATES[stateIndex] ?? STATES[0];
  const state = currentState.state;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStateIndex((current) => (current + 1) % STATES.length);
    }, currentState.duration);

    return () => window.clearTimeout(timer);
  }, [currentState.duration, stateIndex]);

  return (
    <div className="hero-orb">
      <div className="hero-orb__stage" data-state={state}>
        <div className="hero-orb__meta" aria-hidden="true">
          <span>state / {state}</span>
          <span>cloud / free vapor</span>
        </div>
        <Orb
          cloudMode="vapor"
          interactive={false}
          signal={{
            state,
            inputVolume: state === "listening" ? 0.56 : 0,
            outputVolume: state === "speaking" ? 0.68 : 0,
          }}
          ballScale={0.84}
          smokeScale={0.78}
          size="min(21rem, 68vw)"
          theme="cloud"
        />
      </div>
      <div className="state-picker" aria-label="Preview state">
        {STATES.map((item, index) => (
          <button
            aria-pressed={state === item.state}
            className={state === item.state ? "is-active" : undefined}
            key={item.state}
            onClick={() => setStateIndex(index)}
            type="button"
          >
            <span aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
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
