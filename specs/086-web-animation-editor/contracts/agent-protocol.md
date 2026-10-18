# Contract: hub `/hubs/animation` (086)

`AnimationHub`, `[Authorize]` (the default policy scheme: a browser with the JWT on `access_token`, the console with
`X-Api-Key`). The console's half of the protocol (`RegisterAgent`, `Progress`, `FileChanged`, `Finished`, `run`,
`stop`, `writeFiles`) is **generic** — nothing in it names an animation — so another feature can drive the same
console with another system prompt. Every payload is a DTO of `Roll6.DTO/Realtime/Animation/`. Errors are `HubException` codes:
`forbidden`, `not-found`, `no-agent`, `busy`, `invalid`.

## Console → server

| Method | Payload | Reply |
|---|---|---|
| `RegisterAgent` | `AgentRegisterInfo { machine, folder }` | `AgentRegisteredInfo { userName }`; a key-less (JWT) connection → `forbidden` |
| `Progress` | `long requestId`, `ClaudeEventInfo` | — (ignored when the request is not this console's) |
| `FileChanged` | `long requestId`, `FileChangedInfo { path (relative to the working directory), content }` | — (the animation feature validates and stores a version, or relays a notice) |
| `Finished` | `long requestId`, `RequestOutcomeInfo` | — |

## Server → console (client methods)

| Method | Payload |
|---|---|
| `run` | `RunInfo { requestId, sessionId, started, systemPrompt, prompt, images[] { png, caption }, files[] { path, content }, watch[] }` — paths relative to the working directory; a path outside it is refused with `Finished(failed, "caminho fora da pasta de trabalho")` |
| `stop` | `long requestId` |
| `writeFiles` | `FileWriteInfo[] { path, content }` — files to write outside a request (the animation's content changed on the server: a pose edit, an undo, another program) |

## Browser → server

| Method | Payload | Reply |
|---|---|---|
| `OpenEditor` | `long animationId` | `EditorStateInfo`; not the owner → `forbidden`; unknown → `not-found` |
| `CloseEditor` | — | leaves the group |
| `SendRequest` | `RequestInfo { animationId, text ≤ 4000, images ≤ 5 (each PNG ≤ 1.5 MB base64) }` | `long requestId`; no agent → `no-agent`; a request already running or queued for that animation → `busy`; bad payload → `invalid` |
| `StopRequest` | `long requestId` | — (only the request's owner) |
| `NewConversation` | `long animationId` | — (closes the open conversation; refused with `busy` while a request runs) |

## Server → browser (client methods)

| Method | Payload | When |
|---|---|---|
| `agentStatus` | `AgentStatusInfo { connected, busy, machine }` | an agent registers, disconnects, takes or ends a request |
| `requestQueued` | `{ requestId, animationId, position }` | the request waits for the agent |
| `requestStarted` | `{ requestId, animationId, machine }` | the agent took it |
| `requestProgress` | `{ requestId, event: ClaudeEventInfo }` | every event of the Claude (text deltas, tools, notices) |
| `requestFinished` | `{ requestId, outcome: RequestOutcomeInfo, message: EditorMessageInfo }` | done / stopped / failed; `message` is the stored Claude line |
| `animationVersion` | `AnimationVersionInfo { animationId, content, origin, by }` | the animation's content changed (agent upload, pose edit, undo, API) |
| `conversationCleared` | `{ animationId }` | "Nova conversa" |

## Relay rules

- Everything is scoped by the user id of the claims: a console only receives requests of its own user; editors only
  receive events of animations they opened and own.
- One request per animation at a time; one running request per agent; the user's queue is FIFO across animations.
- Hub message size limit 8 MB (`AddSignalR(o => o.MaximumReceiveMessageSize)` for this hub only).

## Console process (`Roll6.Console`)

- `run`: writes each `files[]` entry under the working directory (temp + move; unchanged text skipped), starts
  watching `watch[]`, runs `claude -p --input-format stream-json --output-format stream-json --verbose
  --include-partial-messages (--session-id | --resume) <sessionId> --permission-mode acceptEdits --allowedTools
  <tools> --append-system-prompt <systemPrompt>` with the prompt and the images on stdin (as `contracts/claude-cli.md`
  of 062), relays every event as `Progress`, reports each settled change under the watched paths as `FileChanged`
  (also for 30 s after the result line), and ends with `Finished`. It never reads, validates or interprets the
  contents.
- `stop`: kills the process tree; `Finished(Stopped)`.
- `writeFiles`: writes the files (its own watcher echo ignored).

## The animation feature on top (server)

- `SendRequest` → `AnimationRequestBuilder.Build(...)` → `run`.
- `FileChanged` → `Classify(path)`: the animation's working file → `AnimationFormat.Parse` → valid:
  `ReplaceContentAsync` (origin `agent`) → `animationVersion`; invalid: `requestProgress` with a `notice` ("Arquivo
  inválido: {erro}"); another `.json` under `animacoes/` → `notice` ("O Claude criou {nome}"); anything else ignored.
- `animationVersion` with origin ≠ `agent` → `writeFiles([{ path: working file, content }])` to the user's agents.
