# Research: Editor de animação com salvar explícito

## R1 — Where the edit version lives

- **Decision**: in the editor tab (Q1 = A), as `content` next to `savedContent` in `lib/editorState`. `dirty` compares
  their serialized text. Undo/redo (`lib/animationHistory`, ≤ 100 exact texts) moves the edit version only.
- **Rationale**: it is the clarified choice, it needs no schema and it matches the history that already lives in the
  tab.
- **Alternatives**: a server draft (Q1 = B, declined).

## R2 — The Claude's files must not reach the library

- **Decision**: `AnimationHub.FileChanged` keeps its parse and `AnimationFormat.Parse` validation, but a valid working
  file is sent to the animation's editor group as `draftVersion { animationId, requestId, content }` instead of
  `ReplaceContentAsync(..., "agent")`. Invalid files keep the notice "Arquivo inválido: …"; other `.json` files keep
  "O Claude criou {nome}".
  - The tab applies a `draftVersion` only for the request it sent (`requestId` matches its current or last request).
  - The relayed version goes through the same reducer as a local edit, so it joins the undo history.
- **Rationale**: FR-001/FR-007. Without this the agent would still write the library. With the edit version only in
  the tab (Q1 = A), the tab is the only place that can hold the version.
- **Alternatives**: store it and let the tab ignore it (the library would still change).

## R3 — The Claude works on what the tab shows

- **Decision**: `RequestInfo.content` (optional `JsonElement`) carries the tab's edit version.
  - `SendRequest` validates it with `AnimationFormat.Parse` (`invalid` hub error otherwise) and stores it on the
    `EditorRequest`.
  - At dispatch `AnimationRequestBuilder.Build` uses it, else `ReadContentAsync` as today.
  - The console writes it as the run's `files[0]`, unchanged.
- **Rationale**: FR-008. The working file is written at the start of every run, so carrying the content with each
  request is enough. No extra sync is needed between requests, because pose editing is blocked while a request runs.
- **Alternatives**: a hub method syncing every edit to the consoles (more traffic, same result at run time).

## R4 — Saving

- **Decision**: "Salvar" validates locally (`lib/animationFormat`), then calls the existing
  `animationService.replaceContent(id, content, thumbnailImage)`.
  - The thumbnail is the 090 skeleton picture of the new content, uploaded through `lib/thumbnailUpload`; a failure is
    skipped.
  - On success `savedContent = content`, the badge clears, and the server's `animationVersion` echo is recognised as
    own (exact text, as today).
  - A failure keeps the edit version and toasts the server message.
  - The server still sends `writeFiles` to the consoles for a user-origin save, which is harmless.
- **Rationale**: one request, the existing validation path and the existing notifier. Tokens pick up the version as
  before.

## R5 — A version saved elsewhere while editing

- **Decision**: `animationVersion` from another tab or the MCP:
  - when the tab is clean, both contents become it and the stage replays, as today;
  - when it is dirty, only `savedContent` changes and the state sets `savedChanged`. The top bar shows "A versão salva
    mudou", and "Descartar" then loads the new saved version.
- **Rationale**: the spec's edge case. Nothing unsaved is lost without a decision.

## R6 — Leaving with unsaved changes

- **Decision**: `AnimationEditorPage` calls `useLeaveGuard(dirty)`. The editor is inside the library's data router
  since 089, so the nav, "Voltar para campanha", the user menu and the browser all ask, and unload warns.
- **Rationale**: FR-006, with the same dialog as the other library pages.

## R7 — Conversation scrolling

- **Decision**: the pure `lib/stickToBottom.isAtBottom(el, 24)`.
  - `EditorConversation` records on scroll whether the list is at the bottom.
  - After each change of messages, live text, tool lines or notices it scrolls to the bottom only if it was at the
    bottom.
  - It always scrolls after the user's own send and on the first load.
- **Root cause today**: the effect at `EditorConversation.tsx:43` depends on the message list only, not on the
  streaming text and tool lines of the running request, so a long answer grows below the fold.

## R8 — The rest animation (Q2 = A)

- **Decision**: `lib/restAnimation.restAnimation(type)` returns a valid `roll6-animation` file:
  `{ format: "roll6-animation", version: 1, duration: 1, loop, tracks: [{ bone: "Hips", times: [0, 1], degrees:
  [[0,0,0],[0,0,0]] }] }`.
  - The format needs 1–64 tracks, and a still Hips track changes nothing.
  - `loop` is false for Derrotado (5) and Atacando (6), true for the rest.
  - "Incluir animação" sends it with the name, type and the 090 thumbnail, then navigates to `animationEditorPath(id)`.
- **Rationale**: it is valid on every validator (server, site, skill), it shows the rest pose, and the first edit
  starts from a clean file.
