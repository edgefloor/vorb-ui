import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [
    react(),
    cssInjectedByJsPlugin({
      jsAssetsFilterFunction: (chunk) =>
        chunk.fileName === "vorb-ui.js" || chunk.fileName === "vorb-ui.cjs",
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: {
        "vorb-ui": resolve(__dirname, "src/index.ts"),
        adapters: resolve(__dirname, "src/adapters/index.ts"),
        "livekit-adapter": resolve(__dirname, "src/adapters/livekit/browser.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}${format === "cjs" ? ".cjs" : ".js"}`,
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "livekit-client"],
    },
  },
});
