# Research: Prints pedidos pelo Claude no editor de animação

## R1 — How the Claude asks for a print and waits for it

- **Decision**: a per-run **local MCP server** in `Roll6.Console` (Streamable HTTP on `127.0.0.1:<random port>/mcp`,
  bearer token generated per run), passed to `claude -p` with `--mcp-config` and pre-approved by name in
  `--allowedTools` (`mcp__roll6-editor__print_stage`). The tool call blocks until the server answers; the result is MCP
  `text` + `image` content blocks (base64 PNG), which Claude Code shows to the model directly.
- **Rationale**: a tool is the only mechanism in which the model asks, waits and receives an image in the same turn;
  pre-approving one tool by name is narrower than allowing Bash; no extra `Read` per picture.
- **Alternatives**: (a) a `roll6-console print …` CLI run through Bash, writing a PNG the Claude then reads — needs a
  Bash permission rule and two steps per print; (b) request/response files in the working directory — `claude -p` has
  no way to wait without Bash `sleep` loops; (c) MCP over stdio spawned by Claude — a second process that would still
  need IPC back to the running console.

## R2 — Keeping the console generic

- **Decision**: `RunInfo.tools[] = { name, description, inputSchema }` built by the server; the console registers them
  dynamically (`McpServerTool` subclass with the given `ProtocolTool`, invoke = forward) and relays every call as
  `ToolCall` → waits for `toolResult` (timeout 60 s on the console side as a safety net).
- **Rationale**: FR-012; future features can add tools without touching the console.
- **Alternatives**: a fixed `print_stage` in the console (couples it to animations).

## R3 — Seeing the latest edit

- **Decision**: (1) before forwarding a tool call the console calls `FileWatcher.FlushAsync()` — reads every watched
  file now and sends `FileChanged` for the ones whose text differs from the last report, awaiting the sends; (2) the
  server keeps the **latest valid working content** per request (from `RelayVersionAsync`) and sends it inside
  `printRequested`, so the tab renders exactly that text, independent of its own state.
- **Rationale**: the watcher settles for 200 ms, and the Claude may call the tool within that window (SC-003). Sending
  the content removes any race with `draftVersion` reaching the tab.
- **Alternatives**: delaying every tool call by 250 ms (still racy and slower).

## R4 — Rendering without disturbing the user

- **Decision**: `AnimationStage.captureShots` renders synchronously in one JS task: temporary `AnimationMixer` + clip
  from the content (`buildRoll6Clip`), `setTime`, skeleton view toggle, a shot camera (`lib/shotCamera`), renderer
  sized to 768 × 768 without touching the canvas style, `toDataURL`, then restore (stop/uncache the temporary action,
  `Player.refresh()`, skeleton, camera, size) and render the normal view. The browser paints only after the task, so
  the user never sees the shots (FR-005).
- **Rationale**: reuses the stage's scene, model, weapons and skeleton lines — the print looks exactly like the editor.
- **Alternatives**: a second hidden renderer with a cloned model (duplicates loading, weapons and skeleton code).

## R5 — Views

- **Decision**: `front` (azimuth 0°, elevation 10°), `back` (180°, 10°), `right` (the character's right: −90°, 10°),
  `left` (90°, 10°), `top` (0°, 80°), `three-quarter` (−35°, 20°, default); distance fits the model's box like the
  stage's initial framing. Captions use the existing `cameraSide` names.
- **Rationale**: matches the vocabulary of the user's prints (064/086), so prompt, captions and the model agree.

## R6 — Limits and timeouts

- **Decision**: ≤ 6 shots per call, ≤ 30 per request (counted on the server), 20 s server timeout per call, 60 s console
  safety timeout, PNG ≤ 768 px. Errors are tool results with `isError: true` and Portuguese text, never a failed run.
- **Rationale**: spec FR-009/FR-010; 6 × ~400 KB fits the 8 MB hub limit.

## R7 — Claude Code CLI support

- **Decision**: `--mcp-config` accepts inline JSON with `"type":"http"`, `url` and `headers`; MCP tool names are
  `mcp__<server>__<tool>`; tool results may carry image content. To be verified live during implementation (as 093's
  flags were); if `headers` were ignored, the token goes in the URL query (`?token=`) and the server checks either.

### R7 result (T001, 2026-10-19, Claude Code 2.1.301)

Verified live with a minimal loopback Streamable-HTTP server: the inline `--mcp-config` with `"type":"http"` and
`headers` sends `Authorization: Bearer <token>` on every POST (`server/discover`, `initialize`, `notifications/initialized`,
`tools/list`, `tools/call`); `--allowedTools mcp__roll6-editor__print_stage` under `-p --permission-mode dontAsk` ran
the tool with no denial; the MCP `image` block reached the model, which named the picture's colour correctly. The
`?token=` fallback is not needed (kept only as an accepted alternative in the server).
