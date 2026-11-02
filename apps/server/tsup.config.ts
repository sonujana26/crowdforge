import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  noExternal: ['@crowdforge/shared'],
  clean: true,
});
