import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/onboarding.js")) return "onboarding";
          if (id.includes("/src/analytics/")) return "analytics";
        },
      },
    },
  },
});
