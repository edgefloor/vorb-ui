import { useId } from "react";
import type { OrbCloudMode, OrbState, OrbVisualState } from "../../types";

type CloudFallbackProps = {
  cloudMode: OrbCloudMode;
  exiting: boolean;
  state: OrbState;
  visual: OrbVisualState;
};

type MaterialProps = {
  filterId: string;
  gradientId: string;
  highlightId: string;
  vortexCount: number;
};

function StateFlows({ vortexCount }: { vortexCount: number }) {
  const cells = [
    "M 128 175 C 143 132 189 118 218 145 C 246 170 231 213 194 216 C 163 218 145 202 128 175",
    "M 202 126 C 244 113 281 143 277 181 C 273 215 236 229 211 207 C 189 188 185 153 202 126",
    "M 168 221 C 195 198 239 206 250 242 C 260 274 232 300 199 288 C 169 277 153 247 168 221",
  ].slice(0, vortexCount);

  return (
    <g className="voice-orb__fallback-state-flows">
      <g className="voice-orb__fallback-flow voice-orb__fallback-flow--connecting">
        <path pathLength="1" d="M 88 214 C 138 156 211 133 302 169" />
      </g>

      <g className="voice-orb__fallback-flow voice-orb__fallback-flow--listening">
        <path pathLength="1" d="M 42 238 C 94 228 128 204 177 184" />
        <path pathLength="1" d="M 342 116 C 292 134 267 159 225 183" />
        <path pathLength="1" d="M 306 320 C 269 280 241 258 207 226" />
      </g>

      <g className="voice-orb__fallback-flow voice-orb__fallback-flow--thinking">
        {cells.map((path, index) => (
          <g
            className={`voice-orb__fallback-thinking-cell voice-orb__fallback-thinking-cell--${index + 1}`}
            key={path}
          >
            <path pathLength="1" d={path} />
          </g>
        ))}
      </g>

      <g className="voice-orb__fallback-flow voice-orb__fallback-flow--speaking">
        <path pathLength="1" d="M 215 179 C 259 159 300 134 354 126" />
        <path pathLength="1" d="M 220 211 C 275 213 310 231 363 258" />
        <path pathLength="1" d="M 184 226 C 160 264 129 293 82 317" />
      </g>
    </g>
  );
}

function ShellMaterial({ filterId, gradientId, highlightId, vortexCount }: MaterialProps) {
  return (
    <g className="voice-orb__fallback-material voice-orb__fallback-material--shell">
      <g className="voice-orb__fallback-pose voice-orb__fallback-pose--shell">
        <g className="voice-orb__fallback-drift voice-orb__fallback-drift--a">
          <g className="voice-orb__fallback-audio voice-orb__fallback-audio--body">
            <path
              className="voice-orb__fallback-shell-envelope"
              fill={`url(#${gradientId})`}
              filter={`url(#${filterId})`}
              d="M 201 67 C 255 63 313 92 335 143 C 356 192 338 255 302 298 C 267 339 207 349 153 329 C 98 309 62 261 64 204 C 66 148 103 98 154 77 C 170 71 185 68 201 67 Z"
            />
          </g>
        </g>

        <g className="voice-orb__fallback-drift voice-orb__fallback-drift--b">
          <g className="voice-orb__fallback-audio voice-orb__fallback-audio--density">
            <path
              className="voice-orb__fallback-density voice-orb__fallback-density--deep"
              d="M 112 170 C 135 117 215 93 273 124 C 328 154 318 221 281 250 C 235 286 164 277 125 234 C 109 216 103 191 112 170 Z"
            />
            <path
              className="voice-orb__fallback-density voice-orb__fallback-density--body"
              d="M 150 121 C 198 96 268 125 276 176 C 283 222 245 253 198 250 C 151 247 116 212 123 170 C 126 150 135 131 150 121 Z"
            />
          </g>
        </g>

        <g className="voice-orb__fallback-drift voice-orb__fallback-drift--c">
          <path
            className="voice-orb__fallback-shell-highlight"
            fill="none"
            pathLength="1"
            stroke={`url(#${highlightId})`}
            d="M 103 190 C 112 127 174 87 237 96 C 278 101 310 124 326 158"
          />
          <path
            className="voice-orb__fallback-shell-shadow"
            d="M 123 267 C 173 310 262 305 306 247 C 283 315 212 341 151 314 C 134 306 119 294 107 279 Z"
          />
        </g>
      </g>

      <StateFlows vortexCount={vortexCount} />
      <g className="voice-orb__fallback-failure voice-orb__fallback-failure--shell">
        <path pathLength="1" d="M 225 107 L 204 164 L 231 188 L 195 244 L 211 294" />
      </g>
    </g>
  );
}

function GasMaterial({ filterId, gradientId, highlightId, vortexCount }: MaterialProps) {
  return (
    <g className="voice-orb__fallback-material voice-orb__fallback-material--gas">
      <g className="voice-orb__fallback-pose voice-orb__fallback-pose--gas">
        <g className="voice-orb__fallback-drift voice-orb__fallback-drift--a">
          <g className="voice-orb__fallback-audio voice-orb__fallback-audio--body">
            <path
              className="voice-orb__fallback-gas-plume voice-orb__fallback-gas-plume--a"
              fill={`url(#${gradientId})`}
              filter={`url(#${filterId})`}
              d="M 77 192 C 55 151 87 109 132 118 C 144 69 208 55 238 93 C 276 70 326 97 318 143 C 358 157 360 211 321 228 C 339 273 294 309 253 287 C 225 336 158 333 139 287 C 90 306 52 257 78 219 C 67 211 66 201 77 192 Z"
            />
          </g>
        </g>

        <g className="voice-orb__fallback-drift voice-orb__fallback-drift--b">
          <g className="voice-orb__fallback-audio voice-orb__fallback-audio--density">
            <path
              className="voice-orb__fallback-gas-plume voice-orb__fallback-gas-plume--b"
              d="M 94 151 C 126 113 179 112 202 147 C 231 116 292 129 295 171 C 299 210 257 224 227 208 C 207 244 144 252 119 216 C 98 202 81 174 94 151 Z"
            />
            <path
              className="voice-orb__fallback-gas-plume voice-orb__fallback-gas-plume--c"
              d="M 154 229 C 177 199 217 197 237 224 C 275 205 310 238 291 269 C 273 296 230 293 211 274 C 183 297 130 278 133 248 C 135 239 143 233 154 229 Z"
            />
          </g>
        </g>

        <g className="voice-orb__fallback-drift voice-orb__fallback-drift--c">
          <path
            className="voice-orb__fallback-gas-ridge"
            fill="none"
            stroke={`url(#${highlightId})`}
            d="M 90 184 C 136 143 181 159 204 182 C 230 208 267 202 311 169"
          />
          <path
            className="voice-orb__fallback-gas-wisp"
            d="M 58 125 C 75 104 105 101 121 116 C 99 114 83 125 74 145 C 62 145 52 137 58 125 Z"
          />
        </g>
      </g>

      <StateFlows vortexCount={vortexCount} />
      <g className="voice-orb__fallback-failure voice-orb__fallback-failure--gas">
        <path d="M 61 231 C 124 201 168 209 217 226 C 263 242 305 237 354 205" />
        <path d="M 66 250 C 126 221 169 229 214 245 C 258 260 305 254 347 226" />
      </g>
    </g>
  );
}

function VaporMaterial({ filterId, gradientId, highlightId, vortexCount }: MaterialProps) {
  return (
    <g className="voice-orb__fallback-material voice-orb__fallback-material--vapor">
      <g className="voice-orb__fallback-pose voice-orb__fallback-pose--vapor">
        <g className="voice-orb__fallback-drift voice-orb__fallback-drift--a">
          <g className="voice-orb__fallback-audio voice-orb__fallback-audio--body">
            <path
              className="voice-orb__fallback-vapor-band voice-orb__fallback-vapor-band--broad"
              fill="none"
              stroke={`url(#${gradientId})`}
              filter={`url(#${filterId})`}
              d="M 52 238 C 105 154 160 117 215 142 C 264 164 291 251 354 194"
            />
          </g>
        </g>

        <g className="voice-orb__fallback-drift voice-orb__fallback-drift--b">
          <g className="voice-orb__fallback-audio voice-orb__fallback-audio--density">
            <path
              className="voice-orb__fallback-vapor-band voice-orb__fallback-vapor-band--mid"
              fill="none"
              stroke={`url(#${gradientId})`}
              d="M 64 271 C 119 218 146 177 193 180 C 245 183 286 226 342 160"
            />
            <path
              className="voice-orb__fallback-vapor-band voice-orb__fallback-vapor-band--ridge"
              fill="none"
              stroke={`url(#${highlightId})`}
              d="M 76 216 C 123 179 163 148 208 166 C 255 185 285 218 332 181"
            />
          </g>
        </g>

        <g className="voice-orb__fallback-drift voice-orb__fallback-drift--c">
          <path
            className="voice-orb__fallback-vapor-wisp"
            fill="none"
            stroke={`url(#${highlightId})`}
            d="M 107 118 C 141 92 181 100 202 126"
          />
          <path
            className="voice-orb__fallback-vapor-wisp voice-orb__fallback-vapor-wisp--detached"
            fill="none"
            stroke={`url(#${gradientId})`}
            d="M 267 285 C 296 305 329 291 345 263"
          />
        </g>
      </g>

      <StateFlows vortexCount={vortexCount} />
      <g className="voice-orb__fallback-failure voice-orb__fallback-failure--vapor">
        <path d="M 67 230 C 128 180 162 163 190 174" />
        <path d="M 218 195 C 263 219 295 210 342 169" />
      </g>
    </g>
  );
}

export function CloudFallback({ cloudMode, exiting, state, visual }: CloudFallbackProps) {
  const instanceId = useId().replaceAll(":", "");
  const gradientId = `voice-orb-fallback-gradient-${instanceId}`;
  const highlightId = `voice-orb-fallback-highlight-${instanceId}`;
  const filterId = `voice-orb-fallback-filter-${instanceId}`;
  const vortexCount = Math.max(1, Math.min(3, Math.round(visual.vortexCount)));
  const toneFocus = 24 + visual.tonePosition * 42;
  const displacement = 4 + visual.turbulence * 12;
  const materialProps = { filterId, gradientId, highlightId, vortexCount };

  return (
    <svg
      aria-hidden="true"
      className="voice-orb__canvas-fallback"
      data-cloud-fallback={cloudMode}
      data-exiting={exiting || undefined}
      data-state={state}
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 400 400"
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={`${toneFocus}%`}
          x2={`${Math.min(100, toneFocus + 48)}%`}
          y1="18%"
          y2="82%"
        >
          <stop offset="0" stopColor="var(--voice-orb-tone-lightest)" stopOpacity=".92" />
          <stop offset=".34" stopColor="var(--voice-orb-tone-bright)" stopOpacity=".88" />
          <stop offset=".7" stopColor="var(--voice-orb-tone-base)" stopOpacity=".74" />
          <stop offset="1" stopColor="var(--voice-orb-tone-deepest)" stopOpacity=".28" />
        </linearGradient>
        <linearGradient
          id={highlightId}
          gradientUnits="userSpaceOnUse"
          x1="4%"
          x2="94%"
          y1="18%"
          y2="72%"
        >
          <stop offset="0" stopColor="var(--voice-orb-tone-lightest)" stopOpacity="0" />
          <stop offset=".42" stopColor="var(--voice-orb-tone-lightest)" stopOpacity=".95" />
          <stop offset="1" stopColor="var(--voice-orb-tone-bright)" stopOpacity=".08" />
        </linearGradient>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence
            baseFrequency={cloudMode === "vapor" ? ".008 .014" : ".011 .018"}
            numOctaves="2"
            seed={cloudMode === "shell" ? "7" : cloudMode === "gas" ? "13" : "19"}
            type="fractalNoise"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={displacement}
            xChannelSelector="R"
            yChannelSelector="G"
            result="textured"
          />
          <feGaussianBlur
            in="textured"
            stdDeviation={cloudMode === "vapor" ? "2.2" : cloudMode === "gas" ? "1.5" : ".75"}
          />
        </filter>
      </defs>

      {cloudMode === "shell" && <ShellMaterial {...materialProps} />}
      {cloudMode === "gas" && <GasMaterial {...materialProps} />}
      {cloudMode === "vapor" && <VaporMaterial {...materialProps} />}
    </svg>
  );
}
