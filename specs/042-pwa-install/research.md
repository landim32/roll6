# Research: Roll6 instalável (PWA)

## D1 — Hand-written service worker vs `vite-plugin-pwa`

- **Decision**: a small hand-written `public/sw.js` (install → `skipWaiting`, activate → `clients.claim` and delete any
  old caches), **no `fetch` handler**.
- **Rationale**: Chrome no longer requires a fetch handler for installability (since Chrome 108 the criteria are a
  valid manifest + HTTPS; the SW is needed for the install prompt to be offered consistently and for #39's push).
  Without a fetch handler the SW never intercepts `/api`, `/hubs`, `/mcp`, media or the HTML, so nothing can go stale
  and every deploy is served straight from the network (FR-007/FR-008). It keeps constitution II (no new package).
- **Alternatives**: `vite-plugin-pwa` (Workbox precache; adds a dependency and a precache that must be invalidated per
  deploy — the exact risk FR-008 forbids); a network-first fetch handler (no benefit without offline mode, which is out
  of scope).

## D2 — Update on every deploy

- **Decision**: serve `sw.js` with `Cache-Control: no-cache` and register it with `updateViaCache: 'none'`; call
  `registration.update()` on each load. Because the SW caches nothing, the app's own files are always the network's
  (index.html is already `no-cache`, `/assets/*` are hashed) — so a new deploy shows on the next open; the SW itself
  changing only matters for #39.
- **Alternatives**: a version string baked into `sw.js` per build (not needed while the SW has no cache).

## D3 — Register only in production

- **Decision**: `lib/serviceWorker.ts` registers `/sw.js` only when `import.meta.env.PROD` and `'serviceWorker' in
  navigator`, after `window` `load`. In `npm run dev` nothing registers (FR-010), so Vite's HMR is untouched.

## D4 — Install detection

- **Decision** (`lib/install.ts`, pure, with the navigator/window values passed in):
  - *standalone*: `matchMedia('(display-mode: standalone)').matches || navigator.standalone === true` (iOS).
  - *iOS*: iPhone/iPad/iPod in the user agent, or `MacIntel` with touch points > 1 (iPadOS desktop UA).
  - *canOfferInstall*: not standalone and (a captured `beforeinstallprompt` event exists **or** iOS).
  - Android/desktop: capture `beforeinstallprompt` with `preventDefault()` (so the browser's own mini-infobar never
    shows on its own — FR-004), keep the event, call `prompt()` only on the user's tap; `appinstalled` clears it.
  - iOS: no event; the item opens the guide. In a non-Safari iOS browser the guide adds a line pointing to the
    browser's own share menu / Safari.
- **Alternatives**: `getInstalledRelatedApps` (needs related_applications; overkill).

## D5 — One-time notice on phones (clarification B)

- **Decision**: `InstallHint` renders after login (inside the authenticated app), on phones only (`(max-width:
  767.98px)` or a coarse pointer), when `canOfferInstall` and `localStorage roll6:install-hint` is unset; it marks
  "shown" when it appears (so a reload doesn't bring it back), sits as a small card at the bottom above the map footer /
  chat composer (non-blocking, `role="status"`), and closes on "Agora não", ✕ or "Instalar". On Android it waits for the
  `beforeinstallprompt` event; on iOS it shows right away. Not cleared on logout (it's about the device, not the user).
- **Alternatives**: per-user flag on the server (the clarification says per device).

## D6 — Icons and splash

- **Decision**: generate from `public/brand/roll6-symbol.png` (dark logo symbol already used by the favicons):
  `icon-192.png`/`icon-512.png` (`purpose: any`, symbol on transparent) and `icon-maskable-192.png`/`-512.png`
  (`purpose: maskable`, symbol at ~70% on the brand navy `#0b1220` so the 80% safe zone keeps it whole). Android builds
  its splash from `name` + `background_color` + the 512 icon; iOS uses `apple-touch-icon` (already 180×180) and the
  `background_color` — no per-device iOS startup images (they need ~20 sizes for a marginal gain; the navy screen
  matches the app's first paint).
- **Manifest**: `name`/`short_name` "Roll6", `id` "/", `start_url` "/", `scope` "/", `display` "standalone",
  `orientation` "any", `lang` "pt-BR", `background_color`/`theme_color` `#0b1220`, `description` from the 040 default.
  Links inside the scope (`/campaign/{slug}`, `/map/{slug}`) open in the installed app; the nginx `try_files` already
  serves the SPA for them (FR-009).

## D7 — iOS meta tags

- **Decision**: `<link rel="manifest">`, `<meta name="apple-mobile-web-app-capable" content="yes">` (+ the standard
  `mobile-web-app-capable`), `apple-mobile-web-app-title` "Roll6", `apple-mobile-web-app-status-bar-style`
  "black-translucent" with `viewport-fit=cover` so the navy app reaches the status bar; the existing safe-area-aware
  layout keeps the menu below the notch (`env(safe-area-inset-top)` added to the menu padding).

## D8 — nginx

- **Decision**: homolog `frontend/nginx.conf` gets `location = /sw.js` (`Cache-Control: no-cache`,
  `Service-Worker-Allowed: /`, default JS type) and `location = /manifest.webmanifest`
  (`default_type application/manifest+json`, `Cache-Control: no-cache`), both with `try_files $uri =404` and outside
  the SSI block. The production nginx is shared and outside the repo: `quickstart.md` lists the same two blocks for
  whoever deploys.
