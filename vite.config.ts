/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // the lazily-loaded 3D stage chunk is mostly Three.js itself (~570 kB)
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          ethers: ["ethers"],
          motion: ["motion/react"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
