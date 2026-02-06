import { defineConfig } from 'vite';

export default defineConfig({
  base: '/hips-multihazard/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
