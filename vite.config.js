import { defineConfig } from 'vite';

export default defineConfig({
  base: '/hips-multihazard/',
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
