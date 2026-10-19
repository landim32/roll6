# Tasks: Editor de animação com salvar explícito

**Input**: Design documents from `specs/091-animation-editor-save/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/hub.md, quickstart.md

**Tests**: included where the plan names them — hub/connections (xUnit) and the pure frontend helpers and reducers
(Vitest), as in the rest of the project.

**Organization**: US1 save only on "Salvar" (P1) · US2 conversation scrolling (P1) · US3 "Incluir animação" with name
and type (P2). Paths are relative to the repo root; `fe/` = `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirm the branch `091-animation-editor-save` starts clean. Run `dotnet test` in `backend/` (use
  `-p:BaseOutputPath=<scratch>` if `Roll6.Console` is running) and `cd frontend && npm run lint && npm test`. Note the
  counts.

---

## Phase 2: Foundational

**Purpose**: the hub DTO field and the client message every story touches.

- [X] T002 Add to `backend/Roll6.DTO/Realtime/Animation/EditorInfos.cs`:
  - `RequestInfo.Content` (`JsonElement?`, JSON `content`, documented as the tab's edit version);
  - a new `DraftVersionInfo { AnimationId, RequestId, Content (JsonElement) }`.
- [X] T003 [P] Mirror both in the frontend hub types: `content?: AnimationFile` on the request and
  `DraftVersionInfo` (wherever `RequestInfo`/`AnimationVersionInfo` are typed for
  `fe/Services/animationEditorService.ts`, e.g. `fe/types/animationEditor.ts`).

**Checkpoint**: both projects build.

---

## Phase 3: User Story 1 — Mudanças só vão para a biblioteca ao clicar em "Salvar" (P1) 🎯 MVP

**Goal**: turned bones, undo/redo and the Claude's files change only the tab's edit version; "Salvar" writes it once;
"Descartar" reverts; leaving with changes asks.

**Independent Test**: quickstart §1.

### Backend

- [X] T004 [P] [US1] Add `JsonElement? Content` to `EditorRequest` in
  `backend/Roll6.Application/Realtime/AnimationConnections.cs` and accept it in `Enqueue` (new optional parameter).
  Add a case to `backend/Roll6.Tests/Application/AnimationConnectionsTests.cs` showing the content is kept on the
  request.
- [X] T005 [US1] In `backend/Roll6.Application/Realtime/AnimationHub.cs` `SendRequest`, validate
  `info.Content` when present with `AnimationFormat.Parse` (`DomainValidationException` → `HubException("invalid")`)
  and pass it to `Enqueue`.
- [X] T006 [US1] At dispatch (where `ReadContentAsync` feeds `AnimationRequestBuilder.Build`), use
  `request.Content` when present and fall back to `ReadContentAsync` otherwise. Same file.
- [X] T007 [US1] Replace `StoreVersionAsync` in `AnimationHub.FileChanged` with a relay:
  - keep the JSON parse and the `AnimationFormat.Parse` validation, with the notices unchanged;
  - on success, send `DraftVersionInfo { AnimationId, RequestId, Content }` as client method `draftVersion` to
    `Clients.Group(AnimationConnections.GroupName(request.AnimationId))`, never calling `ReplaceContentAsync`;
  - add the `DRAFT_VERSION_METHOD` constant next to the other method names.
- [X] T008 [US1] Tests in `backend/Roll6.Tests/Application/AnimationHubTests.cs`:
  - a valid working file sends `draftVersion` and never calls `IAnimationService.ReplaceContentAsync`;
  - an invalid file still sends the notice and no `draftVersion`;
  - `SendRequest` with an invalid `content` throws `invalid`;
  - the run's `files[0]` uses the request content when given.

  Update or remove the 086 test that expected the agent file to be stored.

### Frontend

- [X] T009 [P] [US1] Rework `fe/lib/editorState.ts`:
  - add `savedContent` and `savedChanged` to `EditorState`/`INITIAL_STATE`, plus the exported helper
    `isDirty(state)` (serialized text comparison);
  - `opened` sets both contents;
  - add the reducers `edited(state, file)`, `draftVersion(state, info, ownRequestIds)`, `saved(state, file)` and
    `discarded(state)`;
  - change `animationVersion`: when clean it replaces both contents; when dirty it replaces `savedContent` only and
    sets `savedChanged`.

  Every change of `content` bumps `contentVersion`.
- [X] T010 [P] [US1] Tests for T009 in `fe/lib/editorState.test.ts`: dirty after `edited`; clean after `saved`/
  `discarded`; a draft for another request ignored; `animationVersion` clean vs dirty (keeps the edit, sets
  `savedChanged`).
- [X] T011 [US1] `fe/Services/animationEditorService.ts`: register the `draftVersion` handler, and make
  `sendRequest` take and send `content`.
- [X] T012 [US1] `fe/Contexts/AnimationEditorContext.tsx`:
  - `saveContent(file)` (bone release) becomes a local `edited` plus a history push, with no REST call;
  - undo/redo apply the neighbour version locally;
  - add `save()`: validate with `fe/lib/animationFormat`, render the 090 thumbnail
    (`fe/components/library/animationThumbnail` over `toRoll6Clip`), `uploadThumbnail`, then
    `animationService.replaceContent(id, content, thumbnailImage)` → `saved`; on error, toast and keep the edit;
  - add `discard()`;
  - expose `dirty`, `savedChanged`, `saving`;
  - `sendRequest` passes the edit content;
  - handle `draftVersion` for this tab's requests, which also join the history;
  - keep the own-echo recognition of `animationVersion` after a save.
- [X] T013 [US1] `fe/components/animations/editor/EditorTopBar.tsx`:
  - the "Alterações não salvas" badge (`text-bg-warning`) and "A versão salva mudou" when `savedChanged`;
  - "Salvar" (`btn-primary btn-sm`, disabled when clean or saving);
  - "Descartar" (`btn-outline-secondary btn-sm`) behind `ConfirmModal`.

  Hide both buttons for a non-owner.
- [X] T014 [US1] `fe/pages/AnimationEditorPage.tsx`: `const guard = useLeaveGuard(dirty)`, rendered in the page.
  Make sure the stage still re-reads on `contentVersion`. Ctrl+S (outside text fields) triggers save when dirty.
- [X] T015 [P] [US1] Add i18n to `fe/i18n/locales/pt-BR.json`:
  - `editor.save.button` "Salvar", `editor.save.discard` "Descartar", `editor.save.dirty` "Alterações não salvas",
    `editor.save.savedChanged` "A versão salva mudou";
  - `editor.save.saved` "Animação salva.", `editor.save.discardTitle` "Descartar as alterações?",
    `editor.save.discardMessage`, `editor.save.invalid` "Não foi possível salvar: {{message}}".

**Checkpoint**: US1 testable with and without the console.

---

## Phase 4: User Story 2 — A conversa rola sozinha (P1)

**Goal**: the conversation follows new content while the user is at the bottom.

**Independent Test**: quickstart §2.

- [X] T016 [P] [US2] Create `fe/lib/stickToBottom.ts` with `isAtBottom({ scrollTop, scrollHeight, clientHeight },
  tolerance = 24)`, plus tests in `fe/lib/stickToBottom.test.ts`.
- [X] T017 [US2] `fe/components/animations/editor/EditorConversation.tsx`:
  - keep `atBottom` in a ref updated on scroll;
  - add a layout effect over the messages, the running request's live text, its tool lines and its notices that sets
    `scrollTop = scrollHeight` when `atBottom`;
  - force the scroll after the user's own send and on the first load of the history;
  - replace the effect at the current line 43.

**Checkpoint**: US2 done, independent of US1.

---

## Phase 5: User Story 3 — "Incluir animação" pede nome e tipo e abre no editor (P2)

**Goal**: name + type → a 1 s rest-pose animation → its editor.

**Independent Test**: quickstart §3.

- [X] T018 [P] [US3] Create `fe/lib/restAnimation.ts` with `restAnimation(type)` (data-model.md: Hips still track,
  duration 1, `loop` false only for types 5 and 6). Add tests in `fe/lib/restAnimation.test.ts`: the result passes
  `fe/lib/animationFormat` validation and the loop follows the type.
- [X] T019 [US3] Rewrite `fe/pages/library/AnimationCreatePage.tsx` as a form:
  - name (required, ≤ 100) and type select (`ANIMATION_TYPES`, labels `animations.type.*`, default Parado);
  - "Salvar" → `useAnimation().upload({ name, type, content: restAnimation(type) }, thumbnail)`, where the thumbnail is
    the 090 skeleton render of the rest clip, then `navigate(animationEditorPath(id), { replace: true })`;
  - `useLeaveGuard` while something is typed;
  - the field error for an empty name.
- [X] T020 [US3] Delete `fe/components/animations/AnimationUploadForm.tsx` after confirming nothing else imports it
  (`grep -rn AnimationUploadForm fe/`). Remove its now-unused i18n keys (`animations.file`, `animations.fileHelp`,
  `animations.chooseFile`, `animations.send`, `animations.uploaded` — only those nothing else reads).
- [X] T021 [P] [US3] i18n: `animations.createHint` "A animação começa parada na pose de repouso; monte-a no editor."
  and `animations.created` "Animação criada.".

---

## Phase 6: Polish & Cross-Cutting

- [X] T022 [P] Update `CLAUDE.md`:
  - in the 086 paragraph, the agent's files are relayed as `draftVersion` and never stored; versions are local to the
    tab; "Salvar"/"Descartar"; `RequestInfo.content`;
  - in the library (087/090) paragraph, "Incluir animação" = name + type → rest animation → editor;
  - add a Recent Changes line.
- [X] T023 Run `cd backend && dotnet build Roll6.sln && dotnet test` (or the scratch `BaseOutputPath` while the console
  runs) and fix failures.
- [X] T024 Run `cd frontend && npm run lint && npm test && npm run build` and fix failures.
- [X] T025 Walk the quickstart where possible and append "Implementation notes" (deviations, numbers, what was not
  verified) to this file.

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T003) → stories.
- **US1**: T004 → T005 → T006 → T007 → T008 (same hub file, sequential). T009/T010 run in parallel with the backend.
  T011 → T012 → T013/T014. T015 is parallel.
- **US2** (T016–T017) is independent of US1, apart from `EditorConversation` living in the same page.
- **US3**: T018 is parallel; T019 needs T018 (and uses the 090 thumbnail helpers); T020 follows T019.
- Polish comes last.

## Parallel Opportunities

- T003, T004, T009, T010, T015, T016, T018 and T021 touch different files.

## Implementation Strategy

1. **MVP = US1**, the reported problem: nothing saved without "Salvar", the Claude included.
2. US2 is a small, independent fix.
3. US3 completes the create-from-scratch flow.

## Implementation notes (2026-10-18)

- **Deviations**:
  - T011: `Services/animationEditorService.ts` needed no change. Its `on`/`sendRequest` are generic over
    `EditorEvents`/`RequestPayload`, so the new `draftVersion` event and `content` field come from the types
    (`types/animationEditor.ts`).
  - A bone release does not bump `contentVersion` (`edited(..., replay: false)`), because the stage already shows the
    pose. Undo/redo, drafts and discard do bump it.
  - "Descartar" stays enabled while `savedChanged` is set even without edits, so a dirty tab can take the new saved
    version.
  - The conversation follows content through a `MutationObserver` plus image `load` events, instead of a layout effect
    over state, so late-rendering markdown and thumbnails are covered too.
  - Text changes:
    - `editor.edit.saved` was replaced by `editor.edit.pending`, the status after a turned bone;
    - the upload-form keys (`animations.file`, `fileHelp`, `chooseFile`, `send`, `uploaded`) were removed with
      `AnimationUploadForm`.
- **Numbers**:
  - Backend: 2044 tests pass (+3: draft relay replacing the stored version, the request content reaching the run, an
    invalid content refused; and the connections case).
  - Frontend: `npm run lint` clean; `npm test` 941 passing in 101 files (new: `editorState` 091 block, `stickToBottom`,
    `restAnimation`); `npm run build` ok.
  - `Roll6.Console` was still running, so the backend tests were built into a scratch `BaseOutputPath`.
- **Not verified in a browser**: the quickstart (saving, discarding, the leave guard, the Claude's drafts, scrolling,
  creating) was not run. It needs the dev API, and for the drafts the console.
