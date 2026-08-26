import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export function createViteConfig({ mode }) {
  const libraryBuild = mode === "library";

  return {
    plugins: [react()],
    build: libraryBuild
      ? {
          emptyOutDir: true,
          lib: {
            entry: resolve(import.meta.dirname, "src/libroot.js"),
            fileName: () => "treebox.js",
            formats: ["umd"],
            name: "treebox",
          },
          outDir: "build",
          rolldownOptions: {
            output: {
              exports: "default",
            },
          },
          sourcemap: true,
          target: "es2015",
        }
      : {
          emptyOutDir: true,
          outDir: "build",
        },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/setupTests.js",
    },
  };
}

export default defineConfig(createViteConfig);
