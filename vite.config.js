import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths, so dist/ works under any GitHub Pages sub-folder
  build: { chunkSizeWarningLimit: 2000 }, // Phaser is one big chunk
  test: { include: ['tests/unit/**/*.test.js'] },
});
