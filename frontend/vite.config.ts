/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  // Dev server proxy: with VITE_API_URL empty the app calls /api on its own origin and Vite
  // forwards it here — same setup as nginx in Docker, so no CORS is needed against any API.
  const apiProxy = env.VITE_API_PROXY || 'http://localhost:5119'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': { target: apiProxy, changeOrigin: true } },
    },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
