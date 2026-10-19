# Implementation Plan: Prints pedidos pelo Claude no editor de animação

**Branch**: `094-editor-agent-prints` | **Date**: 2026-10-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/094-editor-agent-prints/spec.md`

## Summary

During an animation-editor request the local Claude gets a **tool** that asks the editor tab for prints of the stage
and returns them as images the Claude looks at directly, so every change it writes can be checked before it answers.

- **Generic console tools** (FR-012): `RunInfo` gains `tools[]` (`{ name, description, inputSchema }`, built by the
  server). When a run has tools, `Roll6.Console` starts a **local MCP server** (Streamable HTTP on `127.0.0.1`, random
  port, random per-run bearer token, alive only during the run) exposing exactly those tools, and runs the Claude with
  `--mcp-config {"mcpServers":{"roll6-editor":{"type":"http","url":…,"headers":{"Authorization":"Bearer …"}}}}` and
  `mcp__roll6-editor__<name>` appended to `--allowedTools`. A tool call becomes the hub method
  `ToolCall(requestId, ToolCallInfo { callId, name, arguments })`; the server answers with the client method
  `toolResult(ToolResultInfo { callId, isError, text, images[] })`, which the console returns to the Claude as MCP
  text + image content. The console knows nothing of prints.
- **Pending file changes first**: before forwarding a tool call the console flushes the file watcher (sends
  `FileChanged` for watched files whose text differs from the last report), so a print asked right after an edit
  always sees that edit (SC-003).
- **Server** (`AnimationHub` + pure `AnimationConnections`/`Domain/Animations/PrintRequest`):
  - `AnimationRequestBuilder` adds the tool `print_stage` (only to editor requests; asks of 093 stay read-only and get
    none, FR-011) and a "Prints" section to `AnimationPromptContext` (FR-006: how to call it, the parameters, the
    limits, and *after every change of the file, ask for prints and check them before the final answer*).
  - `EditorRequest` remembers the **editor connection that sent it** and the **latest valid working content**
    (updated by `RelayVersionAsync`; starts as the request's `content`/library content). An invalid last file blocks
    prints with its validation message.
  - `ToolCall` (accepted only from the agent running that request, FR-008) parses the arguments with the pure
    `PrintRequest.Parse` (≤ 6 shots, `time` number ≥ 0 or `"key"`, `view` front|back|right|left|top|three-quarter,
    `skeleton` bool; defaults key / three-quarter / false; Portuguese errors), checks the limit of 30 per request,
    sends the editor connection `printRequested(PrintRequestInfo { callId, requestId, content, shots[] })` and waits up
    to 20 s for the hub method `PrintResult(PrintResultInfo { callId, shots[{ png, caption }] | error })`. The result
    (or a timeout / "editor fechado" / "pedido parado" error) goes back to the console as `toolResult`. Pending calls
    are failed when the request finishes, is stopped or the editor disconnects.
- **Editor tab**:
  - `AnimationEditorContext` handles `printRequested`: refuses without a model / non-Mixamo skeleton, else asks the
    stage for the shots and calls `PrintResult`; adds a local conversation line "Print para o Claude: …" with the
    thumbnails (ampliáveis, `ImageLightbox`), never stored (FR-007).
  - `AnimationStage` gets `captureShots(content, shots)`: synchronously, inside one task, it builds a temporary clip
    from `content` (`buildRoll6Clip`), poses the model at each shot's instant (or the key pose, `lib/keyPose`), sets
    the skeleton view, renders with a shot camera placed by the pure `lib/shotCamera` (view → azimuth/elevation
    around the fitted model), stamps the pose like the user's prints and reads the PNG; then restores the user's pose
    (`Player.refresh()`), skeleton and camera and renders the normal view again — nothing changes on screen (FR-005).
  - The caption comes from the existing `lib/printCaption.caption` (FR-004), with the view's name.
- No database change, no REST endpoint, no MCP tool of `Roll6.Mcp` (still 124 operations / 125 tools).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (API, Console); TypeScript 5 / React 18 (editor).
**Primary Dependencies**: existing in the solution. The console adds `<FrameworkReference Include="Microsoft.AspNetCore.App" />`
and `ModelContextProtocol.AspNetCore` 2.2.0 — the same package and version `Roll6.Mcp` already uses — to host the local
MCP server. Frontend: `three` 0.186.1 (lazy, already used by the stage).
**Storage**: none. Prints live in memory (hub message → console → Claude; the tab keeps its thumbnails while open).
**Testing**: xUnit + Moq + FluentAssertions (`PrintRequest`, `AnimationConnections` print bookkeeping, hub
`ToolCall`/`PrintResult`, `AnimationRequestBuilder` tools + prompt, console `ClaudeRunner` arguments, `RequestRunner`
tool bridge and flush); Vitest (`lib/shotCamera`, editor reducer lines, print request handling).
**Target Platform**: Windows console (the user's machine), Linux API container, browsers.
**Project Type**: web app + console bridge.
**Performance Goals**: a print back to the Claude in ≤ 5 s with the editor open (SC-002); capture of 6 shots < 1 s.
**Constraints**: hub message limit 8 MB (6 PNGs at ≤ 768 px fit); the local MCP listens on loopback only with a token;
read-only runs never get tools; one run per agent (unchanged).
**Scale/Scope**: one user, one editor tab per request.

## Constitution Check

| Principle | Status |
|---|---|
| I. Skills obrigatórias | ✅ no new entity; DTOs and pure domain helpers follow the existing hub/console layering |
| II. Stack fixa | ✅ with note: the console reuses `ModelContextProtocol.AspNetCore` 2.2.0 and the ASP.NET Core shared framework, both already in the solution (`Roll6.Mcp`, API); nothing new to the stack |
| III. Case sensitivity | ✅ unchanged folders |
| IV. Convenções | ✅ `interface`, constants, Portuguese user messages, hub errors as `HubException` codes |
| V. Banco | ✅ not touched |
| VI. Auth / segurança | ✅ tool calls only from the agent running the request; prints only to the owner's editor connection that sent it; local MCP on 127.0.0.1 with a per-run bearer token; read-only runs get no tools |
| VII. Hex grid | ✅ not touched |

Post-design re-check: ✅. The console learns "a run may carry tools, forward their calls", not what a print is.

## Project Structure

### Documentation (this feature)

```text
specs/094-editor-agent-prints/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/console-tools.md   RunInfo.tools, ToolCall/toolResult, the local MCP server, Claude flags
├── contracts/editor-prints.md   print_stage schema, printRequested/PrintResult, errors, limits, prompt section
└── tasks.md                     (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/Realtime/Console/RunInfo.cs          + ToolInfo, RunInfo.Tools, ToolCallInfo, ToolResultInfo, ToolImageInfo
├── Roll6.DTO/Realtime/Animation/                  + PrintRequestInfo, PrintShotInfo, PrintResultInfo
├── Roll6.Domain/Animations/PrintRequest.cs        pure: parse/validate the tool arguments, defaults, limits
├── Roll6.Domain/Animations/AnimationRequestBuilder.cs   + print_stage tool on editor runs
├── Roll6.Domain/Animations/AnimationPromptContext.cs    + "Prints" section
├── Roll6.Application/Realtime/AnimationConnections.cs   + EditorConnectionId, LatestContent/LatestError, print count, pending calls
├── Roll6.Application/Realtime/AnimationHub.cs           + ToolCall, PrintResult; fail pending on finish/stop/disconnect
├── Roll6.Console/Roll6.Console.csproj              + Microsoft.AspNetCore.App, ModelContextProtocol.AspNetCore
├── Roll6.Console/Tools/LocalToolServer.cs          the per-run loopback MCP server (dynamic tools from RunInfo.tools)
├── Roll6.Console/Bridge/BridgeClient.cs            + toolResult; ToolCall
├── Roll6.Console/Bridge/RequestRunner.cs           start/stop the tool server around the run, flush before a call
├── Roll6.Console/Files/FileWatcher.cs              + FlushAsync
├── Roll6.Console/Claude/ClaudeRunner.cs            + --mcp-config / allowed mcp tool names when tools exist
└── Roll6.Tests/…                                   tests listed above

frontend/src/
├── lib/shotCamera.ts (+ test)                      view → camera direction around the fitted model
├── components/animations/editor/AnimationStage.tsx + captureShots
├── Contexts/AnimationEditorContext.tsx             + printRequested → PrintResult, local print lines
├── lib/editorState.ts (+ test)                     + agentPrint line
├── Services/animationEditorService.ts              + onPrintRequested, printResult
├── components/animations/editor/EditorConversation.tsx  print line with thumbnails
└── i18n/locales/pt-BR.json                         editor.print.*
```

**Structure Decision**: existing projects only; the console gets one folder `Tools/`.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| Local MCP server in the console | The Claude must *call* something that blocks until the print exists and returns an image it sees natively | A Bash helper + polling files needs Bash permission (broader than one tool) and an extra `Read` of each PNG; a file request/response protocol has no way to wait inside `claude -p` |
| Dynamic tools from `RunInfo.tools` | Keeps the console generic (FR-012) | A hard-coded `print_stage` in the console would teach it about animations |
