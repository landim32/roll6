# Implementation Plan: Editor de animações na web com o Claude local

**Branch**: `086-web-animation-editor` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/086-web-animation-editor/spec.md`

## Summary

The roll6anime desktop editor becomes a **page of the Roll6** (`/animation/:id`, opened in a new tab from the
animation library, bare: logo + editor) and a **generic console bridge** (`backend/Roll6.Console`, isolated from
animations) that connects out to the Roll6 with the user's API key and runs the local Claude Code for whatever the
server asks: a system prompt, a prompt, images, a session, files to write and paths to watch.

- **Console** (research R1/R2/R6/R7): the generic part of the roll6anime core moves into `Roll6.Console`
  (`ClaudeRunner`, `StreamJsonReader`, `PromptMessage`, `FileWriter`, `FileWatcher`), plus `BridgeClient` (SignalR,
  `X-Api-Key`, auto-reconnect, `RegisterAgent`, `run`/`stop`/`writeFiles`) and `RequestRunner` (write the files, run the
  Claude, relay the events, report watched files). Configuration by `appsettings.json` (`Roll6Console`) +
  `ROLL6_API_KEY`. It references only `Roll6.DTO` and knows nothing of animations.
- **Server** (R3/R4): `AnimationHub` at `/hubs/animation` (JWT or key) with the in-memory `AnimationConnections`
  (agents, editors, running requests, per-user FIFO queue, one request per animation) and the relay; conversations and
  messages persisted (`animation_conversations`, `animation_messages`, migration `AddAnimationConversations`);
  the animation orchestration on the server (`AnimationPromptContext`, `AnimationRequestBuilder`: the former
  `PromptContext` plus the files/watch of each request; `FileChanged` validated with `AnimationFormat` and stored as a
  version); `AnimationService.ReplaceContentAsync` tells the hub (`IAnimationNotifier`) so pose edits, undo and the
  console's changes all reach the open editors (and the console's working file). No new REST endpoint: MCP stays at
  120 / 121.
- **Page** (R5): `AnimationEditorPage` with `AnimationEditorContext`, `animationEditorService` (SignalR client), the
  ported viewer (`AnimationStage`, `AnimationTimeline`, `player`, `poses`, `skeleton`, `skeletonView`, `boneGizmo`,
  `poseEdit`), the conversation (`EditorConversation`), prints (`PrintMarkupModal`, `lib/markup`, `lib/printCaption`),
  the tab history (`lib/animationHistory`), the token select, zoom (085), "Editar no editor" in `AnimationList`.
- **Removal** (R8): `roll6anime/` deleted; its tests moved to `Roll6.Tests/Animations/` and its viewer tests into the
  frontend; CLAUDE.md and the README rewritten.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (API, console); TypeScript 5 / React 18 (page).

**Primary Dependencies**:
- Backend existing: ASP.NET Core 8 + SignalR (017), EF Core 9 + Npgsql, `ModelContextProtocol.AspNetCore` 2.x.
- **New (console only)**: `Microsoft.AspNetCore.SignalR.Client` 8.x, `Microsoft.Extensions.Hosting` 8.x,
  `Microsoft.Extensions.Configuration.Json`/`Binder` 8.x (the last two were already used by roll6anime).
- Frontend existing: React 18, React Router 6, Bootstrap 5.3, i18next, sonner, `@microsoft/signalr` 8, `three`
  0.186.1 (`OrbitControls`, `TransformControls` from its examples — already in the package). **No new npm dependency.**

**Storage**: PostgreSQL — `animation_conversations`, `animation_messages` (migration `AddAnimationConversations` +
`database/migrations/086-animation-conversations.sql`; `roll6.sql` regenerated). Browser: `roll6:editor-token`,
`roll6:editor-skeleton`. Console: nothing stored (the working files the server asks for, inside the working
directory).

**Testing**:
- xUnit: the moved roll6anime tests (runner arguments, stream reader with `claude-ok.jsonl`, prompt message, watcher,
  writer, settings) under `Roll6.Tests/Console/`; `AnimationPromptContext` and `AnimationRequestBuilder` (the former
  prompt-context tests + files/watch/classify); `AnimationConnections` (queue, one per animation, agent pick, drop),
  `AnimationConversationService` (open/resume/close/messages, owner only), hub relay through a fake clients proxy,
  MCP coverage unchanged (120 / 121).
- Vitest: the moved viewer tests (`player`, `poses`, `skeleton`, `poseEdit`), `markup` (port of `MarkGeometryTests`),
  `printCaption`, `animationHistory`, `editorState` reducers.

**Target Platform**: web (desktop first; phones view and chat); the console on Windows (also Linux/macOS with .NET 8 +
Claude Code).

**Project Type**: web application (backend + frontend) + a console app.

**Performance Goals**: the Claude's text streams with no visible lag; a version plays within 5 s of the write
(SC-002); the console runs one request at a time.

**Constraints**:
- Every controller action needs an MCP tool (020): the editor talks through the hub, not through new REST routes.
- The hub takes keys **and** JWTs; the `Session` policy stays on the `TableHub`.
- `three` stays in lazy chunks (the stage is `React.lazy`).
- CRLF files; `pt-BR.json` edited as text; no TS `enum`.
- The table project (`gurps-adventure`) is the user's: not edited.

**Scale/Scope**: one agent per user (two tolerated), one request at a time, conversations of up to a few hundred
messages per animation.

## Constitution Check

| Principle | Status |
|---|---|
| I. Architecture skills | ✅ `AnimationConversation`/`AnimationMessage` with `dotnet-architecture` (models, repositories, service, DI); `AnimationEditorContext`/`animationEditorService`/`useAnimationEditor` with `react-architecture` |
| II. Fixed stack | ⚠ the console adds `Microsoft.AspNetCore.SignalR.Client` + `Microsoft.Extensions.Hosting` (Complexity Tracking); no new npm package; a console app is not a 4th stack (it is .NET, like the MCP gateway) |
| III. Directory casing | ✅ `Contexts/`, `Services/`, `hooks/`, `types/`, `lib/` |
| IV. Code conventions | ✅ PascalCase/camelCase, `[JsonPropertyName]`, ProblemDetails for REST (unchanged), `HubException` codes for the hub (as `TableHub`), `interface` over `type`, no enums |
| V. Database | ✅ snake_case, `{table}_pkey`, FKs `fk_{pai}_{filho}` with `ClientSetNull`, `timestamp without time zone`, one migration + incremental SQL |
| VI. Auth & security | ✅ `[Authorize]` hub; owner checks on every hub method; the key never leaves the console's environment; relay scoped by user; the console writes only inside its working directory |
| VII. Hex grid | ✅ untouched |

**Result**: PASS with one justified addition (below). Re-checked after Phase 1: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/086-web-animation-editor/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/agent-protocol.md, contracts/agent-config.md, contracts/editor-page.md
└── tasks.md            (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.Console/                         NEW console project (in Roll6.sln), generic bridge to the local Claude
│   ├── Program.cs, appsettings.json, README.md
│   ├── Settings/ConsoleSettings.cs
│   ├── Claude/ClaudeRunner.cs, ClaudeEvent.cs, StreamJsonReader.cs, PromptMessage.cs      (moved from roll6anime)
│   ├── Files/FileWriter.cs, FileWatcher.cs                                                 (moved, format-free)
│   └── Bridge/BridgeClient.cs, RequestRunner.cs
├── Roll6.DTO/Realtime/Console/            AgentRegisterInfo, AgentRegisteredInfo, AgentStatusInfo, PromptImageInfo, RunInfo, ClaudeEventInfo, RequestOutcomeInfo, FileWriteInfo, FileChangedInfo
├── Roll6.DTO/Realtime/Animation/          RequestInfo, EditorStateInfo, EditorConversationInfo, EditorMessageInfo, RunningRequestInfo, AnimationVersionInfo, RequestQueuedInfo, RequestStartedInfo, RequestProgressInfo, RequestFinishedInfo
├── Roll6.Domain/Models/                   AnimationConversation.cs, AnimationMessage.cs
├── Roll6.Domain/Enums/                    ConversationRole.cs
├── Roll6.Domain/Animations/               AnimationPromptContext.cs, AnimationRequestBuilder.cs (pure: the RunInfo of a request, the working path, Classify)
├── Roll6.Domain/Services/                 AnimationConversationService.cs; AnimationService (notifier on ReplaceContent; delete conversations)
├── Roll6.Domain/Interfaces/               IAnimationConversationService, IAnimationNotifier
├── Roll6.Infra.Interfaces/                IAnimationConversationRepository, IAnimationMessageRepository
├── Roll6.Infra/                           repositories, Roll6Context (two tables), migration AddAnimationConversations
├── Roll6.Application/Realtime/            AnimationHub.cs, AnimationConnections.cs, AnimationNotifier.cs
├── Roll6.Application/Startup.cs           DI; Roll6.API/Program.cs MapHub("/hubs/animation")
├── Roll6.Tests/Console/                   moved roll6anime tests (runner, reader, message, watcher, writer, settings); fixtures/claude-ok.jsonl
├── Roll6.Tests/Animations/                prompt context, request builder, conversation service, connections, hub
database/migrations/086-animation-conversations.sql, database/roll6.sql

frontend/src/
├── pages/AnimationEditorPage.tsx          the bare page; App.tsx route /animation/:id
├── Contexts/AnimationEditorContext.tsx, hooks/useAnimationEditor.ts
├── Services/animationEditorService.ts     SignalR client of /hubs/animation
├── types/animationEditor.ts
├── lib/animationHistory.ts, lib/markup.ts, lib/printCaption.ts, lib/editorState.ts (+tests)
├── components/animations/editor/          AnimationStage.tsx (lazy), AnimationTimeline.tsx, EditorConversation.tsx, EditorTopBar.tsx, PrintMarkupModal.tsx, ModelTokenSelect.tsx,
│                                          player.ts, poses.ts, skeleton.ts, skeletonView.ts, boneGizmo.ts, poseEdit.ts (+ moved tests)
├── components/animations/AnimationList.tsx   "Editar no editor" (new tab)
├── components/ui/icons.tsx                BoxArrowUpRightIcon, BonesIcon…
└── i18n/locales/pt-BR.json                editor.*, animations.openEditor
frontend/vite.config.ts                    (no change; the roll6anime aliases die with the viewer)
roll6anime/                                DELETED
CLAUDE.md                                  "roll6anime (062)" section → "Roll6.Console bridge and web animation editor (086)"
```

**Structure Decision**: the existing web application plus a console project in the backend solution (like
`Roll6.Mcp`), replacing the separate `roll6anime/` solution.

## Delivery order (large feature)

1. Backend: DTOs, tables, services, hub, notifier, DI (testable without the agent through the hub tests).
2. Console: move the generic core, add the bridge client and the runner; run against the dev API.
3. Page: route, context, service, stage + timeline (US1), conversation (US2), pose/history (US3), prints (US4).
4. Removal of `roll6anime/`, docs.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New NuGet packages on the console (`Microsoft.AspNetCore.SignalR.Client`, `Microsoft.Extensions.Hosting`) | the console must hold an outbound SignalR connection and run as a hosted console | raw WebSockets + a hand-written SignalR protocol would duplicate the client library; HTTP long-polling the API would need new REST endpoints (and MCP tools) and lose the live stream |
