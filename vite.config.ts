import { fileURLToPath } from "node:url";
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
    illustrationAnimationTuningPlugin({
      tracks: {
        "ram-box": {
          lyricsExport: "RAM_BOX_LYRICS",
          lyricsFile: "src/pages/ram-box/model/lyrics.ts",
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src", import.meta.url)),
      "@entities": fileURLToPath(new URL("./src/entities", import.meta.url)),
      "@features": fileURLToPath(new URL("./src/features", import.meta.url)),
      "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      "@widgets": fileURLToPath(new URL("./src/widgets", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
