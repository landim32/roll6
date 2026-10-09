# Tasks: Roll6 instalável (PWA)

**Input**: Design documents from `/specs/042-pwa-install/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pwa.md, quickstart.md

**Tests**: unit tests for the pure install rules only (`lib/install.test.ts`), as in the plan; the rest is checked by the manual pass in `quickstart.md`.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (static PWA files)

- [X] T001 [P] Generate the four icons from `frontend/public/brand/roll6-symbol.png` (Python + Pillow, script kept in the scratchpad, not in the repo): `frontend/public/brand/icon-192.png` and `icon-512.png` (purpose any: symbol centered on transparent, ~90% of the side) and `icon-maskable-192.png` / `icon-maskable-512.png` (purpose maskable: navy `#0b1220` background, symbol at ~70% so the 80% safe zone keeps it whole)
- [X] T002 [P] Create `frontend/public/manifest.webmanifest` exactly as `contracts/pwa.md` §1 (id, name, short_name, description, lang pt-BR, start_url/scope "/", display standalone, orientation any, background/theme `#0b1220`, the four icons)
- [X] T003 [P] Create `frontend/public/sw.js` per `contracts/pwa.md` §2: `install` → `self.skipWaiting()`; `activate` → delete every `caches.keys()` entry then `self.clients.claim()`; **no `fetch` listener**; header comment saying why (nothing cached, API/hub/MCP/media never intercepted, #39 adds push here)
- [X] T004 Update `frontend/index.html`: `<link rel="manifest" href="/manifest.webmanifest" />`, `mobile-web-app-capable`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title` "Roll6", `apple-mobile-web-app-status-bar-style` "black-translucent"; add `viewport-fit=cover` to the viewport meta (keep the 040 SSI meta block and the existing icons/theme-color)
- [X] T005 [P] Update `frontend/nginx.conf`: `location = /sw.js` (`Cache-Control: no-cache`, `Service-Worker-Allowed: /`, `try_files $uri =404`) and `location = /manifest.webmanifest` (`default_type application/manifest+json`, `Cache-Control: no-cache`, `try_files $uri =404`), placed before `location /` (outside the SSI block)

---

## Phase 2: Foundational (blocking for all stories)

- [X] T006 [P] Create `frontend/src/lib/serviceWorker.ts`: `registerServiceWorker()` — only when `import.meta.env.PROD` and `'serviceWorker' in navigator`; on `window` `load` register `/sw.js` with `{ scope: '/', updateViaCache: 'none' }` then `registration.update()`; failures → `console.warn`, never thrown. Call it from `frontend/src/main.tsx` after `createRoot(...).render(...)`
- [X] T007 [P] Create `frontend/src/lib/install.ts` (pure, values passed in): `INSTALL_HINT_KEY = 'roll6:install-hint'`, `interface InstallEnvironment { userAgent; platform; maxTouchPoints; standaloneMedia: boolean; navigatorStandalone?: boolean }`, `isIos(env)` (iPhone/iPad/iPod UA, or `MacIntel` with maxTouchPoints > 1), `isIosSafari(env)` (iOS and not CriOS/FxiOS/EdgiOS/OPiOS), `isStandalone(env)`, `canOfferInstall({ standalone, ios, hasPrompt })`, `shouldShowHint({ canInstall, phone, loggedIn, hintShown, modalOpen })`, `readHintShown()`/`markHintShown()` (localStorage, try/catch)
- [X] T008 [P] Create `frontend/src/lib/install.test.ts`: iPhone/iPad/iPadOS-desktop UA → iOS; Android Chrome → not iOS; Chrome on iOS → iOS but not Safari; standalone by media or `navigator.standalone`; `canOfferInstall` (standalone → false; iOS → true; prompt → true; neither → false); `shouldShowHint` truth table; hint storage survives a throwing localStorage
- [X] T009 Create `frontend/src/Contexts/InstallContext.tsx` + `frontend/src/hooks/useInstall.ts`: captures `beforeinstallprompt` (`preventDefault()`, keep the event), clears it on `appinstalled` (toast `install.installed`), tracks `display-mode: standalone` changes; exposes `{ canInstall, standalone, ios, iosSafari, install, guideOpen, openGuide, closeGuide }` where `install()` = `prompt()` + `userChoice` then clear (Android/desktop) or `openGuide()` (iOS). Register `InstallProvider` in `frontend/src/main.tsx` right after `AuthProvider` (comment in the provider chain)

**Checkpoint**: the production build is installable from the browser's own menu; the app's UI comes next.

---

## Phase 3: User Story 1 — Instalar no Android pelo botão do app (P1) 🎯 MVP

**Goal**: "Instalar o Roll6" in the user menu and the one-time phone notice trigger the system install dialog; installed, the app opens full screen.
**Independent Test**: Android Chrome on the published site → menu item → install → open from the icon (quickstart step 1).

- [X] T010 [P] [US1] Add `DownloadIcon` (bi-download), `ShareIosIcon` (bi-box-arrow-up) and `PlusSquareIcon` (bi-plus-square) to `frontend/src/components/ui/icons.tsx` (official Bootstrap Icons paths)
- [X] T011 [US1] Add the "Instalar o Roll6" item to `frontend/src/components/menu/UserMenu.tsx` (icon + `install.menu`), shown only when `useInstall().canInstall`, calling `install()`
- [X] T012 [US1] Create `frontend/src/components/install/InstallHint.tsx`: small fixed card at the bottom (above the map footer / chat composer, `role="status"`, not blocking), text `install.hintTitle`/`install.hintText`, buttons "Instalar" (`install()`) and "Agora não" + ✕ (close); rendered by `frontend/src/pages/MainPage.tsx` (only inside the logged-in app) when `shouldShowHint({ canInstall, phone: useMediaQuery('(max-width: 767.98px)'), loggedIn, hintShown: readHintShown(), modalOpen: false })`; calls `markHintShown()` when it appears; on Android it appears only once the prompt event exists
- [X] T013 [US1] Add `install.*` keys to `frontend/src/i18n/locales/pt-BR.json` (`menu`, `hintTitle`, `hintText`, `hintInstall`, `hintLater`, `hintClose`, `installed`) and `.stm-install-hint` styles to `frontend/src/styles/app.css` (card with the brand surface, radius, shadow, safe-area bottom inset, z-index above the map layers and below modals)

**Checkpoint**: Android installs from the menu or the notice; US1 complete.

---

## Phase 4: User Story 2 — Instalar no iPhone/iPad com o guia (P1)

**Goal**: on iOS the same entry points open a guide with the "Compartilhar → Adicionar à Tela de Início" steps; installed, the app opens full screen under the status bar.
**Independent Test**: iPhone Safari → menu or notice → guide → add to home screen → open the icon (quickstart step 2).

- [X] T014 [US2] Create `frontend/src/components/install/IosInstallGuide.tsx` (Radix `components/ui/Modal`): numbered steps with `ShareIosIcon` / `PlusSquareIcon` (`install.guideStep1..3`), the `install.guideOtherBrowser` note when `!iosSafari`, "Entendi" closes; driven by `useInstall().guideOpen`/`closeGuide`; rendered once in `frontend/src/App.tsx` (or `MainPage`) so #39 can call `openGuide()` from anywhere
- [X] T015 [US2] Safe area for the full-screen iOS app: `frontend/src/styles/app.css` — the menu (`.stm-menu`) gets `padding-top: env(safe-area-inset-top)` and its height grows by the same inset (via `--stm-menu-height: calc(56px + env(safe-area-inset-top))` and the phone value), bottom bars (footer, chat composer, install hint) add `env(safe-area-inset-bottom)`; with no notch the insets are 0 so the browser layout is unchanged
- [X] T016 [US2] Add the guide keys to `frontend/src/i18n/locales/pt-BR.json` (`guideTitle`, `guideStep1`, `guideStep2`, `guideStep3`, `guideOtherBrowser`, `guideClose`)

**Checkpoint**: iOS installs with the guide; US2 complete.

---

## Phase 5: User Story 3 — O app instalado se mantém atualizado e não atrapalha a mesa (P2)

**Goal**: deploys reach the installed app on the next open; real time, chat and slug links work the same.
**Independent Test**: quickstart steps 3–4 and the DevTools checks (no cache, no SW in API requests).

- [X] T017 [US3] Verify against `npx vite preview` (production build): DevTools Application shows the manifest without errors and installability OK, `/sw.js` active, Cache Storage empty, `/api` and `/hubs` requests not served by the SW, and `npm run dev` registers no SW; fix anything found in `frontend/public/sw.js` / `frontend/src/lib/serviceWorker.ts`
- [X] T018 [US3] Document the production nginx blocks and checks in `specs/042-pwa-install/quickstart.md` (already drafted) and in the `CLAUDE.md` Environments section (the shared nginx must serve `/sw.js` no-cache and `/manifest.webmanifest` as `application/manifest+json`)

---

## Phase 6: Polish & Cross-Cutting

- [X] T019 [P] Update `CLAUDE.md` frontend section: PWA bullet (manifest, `sw.js` without fetch handler and why, PROD-only registration, `InstallContext`/`useInstall`, `lib/install.ts`, `IosInstallGuide` reusable by #39, one-time `InstallHint` with `roll6:install-hint`, icons, iOS metas/safe area) and the Recent Changes entry for 042
- [X] T020 Run `npm run lint`, `npm test`, `npm run build` in `frontend/`; fix anything broken
- [ ] T021 Manual pass from `quickstart.md` on a real Android and iPhone after the frontend is published (record what could not be run as pending for the PR)

---

## Dependencies & Execution Order

- Setup (T001–T005) → Foundational (T006–T009) → US1 (T010–T013) and US2 (T014–T016) in either order (both need T009; T014 needs T010's icons) → US3 (T017–T018) → Polish.
- US1 and US2 are independent once the context exists; US3 only verifies/documents.

## Parallel Example

```text
T001, T002, T003, T005 together (different files)
T006, T007, T008 together, then T009
T010 alongside T012/T013 drafting
```

## Implementation Strategy

1. MVP = Setup + Foundational + US1 (Android, the most common device at the table).
2. Add US2 (iOS guide + safe area).
3. US3 checks and docs, then polish and the manual pass after publishing.
