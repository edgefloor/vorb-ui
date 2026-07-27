import type { Metadata } from "next";
import { OrbPlayground } from "@/components/orb-playground";
import "@/app/playground/playground.css";

export const metadata: Metadata = {
  title: "Playground",
  description: "Test every vorb-ui renderer, state, signal source, and visual control.",
};

export default function PlaygroundPage() {
  return (
    <main className="playground-page">
      <header className="page-intro">
        <div>
          <p className="eyebrow">Playground</p>
          <h1>Shape the response.</h1>
        </div>
        <p>
          Test the published component against real lifecycle states, provider modes, and visual
          parameters.
        </p>
      </header>
      <OrbPlayground />
    </main>
  );
}
