/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const FRONTEND = fileURLToPath(new URL('../../frontend', import.meta.url));

/**
 * The 3D view of the roll6anime (062): a page without React that imports the site's own 3D code (`@roll6/…` =
 * `frontend/src`), so an animation plays exactly as in the Roll6, and resolves `three` to the frontend's single copy.
 * Built into the WPF project's `wwwroot/viewer`, served there through a WebView2 virtual host.
 */
export default defineConfig({
  base: './',
  resolve: {
    alias: [
      { find: /^@roll6\//, replacement: `${FRONTEND}/src/` },
      { find: /^three$/, replacement: `${FRONTEND}/node_modules/three/build/three.module.js` },
      { find: /^three\/(.*)$/, replacement: `${FRONTEND}/node_modules/three/$1` },
    ],
  },
  server: { fs: { allow: ['..', FRONTEND] } },
  build: {
    outDir: '../Roll6Anime/wwwroot/viewer',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  test: { environment: 'node' },
});
