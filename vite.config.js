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
        // Vite 8 / Rolldown only accepts the function form of manualChunks
        // (the object form was Rollup-only).
        manualChunks: (id) => {
          if (id.includes('node_modules/cytoscape/')) return 'cytoscape';
        },
      },
    },
  },
});
