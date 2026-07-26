import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Vite's dev server defaults to appType 'spa', which serves index.html for any unmatched
// path — so deep links like /projects/minecraft-pathfinding work in dev with no extra
// config. Production needs the equivalent rewrite; that lives in vercel.json.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
});
