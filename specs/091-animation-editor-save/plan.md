# Implementation Plan: Editor de animação com salvar explícito

**Branch**: `091-animation-editor-save` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/091-animation-editor-save/spec.md`

## Summary

The animation editor (086/089) stops writing to the library on every change.

- **Edit version in the tab** (Q1 = A): the editor keeps two contents.
  - The **saved** one is the library's; the **edit** one is what the stage shows.
  - Turned bones, undo/redo and the Claude's valid files change only the edit version.
  - **"Salvar"** writes it with the existing `PUT /api/animation/{id}/content`, along with a fresh 090 thumbnail.
    **"Descartar"** goes back to the saved one.
  - A badge shows the unsaved state, and `useLeaveGuard` asks before leaving.
- **Hub changes**:
  - A valid working file from the console is no longer stored. The hub relays it to the editors as `draftVersion`,
    validated as before, and invalid files keep their notice.
  - `SendRequest` carries the tab's edit content, so the Claude works on what the user sees. The run's working file is
    built from it, falling back to the library's content.
- **Conversation**: it sticks to the bottom (follows new text, tool lines and notices only while the user is at the
  bottom; always after an own send and on load).
- **"Incluir animação"** (Q2 = A): asks only the name and type, creates a 1 s rest-pose animation (loop by type), then
  opens its editor.

No schema change, no new REST endpoint, MCP unchanged.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (API hub); TypeScript 5 / React 18 (editor).
**Primary Dependencies**: existing only.
- Backend: ASP.NET Core SignalR (`AnimationHub`), `AnimationFormat`.
- Frontend: React 18, React Router 6.30 data router (`useBlocker` through `useLeaveGuard`), `@microsoft/signalr`,
  `three` (lazy stage).

**No new dependency.**
**Storage**: none new. The edit version lives in the tab's memory (Q1 = A); the library keeps the saved content as today.
**Testing**:
- xUnit:
  - `AnimationHubTests`: a working file is relayed, not stored; an invalid file still gives its notice; `SendRequest`
    content is validated and used for the run.
  - `AnimationConnections`: the request carries its content.
- Vitest:
  - `lib/editorState`: edited / draftVersion / saved / discarded / animationVersion while dirty or clean;
  - `lib/restAnimation`: valid file, loop by type;
  - `lib/stickToBottom`: the at-bottom rule.
- The i18n key test; lint and build.

**Target Platform**: web, desktop and phones (the editor's phone layout unchanged).
**Project Type**: web application (backend hub + frontend page).
**Performance Goals**: a save is one request. Draft relays are the size of one animation file (≤ 1 MB, the hub already
allows 8 MB).
**Constraints**:
- Nothing reaches the library without "Salvar".
- Each tab owns its edit version.
- The console's file format and the `roll6-animation` format are unchanged.

**Scale/Scope**:
- 1 hub method changed, 1 client message added, 1 field on `RequestInfo`.
- About 8 frontend files and 2 new pure modules.

## Constitution Check

| Principle | Status |
|---|---|
| I. Skills obrigatórias | ✅ no new entity; the hub/DTO change follows the 086 layout |
| II. Stack fixa | ✅ Context API, SignalR, Fetch services; nothing added |
| III. Case sensitivity | ✅ unchanged folders |
| IV. Convenções | ✅ `interface`, no enums, domain exceptions for validation |
| V. Banco | ✅ no schema change |
| VI. Auth | ✅ the hub stays `[Authorize]`; `SendRequest` checks ownership as today |
| VII. Hex grid | ✅ not touched |

Post-design re-check: ✅.

## Project Structure

### Documentation (this feature)

```text
specs/091-animation-editor-save/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/hub.md        SendRequest.content, draftVersion, FileChanged no longer stores
└── tasks.md                (/speckit.tasks)
```

### Source Code

```text
backend/
├── Roll6.DTO/Realtime/Animation/EditorInfos.cs       RequestInfo.Content (JsonElement?); DraftVersionInfo
├── Roll6.Application/Realtime/AnimationHub.cs        FileChanged → validate + relay draftVersion (no store);
│                                                     SendRequest validates Content; dispatch builds the run from it
├── Roll6.Application/Realtime/AnimationConnections.cs EditorRequest.Content
└── Roll6.Tests/Application/AnimationHubTests.cs (+ AnimationConnections tests)

frontend/src/
├── lib/editorState.ts (+test)          savedContent + content + dirty; reducers edited/draftVersion/saved/discarded;
│                                       animationVersion keeps a dirty edit and marks savedChanged
├── lib/restAnimation.ts (+test)        the 1 s rest-pose file of a type (Q2 = A)
├── lib/stickToBottom.ts (+test)        isAtBottom(el, tolerance)
├── Services/animationEditorService.ts  draftVersion handler; sendRequest(..., content)
├── Contexts/AnimationEditorContext.tsx edit locally (no REST), save(), discard(), dirty, undo/redo local, draft relay
├── components/animations/editor/EditorTopBar.tsx       "Salvar", "Descartar" (ConfirmModal), unsaved badge
├── components/animations/editor/EditorConversation.tsx stick-to-bottom scrolling
├── pages/AnimationEditorPage.tsx       useLeaveGuard(dirty); stage reads the edit content
├── pages/library/AnimationCreatePage.tsx  name + type form → create rest animation (+ 090 thumbnail) → editor
├── components/animations/AnimationUploadForm.tsx   removed (no caller left)
└── i18n/locales/pt-BR.json             editor.save.*, animations.create.*
CLAUDE.md                               086 paragraph corrected (versions are local; save is explicit) + Recent Changes
```

**Structure Decision**: the edit state lives where the editor state already lives (`lib/editorState` reducers +
`AnimationEditorContext`). The hub stops writing the library for the agent and only relays.

## Phases

1. Hub: draft relay, request content, tests (US1 backend).
2. Editor state + context + top bar + leave guard (US1 frontend).
3. Conversation stick-to-bottom (US2).
4. "Incluir animação" form + rest animation (US3).
5. CLAUDE.md, lint/test/build.

## Complexity Tracking

None.
