# Implementation Plan: Roll6 instalável (PWA)

**Branch**: `042-pwa-install` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/042-pwa-install/spec.md`

## Summary

Make the SPA installable on Android (Chrome) and iOS (Safari) without changing how the table works: a static
`manifest.webmanifest` with the brand icons (192/512, `any` + `maskable`, generated from the dark logo symbol), a tiny
hand-written service worker (`public/sw.js`) that only exists to make the app installable — it caches nothing and never
touches `/api`, `/hubs`, `/mcp` or media — registered in production builds only, the iOS meta tags and splash colour in
`index.html`, and the install UX: an "Instalar o Roll6" item in `UserMenu`, an iOS instructions modal reusable by #39,
and a one-time discreet notice on phones after login (clarification B). Pure detection rules live in `lib/install.ts`
(platform, standalone, hint already shown), state in a small `InstallContext` that captures `beforeinstallprompt`.
The homolog `frontend/nginx.conf` serves `sw.js`/the manifest with the right types and no cache; the production nginx
(outside the repo) gets the same rules documented in `quickstart.md`. No backend change, no new dependency.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend only)
**Primary Dependencies**: React 18, Vite 6, Bootstrap 5.3 (dark), i18next, sonner, Radix Dialog/Dropdown (existing) — **no new dependency** (no `vite-plugin-pwa`/Workbox: a 30-line service worker is simpler than a plugin and keeps the stack fixed, constitution II)
**Storage**: browser only — `localStorage` `roll6:install-hint` ("shown" once per device); nothing on the server
**Testing**: Vitest for the pure rules (`lib/install.test.ts`: platform/standalone/hint decisions, manifest sanity); manual install on Android/iOS (quickstart)
**Target Platform**: Chrome on Android (installs via `beforeinstallprompt`), Safari on iOS 16.4+ ("Adicionar à Tela de Início"), Chrome/Edge desktop
**Project Type**: web application (frontend SPA + nginx); backend untouched
**Performance Goals**: no extra network on start beyond the manifest and `sw.js` (both tiny); no change to load time
**Constraints**: SW must never cache or intercept API/hub/MCP/media; every deploy visible on the next open (≤ 2nd); SW off in `npm run dev`; HTTPS (prod) / localhost (dev)
**Scale/Scope**: 1 manifest, 1 SW, 4 icons, 1 context, 2 components (instructions modal, notice), 1 menu item, nginx rules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Architecture skills | Pass | No new entity (no backend, no CRUD service). The small `InstallContext` follows the existing Context + `hooks/useX` pattern. |
| II. Fixed stack | Pass | Vite/React/Bootstrap/i18next only; no PWA plugin, no new package. |
| III. Directory casing | Pass | `src/Contexts/InstallContext.tsx`, `src/hooks/useInstall.ts`, `src/lib/install.ts`. |
| IV. Code conventions | Pass | `interface` over `type`, no `enum` (consts), texts in `pt-BR.json`, Bootstrap Icons inlined (`icons.tsx`: share/box-arrow-up, plus-square, download). |
| V. Database | N/A | No schema change. |
| VI. Auth & security | Pass | Token stays in localStorage; SW does not see or store authenticated responses (it doesn't intercept fetches at all). |
| VII. Hex grid | N/A | — |
| No local Docker | Pass | nginx config edited, not run. |

Post-design re-check: unchanged — Pass.

## Project Structure

### Documentation (this feature)

```text
specs/042-pwa-install/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── pwa.md          # manifest, service worker, nginx and UI contracts
└── tasks.md            # /speckit.tasks
```

### Source Code (repository root)

```text
frontend/
├── index.html                          # + manifest link, apple-mobile-web-app-* metas
├── nginx.conf                          # + /sw.js and /manifest.webmanifest locations (types, no cache)
├── public/
│   ├── manifest.webmanifest            # new
│   ├── sw.js                           # new: install/activate only, no fetch handler
│   └── brand/
│       ├── icon-192.png, icon-512.png                    # new (any)
│       └── icon-maskable-192.png, icon-maskable-512.png  # new (maskable, safe zone)
└── src/
    ├── main.tsx                        # registerServiceWorker() in production; InstallProvider
    ├── lib/install.ts (+ .test.ts)     # pure: platform, standalone, canOfferInstall, shouldShowHint, hint storage
    ├── lib/serviceWorker.ts            # register (PROD only), update on each load
    ├── Contexts/InstallContext.tsx     # beforeinstallprompt capture, appinstalled, install(), iOS guide state
    ├── hooks/useInstall.ts
    ├── components/install/IosInstallGuide.tsx   # modal with the steps (reusable by #39)
    ├── components/install/InstallHint.tsx       # one-time notice on phones after login
    ├── components/menu/UserMenu.tsx    # + "Instalar o Roll6"
    ├── components/ui/icons.tsx         # + ShareIosIcon (bi-box-arrow-up), PlusSquareIcon, DownloadIcon
    ├── i18n/locales/pt-BR.json         # install.*
    └── styles/app.css                  # .stm-install-hint
```

**Structure Decision**: frontend-only change in the existing `frontend/` SPA; static PWA files under `public/` so Vite
copies them to the build root (`/manifest.webmanifest`, `/sw.js`), served by nginx.

## Complexity Tracking

No violations.
