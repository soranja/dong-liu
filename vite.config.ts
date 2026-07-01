import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { illustrationAnimationTuningPlugin } from "./tools/tuning/illustrationAnimationTuningPlugin";

export default defineConfig({
  plugins: [
    reactRouter(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    illustrationAnimationTuningPlugin(),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
