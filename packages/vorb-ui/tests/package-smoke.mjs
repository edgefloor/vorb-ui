import assert from "node:assert/strict";
import { createRequire } from "node:module";

const esm = await import("../dist/vorb-ui.js");
const adapters = await import("../dist/adapters.js");
const livekit = await import("../dist/livekit-adapter.js");
const require = createRequire(import.meta.url);
const cjs = require("../dist/vorb-ui.cjs");

assert.equal(typeof esm.Orb, "object");
assert.equal(typeof esm.VoiceOrb, "object");
assert.equal(typeof cjs.Orb, "object");
assert.equal(typeof adapters.createVapiAdapter, "function");
assert.equal(typeof livekit.createLiveKitAdapter, "function");
assert.ok(esm.ORB_SCALES.crystal.states.thinking);
console.log("built package ESM, CJS, SSR, adapters, and scale exports passed");
