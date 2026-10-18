# Research: Editor de animações na web com o Claude local (086)

## R1 — How the browser reaches the user's Claude: a reverse-connected agent

**Decision**: `Roll6.Console` is a .NET 8 **console** project in the backend solution — a generic bridge between the
site and the user's Claude Code, with no knowledge of animations — that connects **out** to the
Roll6 (SignalR, `/hubs/animation`) with the user's API key (019) in the `X-Api-Key` header, registers itself as the
account's agent and waits for requests. The browser never talks to the machine: the editor page sends its requests to
the same hub, and the server relays each one to one agent of the same account and the agent's events back.

**Rationale**:
- No port on the user's machine, no CORS/mixed-content/Private-Network-Access, works from any device while the PC is
  on (spec FR-020).
- The API key already carries the user's identity to the server; the policy scheme (019) forwards a request with
  `X-Api-Key` to the key handler, and the .NET SignalR client can set that header (WebSockets from a non-browser
  client may carry headers). Browsers keep the JWT on `access_token` as the `TableHub` does.
- The `TableHub` is `[Authorize(Policy = Session)]` because keys must not drive the table; the new hub takes both: a
  browser (JWT) opens an editor, an agent (key) registers. `AuthConstants.AUTH_METHOD_CLAIM` tells them apart.

**Alternatives considered**: a local HTTP server called by the page (fragile in browsers, one machine only); running
the Claude on the Roll6 server with an Anthropic API key (the user wants the account login, not API billing).

## R2 — What the console is made of (generic by design)

**Decision**: `backend/Roll6.Console/` holds only what is about running the local Claude and touching the working
folder on the server's behalf; everything about animations stays on the server (and the page):

| `Roll6.Console` (moved from the roll6anime core, generic) | Server (`Roll6.Domain`) | Dropped |
|---|---|---|
| `Claude/ClaudeRunner` (process, stdin stream-json, env without API keys), `ClaudeEvent`, `StreamJsonReader`, `PromptMessage` (image + text blocks) | `Animations/AnimationPromptContext` (the former `PromptContext.Build`: the Portuguese instructions about the open animation, the skill, the tool limits, the prints — sent to the console as `systemPrompt`) | `ConversationBook` (the server keeps conversations), `AnimationFolder` (the server validates with `AnimationFormat`), `AnimationUploader`/`Roll6Connection` (versions go through the hub), `Markup/*` (TypeScript), WPF, `viewer/` |
| `Files/FileWriter` (temp + move, UTF-8 no BOM; the former `AnimationWriter` without the format), `Files/FileWatcher` (the former `FolderWatcher`: settle 200 ms, own writes ignored, reports path + content) | `Services/AnimationRequestBuilder` (the `RunInfo`: files to write — the animation's content at `animacoes/{id}-{slug}.json` —, the paths to watch, the system prompt, the prompt, the images, the session) and the handling of `fileChanged` (validate, store as a version, or a notice) | the linked `AnimationFormat.cs` (no validation on the console) |
| `Settings/ConsoleSettings` (`Roll6Console:*` + `ROLL6_API_KEY`), `Bridge/BridgeClient` (SignalR out, register, `run`/`stop`/`writeFiles`), `Bridge/RequestRunner` (one request: write the files, run, relay events, report watched files), `Program.cs` | | |

The console's `run` payload is therefore generic (`RunInfo { requestId, sessionId, started, systemPrompt, prompt,
images, files[], watch[] }`) and its events are generic (`ClaudeEventInfo`, `FileChangedInfo { path, content }`):
another screen of the Roll6 can use the same console tomorrow with another system prompt. The console references
only `Roll6.DTO`, like `Roll6.Mcp`.

**New NuGet** on the console only: `Microsoft.AspNetCore.SignalR.Client` 8.x, `Microsoft.Extensions.Hosting` 8.x.

**Rationale**: the user's requirement ("only connects the web to the local Claude"); a thin, generic console is also
easier to trust (it never decides what to store) and to reuse.

## R3 — The hub and the relay

**Decision**: one hub `AnimationHub` at `/hubs/animation` (`Roll6.Application/Realtime`), `[Authorize]` (JWT or key),
with an in-memory `AnimationConnections` singleton (like `TableConnections`):

| Caller | Method | Effect |
|---|---|---|
| console | `RegisterAgent(AgentRegisterInfo { machine, folder })` | the connection becomes the agent of its user; the user's editors get `agentStatus` |
| console | `Progress(long requestId, ClaudeEventInfo)` | relayed to the editors of that animation; text deltas appended to the running Claude message |
| console | `FileChanged(long requestId, FileChangedInfo { path, content })` | a watched file changed: the server validates it (`AnimationFormat`) and stores it as a version (`ReplaceContentAsync`, origin `agent`) or relays a notice ("Arquivo inválido: …", "O Claude criou {nome}") |
| console | `Finished(long requestId, RequestOutcomeInfo)` | the Claude message is stored, the conversation marked started (session id), the agent freed, the queue advanced; editors get `requestFinished` |
| browser | `OpenEditor(long animationId)` → `EditorStateInfo` | owner only (403 → `HubException("forbidden")`); joins the group; returns the animation, its content, the conversation's messages, the agent status and a running request if any |
| browser | `SendRequest(RequestInfo { animationId, text, images[] { png, caption } })` → `long requestId` | stores the user message (text + image count), queues the request for the account's agent, sends `run` to the agent when free |
| browser | `StopRequest(long requestId)` | tells the agent to kill the process; the outcome comes back as `Finished(Stopped)` |
| browser | `NewConversation(long animationId)` | closes the conversation (a new one starts on the next request) |
| server → console | `run(RunInfo)`, `stop(requestId)`, `writeFiles(FileWriteInfo[])` | the generic request (system prompt, prompt, images, session, files to write before, paths to watch); a stop; files to write outside a request (the content changed on the server — a pose edit, an undo — so the working file follows) |
| server → browser | `agentStatus`, `requestStarted`, `requestProgress`, `requestFinished`, `animationVersion`, `conversationCleared` | what the page shows |

- **Queue** (FR-011): `AnimationConnections` keeps, per user, the agents (`machine`, `busy`) and a FIFO of pending
  requests; one request per animation at a time (a second one for the same animation is refused with
  `HubException("busy")`), one running request per agent. Two agents share the queue; the editor shows which machine
  took the request.
- **Versions**: the hub's `FileChanged` handler parses the content with `AnimationFormat` and calls
  `AnimationService.ReplaceContentAsync` as the user (origin `agent`); no new REST endpoint, so the MCP catalog stays at
  120 / 121. `ReplaceContentAsync` tells the hub (`IAnimationNotifier.VersionAsync`), which sends `animationVersion` to
  the editors and, when the origin is not the agent, `writeFiles` to the agent — so a pose edit from the page reaches
  the working file.
- **Dropped agent**: `OnDisconnectedAsync` of an agent with a running request stores a notice ("O agente caiu."),
  finishes the request as Failed and advances the queue (the next request waits for an agent).

**Alternative**: REST endpoints for the conversation (`GET /api/animation/{id}/conversation`…): every controller action
needs an MCP tool (020), and the page needs the live channel anyway; the hub returns the state on `OpenEditor`.

## R4 — Conversations on the server

**Decision**: two tables (data-model.md): `animation_conversations` (one open conversation per animation; the Claude's
`session_id` and whether it started, so the next request resumes it) and `animation_messages` (role user / claude /
notice, text, `image_count`, created_at). Prints are **not stored** (spec); the page shows their thumbnails only in the
tab that sent them. "Nova conversa" sets `closed_at` on the open conversation. Deleting an animation deletes its
conversations (service, FKs `ClientSetNull`).

The running Claude message is kept in memory on the server (`AnimationConnections.Running[requestId].Text`) from the
deltas and written once at `Finished`; a browser that opens the editor mid-request gets the partial text in
`EditorStateInfo.running`.

## R5 — The editor page

**Decision**: route `/animation/:id` → `pages/AnimationEditorPage` under `ProtectedRoute`, outside `MainPage` (no
map, panels, combos, turn controls, chat); the user menu's "Animações" › Minhas gets "Editar no editor" as a link
`target="_blank"` to that route. Layout: a slim top bar (`BrandLogo` horizontal, the animation's name, the agent badge,
the token select), then a two-column body on `md+` — the 3D stage with its time bar on the left, the conversation on
the right — stacked on phones. `AnimationEditorContext` (page-scoped provider, `react-architecture`) holds the state
loaded from `OpenEditor`, the connection events, the content versions and the tab's history; the SignalR client is
`Services/animationEditorService.ts` (separate from `realtimeService`, which follows campaigns).

**The 3D stage** ports `roll6anime/viewer/src` into `components/animations/editor/`:
- `player.ts`, `poses.ts`, `skeleton.ts`, `poseEdit.ts` (pure, with their Vitest files) move as they are, imports
  `@roll6/…` → relative;
- `skeletonView.ts`, `boneGizmo.ts` (three.js) move; `timeline.ts` and `main.ts` become the React components
  `AnimationStage` (lazy: renderer, `OrbitControls`, holder, player, skeleton, gizmo, capture) and `AnimationTimeline`;
- the token model comes from `loadModel(token.modelFileUrl)` (the stored `.glb` through the API), chosen in a select of
  the user's tokens with a model (`GET /api/token?mine=true`, filtered), remembered in `localStorage`
  `roll6:editor-token`; the stage reuses the previews' look (disc, lights, `#0b1220`) and the 085 zoom buttons.
- **History** (FR-014): `lib/animationHistory.ts` (port of `AnimationHistory.cs`, ≤ 100 versions, exact text);
  Ctrl+Z/Ctrl+Y and ↶ ↷ save the neighbour version through `animationService.replaceContent` — the same path as a
  pose edit — and the tab ignores its own echo of `animationVersion`.
- **Prints** (FR-016/017): `PrintMarkupModal` (a canvas with the PNG; `lib/markup.ts` is the TypeScript port of
  `MarkGeometry.cs` — stroke, clamp, `isMeaningful`, arrow head — with tests; drawing with the four tools, Desfazer,
  Limpar, Concluir/Cancelar), `lib/printCaption.ts` (port of `ViewCapture.Caption` + `MarkupNote`: animation, instant,
  camera side, key pose, skeleton, red marks), thumbnails in the composer (≤ 5) and in the sent message; each PNG is
  downscaled to ≤ 1024 px on its longest side before the hub call (SignalR default message size is raised to 8 MB for
  this hub).

**Alternatives considered**: embedding the old viewer as an iframe (two bundles of `three`, the bridge kept); a modal
inside `MainPage` (the user asked for a bare page in a new tab).

## R6 — How the working file is kept in step (the server decides, the console executes)

**Decision**: `AnimationRequestBuilder` (server) builds every `RunInfo`: `files = [{ path: "animacoes/{animationId}-
{slug(name)}.json", content }]` (the library's current content, relative to the console's working directory),
`watch = ["animacoes/"]`, `systemPrompt = AnimationPromptContext.Build(path, modelName)` (the former `PromptContext`:
the open animation's path, the token's name as the model shown, the skill, the tool limits, the prints — with
"roll6anime" replaced by "o editor de animações do Roll6"), the prompt, the images, the conversation's session. The
console writes the files (temp + move; unchanged text skipped), runs the Claude, and reports every settled change
under the watched paths as `FileChanged { path, content }` while the request runs and for 30 s after the result
line. The hub maps a change of the working file to a version (validated; invalid → notice "Arquivo inválido: …",
shown in the conversation, the last valid version kept) and any other `.json` under `animacoes/` to the notice "O
Claude criou {nome}" (the page offers to create it in the library through the existing `POST /api/animation`).
`writeFiles` outside a request keeps the working file in step with pose edits and undos.

## R7 — Start-up checks and configuration of the console

**Decision** (contracts/agent-config.md): `appsettings.json` section `Roll6Console` with `Url`,
`ClaudeWorkingDirectory`, `ClaudeExecutable`, `ClaudeAllowedTools`; `ROLL6_API_KEY` (required) and
`ROLL6_URL` (optional override) from the environment, like the skills. On start: `GET /api/user/me` with the key (401 →
"Chave de API inválida ou revogada." and exit code 2), `claude --version` (failure → warning, requests refused with
`ClaudeRunner.NOT_FOUND`), the folders checked/created, then the hub connection with automatic reconnect
(`WithAutomaticReconnect`, re-register on reconnect). Console lines in Portuguese: "Conectado ao roll6.site como
Rodrigo (máquina DESKTOP-X) · pasta C:\…", "Pedido #12: rodando o Claude…", "Arquivo alterado: animacoes/7-aceno.json",
"Pedido #12 terminado." Ctrl+C stops a running request (kill) and leaves. The working directory is the one place the
console writes and watches: a path outside it in `files`/`watch` is refused (`invalid`).

## R8 — Removing the desktop app

**Decision**: `roll6anime/` is deleted in the same change (the project, the viewer, the README); CLAUDE.md's
"roll6anime (062)" section is replaced by "Roll6.Console bridge and web animation editor (086)"; `backend/Roll6.Console/
README.md` explains the console. The `criar-animacao` skill of the table project is not touched (it is the user's
project; its `enviar.py` keeps working).
