import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  platform: 'browser',
  target: 'es2020',
  minify: false,
  outDir: 'dist',
  // Peer dependencies must not be bundled
  external: [
    '@bolt-socket/core',
    'react',
    'react-dom',
    'socket.io-client',
  ],
  esbuildOptions(options) {
    // Mark React JSX runtime as external
    options.jsx = 'automatic';
  },
});
