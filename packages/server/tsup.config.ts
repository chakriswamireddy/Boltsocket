import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  platform: 'node',
  target: 'es2020',
  minify: false,
  outDir: 'dist',
  // Peer dependencies must not be bundled
  external: [
    '@bolt-socket/core',
    'socket.io',
    'zod',
  ],
});
