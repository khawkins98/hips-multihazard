import { defineConfig } from 'vite';

export default defineConfig({
  base: '/hips-multihazard/',
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          cytoscape: ['cytoscape'],
        },
      },
    },
  },
});
