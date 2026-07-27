"use client";

import { useState } from "react";
import { Orb, type OrbState, type OrbTheme } from "vorb-ui";

const STATES: Array<{ state: OrbState; label: string }> = [
  { state: "idle", label: "Idle" },
  { state: "listening", label: "Listen" },
  { state: "thinking", label: "Think" },
  { state: "speaking", label: "Speak" },
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
  const [state, setState] = useState<OrbState>("listening");

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
        {STATES.map((item) => (
          <button
            aria-pressed={state === item.state}
            className={state === item.state ? "is-active" : undefined}
            key={item.state}
            onClick={() => setState(item.state)}
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
