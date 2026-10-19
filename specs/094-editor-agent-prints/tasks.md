# Tasks: Prints pedidos pelo Claude no editor de animação

**Input**: Design documents from `specs/094-editor-agent-prints/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/console-tools.md, contracts/editor-prints.md

**Tests**: included — the project keeps pure rules and hub/console behaviour under xUnit and Vitest.

Paths: `be/` = `backend/`, `fe/` = `frontend/src/`.

## Phase 1: Setup

- [X] T001 Verify live with Claude Code that an inline `--mcp-config` with `"type":"http"`, `url` and `headers` connects to a loopback server, that `mcp__roll6-editor__print_stage` in `--allowedTools` runs without a prompt under `-p`, and that an MCP `image` result reaches the model (research R7); record the outcome (or the `?token=` fallback) in `specs/094-editor-agent-prints/research.md`.
- [X] T002 Add `<FrameworkReference Include="Microsoft.AspNetCore.App" />` and `ModelContextProtocol.AspNetCore` 2.2.0 to `be/Roll6.Console/Roll6.Console.csproj`; build with the scratch `BaseOutputPath` (the running console locks `bin/`).

## Phase 2: Foundational (blocking)

- [X] T003 [P] Add `ToolInfo { name, description, inputSchema (JsonElement) }`, `RunInfo.Tools` (`List<ToolInfo>`), `ToolCallInfo { callId, name, arguments }`, `ToolImageInfo { mediaType, data }`, `ToolResultInfo { callId, isError, text, images }` with `JsonPropertyName`s to `be/Roll6.DTO/Realtime/Console/RunInfo.cs`.
- [X] T004 [P] Add `PrintShotInfo { time (JsonElement: number or "key"), view, skeleton }`, `PrintRequestInfo { requestId, callId, content, shots }`, `PrintedShotInfo { png, caption }`, `PrintResultInfo { callId, error, shots }` in `be/Roll6.DTO/Realtime/Animation/PrintInfo.cs`.
- [X] T005 Pure `be/Roll6.Domain/Animations/PrintRequest.cs`: `Parse(JsonElement? arguments)` → shots (defaults key / three-quarter / false; ≤ 6; views front|back|right|left|top|three-quarter; time ≥ 0 or "key"), `MAX_SHOTS = 6`, `MAX_PER_REQUEST = 30`, the Portuguese error texts of `contracts/editor-prints.md`, `ToolDefinition()` (name, description, input schema) and `ResultText(captions)` ("Print 1: …").
- [X] T006 [P] Tests `be/Roll6.Tests/Domain/Animations/PrintRequestTests.cs`: defaults, 7 shots refused, unknown view, negative time, "key", result text numbering, schema has `shots.maxItems = 6`.

## Phase 3: User Story 1 - O Claude confere o que escreveu (P1) 🎯 MVP

**Goal**: during an editor request the Claude calls `print_stage`, gets the latest version printed and checks it.
**Independent test**: quickstart scenario 1 (and 3 for the latest version).

### Console (generic)

- [X] T007 [US1] `be/Roll6.Console/Tools/LocalToolServer.cs`: start on `http://127.0.0.1:0/mcp` (Kestrel, OS port), random 32-byte token checked on every request (`Authorization: Bearer` or `?token=`, else 401), dynamic tools from `RunInfo.Tools` (an `McpServerTool` subclass exposing the given `ProtocolTool`, invoking a `Func<ToolCallInfo, CancellationToken, Task<ToolResultInfo>>`), result mapped to MCP `TextContentBlock` + `ImageContentBlock`s and `IsError`; `Url`, `Token`, `DisposeAsync` stops it.
- [X] T008 [US1] `be/Roll6.Console/Files/FileWatcher.cs`: `FlushAsync()` — read each watched file now and report the ones whose text differs from the last report (same callback, awaited), ignoring own writes.
- [X] T009 [US1] `be/Roll6.Console/Claude/ClaudeRunner.cs`: `Arguments(…, tools)` — when `tools` is non-empty and not `readOnly`, add `--mcp-config` with the server JSON of `contracts/console-tools.md` and append `mcp__roll6-editor__<name>` to the `--allowedTools` value; read-only runs unchanged.
- [X] T010 [US1] `be/Roll6.Console/Bridge/BridgeClient.cs`: client method `toolResult(ToolResultInfo)` completing a pending call by `callId`; `CallToolAsync(requestId, ToolCallInfo, ct)` sending hub `ToolCall` and awaiting the result (60 s → error result "O Roll6 não respondeu a tempo.").
- [X] T011 [US1] `be/Roll6.Console/Bridge/RequestRunner.cs`: when the run has tools (and is not read-only), start `LocalToolServer` before Claude, its invoke = log "Pedido #N: ferramenta {name}…" → `watcher.FlushAsync()` → `bridge.CallToolAsync`; pass url/token to `ClaudeRunner.Arguments`; stop it when the run ends (done/stopped/failed) and fail pending calls.
- [X] T012 [P] [US1] Tests `be/Roll6.Tests/Console/ClaudeRunnerTests.cs` (mcp-config + allowed names with tools; none for read-only or no tools) and `be/Roll6.Tests/Console/RequestRunnerTests.cs` (tool call flushes files before forwarding, server stopped after the run, read-only ignores tools).
- [X] T013 [P] [US1] Tests `be/Roll6.Tests/Console/LocalToolServerTests.cs`: 401 without token, `tools/list` returns the given tool, `tools/call` forwards and returns text + image, error mapped to `isError`.

### Server

- [X] T014 [US1] `be/Roll6.Application/Realtime/AnimationConnections.cs`: `EditorRequest.EditorConnectionId` (set by `Enqueue` from the sender), `LatestContent`/`LatestError` (`SetLatest(content)` / `SetLatestError(message)`), `PrintCount` + `TryReservePrints(n)` (≤ 30), pending prints (`AddPendingPrint(callId)`, `CompletePrint(callId, result)`, `FailPendingPrints(requestId, message)`), `FailPrintsOfEditor(connectionId)`.
- [X] T015 [US1] `be/Roll6.Domain/Animations/AnimationRequestBuilder.cs`: editor runs get `Tools = [PrintRequest.ToolDefinition()]`; asks (093) none. `be/Roll6.Domain/Animations/AnimationPromptContext.cs`: append the "Prints do palco" section of `contracts/editor-prints.md`.
- [X] T016 [US1] `be/Roll6.Application/Realtime/AnimationHub.cs`: `SendRequest` passes `Context.ConnectionId`; `RelayVersionAsync` records `SetLatest`/`SetLatestError`; new `ToolCall(requestId, ToolCallInfo)` (only from the running agent; unknown tool / request gone / ask → error result; `PrintRequest.Parse`; latest-error and limit checks; editor gone → error; `printRequested` to `EditorConnectionId` with `LatestContent`; wait 20 s; `toolResult` to the caller); new `PrintResult(PrintResultInfo)` (only from that request's editor connection, pending callId) → `toolResult` with captions + PNGs; `Finished`/`StopRequest` fail pending prints ("O pedido foi encerrado."); editor disconnect fails its prints ("O editor não está aberto…").
- [X] T017 [P] [US1] Tests `be/Roll6.Tests/Application/AnimationConnectionsTests.cs` (latest content/error, 30 limit, pending complete/fail, editor disconnect) and `be/Roll6.Tests/Application/AnimationHubTests.cs` (ToolCall from another connection ignored, invalid args → error result, printRequested to the sender tab with latest content, PrintResult relayed as toolResult, timeout, finish fails pending, asks get no tools).
- [X] T018 [P] [US1] Tests in `be/Roll6.Tests/Domain/Animations/AnimationRequestBuilderTests.cs` (editor run carries `print_stage`; prompt has the "Prints do palco" section; ask runs have no tools).

### Editor tab

- [X] T019 [P] [US1] Pure `fe/lib/shotCamera.ts` (+ `fe/lib/shotCamera.test.ts`): `SHOT_VIEWS`, `shotAngles(view)` (research R5), `shotCameraPosition(target, radius, view)`, `viewLabel(view)` matching `printCaption.cameraSide`.
- [X] T020 [US1] `fe/components/animations/editor/AnimationStage.tsx`: `StageHandle.captureShots(content, shots)` → `{ png, time, duration, view, skeleton, pose }[]` | error string — synchronous: temporary mixer/clip from `buildRoll6Clip(content)`, time = number clamped to the duration or the key pose (`lib/keyPose`), skeleton toggle, shot camera, renderer size 768 × 768 (no style change), stamp like `stampPrint`, then restore pose (`player.refresh()`), skeleton, camera, size and render the normal view.
- [X] T021 [US1] `fe/Services/animationEditorService.ts`: `onPrintRequested(handler)` and `printResult(info)` (hub `PrintResult`); types in `fe/types/animationEditor.ts` (or the existing editor types file).
- [X] T022 [US1] `fe/Contexts/AnimationEditorContext.tsx`: on `printRequested` for this tab's running request — no model → error "Escolha um modelo 3D no editor para tirar prints.", non-Mixamo → its error, else `stage.captureShots`, captions via `lib/printCaption.caption` (animation, instant, pose, view, skeleton note, weapons), send `printResult`; dispatch a local `agentPrint` line.

## Phase 4: User Story 2 - Vários ângulos e instantes (P2)

**Goal**: one call with up to 6 shots, each with its own instant, view and skeleton, captions in order.
**Independent test**: quickstart scenario 2.

- [X] T023 [US2] `fe/lib/printCaption.ts`: accept an explicit `view` (front/back/right/left/top/three-quarter) for agent shots so the caption names the side asked, keeping the user's print captions unchanged (+ cases in `fe/lib/printCaption.test.ts`).
- [X] T024 [US2] `fe/components/animations/editor/AnimationStage.tsx`: skeleton per shot (amber/cyan as the "Esqueleto" button) and the weapons toggle state respected; shots returned in the requested order.

## Phase 5: User Story 3 - O usuário acompanha os prints (P3)

**Goal**: the conversation shows each print line with thumbnails; the user's stage never changes.
**Independent test**: quickstart scenario 1 (watch the stage) + the conversation lines.

- [X] T025 [US3] `fe/lib/editorState.ts` (+ test): `agentPrint` line `{ requestId, shots[{ png, caption }], error }` placed under the running Claude line, cleared like the other live lines.
- [X] T026 [US3] `fe/components/animations/editor/EditorConversation.tsx`: render "Print para o Claude" with thumbnails (click → `ImageLightbox`) or the error muted; CSS `.stm-editor-print-*` in `fe/styles/app.css`.
- [X] T027 [P] [US3] i18n `editor.print.*` in `fe/i18n/locales/pt-BR.json` (line label, errors shown by the tab).

## Phase 6: Polish

- [X] T028 [P] `be/Roll6.Console/README.md`: tools in a run, the loopback MCP server, token, lifetime, what it never does (read-only runs, other ports).
- [X] T029 [P] `CLAUDE.md` (keep the BOM): 094 paragraph in the "Roll6.Console bridge and web animation editor" section + Recent Changes entry.
- [X] T030 Backend build + `dotnet test` (scratch `BaseOutputPath`); frontend `npm run lint`, `npm test`, `npm run build`.
- [X] T031 Manual check with the real console (quickstart 1–7) where possible; mark tasks `[X]` and append "Implementation notes" (deviations, T001 result, what was not verified) to this file.

## Dependencies

- Setup (T001–T002) → Foundational (T003–T006) → US1 → US2 → US3 → Polish.
- US1: console T007–T011 and server T014–T016 can proceed in parallel after T003–T005; tab T019–T022 after T004.
- US2 and US3 extend US1's stage/context; they don't depend on each other.

## Parallel examples

- After T005: T007 (console server), T014 (connections) and T019 (shot camera) in parallel.
- Tests T012, T013, T017, T018 in parallel once their code exists.

## Implementation Strategy

1. **MVP** = US1: one default print reaching the Claude and the prompt telling it to check after each change.
2. US2 adds the angles/instants and caption detail; US3 the user's visibility.
3. Polish and the manual pass.

---

## Implementation notes

- **T001 (live, Claude Code 2.1.301)**: an inline `--mcp-config` with `"type":"http"` + `headers` sends the bearer
  token on every POST; `--allowedTools mcp__roll6-editor__print_stage` runs the tool under `-p --permission-mode
  dontAsk` with no denial; the MCP image reaches the model (it named the picture's colour). Recorded in research.md.
- **T031 (live, partial)**: the console's real `LocalToolServer` (Kestrel + `ModelContextProtocol.AspNetCore` 2.2.0,
  stateless) hosted by a scratch program answered Claude Code 2.1.301 end to end: 401 without the token, the call
  forwarded with its arguments (`{"shots":[{"view":"front"}]}`), the returned PNG seen by the model. **Not verified**:
  the full round trip site ↔ API ↔ console ↔ tab (no PostgreSQL on this machine), the stage's `captureShots` drawing
  in a real browser, and the quickstart scenarios 1–7 through the site.
- **Deviations**:
  - `FileWatcher.Flush()` is synchronous (not `FlushAsync`): it raises the same `FileSettled` event and the runner
    awaits the queued reports before forwarding the call. The watcher now remembers each file's last text (at start,
    reported or written by the console) and skips settles with unchanged text, so a flushed edit is not reported twice.
  - The print waiting and the `toolResult` live in `AgentDispatcher.HandleToolCallAsync` / `ToolResultAsync` (a
    singleton with the hub context) instead of the hub method: a hub method that waited 20 s would hold the console's
    other messages behind it. `AgentDispatcher.PrintTimeout` (20 s) is settable for the tests.
  - The console prefixes each call id with the request id (`"12:c1"`), so ids never collide across runs.
  - The AnimationConnections bookkeeping (latest content, limit, pending prints) is tested through the hub tests
    rather than a separate pure test class.
- **Numbers**: backend 2113 tests passing (console 57 of them in the console/print filter); frontend lint clean,
  106 files / 960 tests, build OK. No schema, REST or MCP change (MCP still 124 operations / 125 tools).
