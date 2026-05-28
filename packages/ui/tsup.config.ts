import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/primitives/index.ts', 'src/theme/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom'],
});
