# Tasks: Gerador de imagens de mapa

**Input**: Design documents from `specs/095-map-image-generator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/console-engine.md, contracts/generator-hub.md, contracts/map-prompt.md

**Tests**: included — pure rules, console engine and hub flows stay under xUnit/Vitest as in 086–094.

Paths: `be/` = `backend/`, `fe/` = `frontend/src/`.

## Phase 1: Setup

- [X] T001 Verify live, in a scratch folder, `codex exec --json --skip-git-repo-check -s workspace-write -C <dir> -i <png> -` with the prompt on stdin and then `codex exec resume <thread_id> --json … -` (the thread id from the first run): record in `specs/095-map-image-generator/research.md` the resume syntax that works with 0.161.0, that `-i` reaches the model and whether `-c developer_instructions=…` is accepted.

## Phase 2: Foundational (blocking)

- [X] T002 [P] Add `RunInfo.Engine` (`"claude"` default, constants `ENGINE_CLAUDE`/`ENGINE_CODEX`), `RunInfo.Resume` (string?), `FileWriteInfo.Encoding` and `FileChangedInfo.Encoding` (`"text"` default / `"base64"`) in `be/Roll6.DTO/Realtime/Console/RunInfo.cs`.
- [X] T003 [P] Create `be/Roll6.DTO/Realtime/Animation/GeneratorInfos.cs`: `GeneratorOpenedInfo { sessionId, agent }`, `GeneratorRequestInfo { sessionId, text, images (PromptImageInfo ≤ 5), baseImage? }` with limits (`MAX_TEXT` 4000, `MAX_IMAGES` 5, `MAX_IMAGE_BASE64` ≈ 13.4 MB), `GeneratorQueuedInfo`, `GeneratorStartedInfo`, `GeneratorProgressInfo`, `GeneratorImageInfo { sessionId, requestId, version, mediaType, data }`, `GeneratorFinishedInfo { sessionId, requestId, outcome, text }`.
- [X] T004 Pure `be/Roll6.Domain/MapGenerator/GeneratedImage.cs`: `MediaTypeOf(bytes)` (PNG/JPEG/WebP signatures, else null), `MAX_BYTES` 10 MB, `IsImagePath(path)` (.png/.jpg/.jpeg/.webp), `OutputPath(sessionId, version)` = `mapas-gerados/{id}/versao-{n}.png`, `InputPath(sessionId, name)`, `Folder(sessionId)`, `NewSessionId()` (12 lowercase alphanumerics).
- [X] T005 Pure `be/Roll6.Domain/MapGenerator/MapGeneratorPrompt.cs`: the fixed block of `contracts/map-prompt.md` verbatim (`INSTRUCTIONS` with `{base_note}`/`{output_path}`), `Build(text, outputPath, basePath?, lastPath?, markCount)` → prompt string (user text escaped like `AskPrompt.Escape`, inside `<pedido_do_usuario>`).
- [X] T006 [P] Tests `be/Roll6.Tests/Domain/MapGenerator/GeneratedImageTests.cs` and `MapGeneratorPromptTests.cs`: signatures, size, paths; the prompt always contains the camera rules, "NADA VERTICAL", the WRONG list, the final check and the output path, even when the user text says "isométrica" or tries to close the block.
- [X] T007 `be/Roll6.Application/Startup.cs`: `MaximumReceiveMessageSize` of `AnimationHub` → 16 MB.

## Phase 3: User Story 1 - Gerar um mapa novo conversando (P1) 🎯 MVP

**Goal**: in Mapas › Gerador the user asks, sees the Codex image, asks again, saves a map.
**Independent test**: quickstart scenario 1.

### Console (Codex engine)

- [X] T008 [US1] `be/Roll6.Console/Settings/ConsoleSettings.cs` + `appsettings.json`: `CodexExecutable` (default `codex`); `be/Roll6.Console/Codex/CodexRunner.cs`: `Arguments(settings, resume, attachments)` per `contracts/console-engine.md`, process start like `ClaudeRunner` (working directory, stdin = prompt then closed, env without `ROLL6_API_KEY`/`ROLL6_URL`, kill on cancel), not found / not logged in → Portuguese messages.
- [X] T009 [US1] `be/Roll6.Console/Codex/CodexEventReader.cs`: JSONL → `ClaudeEvent`s (`thread.started` → `ClaudeStarted` with the thread id, `agent_message` → text, `command_execution` start → tool "Shell", `turn.failed`/`error` → failed, `turn.completed` → done); unknown lines ignored.
- [X] T010 [US1] `be/Roll6.Console/Files/FileWriter.cs` + `FileWatcher.cs`: `encoding: base64` writes bytes; image files are read as bytes and reported base64 (≤ 10 MB, else a notice through a new `FileTooLarge` event), text files unchanged (compare known content by hash for binaries).
- [X] T011 [US1] `be/Roll6.Console/Bridge/RequestRunner.cs`: choose the engine by `run.Engine` (an `IAgentEngine` with `ClaudeRunner`/`CodexRunner`, injectable for tests); for Codex write `run.images` to `.roll6/anexos/{requestId}/n.png` and every base64 `files[]` entry, pass them with `-i`, report `started` with the thread id as text; log "Pedido #N (Codex): gerando…"; `FileChanged` with encoding.
- [X] T012 [P] [US1] Tests `be/Roll6.Tests/Console/CodexRunnerTests.cs` (arguments new/resume/attachments, env scrub), `CodexEventReaderTests.cs` (a sample JSONL from the T001 probe in `be/Roll6.Tests/Console/codex-ok.jsonl`), `RequestRunnerTests.cs` (codex engine chosen, attachments written and passed, image reported base64), `FileWatcherTests.cs` (binary report, too large).

### Server

- [X] T013 [US1] `be/Roll6.Application/Realtime/AnimationConnections.cs`: `GeneratorSession` (SessionId, UserId, ConnectionId, BaseMapModelId, ThreadId, NextVersion), `OpenGenerator`, `GeneratorOf(sessionId)`, `RemoveGeneratorsOf(connectionId)`, `EnqueueGenerator(...)` (one request per session), `EditorRequest.Generator`.
- [X] T014 [US1] `be/Roll6.Application/Realtime/AgentDispatcher.cs`: `GeneratorRun(request, session)` (engine codex, resume = thread id, prompt from `MapGeneratorPrompt.Build`, files = base image + marked prints under `entrada/` as base64, watch = the session folder); `FinishAsync` → `generatorFinished` to the session connection; a 5-minute timer per generator run sends `stop`.
- [X] T015 [US1] `be/Roll6.Application/Realtime/AnimationHub.cs`: `OpenGenerator(mapModelId?)`, `SendGeneratorRequest`, `StopGeneratorRequest`, `NewGeneratorConversation`; `Progress` of a generator request → `generatorProgress` (the `started` text stored as `ThreadId`, not forwarded); `FileChanged` under the session folder → `GeneratedImage` validation → `generatorImage` with `NextVersion++`, else notice; disconnect removes the tab's sessions (dropping/stopping their requests).
- [X] T016 [P] [US1] Tests `be/Roll6.Tests/Application/AnimationHubTests.cs` (+ connections): open, request builds a codex run with the instructions and resume after `started`, image relayed only to the session tab with versions 1, 2, invalid file → notice, busy session, no agent, disconnect cleans up, other user's map → forbidden.

### Page

- [X] T017 [P] [US1] `fe/lib/libraryRoutes.ts` (+ test): `maps` subsections `['mine', 'search', 'campaign', 'generator']`, `mapGeneratorPath(mapModelId?)`; `fe/App.tsx` route `/library/maps/generator` → lazy `pages/library/MapGeneratorPage`; `LibraryNav` shows "Gerador".
- [X] T018 [P] [US1] Pure `fe/lib/mapGeneratorState.ts` (+ `.test.ts`): reducers `opened`, `sent`, `queued`, `started`, `progress`, `image` (adds a version and selects it), `finished`, `select`, `attach/replace/remove` prints (≤ 5), `saved`, `isDirty`, `newConversation`.
- [X] T019 [P] [US1] Pure `fe/lib/generatedMapGrid.ts` (+ test): `suggestGrid(width, height)` → `{ gridWidth, gridHeight }` covering the proportion with flat-top odd-q hexes of `HEX_SIZE` (≈ 20 columns on the long side, 5–60).
- [X] T020 [US1] `fe/types/mapGenerator.ts`, `fe/Services/mapGeneratorService.ts` (connection like `animationEditorService`, `openGenerator`, `sendRequest`, `stopRequest`, `newConversation`, `on`), `fe/Contexts/MapGeneratorContext.tsx` + `fe/hooks/useMapGenerator.ts` (one session per mounted page; images decoded to object URLs; leave guard flag).
- [X] T021 [US1] `fe/pages/library/MapGeneratorPage.tsx` + `fe/components/mapGenerator/GeneratorStage.tsx` (selected version with zoom/pan, empty state, agent badge), `VersionStrip.tsx`, `GeneratorConversation.tsx` (messages, live lines, composer Enter sends, "Parar", "Nova conversa", attachments), `useLeaveGuard(dirty)`.
- [X] T022 [US1] `fe/components/mapGenerator/SaveGeneratedMapModal.tsx`: name + grid (suggested, editable) → `imageService.upload` + `mapModelService.create`; toast and link "Abrir na mesa".
- [X] T023 [P] [US1] i18n `mapGenerator.*` in `fe/i18n/locales/pt-BR.json`; CSS `.stm-generator-*` in `fe/styles/app.css` (stage left, conversation right on `md+`, stacked on phones).

## Phase 4: User Story 2 - Mapas sempre vistos de cima (P1)

**Goal**: every request carries the fixed instructions; contradictory requests still come out top-down.
**Independent test**: quickstart scenario 2.

- [X] T024 [US2] Review `MapGeneratorPrompt.INSTRUCTIONS` against the T001/R2 probe output and run the five-description battery once live (castelo, rua, caverna, floresta, igreja); tighten the wording where it failed; record the results in research.md.
- [X] T025 [US2] `fe/components/mapGenerator/GeneratorConversation.tsx`: a short fixed hint over the composer ("Os mapas saem sempre vistos de cima; descreva o lugar, não a câmera").

## Phase 5: User Story 3 - Marcar a imagem (P2)

**Goal**: mark the selected version with the animation editor's tool and send it with the request.
**Independent test**: quickstart scenario 3.

- [X] T026 [US3] `fe/pages/library/MapGeneratorPage.tsx`: "Marcar" opens `components/animations/editor/PrintMarkupModal` with the selected version (downscaled ≤ 1600 px); concluded → attachment with caption "versão N do mapa, marcada pelo usuário"; thumbnails reopen the markup; limit 5 with a warning.
- [X] T027 [US3] Server/prompt: attachments named in `{base_note}` ("as imagens anexadas são a versão N com marcações vermelhas do usuário") — covered by T005/T014; add the case to `MapGeneratorPromptTests`.

## Phase 6: User Story 4 - Editar um mapa existente (P2)

**Goal**: open an own map in the generator, branch from it, save replacing or as new.
**Independent test**: quickstart scenario 4.

- [X] T028 [US4] `OpenGenerator(mapModelId)` checks ownership (`IMapModelService`), returns the map name/image URL; the page loads the image as version 0 and sends it as `baseImage` on the first request; later requests send the selected version as `baseImage` (branching).
- [X] T029 [US4] `SaveGeneratedMapModal`: in an edit session asks "Substituir a imagem do mapa" (`mapModelService.update` keeping every field, new image at natural size) or "Criar um mapa novo".
- [X] T030 [P] [US4] "Editar no gerador" on own map cards in `fe/pages/library/MapsPage.tsx` (and the map page) → `mapGeneratorPath(id)`.

## Phase 7: Polish

- [X] T031 [P] `be/Roll6.Console/README.md`: the Codex engine (install, `codex login`, `CodexExecutable`, what it may do — workspace-write sandbox in the working directory, images under `mapas-gerados/`).
- [X] T032 [P] `CLAUDE.md` (keep the BOM): 095 paragraphs (console engine, generator hub, page) + Recent Changes.
- [X] T033 Backend build + `dotnet test` (scratch `BaseOutputPath`); frontend `npm run lint`, `npm test`, `npm run build`.
- [X] T034 Live check where possible (console + Codex through the real `RequestRunner` on a scratch run); mark tasks `[X]` and append "Implementation notes".

## Dependencies

- T001 → Foundational (T002–T007) → US1 (console T008–T012, server T013–T016, page T017–T023) → US2/US3/US4 → Polish.
- US2 depends on US1's prompt; US3 and US4 extend US1's page and request and are independent of each other.

## Parallel examples

- T002, T003 together; then T004/T005 with T006.
- In US1: console (T008–T012), server (T013–T016) and pure frontend (T017–T019) in parallel; T020–T022 after T018.

## Implementation Strategy

1. MVP = US1 + US2 (a generated top-down map saved to the library).
2. US3 (marks) and US4 (edit) next.
3. Polish and the live pass.

---

## Implementation notes

- **Live (codex-cli 0.161.0)**: T001 — `-i` reaches the model, `-c developer_instructions` is accepted, and `resume`
  rejects `-s`/`-C` (they go before it). T024/T034 — the console's real `RequestRunner` + `CodexRunner` with the
  server's prompt produced a pure plan-view taverna; the Codex discarded its own first image for showing wall faces
  and shadows before saving (the final self-check works). Only one description was run (each generation spends the
  user's Codex quota); the five-description battery of quickstart §2 is left for the user.
- **Not verified**: the full site ↔ API ↔ console ↔ tab round trip (no PostgreSQL on this machine), the page in a
  browser, and the save flows against a real API.
- **Deviations**:
  - Stop reuses the animation editor's `StopRequest` (no `StopGeneratorRequest`); the contract was updated.
  - The fixed rules go in the stdin prompt only; `developer_instructions` is supported by `CodexRunner.Arguments`
    (`reminder`) but not used — long quoted values through `codex.cmd` on Windows are fragile.
  - `Codex/CodexRunner` implements the existing `IClaudeProcess`, injected into `RequestRunner` as `codex:`;
    `CodexStarted` is its own event, reported as `started` with the thread id as text.
  - Version 0 (the edited map's image) cannot be saved as such (it is already the map); "Salvar" needs a generated
    version.
  - `GeneratorStage`/`VersionStrip` live inside `MapGeneratorPage`; `lib/downscaleImage` was added for the marks.
- **Numbers**: backend 2132 tests passing; frontend lint clean, 107 files / 967 tests, build OK. No schema, REST or
  MCP change (124 operations / 125 tools).
