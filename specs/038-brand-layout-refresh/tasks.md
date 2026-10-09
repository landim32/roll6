# Tasks: Novo visual e logomarca do Roll6

**Input**: Design documents from `/specs/038-brand-layout-refresh/`
**Prerequisites**: plan.md, spec.md, research.md (D1..D10), data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: only the pure helper `lib/brandAsset.ts` gets a Vitest test (named in plan/quickstart); the rest is visual and validated by the manual steps of `quickstart.md`.

**Organization**: grouped by user story — US1 marca (P1), US2 cores (P2), US3 acabamento (P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1, US2, US3

Paths are relative to the repository root (`C:\repos\Roll6`). Frontend only — no backend, MCP or database change.

---

## Phase 1: Setup

- [X] T001 Run `npm run lint`, `npm test` and `npm run build` in `frontend/` to record the baseline, and note the current map area at 1366×768 (menu 56 px, footer 32 px) for SC-003

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the brand tokens every story reads.

- [X] T002 Create `frontend/src/styles/theme.css` with only the **tokens** of `data-model.md`: in `:root` `--stm-bg #0b1220`, `--stm-surface #121b2b`, `--stm-surface-2 #1a2638`, `--stm-border #2b3d52`, `--stm-border-strong #5b7694`, `--stm-accent #1fd67a`, `--stm-accent-rgb 31, 214, 122`, `--stm-accent-hover #3fe08e`, `--stm-accent-2 #00b890`, `--stm-on-accent #071322`, `--stm-radius 0.75rem`, `--stm-radius-sm 0.5rem`, `--stm-shadow 0 8px 24px rgba(0,0,0,.35)`; and in `[data-bs-theme="dark"]` the Bootstrap base variables `--bs-body-bg`, `--bs-body-bg-rgb`, `--bs-body-color #e6edf3` (+`-rgb`), `--bs-emphasis-color`, `--bs-secondary-color #9fb0c3`, `--bs-secondary-bg`, `--bs-tertiary-bg` (+ the `-rgb` forms), `--bs-border-color` mapped to the tokens (header comment: palette sampled from `docs/logomarca/*-escuro.png`, see research D1)
- [X] T003 Import it in `frontend/src/main.tsx` between `import 'bootstrap/dist/css/bootstrap.min.css';` and `import './styles/app.css';`, and remove the now duplicated `--stm-bg`, `--stm-surface`, `--stm-surface-2`, `--stm-border`, `--stm-accent` declarations from the `:root` block of `frontend/src/styles/app.css` (keep `--stm-controls-space`, `--stm-grid-line`, `--stm-menu-height`, `--stm-footer-height`)

**Checkpoint**: the app builds and runs; backgrounds already move to the brand navy.

---

## Phase 3: User Story 1 — A marca aparece onde o usuário chega (Priority: P1) 🎯 MVP

**Goal**: redesigned login with the vertical logo, horizontal logo in the desktop menu, symbol on phones and in the browser tab; dark versions only.

**Independent Test**: open the login page, sign in, look at the tab — vertical logo on the login (new background and card), horizontal in the menu (symbol below 768 px), symbol favicon; blocking `/brand/*` shows the text "Roll6"; signing in works as before.

### Assets

- [X] T004 [US1] Generate the brand files into `frontend/public/brand/` from `docs/logomarca/roll6-vertical-escuro.png` and `roll6-horizontal-escuro.png` with a throwaway Pillow script in the scratchpad (not committed), following `quickstart.md`: `roll6-vertical.webp`/`.png` 320 px wide; `roll6-horizontal.webp`/`.png` 80 px tall; the symbol cropped from the horizontal logo (opaque area up to the first fully transparent column before the "r", ≈ x 690 of 2043, padded to a square) as `roll6-symbol.webp`/`.png` 64×64, `favicon-32.png`, `favicon-48.png`, and `apple-touch-icon.png` 180×180 on `#0b1220` with 12% margin; LANCZOS, WebP `quality=90, method=6`, PNG `optimize=True`; confirm the folder totals ≤ 100 KB and look at each file (sharp, not cut, transparent background except the touch icon). Never copy the light ("claro") versions

### Tests

- [X] T005 [P] [US1] Create `frontend/src/lib/brandAsset.test.ts`: `brandAsset('vertical' | 'horizontal' | 'symbol')` returns `{ webp: '/brand/roll6-{v}.webp', png: '/brand/roll6-{v}.png', aspect }` with aspect 1263/1245, 2043/770 and 1; `brandSize(variant, height)` returns `{ width: Math.round(height * aspect), height }` and uses the defaults 160/40/32 when `height` is omitted

### Implementation

- [X] T006 [P] [US1] Create `frontend/src/lib/brandAsset.ts` (pure, no React): `BRAND_VARIANTS` as `const`, `BrandVariant` union, `BRAND_DEFAULT_HEIGHT`, `brandAsset(variant)` and `brandSize(variant, height?)` matching T005; make T005 pass
- [X] T007 [US1] Create `frontend/src/components/ui/BrandLogo.tsx` per `contracts/ui-contracts.md`: `interface BrandLogoProps { variant: BrandVariant; height?: number; className?: string }`; `<picture className="stm-brand-logo {className}">` with `<source type="image/webp" srcSet={webp}>` and `<img src={png} alt={t('common.appName')} width height decoding="async" onError={() => setFailed(true)} />`; when `failed`, render `<span className="stm-brand-text">{t('common.appName')}</span>` (FR-012)
- [X] T008 [US1] Redesign `frontend/src/pages/LoginPage.tsx` keeping `handleSubmit`, state, `Tabs`, fields, ids, `autoComplete`, hints and button untouched: wrap in `.stm-login` → `<BrandLogo variant="vertical" className="stm-login-logo" />` → `.stm-login-card`; turn the `<h1>` into `<h1 className="visually-hidden">{t('common.appName')}</h1>`
- [X] T009 [US1] Restyle the login in `frontend/src/styles/app.css` (replace `.stm-login`, `.stm-login-card`, `.stm-brand` rules): `.stm-login` `min-height: 100dvh`, column flex centered with `gap: 1.5rem`, background = `radial-gradient(ellipse at 50% 25%, rgba(var(--stm-accent-rgb), .12), transparent 60%)` over a repeated inline SVG data URI of flat-top hexagon outlines (stroke `#2b3d52`, `stroke-opacity .35`, tile ≈ 84×48 px) over `var(--stm-bg)`; `.stm-login-logo img` height 160 px (120 px below 768 px, `max-width: 70vw`, `height: auto`); `.stm-login-card` `max-width: 400px`, surface background, `--stm-border` border, `--stm-radius`, `--stm-shadow`, `overflow: hidden` and a `::before` 3 px strip `linear-gradient(90deg, var(--stm-accent), var(--stm-accent-2))`; `.stm-brand-text` = old `.stm-brand` look in `--stm-accent`
- [X] T010 [US1] In `frontend/src/components/menu/TopMenu.tsx` replace `<span className="stm-brand me-2">…</span>` with `<span className="stm-menu-brand me-2"><BrandLogo variant="horizontal" height={32} className="d-none d-md-inline-flex" /><BrandLogo variant="symbol" height={32} className="d-md-none" /></span>`; in `frontend/src/styles/app.css` add `.stm-menu-brand` (`display: inline-flex; align-items: center; flex-shrink: 0`) and `.stm-brand-logo img { display: block; object-fit: contain; max-width: 100% }`, keeping `--stm-menu-height` unchanged (FR-002, FR-010)
- [X] T011 [P] [US1] In `frontend/index.html` add `<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png" />`, the 48 px one, `<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />` and `<meta name="theme-color" content="#0b1220" />`; keep `<title>Roll6</title>` and `data-bs-theme="dark"`

**Checkpoint**: quickstart manual steps 1, 2, 3 and 8 pass.

---

## Phase 4: User Story 2 — As cores do site seguem a marca (Priority: P2)

**Goal**: the brand green replaces the gold and Bootstrap's blue everywhere it means "primary/active/success"; one single green; contrast kept.

**Independent Test**: walk login, menu, every modal, side panels, piece menu and map footer — green primaries with dark text, green active tabs/focus/checks/dropdown items/links, green success toasts and Mover "ok" path, red "over" path, no gold (`grep -rn d4a24c frontend/src` empty).

- [X] T012 [US2] Append the **component overrides** to `frontend/src/styles/theme.css` (research D2): `[data-bs-theme="dark"]` `--bs-primary`/`--bs-success` = `--stm-accent` (+ `-rgb`), `--bs-link-color`/`--bs-link-hover-color` (+ `-rgb`), `--bs-primary-text-emphasis`, `--bs-primary-bg-subtle`, `--bs-primary-border-subtle` and the success equivalents, `--bs-focus-ring-color: rgba(var(--stm-accent-rgb), .35)`; `.btn-primary, .btn-success` → `--bs-btn-color/--bs-btn-hover-color/--bs-btn-active-color: var(--stm-on-accent)`, `--bs-btn-bg/--bs-btn-border-color: var(--stm-accent)`, hover/active `var(--stm-accent-hover)`, `--bs-btn-disabled-bg/-border-color: var(--stm-accent)`, `--bs-btn-disabled-color: var(--stm-on-accent)`, `--bs-btn-focus-shadow-rgb: var(--stm-accent-rgb)`; `.btn-outline-primary, .btn-outline-success` → color/border `var(--stm-accent)`, hover bg `var(--stm-accent)` with `var(--stm-on-accent)` text; `.form-control, .form-select` `border-color: var(--stm-border-strong)`; `.form-control:focus, .form-select:focus, .form-check-input:focus` `border-color: var(--stm-accent); box-shadow: 0 0 0 .25rem rgba(var(--stm-accent-rgb), .25)`; `.form-check-input:checked` bg/border `var(--stm-accent)`; `.nav-pills` `--bs-nav-pills-link-active-bg: var(--stm-accent)`, `--bs-nav-pills-link-active-color: var(--stm-on-accent)`; `.dropdown-menu` `--bs-dropdown-link-active-bg: var(--stm-accent)`, `--bs-dropdown-link-active-color: var(--stm-on-accent)`; `.pagination` `--bs-pagination-active-bg/-border-color: var(--stm-accent)`, `--bs-pagination-active-color: var(--stm-on-accent)`, `--bs-pagination-focus-box-shadow`; `.progress, .progress-stacked` `--bs-progress-bar-bg: var(--stm-accent)`; `.form-range` thumb background; `.text-bg-primary, .text-bg-success` color `var(--stm-on-accent)`
- [X] T013 [P] [US2] Append the `sonner` success colors to `frontend/src/styles/theme.css`: `[data-sonner-toaster][data-theme="dark"] { --success-bg: …; --success-border: …; --success-text: … }` built from `--stm-accent` (dark tinted background, accent border and text) so `richColors` success toasts use the brand green (FR-008)
- [X] T014 [US2] In `frontend/src/styles/app.css` change the Mover "ok" colors to the brand green: `.stm-map .stm-move-trail.is-ok { stroke: rgba(var(--stm-accent-rgb), .85) }` and `.stm-map .stm-move-target.is-ok { fill: rgba(var(--stm-accent-rgb), .3); stroke: rgba(var(--stm-accent-rgb), .9) }`; the `.is-over` red and the gray object colors stay
- [X] T015 [US2] Search `frontend/src` for remaining brand-conflicting colors and route them to tokens: every `#d4a24c`/`--stm-accent` use (the resize frame and handle now read the green), the hard-coded `rgba(27, 30, 36, …)` menu/footer backgrounds → `rgba(18, 27, 43, …)` (surface `#121b2b` with the same alpha), `#1a1d21` in `.stm-story` → `var(--stm-bg)`; leave the semantic colors of piece discs, danger, warning, info, posture and the speech balloon text as they are (FR-008)
- [X] T016 [P] [US2] In `frontend/src/lib/mapSnapshot.ts` set `BACKGROUND = '#0b1220'` with a comment that it mirrors `--stm-bg` in `styles/theme.css` (the canvas can't read CSS variables) — FR-013; update any test that pins the old value
- [X] T017 [US2] Check the contrast pairs of research D1 in the running app (DevTools contrast picker or Lighthouse → Accessibility) on: login card, modal body text and secondary text, a primary button, an active tab, a focused input border, a success toast; fix any pair under 4.5:1 (text) / 3:1 (borders, icons) in `frontend/src/styles/theme.css` (FR-007)

**Checkpoint**: quickstart manual steps 4, 5, 7 and 9 pass; `grep -rn "d4a24c" frontend/src` finds nothing.

---

## Phase 5: User Story 3 — Layout mais limpo sem ficar pesado (Priority: P3)

**Goal**: same corners, shadows, titles and spacing in modals, panels, dropdowns and map controls; heights and positions unchanged.

**Independent Test**: compare before/after on desktop and phone — same controls in the same places, menu 56/100 px and footer 32 px unchanged, modals (Mapas, Personagem na Campanha, Tokens, Configurações, Chaves de API) share corner, shadow, title weight and footer.

- [X] T018 [US3] In `frontend/src/styles/app.css` make `.stm-modal-content` use `background: var(--stm-surface)`, `border: 1px solid var(--stm-border)`, `border-radius: var(--stm-radius)`, `box-shadow: var(--stm-shadow)`; `.stm-modal-content .modal-header, .modal-footer` border color `var(--stm-border)`; `.stm-modal-content .modal-title` `font-weight: 600`; `.stm-modal-overlay` background `rgba(5, 9, 16, .65)`
- [X] T019 [P] [US3] In `frontend/src/styles/app.css` give the active `.nav-tabs .nav-link.active` (used by `components/ui/Tabs.tsx`) a 2 px bottom border in `var(--stm-accent)` and `var(--bs-body-color)` text, inactive tabs `var(--bs-secondary-color)`, keeping the current tab height
- [X] T020 [US3] In `frontend/src/styles/app.css` apply `--stm-radius`/`--stm-radius-sm`, `--stm-border` and `--stm-shadow` to the side panels (`.stm-party`, `.stm-party-footer`), the dropdown menus (`.dropdown-menu` inside `.stm-menu`), the piece menu (HexMenu), the map controls and the turn console, replacing their individual radius/shadow values; do not change sizes, paddings that affect height, or positions
- [X] T021 [US3] In `frontend/src/styles/app.css` restyle `.stm-menu` and `.stm-footer`: background `rgba(18, 27, 43, .92)`, bottom/top border `var(--stm-border)`, same heights (`--stm-menu-height`, `--stm-footer-height`) and same phone two-row layout (`.stm-menu-break`)
- [X] T022 [US3] Verify on desktop (1366×768, 1920×1080) and phone (390×844) that the menu, footer and side panels kept their heights and the map area is the same (SC-003), and that no action moved (SC-005); fix regressions in `frontend/src/styles/app.css`

**Checkpoint**: quickstart manual step 6 passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 [P] Update `CLAUDE.md`: in the frontend section add a bullet on the visual identity (038) — palette tokens in `src/styles/theme.css` (imported between Bootstrap and `app.css`; one single green `--stm-accent` for primary, success and the Mover "ok" path, `--stm-on-accent` text on it; no brand hex outside it except `lib/mapSnapshot.BACKGROUND`), brand files in `public/brand/` (dark versions only, generated from `docs/logomarca`), `components/ui/BrandLogo` (vertical on the login, horizontal in the menu ≥ md, symbol below, text fallback); replace "Dark theme only" note if needed; add a `038-brand-layout-refresh` entry at the top of "Recent Changes"
- [X] T024 Run `npm run lint`, `npm test` and `npm run build` in `frontend/`; confirm `grep -rn "d4a24c" frontend/src` is empty and `frontend/public/brand/` ≤ 100 KB
- [ ] T025 Walk the whole `specs/038-brand-layout-refresh/quickstart.md` manual list with `npm run dev` (login works against a backend — homolog proxy or local API; without one, check the login/menu visuals only and record the rest as pending for the PR) — PARTIAL: login (desktop, 390 px, logo fallback, contrast) checked in the browser; menu, modals, map and share need a signed-in session (pending for the PR)

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T003)** → stories.
- **US1**: T004 (assets) and T005/T006 (helper) first; T007 needs T006; T008/T010 need T007; T009 after T008; T011 needs T004.
- **US2**: needs T002/T003 only; T012 → T013 (same file); T014, T015 share `app.css` with US1/US3 tasks — run sequentially.
- **US3**: needs T002/T003; all its CSS tasks touch `app.css` (sequential, except T019 which is an independent rule block).
- **Polish** after the stories.

### Parallel Opportunities

- US1: T004, T005 and T011 in parallel (different files); T006 alongside T004.
- US2: T013 (theme.css, after T012) and T016 (`mapSnapshot.ts`) alongside the `app.css` work.
- US3: T019 alongside T018.

## Parallel Example: User Story 1

```text
Task: "T004 Generate frontend/public/brand/* from docs/logomarca (dark only)"
Task: "T005 lib/brandAsset.test.ts"
Task: "T006 lib/brandAsset.ts"
```

## Implementation Strategy

### MVP (US1)

1. T001–T003 (tokens), then T004–T011.
2. Validate: the logo is everywhere it should be and the login is redesigned — the most visible part of issue #36.

### Incremental delivery

1. + US2: brand colors and a single green (no gold left).
2. + US3: uniform finish.
3. Polish: CLAUDE.md, build, manual pass.
