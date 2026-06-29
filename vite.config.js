import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  publicDir: "public",
  // Dev only: pre-transform the module graph on server start so the first load
  // doesn't pay the lazy per-module transform tax across the unbundled waterfall.
  // app.js warms the eager graph; the other two are deferred imports (see boot rules).
  server: {
    warmup: {
      clientFiles: [
        "./src/app.js",
        "./src/analytics/index.js",
        "./src/onboarding/tour.js",
      ],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/onboarding/tour.js")) return "onboarding";
          if (id.includes("/src/analytics/")) return "analytics";
        },
      },
    },
  },
});
