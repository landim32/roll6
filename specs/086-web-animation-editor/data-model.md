# Data Model: Editor de animações na web com o Claude local (086)

## AnimationConversation (new table `animation_conversations`)

| Column | Type | Rules |
|---|---|---|
| `animation_conversation_id` | `bigint` identity | PK `animation_conversations_pkey` |
| `animation_id` | `bigint not null` | FK `fk_animation_animation_conversation` → `animations`, `ClientSetNull`; deleted in code with the animation |
| `user_id` | `bigint not null` | the owner; FK `fk_user_animation_conversation` |
| `claude_session_id` | `uuid not null` | the Claude Code session (`--session-id` / `--resume`) |
| `started` | `boolean not null default false` | the CLI knows the session: the next request resumes it |
| `created_at`, `closed_at` | `timestamp without time zone` | `closed_at` set by "Nova conversa" |

Index: `ix_animation_conversations_open` unique partial on `(animation_id) WHERE closed_at IS NULL` — one open
conversation per animation.

Domain `AnimationConversation`: `Open(animationId, userId)` (new session id), `MarkStarted()`, `Close(now)`.

## AnimationMessage (new table `animation_messages`)

| Column | Type | Rules |
|---|---|---|
| `animation_message_id` | `bigint` identity | PK |
| `animation_conversation_id` | `bigint not null` | FK `fk_animation_conversation_message`, index |
| `role` | `integer not null` | `ConversationRole` 1 User, 2 Claude, 3 Notice |
| `text` | `varchar(20000) not null` | the request, the answer (Claude lines may be empty when stopped at once), or the notice |
| `image_count` | `integer not null default 0` | prints sent with a user line (the PNGs are never stored) |
| `created_at` | `timestamp without time zone not null` | |

Domain `AnimationMessage.Create(conversationId, role, text, imageCount)`; text ≤ 20000 (an answer longer than that is
cut with "…").

## In memory (server, `Roll6.Application/Realtime/AnimationConnections`)

- **Agent**: `connectionId`, `userId`, `machine`, `folder`, `busyWith: requestId?`, `connectedAt`.
- **Editor**: `connectionId`, `userId`, `animationId` (group `animation:{id}`).
- **Request** (`RunningRequest`): `requestId` (server counter), `animationId`, `userId`, `conversationId`,
  `agentConnectionId?`, `text` (the Claude's growing answer), `state` Queued / Running / Finished, `startedAt`.
- **Queue** per user: FIFO of request ids; one Running per agent; one per animation at a time.

## Console (`Roll6.Console`, generic)

- `ConsoleSettings { Url, ClaudeWorkingDirectory, ClaudeExecutable, ClaudeAllowedTools }` + `ApiKey` from
  `ROLL6_API_KEY`. No animation setting: the server says which files to write and watch, always relative to the
  working directory.
- `ActiveRequest { requestId, watchedPaths, cancellation }` — one at a time.

## Server-side animation orchestration (`Roll6.Domain/Animations`)

- `AnimationPromptContext.Build(animationPath, modelName)` — the Portuguese instructions (pure).
- `AnimationRequestBuilder.Build(animation, content, conversation, text, images, modelName)` → `RunInfo` (pure):
  `files = [{ path: "animacoes/{id}-{slug}.json", content }]`, `watch = ["animacoes/"]`.
- `AnimationRequestBuilder.WorkingPath(animation)` and `Classify(path)` → `working` | `otherAnimation` | `ignored`
  for the `FileChanged` events.

## Frontend state (`AnimationEditorContext`)

- `animation: AnimationInfo`, `content: AnimationFile` (current), `versions: AnimationHistory` (≤ 100 exact texts,
  undo/redo counts), `messages: EditorMessage[]` (role, text, thumbnails of this tab, running flag), `agent:
  { status: 'connected' | 'busy' | 'disconnected', machine? }`, `request: { id, state } | null`, `attachments:
  PrintAttachment[]` (≤ 5: original PNG, marks, marked PNG, caption), `token: TokenInfo | null` (remembered in
  `localStorage` `roll6:editor-token`), `skeleton: boolean` (`roll6:editor-skeleton`).

## DTOs

- `Roll6.DTO/Realtime/Console/` (generic, nothing about animations): `AgentRegisterInfo { machine, folder }`,
  `AgentRegisteredInfo { userName }`, `AgentStatusInfo { connected, busy, machine }`, `PromptImageInfo { png (base64),
  caption }`, `RunInfo { requestId, sessionId, started, systemPrompt, prompt, images[], files[] { path, content },
  watch[] }`, `ClaudeEventInfo { kind: started | text | tool | notice, text?, tool?, target? }`,
  `RequestOutcomeInfo { kind: done | stopped | failed, message?, permissionDenials[] }`, `FileWriteInfo { path,
  content }`, `FileChangedInfo { path, content }`.
- `Roll6.DTO/Realtime/Animation/` (the editor): `RequestInfo { animationId, text, images[] }`,
  `EditorStateInfo { animation, content, conversation { id, messages[] }, agent, running { requestId, text } | null }`,
  `EditorMessageInfo { id, role, text, imageCount, createdAt }`, `AnimationVersionInfo { animationId, content, origin:
  agent | user | other, by (userId) }`, `RequestQueuedInfo`, `RequestStartedInfo`, `RequestProgressInfo`,
  `RequestFinishedInfo`.

## Migration

`AddAnimationConversations` creates the two tables; `database/migrations/086-animation-conversations.sql`; `roll6.sql`
regenerated. `AnimationService.DeleteAsync` deletes messages and conversations first.
