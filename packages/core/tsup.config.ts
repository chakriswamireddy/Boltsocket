import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  platform: 'neutral',  // works in both Node.js and browser
  target: 'es2020',
  minify: false,        // consumers' bundlers will minify
  outDir: 'dist',
  // Do not bundle peer dependencies
  external: ['zod'],
  esbuildOptions(options) {
    // Ensure pure annotations so bundlers can tree-shake class methods
    options.pure = ['console.debug', 'console.info', 'console.warn'];
  },
});
