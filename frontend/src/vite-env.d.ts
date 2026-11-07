/// <reference types="vite/client" />

/** Id of this build (110, `vite.config.ts`); `dev` in `npm run dev` and in the tests. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Base URL of the backend API; empty = same origin (/api proxied by Vite or nginx). */
  readonly VITE_API_URL: string;
  /** Dev server only: where Vite proxies /api (default http://localhost:5119). */
  readonly VITE_API_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
