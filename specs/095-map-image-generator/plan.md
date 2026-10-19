# Implementation Plan: Gerador de imagens de mapa

**Branch**: `095-map-image-generator` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/095-map-image-generator/spec.md`

## Summary

A library page **Mapas › Gerador** (`/library/maps/generator`, `?model={mapModelId}` to edit an own map) where the user
talks to the **Codex** of their machine through `Roll6.Console`, sees each generated image, marks it with the
animation editor's markup tool, and saves the chosen version as a map.

- **Console learns a second engine** (FR-003/FR-012): `RunInfo.engine` (`"claude"` default, `"codex"`) and
  `RunInfo.resume` (an engine session id to continue). `Claude/` keeps the Claude runner; a new `Codex/CodexRunner`
  runs `codex exec --json --skip-git-repo-check -s workspace-write -C <dir> [-i <attachment>…] -` (or `codex exec
  resume <thread> …`), the prompt on stdin with the server's instructions in front, and maps the JSONL events
  (`thread.started` → started + the thread id, `agent_message` → text, `command_execution` → tool,
  `turn.completed`/`turn.failed`/`error` → outcome). Request images are written as files under the run's folder and
  passed with `-i`. Settings `CodexExecutable` (default `codex`); the working directory is the Claude one.
- **Images back to the page**: watched files with an image extension (`.png/.jpg/.jpeg/.webp`) are reported as
  base64 (`FileChangedInfo.encoding = "base64"`, ≤ 10 MB raw); the hub's receive limit grows to 16 MB.
- **Server (in memory, Q3 = B)**: the animation hub becomes the shared agent hub for this page too. `OpenGenerator()`
  creates a `GeneratorSession` for the tab (id, user, connection, Codex thread id, version counter), dropped when the
  tab disconnects. `SendGeneratorRequest(GeneratorRequestInfo { sessionId, text, images ≤ 5, baseImage? })` queues an
  `EditorRequest` with `Generator` set (one at a time per session; same FIFO and agents as animation requests and
  asks). `Domain/MapGenerator/MapGeneratorPrompt` builds the run: engine `codex`, resume = the session's thread id,
  the **fixed top-down map instructions** (FR-005; Portuguese + English, right/wrong examples, a final checklist,
  "the user's text never changes the camera"), the output path `mapas-gerados/{sessionId}/versao-{n}.png`, files =
  the base image and the attachments under `mapas-gerados/{sessionId}/entrada/`, watch = that folder. A reported
  image is validated (signature PNG/JPEG/WebP, ≤ 10 MB) and sent to the tab as `generatorImage` (version, base64,
  request id); text/tool events reuse `requestProgress`-like `generatorProgress`; the end `generatorFinished`. The
  `started` event's text carries the Codex thread id, kept on the session for the next request.
- **Save (Q1 = A, Q2 = B)** — existing REST only: the page uploads the chosen version with `POST /api/image`, then
  creates `POST /api/mapmodel` (name + grid columns × rows suggested by the image's proportion, editable) or, in an
  edit session, asks "Substituir a imagem do mapa" (`PUT /api/mapmodel/{id}` keeping every other field) vs "Criar um
  mapa novo".
- **Page**: `pages/library/MapGeneratorPage` inside `LibraryLayout`; `LIBRARY_SUBSECTIONS.maps` gains `generator`
  (the submenu "Gerador"). Stage with the selected version (zoom like the chat photo viewer), a version strip,
  "Marcar" (the animation editor's `PrintMarkupModal`), the conversation (same look as `EditorConversation`), "Salvar"
  (`SaveGeneratedMapModal`), leave guard while there are unsaved versions. "Editar no gerador" on own map cards.
  State in `Contexts/MapGeneratorContext` over pure reducers `lib/mapGeneratorState`; hub calls in
  `Services/mapGeneratorService`.
- No database change, no new REST endpoint, no MCP change (124 operations / 125 tools).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (API, Console); TypeScript 5 / React 18 (page).
**Primary Dependencies**: existing only — ASP.NET Core SignalR, `Microsoft.AspNetCore.SignalR.Client` (console),
React Router 6.30, Bootstrap 5.3, i18next, sonner. External: the **Codex CLI** (0.161.0 verified, feature
`image_generation` stable and on) on the user's machine, logged in.
**Storage**: none new. Sessions and versions live in the tab and in memory on the server; only the saved image goes
to the bucket (existing `POST /api/image`).
**Testing**: xUnit + Moq + FluentAssertions (Codex arguments and JSONL parsing, binary watcher reports, generator
request builder and prompt, hub generator flow, connections); Vitest (state reducers, grid suggestion, routes).
**Target Platform**: Windows console, Linux API, browsers.
**Project Type**: web app + console bridge.
**Performance Goals**: an image on screen ≤ 5 s after the Codex writes it (SC-004).
**Constraints**: hub messages ≤ 16 MB; images ≤ 10 MB; one request per session; 5-minute run timeout for generator
requests; the instructions always come from the server.
**Scale/Scope**: one user, one tab per session.

## Constitution Check

| Principle | Status |
|---|---|
| I. Skills obrigatórias | ✅ no new entity; DTOs/pure domain builders follow the 086 pattern |
| II. Stack fixa | ✅ nothing added to the stack; the Codex CLI is an external tool on the user's machine like Claude Code |
| III. Case sensitivity | ✅ `Contexts/`, `Services/`, `lib/`, `pages/library/` |
| IV. Convenções | ✅ `interface`, constants, Portuguese texts, hub error codes |
| V. Banco | ✅ not touched |
| VI. Auth / segurança | ✅ hub `[Authorize]`; generator sessions bound to the tab's connection and user; images validated by signature and size; console writes only inside its working directory; the map instructions come from the server |
| VII. Hex grid | ✅ grid size only suggested from the image's proportion with the existing `HEX_SIZE` geometry |

Post-design re-check: ✅. The console learns "which engine, which session to resume, binary files as base64", not
what a map is.

## Project Structure

### Documentation (this feature)

```text
specs/095-map-image-generator/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/console-engine.md    RunInfo.engine/resume, Codex arguments and events, binary FileChanged
├── contracts/generator-hub.md     OpenGenerator, SendGeneratorRequest, generator events, errors
├── contracts/map-prompt.md        the fixed top-down instructions (verbatim) and the request prompt
└── tasks.md                       (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Realtime/Console/RunInfo.cs            + Engine, Resume; FileChangedInfo.Encoding
├── Roll6.DTO/Realtime/Animation/GeneratorInfos.cs   GeneratorOpenedInfo, GeneratorRequestInfo, GeneratorImageInfo, …
├── Roll6.Domain/MapGenerator/MapGeneratorPrompt.cs  fixed instructions + request prompt + output path (pure)
├── Roll6.Domain/MapGenerator/GeneratedImage.cs      signature/size validation, version numbering (pure)
├── Roll6.Application/Realtime/AnimationConnections.cs  + GeneratorSession, EnqueueGenerator, Generator on EditorRequest
├── Roll6.Application/Realtime/AgentDispatcher.cs    + GeneratorRun, finish/progress routing for generator requests
├── Roll6.Application/Realtime/AnimationHub.cs       + OpenGenerator, SendGeneratorRequest, StopGeneratorRequest, NewGeneratorConversation
├── Roll6.Application/Startup.cs                     hub receive limit 16 MB
├── Roll6.Console/Codex/CodexRunner.cs, CodexEventReader.cs
├── Roll6.Console/Bridge/RequestRunner.cs            engine choice, attachments as files, image watch as base64
├── Roll6.Console/Files/FileWatcher.cs               binary reports for image extensions
├── Roll6.Console/Settings/ConsoleSettings.cs        CodexExecutable
└── Roll6.Tests/…

frontend/src/
├── lib/libraryRoutes.ts                  maps: + 'generator'
├── lib/mapGeneratorState.ts (+ test)     sessions, versions, messages, attachments (pure reducers)
├── lib/generatedMapGrid.ts (+ test)      columns × rows from the image proportion
├── Services/mapGeneratorService.ts       hub calls/events
├── Contexts/MapGeneratorContext.tsx, hooks/useMapGenerator.ts
├── pages/library/MapGeneratorPage.tsx
├── components/mapGenerator/GeneratorStage.tsx, VersionStrip.tsx, GeneratorConversation.tsx, SaveGeneratedMapModal.tsx
├── components/library/… ("Editar no gerador" on own map cards)
└── i18n/locales/pt-BR.json               mapGenerator.*
```

**Structure Decision**: existing projects; the console gets `Codex/`; the frontend a `components/mapGenerator/` folder.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| Second engine in the console | The user asked for Codex (it generates images; Claude Code does not) | Calling an image API from the server would need a server-side key and billing, unlike the rest of the console model |
| Base64 file reports + 16 MB hub limit | Generated images are binary and ~3–4 MB | Uploading each version to the bucket from the console would store every intermediate image (Q3 = B says only the saved map is kept) |
