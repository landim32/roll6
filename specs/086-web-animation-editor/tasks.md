# Tasks: Editor de animações na web com o Claude local

**Input**: Design documents from `specs/086-web-animation-editor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/agent-protocol.md, contracts/agent-config.md,
contracts/editor-page.md, quickstart.md

**Tests**: included (xUnit for the moved console core, the server-side animation orchestration, the relay/queue and
the conversation service; Vitest for the moved viewer modules, markup, captions, history and the editor reducers), as
every feature of the project.

**Organization**: tasks are grouped by user story. The order of the stories here is the delivery order of the plan:
the backend and the console core first (foundational), then US1 (page + stage), US5 (the `Roll6.Console` bridge),
US2 (conversation), US3 (pose + history), US4 (prints), then the removal and the docs. **The console is generic**: it
knows nothing of animations — the server builds every request (`AnimationRequestBuilder`) and validates every file
the console reports (`AnimationFormat`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 page and stage, US2 conversation through the agent, US3 skeleton/pose/history, US4 prints,
  US5 the console program (`Roll6.Console`)

## Conventions for every task

- Files are CRLF (some with a BOM): edit with scripts that keep both; never rewrite `pt-BR.json` as JSON (legacy
  duplicate key) — insert keys as text. Bash heredocs with quotes break: write scripts to the scratchpad and run them
  with `python`.
- Backend: `dotnet-architecture` skill for the new entities; every text in Portuguese; `[JsonPropertyName]`
  camelCase; `HubException` codes as `TableHub`. Frontend: `react-architecture` for the context/service/hook; no TS
  `enum`; `interface` over `type`; every text through i18n; Bootstrap Icons only; `three` only in lazy chunks.
- Moving a file from `roll6anime/` = `git mv` (history kept), then namespace/import fixes.
- The table project `C:\repos\gurps-adventure` is the user's: never edited; its `.glb` files are only read.

---

## Phase 1: Setup

- [X] T001 Confirm the baseline on branch `086-web-animation-editor`: `dotnet build backend/Roll6.sln`, `dotnet test`
  in `backend/` (1940 pass), `npm run lint`/`npm test`/`npm run build` in `frontend/`, and `dotnet build
  roll6anime/Roll6Anime.sln` + `dotnet test roll6anime/Roll6Anime.Tests` (what is being moved still passes). Read
  `.specify/memory/constitution.md`; load the `dotnet-architecture` and `react-architecture` skills.
- [X] T002 Create the console project `backend/Roll6.Console/Roll6.Console.csproj` (`net8.0`, `OutputType Exe`,
  `ImplicitUsings`, `Nullable`, `RootNamespace Roll6.Console`, `AssemblyName Roll6.Console`; `ProjectReference` to
  `Roll6.DTO` **only** (no Domain, no linked `AnimationFormat` — the console validates nothing); `PackageReference`
  `Microsoft.AspNetCore.SignalR.Client` 8.0.x, `Microsoft.Extensions.Hosting` 8.0.x,
  `Microsoft.Extensions.Configuration.Json` + `.Binder` 8.0.x; `appsettings.json` copied to output), add it to
  `backend/Roll6.sln` (`dotnet sln add`) and a `ProjectReference` from `backend/Roll6.Tests/Roll6.Tests.csproj`. Add
  the folder `backend/Roll6.Console/` to `.dockerignore` only if the API image build globs it (check
  `backend/Roll6.API/Dockerfile` and `Roll6.Mcp/Dockerfile`).

---

## Phase 2: Foundational (blocking)

**Purpose**: the DTOs, tables, services, hub and relay every story needs, and the agent core moved into its project.

### DTOs

- [X] T003 [P] Create the DTOs in two folders. `backend/Roll6.DTO/Realtime/Console/` (**generic**, nothing about
  animations): `AgentRegisterInfo { machine, folder }`, `AgentRegisteredInfo { userName }`, `AgentStatusInfo {
  connected, busy, machine }`, `PromptImageInfo { png (base64 string), caption }`, `RunInfo { requestId, sessionId
  (Guid), started, systemPrompt, prompt, images: List<PromptImageInfo>, files: List<FileWriteInfo>, watch: List<string>
  }`, `FileWriteInfo { path, content (string) }`, `FileChangedInfo { path, content (string) }`, `ClaudeEventInfo {
  kind: "started" | "text" | "tool" | "notice", text?, tool?, target? }`, `RequestOutcomeInfo { kind: "done" |
  "stopped" | "failed", message?, permissionDenials: List<string> }`. `backend/Roll6.DTO/Realtime/Animation/` (the
  editor): `RequestInfo { animationId, text, images: List<PromptImageInfo> }`, `EditorMessageInfo {
  animationMessageId, role (int), text, imageCount, createdAt }`, `EditorConversationInfo { animationConversationId,
  messages }`, `RunningRequestInfo { requestId, text, machine, startedAt }`, `EditorStateInfo { animation
  (AnimationInfo), content (JsonElement), conversation, agent, running? }`, `AnimationVersionInfo { animationId,
  content, origin: "agent" | "user" | "other", userId }`, `RequestQueuedInfo { requestId, animationId, position }`,
  `RequestStartedInfo { requestId, animationId, machine }`, `RequestProgressInfo { requestId, event }`,
  `RequestFinishedInfo { requestId, outcome, message }`. All with `[JsonPropertyName]` camelCase and summaries from
  contracts/agent-protocol.md.

### Domain and persistence

- [X] T004 [P] Create `backend/Roll6.Domain/Enums/ConversationRole.cs` (`User = 1, Claude = 2, Notice = 3`),
  `backend/Roll6.Domain/Models/AnimationConversation.cs` (`Open(animationId, userId)` with a new `ClaudeSessionId`,
  `MarkStarted()`, `Close(now)`, `IsOpen`) and `AnimationMessage.cs` (`Create(conversationId, role, text, imageCount)`,
  `MAX_TEXT` 20000 — longer text cut with "…"). Tests `backend/Roll6.Tests/Domain/Models/AnimationConversationTests.cs`.
- [X] T005 [P] Repositories: `backend/Roll6.Infra.Interfaces/Repository/IAnimationConversationRepository.cs`
  (`GetOpenAsync(animationId)`, `GetByIdAsync`, `InsertAsync`, `UpdateAsync`, `DeleteByAnimationAsync`) and
  `IAnimationMessageRepository.cs` (`ListByConversationAsync(conversationId, take = 500)`, `InsertAsync`,
  `DeleteByAnimationAsync`); implementations in `backend/Roll6.Infra/Repository/`; `Roll6Context` entities
  `animation_conversations` (PK `animation_conversations_pkey`, FKs `fk_animation_animation_conversation` →
  `animations`, `fk_user_animation_conversation` → `users`, `ClientSetNull`, unique partial index
  `ix_animation_conversations_open` on `animation_id` where `closed_at IS NULL`, `claude_session_id uuid`, `started`
  boolean default false with sentinel) and `animation_messages` (FK `fk_animation_conversation_message`, index on the
  conversation, `role` int, `text varchar(20000)`, `image_count` int default 0); DI in `Startup.cs`.
- [X] T006 Migration `AddAnimationConversations` (`dotnet ef migrations add … --project Roll6.Infra --startup-project
  Roll6.API`), incremental script `database/migrations/086-animation-conversations.sql` (header like `083-…`, from the
  previous migration `20261018134011_AddWeaponSockets`), `database/roll6.sql` regenerated with its header.
- [X] T007 Create `backend/Roll6.Domain/Interfaces/IAnimationConversationService.cs` and
  `backend/Roll6.Domain/Services/AnimationConversationService.cs`: `GetOrOpenAsync(userId, animationId)` (owner only →
  403; opens when none), `ListMessagesAsync(userId, animationId)`, `AddMessageAsync(userId, animationId, role, text,
  imageCount)`, `MarkStartedAsync(conversationId)`, `CloseAsync(userId, animationId)` ("Nova conversa"),
  `DeleteByAnimationAsync(animationId)` (used by `AnimationService.DeleteAsync` before deleting the animation).
  Tests `backend/Roll6.Tests/Domain/Services/AnimationConversationServiceTests.cs` (open once, resume the open one,
  close + reopen = new session id, owner only, text cut at 20000).
- [X] T008 `backend/Roll6.Domain/Interfaces/IAnimationNotifier.cs` (`VersionAsync(AnimationVersionInfo)`) with a
  no-op default used in tests; `AnimationService.ReplaceContentAsync(userId, animationId, content, origin = "user")`
  publishes it after the write with the given origin (the controller keeps `user`; the hub's `FileChanged` handler
  passes `agent`); `AnimationService.DeleteAsync` deletes the conversations first. Update
  `backend/Roll6.Tests/Domain/Services/AnimationServiceTests.cs` (publishes on replace with the origin, deletes
  conversations).
- [X] T008b [P] Server-side animation orchestration (moved from the roll6anime core, now pure domain code):
  `backend/Roll6.Domain/Animations/AnimationPromptContext.cs` (the former `PromptContext.Build`: the Portuguese
  instructions naming the working file path, "Modelo mostrado na tela: {nome} (um token do Roll6; só para
  referência)", the `criar-animacao` skill, Write/Edit only and simple `python` in Bash, the prints; "roll6anime" →
  "o editor de animações do Roll6") and `backend/Roll6.Domain/Animations/AnimationRequestBuilder.cs`:
  `WorkingPath(animation)` = `animacoes/{animationId}-{Slug.From(name)}.json` (forward slashes, relative to the
  console's working directory), `Build(animation, content, conversation, text, images, modelName)` → `RunInfo` (`files`
  = the working file with the content as compact JSON, `watch = ["animacoes/"]`, `systemPrompt`, `prompt` = the text,
  the images, `sessionId`/`started` from the conversation), `Classify(animation, path)` → `Working` | `OtherAnimation`
  (another `.json` under `animacoes/`) | `Ignored`. Tests `backend/Roll6.Tests/Animations/AnimationPromptContextTests.cs`
  (port of `PromptContextTests`) and `AnimationRequestBuilderTests.cs` (path, files/watch, classify, slug of accented
  names).

### Hub and relay

- [X] T009 Create `backend/Roll6.Application/Realtime/AnimationConnections.cs` (singleton, pure, tested): agents per
  user (`connectionId`, `machine`, `folder`, `busyWith`), editors per connection (`userId`, `animationId`), requests
  (`RunningRequest { requestId, animationId, userId, conversationId, agentConnectionId?, text (StringBuilder), state,
  machine, startedAt }`), a per-user FIFO queue; methods `AddAgent`, `RemoveAgent` (returns the running request to
  fail), `AddEditor`/`RemoveEditor`, `AgentStatusOf(userId)`, `Enqueue(request)` (throws `busy` when the animation
  already has a queued/running request), `NextRunnable(userId)` (a free agent + the first queued request → assigns
  and marks busy), `Finish(requestId)` (frees the agent), `AppendText`, `Running(animationId)`, `EditorsOf(animationId)`,
  `AgentsOf(userId)`. Tests `backend/Roll6.Tests/Realtime/AnimationConnectionsTests.cs`: FIFO across animations, one
  per animation, two agents take two requests, a dropped agent fails its request and the next waits, user isolation.
- [X] T010 Create `backend/Roll6.Application/Realtime/AnimationHub.cs` (`[Authorize]`, default policy) per
  contracts/agent-protocol.md: `RegisterAgent` (only `auth_method = api_key` connections → else `forbidden`; sends
  `agentStatus` to the user's editors; starts `NextRunnable`), `Progress` (appends text, relays `requestProgress` to
  the animation group), `Finished` (stores the Claude message through `IAnimationConversationService.AddMessageAsync`
  — a stopped/failed outcome adds a Notice line too —, `MarkStartedAsync` when the agent reported `started`, frees the
  agent, relays `requestFinished`, runs the next queued request), `OpenEditor` (owner check through
  `IAnimationService.GetByIdAsync` + `userId`; joins `animation:{id}`; returns `EditorStateInfo` with the content read
  through `IAnimationService.ReadContentAsync` — add it if missing —, the open conversation's messages, the agent
  status and the running request), `CloseEditor`, `SendRequest` (validates text ≤ 4000, ≤ 5 images, each ≤ 1.5 MB;
  no agent → `no-agent`; stores the user message; enqueues; `requestQueued`/`requestStarted`; sends `run` to the
  agent with `RunInfo` — the content from the service, the conversation's session id/started, the images, the model
  name sent by the page), `StopRequest` (sends `stop` to the agent), `NewConversation` (`busy` while a request runs;
  `CloseAsync`; `conversationCleared`), `FileChanged(requestId, FileChangedInfo)` (only from the request's own
  console; `AnimationRequestBuilder.Classify`: `Working` → `AnimationFormat.Parse` → valid:
  `IAnimationService.ReplaceContentAsync(userId, animationId, content, origin: "agent")` (which publishes
  `animationVersion`); invalid → `requestProgress` with a `notice` "Arquivo inválido: {erro}" (the last valid version
  stays); `OtherAnimation` → `notice` "O Claude criou {nome}"; `Ignored` → nothing). The `run` payload comes from
  `AnimationRequestBuilder.Build` (the content from the service, the conversation's session id/started, the images,
  the model name sent by the page). `OnDisconnectedAsync`: an agent → fail its running request with the notice "O
  agente caiu." and `agentStatus`; an editor → leave. Hub message size 8 MB for this hub
  (`AddSignalR().AddHubOptions<AnimationHub>`). `backend/Roll6.API/Program.cs`:
  `app.MapHub<AnimationHub>("/hubs/animation")`. `AnimationNotifier` (`Roll6.Application/Realtime/AnimationNotifier.cs`,
  implements `IAnimationNotifier`): sends `animationVersion` to the animation group and, when the origin is not
  `agent`, `writeFiles([{ path: WorkingPath, content }])` to the user's agents (serving a request or not). DI in
  `Startup.cs`.
- [X] T011 Tests `backend/Roll6.Tests/Realtime/AnimationHubTests.cs` with `Mock<IHubCallerClients>`/`IGroupManager`
  (the pattern of the existing `TableHubTests`, if any; else a small fake): `RegisterAgent` from a JWT connection →
  `forbidden`; `OpenEditor` by another user → `forbidden`; `SendRequest` without agent → `no-agent`; a queued request
  reaches the agent as `run` with the session id, the working file in `files` and `animacoes/` in `watch`;
  `FileChanged` of the working file with valid content replaces the animation (origin `agent`) and with invalid
  content relays a notice; `Finished` stores the message and advances the queue; `StopRequest` sends `stop`; a
  `user` version sends `writeFiles` to the agents; the agent's disconnect fails the request. `McpCoverageTests`
  unchanged (120 / 121).

### Console core moved (generic only)

- [X] T012 `git mv` the generic part of the roll6anime core into `backend/Roll6.Console/`: `Claude/ClaudeRunner.cs`,
  `ClaudeEvent.cs`, `StreamJsonReader.cs`, `PromptImage.cs` → `Claude/PromptMessage.cs` (keep only `PromptMessage` and
  `PromptImage(Png, Caption)`; drop `CapturePose`/`MarkupNote`), `Animations/AnimationWriter.cs` → `Files/FileWriter.cs`
  (temp + move, UTF-8 without BOM, unchanged text skipped; **no `AnimationFormat`**), `Animations/FolderWatcher.cs` →
  `Files/FileWatcher.cs` (watches a set of relative paths/folders under the working directory, 200 ms settle, own
  writes ignored, reports `(relativePath, content)`), `Settings/AnimeSettings.cs` → `Settings/ConsoleSettings.cs`
  (section `Roll6Console`: `Url`, `ClaudeWorkingDirectory`, `ClaudeExecutable`, `ClaudeAllowedTools`; `ApiKey` read
  from `ROLL6_API_KEY`, `Url` overridden by `ROLL6_URL`; no animations folder), `Upload/Roll6Api.cs` →
  `Bridge/Roll6Api.cs` (only `MeAsync` for the start-up check, `X-Api-Key`). **Not moved**: `PromptContext` (→ T008b
  on the server), `AnimationFolder`, `ConversationBook`, `AnimationUploader`, `Roll6Connection`, `Markup/*`,
  `AnimationHistory`. Namespaces `Roll6.Console.*`; `ClaudeRunner` takes the system prompt as a parameter and its
  messages mention `Roll6Console:ClaudeExecutable`. `git mv` the tests into `backend/Roll6.Tests/Console/`
  (`ClaudeRunnerTests`, `StreamJsonReaderTests` + `fixtures/claude-ok.jsonl` from `specs/062-…/contracts/samples`,
  `PromptImageTests` (message part only), `FolderWatcherTests` → `FileWatcherTests`, `AnimeSettingsTests` →
  `ConsoleSettingsTests`, writer tests → `FileWriterTests`) and fix namespaces/usings; `PromptContextTests` move to
  T008b; drop `ConversationBookTests`, `AnimationHistoryTests`, `AnimationUploaderTests`, `AnimationFolderTests`,
  `MarkGeometryTests`, `PrintAttachmentTests` (their subjects move to the browser or the server). `dotnet build
  Roll6.sln` + `dotnet test` green; `grep -ri animation backend/Roll6.Console/` finds nothing but the README.

### Frontend shared

- [X] T013 [P] Create `frontend/src/types/animationEditor.ts` mirroring the DTOs of T003 (`AgentStatus`,
  `PromptImage`, `RequestPayload`, `ClaudeEvent`, `RequestOutcome`, `EditorMessage`, `EditorState`,
  `AnimationVersion`, `CONVERSATION_ROLE` constants, `REQUEST_STATE`), and `frontend/src/Services/
  animationEditorService.ts` (`react-architecture` service class over `@microsoft/signalr`: `connect()` →
  `HubConnection` to `/hubs/animation` with `accessTokenFactory` from the stored session and automatic reconnect;
  `openEditor(animationId)`, `closeEditor()`, `sendRequest(payload)`, `stopRequest(id)`, `newConversation(id)`; `on(event,
  handler)` for the seven server→browser methods; the `HubException` messages mapped to `editor.error.*` keys).
- [X] T014 [P] `git mv` the viewer's pure modules into `frontend/src/components/animations/editor/`: `player.ts`,
  `poses.ts`, `skeleton.ts`, `poseEdit.ts`, `skeletonView.ts`, `boneGizmo.ts` and the tests `player.test.ts`,
  `poses.test.ts`, `skeleton.test.ts`, `poseEdit.test.ts` (imports `@roll6/…` → relative `../../story/…`,
  `../../../lib/…`; `SKELETON_STORAGE_KEY` → `roll6:editor-skeleton`). `npx vitest run src/components/animations/editor`
  green.
- [X] T015 [P] Create `frontend/src/lib/animationHistory.ts` (port of `AnimationHistory.cs`: `createHistory(limit =
  100)` → `{ push(text), undo(), redo(), current, counts: { undo, redo } }`, a push equal to the current is ignored,
  a push after undos drops the redo branch) with `frontend/src/lib/animationHistory.test.ts` (port of
  `AnimationHistoryTests.cs`).
- [X] T016 [P] Create `frontend/src/lib/editorState.ts`: the pure reducer of the page (`EditorState` + actions
  `opened(state)`, `agentStatus`, `requestQueued`, `requestStarted`, `requestProgress` (append delta to the running
  Claude message, add tool/notice lines), `requestFinished` (replace the running message by the stored one),
  `animationVersion` (own echo ignored by exact text), `conversationCleared`, `attachPrint`/`removePrint` (≤ 5),
  `sendPending`) with `frontend/src/lib/editorState.test.ts`.

**Checkpoint**: backend builds and tests pass (hub/queue/service/moved core); frontend lint/tests pass with the moved
viewer modules.

---

## Phase 3: US1 — Open the editor and see the animation on a model (P1)

**Goal**: the bare page in a new tab, the token select, the stage with the timeline and the key-pose label.

**Independent test**: quickstart step 1.

- [X] T017 [US1] Create `frontend/src/Contexts/AnimationEditorContext.tsx` + `frontend/src/hooks/useAnimationEditor.ts`
  (`react-architecture`): a page-scoped provider taking `animationId`; on mount connects the service, `openEditor`,
  dispatches every event into `lib/editorState`, exposes `state`, `loading`, `error` (`forbidden` / `not-found`),
  `content`, `history` (`lib/animationHistory`, seeded with the opened content; every `animationVersion` pushes),
  `token` (`roll6:editor-token`), `setToken`, `skeleton` (`roll6:editor-skeleton`), `setSkeleton`, `saveContent(file)`
  (`animationService.replaceContent` — add it to `Services/animationService.ts` if missing — then pushes to the
  history), `undo()`/`redo()` (save the neighbour version), `sendRequest`, `stopRequest`, `newConversation`,
  `attachPrint`, `removePrint`; disconnects on unmount.
- [X] T018 [US1] Create `frontend/src/components/animations/editor/ModelTokenSelect.tsx`: `GET /api/token?mine=true`
  (`tokenService.list`, page size 100) filtered by `modelFile`, a `form-select` with the token names, "Nenhum token com
  modelo 3D" + link to the main page when empty; remembers the choice through the context.
- [X] T019 [US1] Create `frontend/src/components/animations/editor/AnimationStage.tsx` (lazy; port of the viewer's
  `main.ts` minus the bridge): renderer, scene (`#0b1220`, disc, lights), `OrbitControls`, the holder with the token's
  model (`loadModel(token.modelFileUrl)` → `instantiate`), `Player(model, asset.scene, height)`, `createSkeletonView`,
  `createBoneGizmo` (US3 wiring, present but disabled until T027), `cameraAngles`, `stampPrint`, zoom buttons (085
  `ZoomButtons` over the stage driving `controls.minDistance/maxDistance`… or the camera distance), the frame loop;
  props `modelUrl`, `content: AnimationFile | null`, `contentKey` (changes when another version arrives; the same
  animation keeps time — `nextPlayback`), `skeleton`, `editingAllowed`; events `onModelLoaded({ mixamo, bones })`,
  `onModelError`, `onAnimationError(message)`, `onPlayback(playback, pose)` (throttled to the frame loop), `onSave(file)`;
  handle `capture(): CapturedPrint`. The content → `toRoll6Clip(file, 'animation:' + id)` + `buildRoll6Clip` (as the
  viewer's `Player.setAnimation`).
- [X] T020 [US1] Create `frontend/src/components/animations/editor/AnimationTimeline.tsx` (port of `timeline.ts` +
  `poses.ts` label): play/pause (`PlayFillIcon`/`PauseFillIcon`), the `form-range` 0…duration written per frame, "1,2
  s de 3,0 s", "Pose 2 de 5" / "Entre as poses 2 e 3 (de 5)", disabled without an animation; a drag pauses and seeks.
- [X] T021 [US1] Create `frontend/src/pages/AnimationEditorPage.tsx` and `frontend/src/components/animations/editor/
  EditorTopBar.tsx`: the bare page (no `TopMenu`): top bar with `BrandLogo variant="horizontal"` (symbol below `md`),
  the animation name, the agent badge (`editor.agent.connected` "conectado ({{machine}})" green, `busy` "ocupado",
  `disconnected` "desconectado" with an ⓘ popover `editor.agent.hint` explaining the agent — link to the README) and
  `ModelTokenSelect`; the body `stm-editor-layout` (grid 1fr 380px on `md+`, stacked below) with the stage + timeline on
  the left and a placeholder for the conversation (T024) on the right; `useDocumentTitle` "{nome} · Editor | Roll6";
  the forbidden/not-found card with "Voltar ao Roll6". Wrap in `AnimationEditorProvider`. Route in
  `frontend/src/App.tsx`: `<Route path="/animation/:id" element={<ProtectedRoute><AnimationEditorPage /></ProtectedRoute>} />`.
  CSS in `styles/app.css` (`.stm-editor-*`).
- [X] T022 [US1] `frontend/src/components/animations/AnimationList.tsx`: for `mine`, a button-link "Editar no editor"
  (`BoxArrowUpRightIcon` added to `components/ui/icons.tsx` from the official `bi-box-arrow-up-right`) as `<a
  href={`/animation/${id}`} target="_blank" rel="noopener">` with `title`/`aria-label` `animations.openEditor`.
- [X] T023 [US1] i18n (text insertion in `pt-BR.json`): `animations.openEditor` "Editar no editor", the `editor.*`
  block: `title`, `agent.*`, `model.*` (label, none, noneHint), `stage.*` (loading, modelError, notMixamo,
  animationError), `timeline.*` (play, pause, of, pose, between), `forbidden`, `notFound`, `back`. `npm test -- keys`.

**Checkpoint**: the page opens in a new tab from the library, shows only the logo and the editor, plays the animation
on the chosen token with the timeline and the pose label; `forbidden` for another user's animation.

---

## Phase 4: US5 — The console program `Roll6.Console` (P2, needed by US2)

**Goal**: `Roll6.Console` connects, registers, runs generic requests and reports watched files — without knowing
what an animation is.

**Independent test**: quickstart step 2 (and the console lines of contracts/agent-config.md).

- [X] T024 [US5] Create `backend/Roll6.Console/Bridge/BridgeClient.cs`: `HubConnectionBuilder.WithUrl(url +
  "/hubs/animation", o => o.Headers["X-Api-Key"] = key).WithAutomaticReconnect()`, handlers `run` (→ `RequestRunner`),
  `stop`, `writeFiles` (→ `FileWriter`, watcher echo ignored), `Reconnected` → `RegisterAgent` again, `Closed` →
  retry loop with a console line; `RegisterAsync(machine, folder)`; `ProgressAsync(requestId, ClaudeEventInfo)`,
  `FileChangedAsync(requestId, FileChangedInfo)`, `FinishedAsync(requestId, outcome)`.
- [X] T025 [US5] Create `backend/Roll6.Console/Bridge/RequestRunner.cs`: one request at a time; `RunAsync(RunInfo)` —
  refuses any `files[].path`/`watch[]` outside the working directory (`Path.GetFullPath` prefix check →
  `Finished(failed, "caminho fora da pasta de trabalho")`), writes `files[]` with `FileWriter` (creating folders),
  starts `FileWatcher` on `watch[]`, runs `ClaudeRunner.RunAsync(systemPrompt, prompt, images, sessionId, started)`
  with a `Progress<ClaudeEvent>` mapped to `ClaudeEventInfo` (started → `started`; text; tool → `tool` with
  `Describe()`; permission denials → `notice`), reports every settled change as `FileChangedAsync` (console "Arquivo
  alterado: {path}"), keeps watching 30 s after the result, then `FinishedAsync` with the outcome. `Stop(requestId)`
  cancels (kills the process tree). Tests `backend/Roll6.Tests/Console/RequestRunnerTests.cs` with a fake
  `IClaudeProcess` and a temp working directory (files written before the run, a changed watched file reported with
  its content, a path outside the directory refused, stop).
- [X] T026 [US5] Create `backend/Roll6.Console/Program.cs` (generic host: `ConsoleSettings` bound from
  `appsettings.json` + env; the start-up checks of contracts/agent-config.md — key missing/invalid → exit 2, `claude
  --version` warning, working directory must exist; the console lines in Portuguese; Ctrl+C stops the running
  request and leaves), `appsettings.json` (the defaults of the contract) and `backend/Roll6.Console/README.md`
  (what it is — a bridge between the Roll6 and this machine's Claude Code, used by the animation editor and by any
  future screen —, install, configure, run, publish; the editor page points to it). `dotnet run --project
  Roll6.Console` against the dev API (`Url` = `http://localhost:5119`) registers and shows "Conectado ao … como …".

**Checkpoint**: the console connects to the dev API; the page's badge turns "conectado (MÁQUINA)".

---

## Phase 5: US2 — Conversation with the local Claude (P1)

**Goal**: send requests, stream the answers, play the versions as they arrive, resume conversations.

**Independent test**: quickstart step 3.

- [X] T027 [US2] Create `frontend/src/components/animations/editor/EditorConversation.tsx`: the message list (user
  lines with this tab's thumbnails and "N prints" for stored ones, Claude lines with the live text — `MarkdownView`
  lazy for finished ones —, notice lines muted), "aguardando o agente (posição N)" / "rodando na MÁQUINA", the
  composer (`textarea`, Enter sends / Shift+Enter new line, ≤ 4000, disabled without agent with `editor.agent.hint`,
  disabled while a request runs), the attachment strip (T034), "Enviar", "Parar" (while running), "Nova conversa"
  (confirm with `ConfirmModal`, disabled while running). Wire into `AnimationEditorPage` (T021 placeholder).
- [X] T028 [US2] `AnimationEditorContext`: `sendRequest(text)` builds `RequestPayload` with the attachments (base64
  without the `data:` prefix + captions) and the token's name, calls the service, handles `busy`/`no-agent`/`invalid`
  as toasts; on `animationVersion` the content is pushed to the history and the stage gets `contentKey` with
  `keepTime` (the same animation); `requestFinished` with `failed` shows the message as a notice line (already from
  the server) and a toast.
- [X] T029 [US2] End-to-end check against the dev API with the console (quickstart step 3): request → stream → the
  console reports the changed working file → the server validates and stores it → the version plays at the same
  instant/angle → "Parar" → reopen resumes → "Nova conversa".
- [X] T030 [US2] i18n: `editor.conversation.*` (empty, you, claude, notice, queued, running, send, stop, stopped,
  failed, newConversation, confirmNew, placeholder, tooLong), `editor.error.*` (busy, noAgent, invalid, agentDropped).

**Checkpoint**: a request made in the page changes the animation on screen within seconds, through the local Claude.

---

## Phase 6: US3 — Skeleton, pose editing and history (P2)

**Goal**: the viewer's skeleton/gizmo/history inside the stage, saving to the library.

**Independent test**: quickstart step 4.

- [X] T031 [US3] `AnimationStage.tsx`: the "Esqueleto" toggle (`BonesIcon` — `bi-diagram-3` or similar — over the
  stage; `md+` only), hover label (`.stm-editor-bone-label`), click on a joint → `select` (pause, freeze, gizmo), drag
  → status "{bone}: 32°", release → `degreesFromLocal` + `setKey` → `onSave(file)`; Esc / click on nothing → deselect;
  `editingAllowed` false → status with the reason (`editor.edit.blockedRunning` while a request runs,
  `editor.edit.notMixamo`); `isEditableBone` guard. Status line under the stage (`.stm-editor-status`).
- [X] T032 [US3] `AnimationEditorContext.saveContent(file)` → `animationService.replaceContent(id, file)` (400 → status
  "Não gravado: {erro}", the stage thaws to the file's pose), the version pushed to the history, the own echo of
  `animationVersion` ignored by exact text; `undo()`/`redo()` save the neighbour text; ↶ n / ↷ n buttons over the
  stage and Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z on the page (not inside the textarea); `editingAllowed` = no request
  running and content valid.
- [X] T033 [US3] i18n: `editor.skeleton.*` (show, hide, none), `editor.edit.*` (drag, saving, notSaved, undo, redo,
  blockedRunning, notMixamo, notEditable), and a Vitest for the history integration in `editorState.test.ts` (own echo
  ignored, undo/redo counts).

**Checkpoint**: a bone turned on screen becomes a saved version; undo/redo walk the versions.

---

## Phase 7: US4 — Prints with markup (P2)

**Goal**: capture, mark, attach and caption prints for the Claude.

**Independent test**: quickstart step 5.

- [X] T034 [P] [US4] Create `frontend/src/lib/markup.ts` (port of `MarkGeometry.cs` + `Mark.cs`: `MARK_KIND`
  constants, `Mark { kind, points | box }`, `strokeWidth(size)`, `clampToImage`, `isMeaningful`, `arrowHead`,
  `drawMarks(context, marks, scale)` in red `#ff3b30` with dotted rectangles/ellipses and a solid arrow) with
  `frontend/src/lib/markup.test.ts` (port of `MarkGeometryTests.cs`), and `frontend/src/lib/printCaption.ts`
  (`caption({ animationName, time, duration, paused, azimuth, elevation, pose, skeleton, marks })` → the Portuguese
  text of `ViewCapture.Caption` + `SKELETON_NOTE` + `MarkupNote`; `cameraSide(azimuth, elevation)`) with
  `printCaption.test.ts` (port of `PrintAttachmentTests`/`PromptImageTests` caption cases).
- [X] T035 [US4] Create `frontend/src/components/animations/editor/PrintMarkupModal.tsx` (`Modal` large): the print on
  a canvas sized to the image (`.stm-markup-stage`), tools Lápis / Retângulo / Círculo / Seta (`btn-group`, icons),
  Desfazer (Ctrl+Z inside the modal), Limpar, Concluir (Enter) → `{ png (marked, data URL), marks }`, Cancelar (Esc);
  pointer drawing with `lib/markup`.
- [X] T036 [US4] Attachments in `EditorConversation`/context: "Anexar print" (`CameraIcon`, `md+`, disabled without a
  model) → `stage.capture()` → `PrintMarkupModal` → `attachPrint({ original, marked, marks, caption })` (≤ 5, toast
  `editor.prints.max`); the strip of thumbnails (click reopens the markup with the original and the marks, × removes);
  on send each marked PNG downscaled to ≤ 1024 px (canvas) and sent with its caption; the sent message keeps the
  thumbnails in this tab.
- [X] T037 [US4] i18n: `editor.prints.*` (attach, max, markup title, tools, undo, clear, done, cancel, captionSkeleton…)
  and the markup CSS.

**Checkpoint**: a marked print reaches the Claude with its caption; the thumbnails show on the sent message.

---

## Phase 8: Removal, docs and polish

- [X] T038 Delete `roll6anime/` (`git rm -r`), remove its mentions from `.gitignore`/workflows if any, and the
  `@roll6` alias comment references; `frontend/vite.config.ts` untouched (check). `dotnet build backend/Roll6.sln` and
  `npm run build` green.
- [X] T039 [P] `CLAUDE.md`: replace the "## roll6anime (062) — Windows animation editor" section (and its commands
  block) by "## Roll6.Console bridge and web animation editor (086)": the page (`/animation/:id`, new tab, bare), the
  context/service, the ported modules, the hub protocol summary (generic console half vs the animation half), the
  server-side `AnimationPromptContext`/`AnimationRequestBuilder`, the console (generic, config, start-up, lines), the
  tables, what is per tab (history, thumbnails); update the "Animation library (059)" sentence about the
  `criar-animacao` skill and the "Backend layout" list (add `Roll6.Console`, depends only on `DTO`); add the
  "086-web-animation-editor" line at the top of `## Recent
  Changes`; drop the roll6anime entries from "Recent Changes" only if the section grows past its usual size (keep
  history otherwise).
- [X] T040 [P] Spec docs: mark `specs/062-roll6anime-editor/spec.md` (and 064–067) as superseded by 086 in a one-line
  note at the top of each `spec.md` (the contracts stay as history); `specs/086-web-animation-editor/quickstart.md`
  updated with anything learned.
- [X] T041 Full runs: `dotnet build backend/Roll6.sln`, `dotnet test` (all, MCP 120 / 121), `npm run lint`, `npm test`,
  `npm run build` (`three` lazy; the editor page in its own chunk); the quickstart steps 1–6 against the dev API with
  the agent running on this machine. Mark the tasks in `specs/086-web-animation-editor/tasks.md` and add
  "Implementation notes" (deviations, numbers, what was not verified).

---

## Dependencies

- Phase 2 before every story: T003 → T004/T005 → T006 → T007/T008/T008b → T009 → T010 → T011; T012 after T002;
  T013–T016 after T003 (types mirror the DTOs).
- **US1** (T017–T023): T017 after T013/T015/T016; T019 after T014; T021 after T017–T020; T022/T023 any time.
- **US5** (T024–T026): after T012 and T010 (the hub must exist to test against).
- **US2** (T027–T030): after US1 and US5.
- **US3** (T031–T033): after T019/T017 (stage and context); independent of the agent.
- **US4** (T034–T037): T034 any time after T013; T035/T036 after T027.
- Phase 8 last; T039/T040 parallel with T041's runs.

## Parallel examples

- Phase 2: T003 ∥ T004 ∥ T005 ∥ T008b; T013 ∥ T014 ∥ T015 ∥ T016; T012 ∥ the frontend tasks.
- US1: T018 ∥ T019 ∥ T020 ∥ T022 ∥ T023 after T017.
- US4: T034 while US2 is being wired.

## Implementation strategy

1. Phase 2 (server + console core) and US1: the page shows any animation of the library on a token — already useful.
2. US5 + US2: the console bridge and the conversation — the reason of the feature.
3. US3, US4, then the removal of the desktop app and the docs.

## Implementation notes (2026-10-18)

- **Done as planned**, with these deviations:
  - The roll6anime files were rewritten into their new homes instead of `git mv` (every moved file changed namespace,
    dependencies and most of its body; the history of `roll6anime/` stays in git until its removal commit).
  - `RequestRunner` uses a synchronous progress (`Claude/SyncProgress`) instead of `Progress<T>`, so the events reach the
    hub in order (a text delta could otherwise arrive after the result line).
  - `PromptMessage` keeps accents readable (`UnsafeRelaxedJsonEscaping`); the working file is written with LF on every
    platform (`AnimationRequestBuilder.Serialize`).
  - The hub validates the reported working file with `AnimationFormat.Parse` itself before calling
    `ReplaceContentAsync` (the service validates again), so an invalid file is a notice and never a version.
  - `AnimationVersionInfo` carries the animation `name` (the notifier needs it for the working file path).
  - `EditorStateInfo.running.queuePosition` tells a reopened tab whether the request is still queued.
  - The console's `Roll6Api` makes the one REST call of the start-up check (`GET /api/user/me`); versions go through the
    hub (`FileChanged`), never through REST from the console.
- **Numbers**: backend 2012 tests (xUnit) pass, MCP coverage unchanged (120 / 121); frontend 900 tests (Vitest) pass,
  `npm run lint` clean, `npm run build` puts the stage in its own chunk (`AnimationStage-*.js`, ~55 kB; `three` stays
  in the existing lazy chunk).
- **Not verified on this machine**: the end-to-end checks of the quickstart (steps 1–6) need the dev API against a
  reachable PostgreSQL and a running `Roll6.Console` with a real API key and Claude Code login; there is no database on
  the dev machine. To run them: `dotnet run --project Roll6.API`, `ROLL6_URL=http://localhost:5119 ROLL6_API_KEY=r6_…
  dotnet run --project Roll6.Console`, `npm run dev`, then menu › Animações › "Editar no editor".
