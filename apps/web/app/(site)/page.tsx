import Link from "next/link";
import { CloudMarquee, HeroOrb } from "@/components/landing-orbs";

const FEATURES = [
  ["Signal", "One normalized shape for state, input volume, output volume, and errors."],
  ["Adapters", "Bring Vapi, LiveKit, ElevenLabs, Gemini, Pipecat, or OpenAI Realtime."],
  ["Control", "Use it as a passive visual or let it own the complete session lifecycle."],
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">React primitive · realtime voice</p>
          <h1>Give voice a visible state.</h1>
          <p className="hero__lede">
            A focused visual layer for listening, thinking, speaking, and failure—controlled by your
            app or connected to the provider you already use.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" href="/docs/quick-start">
              Get started
            </Link>
            <Link className="button" href="/playground">
              Open playground
            </Link>
          </div>
          <dl className="hero__facts">
            <div>
              <dt>States</dt>
              <dd>06</dd>
            </div>
            <div>
              <dt>Renderers</dt>
              <dd>05</dd>
            </div>
            <div>
              <dt>Adapters</dt>
              <dd>06</dd>
            </div>
          </dl>
        </div>
        <HeroOrb />
      </section>

      <CloudMarquee />

      <section className="section architecture" id="api">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The whole surface</p>
            <h2>Small API. Clear boundary.</h2>
          </div>
          <p>
            vorb-ui translates provider noise into one visual contract. The renderer stays
            expressive; your application stays in control.
          </p>
        </div>
        <div className="architecture__grid">
          <div className="code-card">
            <div className="code-card__top">
              <span>assistant.tsx</span>
              <span>React · TSX</span>
            </div>
            <pre aria-label="Controlled Orb example">
              <code>
                <span className="code-line">
                  <span className="code-token code-token--keyword">import</span>
                  <span className="code-token code-token--plain"> {"{ Orb }"} </span>
                  <span className="code-token code-token--keyword">from</span>
                  <span className="code-token code-token--string"> &quot;vorb-ui&quot;</span>
                  <span className="code-token code-token--muted">;</span>
                </span>
                <span className="code-line" aria-hidden="true">
                  &nbsp;
                </span>
                <span className="code-line">
                  <span className="code-token code-token--muted">&lt;</span>
                  <span className="code-token code-token--component">Orb</span>
                </span>
                <span className="code-line">
                  <span className="code-indent" />
                  <span className="code-token code-token--property">signal</span>
                  <span className="code-token code-token--muted">=&#123;&#123;</span>
                </span>
                <span className="code-line">
                  <span className="code-indent code-indent--double" />
                  <span className="code-token code-token--property">state</span>
                  <span className="code-token code-token--muted">: </span>
                  <span className="code-token code-token--string">&quot;listening&quot;</span>
                  <span className="code-token code-token--muted">,</span>
                </span>
                <span className="code-line">
                  <span className="code-indent code-indent--double" />
                  <span className="code-token code-token--property">inputVolume</span>
                  <span className="code-token code-token--muted">: </span>
                  <span className="code-token code-token--number">0.42</span>
                </span>
                <span className="code-line">
                  <span className="code-indent" />
                  <span className="code-token code-token--muted">&#125;&#125;</span>
                </span>
                <span className="code-line">
                  <span className="code-indent" />
                  <span className="code-token code-token--property">theme</span>
                  <span className="code-token code-token--muted">=</span>
                  <span className="code-token code-token--string">&quot;circle&quot;</span>
                </span>
                <span className="code-line">
                  <span className="code-indent" />
                  <span className="code-token code-token--property">size</span>
                  <span className="code-token code-token--muted">=&#123;</span>
                  <span className="code-token code-token--number">240</span>
                  <span className="code-token code-token--muted">&#125;</span>
                </span>
                <span className="code-line">
                  <span className="code-indent" />
                  <span className="code-token code-token--property">interactive</span>
                  <span className="code-token code-token--muted">=&#123;</span>
                  <span className="code-token code-token--keyword">false</span>
                  <span className="code-token code-token--muted">&#125;</span>
                </span>
                <span className="code-line">
                  <span className="code-token code-token--muted">/&gt;</span>
                </span>
              </code>
            </pre>
          </div>
          <div className="feature-list">
            {FEATURES.map(([title, body], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="section__next">
          <p>Cloud, radial, circle, bars, and debug share this same surface.</p>
          <Link href="/docs/themes">
            Explore the renderers <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
