import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "tests/e2e/fixture",
  plugins: [react()],
  server: { strictPort: true },
});
