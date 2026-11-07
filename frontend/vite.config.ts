/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { buildVersion, versionJson } from './src/lib/appVersion'

/** 110: writes dist/version.json with the same id the bundle carries in __APP_VERSION__. */
const appVersion = (version: string): Plugin => ({
  name: 'roll6-app-version',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: versionJson(version) })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  // Dev server proxy: with VITE_API_URL empty the app calls /api on its own origin and Vite
  // forwards it here — same setup as nginx in Docker, so no CORS is needed against any API.
  const apiProxy = env.VITE_API_PROXY || 'http://localhost:5119'
  // MCP server (020, separate project: dotnet run --project Roll6.Mcp).
  const mcpProxy = env.VITE_MCP_PROXY || 'http://localhost:5129'
  // 110: one id per build; the dev server and the tests never compare versions.
  const version = mode === 'production' ? buildVersion(new Date()) : 'dev'

  return {
    plugins: [react(), appVersion(version)],
    define: { __APP_VERSION__: JSON.stringify(version) },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiProxy, changeOrigin: true },
        // Real-time table events (SignalR, WebSocket upgrade).
        '/hubs': { target: apiProxy, changeOrigin: true, ws: true },
        // MCP server for AI assistants (020, Streamable HTTP).
        '/mcp': { target: mcpProxy, changeOrigin: true },
      },
    },
    test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
