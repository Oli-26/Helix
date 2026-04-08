import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': '/src/shared',
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'preload.js',
      },
    },
  },
});
