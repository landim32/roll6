# Tasks: Token com armas no editor de animação

**Input**: Design documents from `specs/092-editor-token-weapons/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/hub.md, quickstart.md

**Tests**: Vitest for the pure helper and the caption; xUnit for the prompt context and the hub field, as in the rest of
the project.

**Organization**: US1 weapons on the stage (P1) · US2 toggle, print caption and the Claude's context (P2). Paths are
relative to the repo root; `fe/` = `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirm the branch `092-editor-token-weapons` starts clean. Run `cd frontend && npm run lint && npm test`
  and `dotnet test` in `backend/` (with `-p:BaseOutputPath=<scratch>` while `Roll6.Console` runs). Note the counts.

---

## Phase 2: Foundational

- [X] T002 [P] Create `fe/lib/editorWeapons.ts`:
  - `SOCKET_LABEL` (pt-BR: 1 mão direita, 2 mão esquerda, 3 costas, 4 coldre direito, 5 coldre esquerdo);
  - `weaponItems(token)` returns "{nome} ({encaixe})" ordered by socket, skipping weapons without a model file;
  - `hasWeapons(token)`;
  - `EDITOR_WEAPONS_KEY = 'roll6:editor-weapons'`, plus `readWeaponsToggle()` / `writeWeaponsToggle(on)` with
    try/catch (missing = on).
- [X] T003 [P] Tests for T002 in `fe/lib/editorWeapons.test.ts`: order by socket; labels; no weapons → `[]`; a weapon
  without a file is skipped.

---

## Phase 3: User Story 1 — O palco mostra o token com as suas armas (P1) 🎯 MVP

**Goal**: the chosen token's weapons ride its sockets on the stage, placed like the table, following the edited
animation.

**Independent Test**: quickstart §1.

- [X] T004 [US1] `fe/components/animations/editor/AnimationStage.tsx` — props and lifecycle:
  - add the props `weapons?: SocketWeapons`, `showWeapons?: boolean` and `idleClip?: string | null` (the token's
    `modelIdleClip` choice);
  - keep `latest` refs for them;
  - create one `createWeaponSockets(onChange)` (`fe/components/story/weaponSockets.ts`) per stage, whose `onChange`
    re-applies visibility;
  - `reset()` it when the model is replaced or disposed.
- [X] T005 [US1] Same file — measure the sockets once per loaded model (research R2):
  - build the token's idle clip with the loaded asset's clip builder (`asset.clips({ idle: idleClip, walk: null,
    down: null }, library)`, loading a library `animation:{id}` through `fe/lib/animationCache.ts` first);
  - pose the model on its first frame with a temporary `AnimationMixer` (`update(0)`), or the rest pose without an
    idle;
  - `updateMatrixWorld(true)`, then `forgetSockets` and `measureSockets` (`fe/components/story/socketAnchors.ts`);
  - `weaponSockets.sync(model, height, weapons)`, with `height` = the asset bounds' height in the model's own units;
  - stop the temporary mixer and let the editor's `Player` re-apply the edited clip at its current instant (`update(0)`).
- [X] T006 [US1] Same file — react to prop changes:
  - another `weapons` (token switch to the same model file, or a grip change) → `weaponSockets.sync` only;
  - another `idleClip` → measure again (T005);
  - `showWeapons` → set `visible` on every attached weapon holder (mark them with `userData.roll6Weapon = true` in the
    `onChange` traversal, or use the sync's held objects).

  Make sure the existing bone picking ignores weapon meshes: if it raycasts meshes, filter out objects under a
  `roll6Weapon` holder.
- [X] T007 [US1] `fe/pages/AnimationEditorPage.tsx`: pass `weapons={socketWeaponsOf(token)}` (`fe/lib/weaponGrip.ts`)
  memoised on the token, `idleClip={token?.modelIdleClip ?? null}` and `showWeapons` (state from T009, default `true`
  until US2 lands) to `AnimationStage`.

**Checkpoint**: an armed token shows its weapons following the animation.

---

## Phase 4: User Story 2 — Ligar e desligar as armas e contar ao Claude (P2)

**Goal**: an "Armas" toggle, a print caption naming the weapons, and the weapons in the Claude's context.

**Independent Test**: quickstart §2.

- [X] T008 [P] [US2] `fe/lib/printCaption.ts`: optional `weapons?: string[]` in the caption input; when non-empty, add
  " O modelo carrega: {lista}." after the skeleton note. Add tests in `fe/lib/printCaption.test.ts` (with and without
  weapons).
- [X] T009 [US2] `fe/pages/AnimationEditorPage.tsx`:
  - state `showWeapons` from `readWeaponsToggle()`;
  - an "Armas" button next to "Esqueleto" in `.stm-editor-tools` (`btn-primary` when on, else `btn-outline-secondary`,
    `aria-pressed`, disabled when `!hasWeapons(token)`), desktop only like the skeleton button, writing
    `writeWeaponsToggle`;
  - the capture caption gets `weapons: showWeapons ? weaponItems(token) : []`;
  - `sendRequest` gets the weapon items.
- [X] T010 [US2] `fe/Contexts/AnimationEditorContext.tsx` and `fe/types/animationEditor.ts`: `RequestPayload.modelWeapons?:
  string[]`. Make `sendRequest(text, modelName, modelWeapons?)` send it, and update the call in
  `fe/components/animations/editor/EditorConversation.tsx` (a new `modelWeapons` prop passed by the page).
- [X] T011 [P] [US2] `backend/Roll6.DTO/Realtime/Animation/EditorInfos.cs`: `RequestInfo.ModelWeapons` (`List<string>?`,
  JSON `modelWeapons`), with `MAX_WEAPONS = 5` and `MAX_WEAPON_TEXT = 120`.
- [X] T012 [US2] Plumb the field through the backend:
  - `backend/Roll6.Application/Realtime/AnimationHub.cs`: `IsValid` refuses more than 5 items or an item over 120
    characters (`invalid`); `SendRequest` passes the trimmed items to `Enqueue`.
  - `backend/Roll6.Application/Realtime/AnimationConnections.cs`: `EditorRequest.ModelWeapons` (init), plus an
    optional `Enqueue` parameter.
  - At dispatch, pass it to `AnimationRequestBuilder.Build` (`backend/Roll6.Domain/Animations/AnimationRequestBuilder.cs`,
    new optional parameter), which forwards it to `AnimationPromptContext.Build(path, modelName, weapons)`.
- [X] T013 [US2] `backend/Roll6.Domain/Animations/AnimationPromptContext.cs`: after the model line, add "Armas do
  modelo: {lista} — elas acompanham as mãos e o corpo, mas não fazem parte do arquivo da animação." when the list is
  non-empty.
- [X] T014 [US2] Tests:
  - `backend/Roll6.Tests/Animations/AnimationRequestBuilderTests.cs`: the line is present with weapons and absent
    without;
  - `backend/Roll6.Tests/Application/AnimationHubTests.cs`: `modelWeapons` reaches the run's `SystemPrompt`; 6 items
    or a 121-character item → `invalid`.
- [X] T015 [P] [US2] i18n in `fe/i18n/locales/pt-BR.json`: `editor.weapons.label` "Armas", `editor.weapons.show`
  "Mostrar as armas do token", `editor.weapons.hide` "Esconder as armas", `editor.weapons.none` "Este token não tem
  armas".

---

## Phase 5: Polish & Cross-Cutting

- [X] T016 [P] `CLAUDE.md`: in the 086 page paragraph, add that the stage draws the chosen token's weapons
  (`socketWeaponsOf`, sockets measured on the token's idle first frame), the "Armas" toggle (`roll6:editor-weapons`), the
  caption note and `RequestInfo.modelWeapons` → "Armas do modelo" in the prompt. Add a Recent Changes line.
- [X] T017 Backend `dotnet build` + `dotnet test`; fix failures.
- [X] T018 Frontend `npm run lint && npm test && npm run build`; confirm `three` stays out of new eager imports in the
  page (the weapon modules are only imported by the lazy stage).
- [X] T019 Walk the quickstart where possible and append "Implementation notes" to this file.

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T003) → US1 → US2 → Polish.
- **US1**: T004 → T005 → T006 (same file), then T007.
- **US2**:
  - T008, T011 and T015 are parallel;
  - T009 needs T002, T007 and T008;
  - T010 follows T009;
  - T012 → T013 → T014 (backend chain, after T011).
- US2's backend half (T011–T014) is independent of the frontend half.

## Parallel Opportunities

- T002/T003 can run with the backend chain T011–T014; T008 and T015 run anytime.

## Implementation Strategy

1. **MVP = US1**: the weapons on the stage are the request.
2. US2 adds the toggle, the caption and the context.
3. Polish.

## Implementation notes (2026-10-18)

- **Deviations**:
  - T005/T006: the editor's `Player` gained two methods. `restPose()` was split out of `clear()`, and `refresh()`
    restores the rest pose and re-applies the edited clip at its instant. Without the rest restore, bones the edited
    clip does not animate stayed in the token's idle pose after the measurement.
  - `skeletonView.seeThrough` now skips the weapon holders. Weapon clones share their materials with the cached asset,
    so the see-through would have made every copy of the weapon translucent.
  - Bone picking needed no change: it projects the skeleton's joints and segments and never raycasts meshes.
  - The print caption takes the weapons visible when the markup is concluded; the toggle cannot change while the markup
    window is open.
- **Numbers**:
  - Backend: 2046 tests pass (+2: the context line with/without weapons, and the hub carrying `modelWeapons` to the
    system prompt with its limits).
  - Frontend: lint is clean; 944 tests pass in 102 files (new: `editorWeapons`, the caption's weapons note); the build
    is ok and the stage chunk stays lazy (56.7 kB).
- **Not verified in a browser**: the quickstart (weapons following the hands, same place as the table, the toggle, the
  caption) was not run here. It needs the dev API and a token with weapons.
