import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "core/index": "src/core/index.ts",
    "server/index": "src/server/index.ts",
    "react/index": "src/react/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  platform: "neutral",
  target: "es2020",
  minify: false,
  outDir: "dist",
  external: ["zod", "socket.io", "socket.io-client", "react"],
  esbuildOptions(options) {
    options.pure = ["console.debug", "console.info", "console.warn"];
  },
});
