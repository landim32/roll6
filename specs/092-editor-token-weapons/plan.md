# Implementation Plan: Token com armas no editor de animação

**Branch**: `092-editor-token-weapons` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/092-editor-token-weapons/spec.md`

## Summary

The animation editor's stage (`AnimationStage`) draws the chosen token's **weapons on their sockets**. It reuses, without
copying, the machinery of the 3D view and the token preview (082/083/085):
- `socketWeaponsOf(token)` reads the token's weapons;
- `socketAnchors.measureSockets` measures the sockets;
- `createWeaponSockets` keeps them in step with what the token asks for.

The sockets are measured as the table measures them: on the first frame of the **token's own idle animation**, else the
rest pose. They are then carried by the bones, so the weapons follow the edited animation at any instant (FR-002).

A **"Armas"** toggle next to "Esqueleto" hides or shows them. It is remembered in `roll6:editor-weapons` and disabled
for a token without weapons.

The print caption lists the visible weapons and their sockets. Each request sends them to the server
(`RequestInfo.modelWeapons`), which adds one line to the Claude's context (`AnimationPromptContext`). Weapons never touch
the animation file.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (editor); C# 12 / .NET 8 (one hub DTO field and one context line).
**Primary Dependencies**: existing only.
- `three` 0.186.1, lazy, in the stage chunk.
- The 082/083/085 weapon modules: `loadWeapon`, `attachWeapons`, `weaponSockets`, `socketAnchors`, `lib/weaponGrip`.
- `loadModel`'s clip builder (`createClipBuilder`) and `lib/animationCache` for a library idle.

**No new dependency.**
**Storage**: none new. `roll6:editor-weapons` (localStorage, per device) holds the toggle.
**Testing**:
- Vitest:
  - `lib/printCaption` (weapons note);
  - `lib/editorWeapons` (socket labels, the weapons line from a token, the toggle default).
- xUnit: `AnimationPromptContext` with/without weapons, plus the hub carrying `modelWeapons` to the run's system prompt.
- Lint and build.

**Target Platform**: web, desktop and phones (the toggle follows the skeleton button: desktop only).
**Project Type**: web application.
**Performance Goals**: weapons load once per URL (the `loadWeapon` cache) and nothing runs per frame for them, because
they ride the bones (SC-003).
**Constraints**:
- Same placement as the table (FR-002).
- Picking bones and the gizmo are unaffected.
- The 091 save flow is untouched.

**Scale/Scope**:
- About 5 frontend files and 1 new pure module.
- 2 backend files (DTO + prompt context), plus the hub/connection plumbing for one field.

## Constitution Check

| Principle | Status |
|---|---|
| I. Skills obrigatórias | ✅ no new entity |
| II. Stack fixa | ✅ nothing added; `three` stays lazy |
| III. Case sensitivity | ✅ unchanged folders |
| IV. Convenções | ✅ `interface`, constants, pure helpers tested |
| V. Banco | ✅ no schema change |
| VI. Auth | ✅ hub unchanged in access; the field is plain text, bounded |
| VII. Hex grid | ✅ not touched |

Post-design re-check: ✅.

## Project Structure

### Documentation (this feature)

```text
specs/092-editor-token-weapons/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/hub.md        RequestInfo.modelWeapons + the context line
└── tasks.md                (/speckit.tasks)
```

### Source Code

```text
frontend/src/
├── lib/editorWeapons.ts (+test)           socket labels pt-BR, weaponsLine(token), hasWeapons, toggle storage key
├── components/animations/editor/AnimationStage.tsx
│                                          props weapons (SocketWeapons) + showWeapons; measure sockets on the token's
│                                          idle first frame (or rest), createWeaponSockets.sync/refresh/reset, visibility
├── pages/AnimationEditorPage.tsx          socketWeaponsOf(token) → stage; "Armas" toggle; caption + request get weapons
├── Contexts/AnimationEditorContext.tsx    sendRequest(text, modelName, modelWeapons)
├── lib/printCaption.ts (+test)            weapons note
├── types/animationEditor.ts               RequestPayload.modelWeapons
└── i18n/locales/pt-BR.json                editor.weapons.*
backend/
├── Roll6.DTO/Realtime/Animation/EditorInfos.cs      RequestInfo.ModelWeapons (≤ 5 × ≤ 120 chars)
├── Roll6.Application/Realtime/AnimationHub.cs + AnimationConnections.cs   validate, keep, pass to Build
├── Roll6.Domain/Animations/AnimationRequestBuilder.cs + AnimationPromptContext.cs   one "Armas do modelo: …" line
└── Roll6.Tests/                                     prompt context + hub test
CLAUDE.md                                            086 paragraph: the stage shows the token's weapons
```

**Structure Decision**: the stage gains weapons by composing the existing weapon modules; only a line of context
crosses to the server.

## Phases

1. Pure helper + caption (US2 groundwork); stage weapons (US1).
2. Page wiring and toggle (US1/US2).
3. Server context line (US2).
4. CLAUDE.md, lint/test/build.

## Complexity Tracking

None.
