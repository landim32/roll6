# Tasks: Perguntar ao Claude do mestre pelo chat

**Input**: Design documents from `specs/093-chat-ask-gm-console/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/console.md,
contracts/skill-perguntar.md, quickstart.md

**Tests**: included, because security is a P1 story. Domain/service rules, the prompt escaping, the console's
read-only arguments, the whisper audience, the dispatcher and MCP coverage use xUnit; the pure frontend rules use
Vitest.

**Organization**: US1 ask (P1) · US2 private (P1) · US3 injection defences (P1). Paths are relative to the repo root;
`be/` = `backend/`, `fe/` = `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirm a clean start on `093-chat-ask-gm-console`:
  - `dotnet test` in `be/`, with `-p:BaseOutputPath=<scratch>` while `Roll6.Console` runs;
  - `cd frontend && npm run lint && npm test`.

  Note the counts.

---

## Phase 2: Foundational (blocking)

- [X] T002 Add `Question = 13` and `Answer = 14` to `be/Roll6.Domain/Enums/TurnType.cs` and add both to
  `TurnTypes.CONVERSATION`. Grep every `switch`/mapping over `TurnType`/`ChatItem` kinds (`ChatItemInfo.kind`,
  `TurnService.Chat.cs` `KindOf`, `ParseKinds`) and add `question`/`answer`.
- [X] T003 `be/Roll6.Domain/Models/Turn.cs`:
  - add `AskState` (`be/Roll6.Domain/Enums/AskState.cs`: `Waiting = 1`, `Answered = 2`, `Failed = 3`) and `EditedAt`;
  - add the factory `Question(...)` (text 1–1000, control characters stripped, `AskState = Waiting`);
  - add the factory `Answer(question, masterUserId, text)` (reply to the question, `DisplayName` "Claude do mestre",
    no character, text cut at 4000 with " … (resposta encurtada)");
  - add `MarkAnswered()` / `MarkFailed()`, which act only from Waiting and return a bool;
  - add `EditAnswer(text)`, for answers only, 1–4000, which sets `EditedAt`.
- [X] T004 [P] Domain tests in `be/Roll6.Tests/Domain/Models/TurnAskTests.cs` for the factories, bounds, transitions and
  `EditAnswer` on a non-answer (refused).
- [X] T005 Map `ask_state` and `edited_at` in `be/Roll6.Infra/Context/Roll6Context.cs`, generate migration `AddChatAsk`
  (`dotnet ef migrations add AddChatAsk --project Roll6.Infra --startup-project Roll6.API`) and write
  `database/migrations/093-chat-ask.sql` in the style of `090-library-images.sql`.
- [X] T006 [P] DTOs:
  - `be/Roll6.DTO/Chat/ChatAskInfo.cs` (`characterId`, `text`, `private`);
  - `AskStatusInfo.cs` (`available`, `waitingTurnId`);
  - `ChatAnswerEditInfo.cs` (`text`);
  - on `ChatItemInfo`, add `ask` (`ChatAskStateInfo { state }`) and `editedAt`;
  - `be/Roll6.DTO/Realtime/Console/RunInfo.cs` gains `ReadOnly` and `MaxTurns`;
  - add `TableEventType.ASK_CHANGED = "ask.changed"`.
- [X] T007 [P] Mirror in `fe/types/chat.ts`: the kinds `question` and `answer`, `ask`, `editedAt`, `AskStatusInfo`. Add
  `ask.changed` to the table event types.

**Checkpoint**: everything builds; the migration exists.

---

## Phase 3: User Story 1 — Fazer uma pergunta ao Claude do mestre (P1) 🎯 MVP

**Goal**: ask from the chat (paperclip or "/perguntar"), queued to the master's console, answered in blue; one waiting
question per participant; 2-minute timeout; the master corrects answers.

**Independent Test**: quickstart §1.

### Backend

- [X] T008 [US1] Create `be/Roll6.Domain/Interfaces/IAskDispatcher.cs` with
  `bool IsAgentConnected(long userId)`, `Task EnqueueAsync(AskJob job)` and `Task StopAsync(long turnId)`, plus the
  record `AskJob { CampaignId, TurnId, MasterUserId, CampaignName, SpeakerName, Text }` in Domain.
- [X] T009 [US1] Create `be/Roll6.Domain/Asks/AskPrompt.cs` (pure):
  - `SystemPrompt()` returns the rules of research R6, including the "não configurou" sentence;
  - `UserPrompt(campaignName, speakerName, text)` escapes `<`/`>` to `‹`/`›`, strips control characters and wraps the
    text in `<pergunta_do_jogador>…</pergunta_do_jogador>`;
  - `MAX_QUESTION = 1000` and `MAX_ANSWER = 4000`.
- [X] T010 [P] [US1] Tests in `be/Roll6.Tests/Domain/Asks/AskPromptTests.cs`:
  - a closing delimiter inside the question is neutralised;
  - names are escaped;
  - the rules are present;
  - control characters are removed.
- [X] T011 [US1] Create `be/Roll6.Domain/Services/TurnService.Asks.cs` (partial `TurnService`, also implementing a new
  `IAskService` in `be/Roll6.Domain/Interfaces/IAskService.cs`):
  - `AskAsync(userId, campaignId, ChatAskInfo)`:
    - checks the reader (master or approved), the speaker as for messages and the text;
    - refuses with 409 when `!dispatcher.IsAgentConnected(campaign.UserId)` and when the caller has a Waiting
      question in the campaign (new `ITurnRepository.AnyWaitingAskAsync(campaignId, userId)`);
    - saves the question (private → whisper to the master through `ITurnWhisperRepository`, see US2);
    - publishes `chat.message` through the existing `PublishEntryAsync`, enqueues the N1 notice like a message and
      calls `dispatcher.EnqueueAsync`;
  - `StatusAsync(userId, campaignId)` returns `AskStatusInfo`;
  - `CompleteAsync(turnId, text)` runs only from Waiting: it saves the answer (whisper rules US2), marks the question
    answered and publishes `chat.message` + `chat.updated`;
  - `FailAsync(turnId, reason)` marks the question failed and publishes `chat.updated`;
  - `FailExpiredAsync(now)` fails the Waiting questions older than 2 minutes and returns their ids;
  - `EditAnswerAsync(userId, turnId, text)`, for the master only, publishes `chat.updated`.

  Inject `IAskDispatcher` as the last constructor parameter and register the service in the Application `Startup`.
- [X] T012 [US1] `be/Roll6.Infra/Repository/TurnRepository.cs` (+ interface): `AnyWaitingAskAsync`,
  `ListWaitingAsksOlderThanAsync(cutoff)`. Make the chat item mapping (`TurnService.Chat.cs`) fill `ask` and `editedAt`.
- [X] T013 [US1] `be/Roll6.Application/Realtime/AnimationConnections.cs`:
  - add `EditorRequest.Kind` (`RequestKind.Animation | Ask`) plus `CampaignId`, `TurnId` and `AskText`;
  - add `EnqueueAsk(job, now)`, unique per turn, sharing the master's FIFO queue and agents;
  - add `FindByTurn(turnId)`.

  Add tests in `be/Roll6.Tests/Application/AnimationConnectionsTests.cs`: an ask job queues behind an animation
  request; a second job for the same turn is refused.
- [X] T014 [US1] Create `be/Roll6.Application/Realtime/AgentDispatcher.cs` (singleton, `IAskDispatcher`), using
  `IHubContext<AnimationHub>`, `AnimationConnections` and `IServiceScopeFactory`:
  - move the hub's `DispatchAsync(userId)` here so both call it; an animation job builds the run as today;
  - an ask job builds `RunInfo { ReadOnly = true, MaxTurns = 8, SessionId = Guid.NewGuid(), Started = false,
    SystemPrompt = AskPrompt.SystemPrompt(), Prompt = AskPrompt.UserPrompt(...), Files = [], Watch = [] }`;
  - `StopAsync(turnId)` sends `stop` to the running agent, or drops the job when it is still queued.

  Register it in `be/Roll6.Application/Startup.cs` and make the hub use it.
- [X] T015 [US1] `be/Roll6.Application/Realtime/AnimationHub.cs`:
  - `Progress` for ask jobs only accumulates the text (no editor group);
  - `FileChanged` ignores ask jobs;
  - `Finished` for ask jobs calls `IAskService.CompleteAsync` (done with text) or `FailAsync` (stopped, failed,
    empty) through a scope, then dispatches the next job;
  - `RegisterAgent` and the agent dropping publish `ask.changed` (`IRealtimeNotifier`) to the campaigns the user
    masters (new `ICampaignRepository.ListIdsByOwnerAsync`).
- [X] T016 [US1] Create `be/Roll6.Application/Asks/AskTimeoutWorker.cs` (`BackgroundService`, every 10 s, plus once on
  start): scoped `IAskService.FailExpiredAsync(now)`, then `IAskDispatcher.StopAsync` for each id. Register it as a
  hosted service.
- [X] T017 [US1] Endpoints:
  - `be/Roll6.API/Controllers/CampaignController.cs`: `POST {id:long}/chat/ask` (201) and `GET {id:long}/ask`;
  - `be/Roll6.API/Controllers/ChatController.cs`: `PUT {id:long}/answer`;

  all with try/`HandleException`.
- [X] T018 [US1] MCP in `be/Roll6.Mcp/Tools/ChatTools.cs`:
  - the tools `ask_question`, `get_ask_status` and `edit_answer`, with full descriptions (who, privacy, read-only
    answering, limits, 409s);
  - `kind` accepts `question` and `answer`;
  - the guide section "Asking the master's Claude" in `be/Roll6.Mcp/Roll6Guide.cs`;
  - the counts in `be/Roll6.Tests/Mcp/McpCoverageTests.cs` move to 124 / 125.
- [X] T019 [US1] Service tests in `be/Roll6.Tests/Domain/Services/TurnServiceAskTests.cs`:
  - unavailable → 409;
  - waiting → 409;
  - ask saves Waiting, publishes and enqueues;
  - complete saves the answer quoting the question and marks it answered (only once);
  - fail;
  - expired;
  - edit answer by a non-master → 403, on a non-answer → 400.
- [X] T020 [US1] Hub/dispatcher tests in `be/Roll6.Tests/Application/AnimationHubTests.cs`:
  - an ask job reaches the master's agent as a read-only run (no files, fresh session, prompt with delimiters);
  - `Finished` done → `CompleteAsync`;
  - failed → `FailAsync`;
  - agent register/drop → `ask.changed`.

### Frontend

- [X] T021 [P] [US1] Create `fe/lib/askComposer.ts` with `parseAskPrefix(text)` (`"/perguntar "` at the start, case
  insensitive → `{ ask: true, text }`) and `askAvailability(status, waitingTurnId)` (returns `ready`, `offline` or
  `waiting`). Add tests in `fe/lib/askComposer.test.ts`.
- [X] T022 [US1] `fe/Services/chatService.ts`: `ask(campaignId, { characterId, text, private })`, `askStatus(campaignId)`,
  `editAnswer(turnId, text)`.
- [X] T023 [US1] `fe/Contexts/ChatContext.tsx`:
  - `askStatus`, loaded with the campaign, refreshed on the table event `ask.changed`, after an own ask and when the own
    question's `chat.updated` arrives;
  - `ask(text, isPrivate)` uses the current speaker and toasts the 409 messages;
  - `editAnswer(item, text)`.
- [X] T024 [US1] `fe/components/chat/ChatComposer.tsx`:
  - a mode `'ask'` next to message/action;
  - the "Perguntar" item in the paperclip menu (`QuestionCircleIcon`), disabled with `chat.ask.offline` /
    `chat.ask.waiting`;
  - typing "/perguntar " switches to ask and removes the prefix (offline → toast, stays a message);
  - in ask mode the field gets `.stm-ask-composer` (blue), a ≤ 1000 counter and the "Privado" checkbox (reset after
    every send);
  - Enter sends `ask`.
- [X] T025 [P] [US1] Add `QuestionCircleIcon` (Bootstrap Icons `question-circle`, copy the official path) to
  `fe/components/ui/icons.tsx`.
- [X] T026 [P] [US1] Create `fe/components/ui/strictMarkdownOptions.ts`: sanitize schema without `img`, links rendered
  as text, raw HTML skipped, `urlTransform` returns `''`. Add tests in `fe/components/ui/strictMarkdown.test.ts`:
  images, links and scripts never render.
- [X] T027 [US1] `fe/components/chat/ChatItem.tsx`:
  - question bubble: blue `.is-question`, "?" icon, "Pensando…" while waiting, "Não foi possível responder" when failed;
  - answer bubble: blue `.is-answer` "Claude do mestre", markdown through `MarkdownView` with `strictMarkdownOptions`,
    the reply quote, "editada pelo mestre" when `editedAt`.
- [X] T028 [US1] `fe/lib/chatItems.ts`:
  - kinds `question` / `answer` in `copyableText` and grouping (answers never group with the previous speaker);
  - `permissionsFor`: the master gets `canEditAnswer` and delete on both; the author deletes their question; no
    convert, no voice switch.

  Add tests in `fe/lib/chatItems.test.ts`.
- [X] T029 [US1] Create `fe/components/chat/AnswerEditModal.tsx` ("Corrigir resposta": textarea ≤ 4000, save →
  `editAnswer`). Add the "Corrigir resposta" entry (`PencilIcon`) to `fe/components/chat/ChatItemActions.tsx` when
  `canEditAnswer`.
- [X] T030 [P] [US1] Add `.is-question`, `.is-answer` and `.stm-ask-composer` to `fe/styles/app.css`:
  `--bs-info`-based blue, readable on the dark theme, own question tinted like own messages.
- [X] T031 [P] [US1] i18n in `fe/i18n/locales/pt-BR.json`, under `chat.ask`:
  - `label` "Perguntar", `offline` "O console do mestre não está conectado", `waiting` "Aguarde a resposta da sua
    pergunta";
  - `placeholder` "Pergunte ao Claude do mestre…", `private` "Privado", `thinking` "Pensando…";
  - `failed` "Não foi possível responder", `answerName` "Claude do mestre", `edited` "editada pelo mestre";
  - `edit` "Corrigir resposta", `editTitle`, `saved`, `tooLong`.

**Checkpoint**: US1 end-to-end with the console running.

---

## Phase 4: User Story 2 — Pergunta privada (P1)

**Goal**: private questions and answers only for the author and the master.

**Independent Test**: quickstart §2.

- [X] T032 [US2] In `be/Roll6.Domain/Services/TurnService.Asks.cs`:
  - `AskAsync` with `private` saves `is_whisper = true` plus one target (`character_id = null`, the master);
  - `CompleteAsync` copies the privacy: a private answer is whispered to the question's `CharacterId` (the asker's own
    character), or to the master when the master asked;
  - publish through `PublishEntryAsync`, which already splits by audience;
  - the N1 notice of a private entry goes only to the audience (the existing `RestrictNoticeAsync`).
- [X] T033 [US2] Tests in `be/Roll6.Tests/Domain/Services/TurnServiceAskTests.cs`:
  - the private question is visible to the author and the master and hidden from another player (`ListChatPageAsync`
    with `VisibleTo`);
  - the answer is the same;
  - the realtime split sends only to the audience;
  - the master asking privately → only him.
- [X] T034 [US2] Frontend:
  - the "Privado" badge on question and answer bubbles when `whisper` is set (`fe/components/chat/ChatItem.tsx`), using
    the `chat.ask.private` text instead of the whisper's "Visível apenas para" line for ask entries;
  - the checkbox state is sent by `ask(text, isPrivate)`.

---

## Phase 5: User Story 3 — Proteções contra prompt injection (P1)

**Goal**: the master's Claude can only read; the question is untrusted data; the output is inert.

**Independent Test**: quickstart §3.

- [X] T035 [US3] `be/Roll6.Console/Claude/ClaudeRunner.cs`, when `run.ReadOnly`:
  - arguments `--permission-mode default`, `--allowedTools Read Glob Grep Skill`,
    `--disallowedTools Bash Write Edit MultiEdit NotebookEdit WebFetch WebSearch Task TodoWrite`,
    `--strict-mcp-config --mcp-config {"mcpServers":{}}`, `--max-turns min(MaxTurns ?? 8, 12)`, always `--session-id`
    (never `--resume`);
  - remove `ROLL6_API_KEY` and `ROLL6_URL` from the child environment, on top of the Anthropic list.
- [X] T036 [US3] `be/Roll6.Console/Bridge/RequestRunner.cs`: for read-only runs skip writing `files[]` and watching
  `watch[]`, and log "Pedido #N (pergunta, somente leitura): rodando o Claude…".
- [X] T037 [US3] Tests:
  - `be/Roll6.Tests/Console/ClaudeRunnerTests.cs`: the read-only argument list (allowed and disallowed tools, strict
    MCP, max turns capped, no resume) and the env scrub;
  - `be/Roll6.Tests/Console/RequestRunnerTests.cs`: a read-only run writes and watches nothing.
- [X] T038 [US3] Server bounds:
  - the question 1–1000 is checked in `Turn.Question` (400 `text`) and in the composer (`chat.ask.tooLong`);
  - the answer is cut at 4000 in `Turn.Answer`;
  - `AskPrompt` keeps the question out of the system prompt (only in the delimited user block).

  Confirm `AnimationRequestBuilder`'s animation runs are unchanged (no `ReadOnly`).
- [X] T039 [US3] Update `be/Roll6.Console/README.md`: the read-only mode, what it blocks, the Claude Code version it was
  verified with, and the suggested skill (link to `specs/093-chat-ask-gm-console/contracts/skill-perguntar.md`).
- [ ] T040 [US3] Manual verification (research R5):
  - run the console locally against the dev API and send the quickstart §3 battery;
  - record in the notes the `permission_denials` and `git status` of the working directory.

  If the CLI ignores a flag (version difference), harden with the equivalent and document it.

---

## Phase 6: Polish & Cross-Cutting

- [X] T041 [P] Regenerate `database/roll6.sql` (keep the header).
- [X] T042 [P] Update `CLAUDE.md`:
  - add a "Perguntar (093)" bullet in the backend chat section and the frontend chat section (types 13/14,
    `ask_state`, private = whisper to the master, `AgentDispatcher`, `AskTimeoutWorker`, `ask.changed`, the endpoints,
    MCP 124/125, the console's read-only mode);
  - add a Recent Changes line.
- [X] T043 Backend `dotnet build` + `dotnet test`; fix failures.
- [X] T044 Frontend `npm run lint && npm test && npm run build`; fix failures.
- [X] T045 Append "Implementation notes" to this file: deviations, numbers, the T040 result and what was not verified.

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T007) → US1 backend (T008–T020) and US1 frontend (T021–T031) → US2 (T032–T034) → US3
  (T035–T040) → Polish.
- The US3 console work (T035–T037) depends only on T006 (`RunInfo.ReadOnly`), so it can run in parallel with US1.
- **Within US1**:
  - T008 → T009 → T011 → T012;
  - T013 → T014 → T015 → T016;
  - T017 → T018 → T019/T020.
- **Frontend**: T021, T025, T026, T030 and T031 are parallel; T022 → T023 → T024 → T027–T029.

## Parallel Opportunities

- Domain tests (T004, T010), DTOs/types (T006, T007), the console read-only work (T035–T037), the icon, CSS, i18n and
  strict renderer (T025, T026, T030, T031).

## Implementation Strategy

1. **Safety first inside the MVP**: US3's console enforcement (T035–T037) should land with US1, so a question never runs
   on a writable console.
2. US1 + US3 (console) is the MVP; US2 follows immediately (both P1).
3. Polish.

---

## Implementation notes

- **Deviations from the plan / research**:
  - `--max-turns` does not exist in Claude Code 2.1.301, so `MaxTurns` was dropped; the 2-minute timeout
    (`AskTimeoutWorker`) and the console's stop are the only limits on a run.
  - `--permission-mode default` does not exist either; read-only runs use `--permission-mode dontAsk` plus
    `--permission-prompts none`: anything not pre-approved is denied without a prompt.
  - Only `Skill` is pre-approved (`--allowedTools Skill`). With `Read` pre-approved the CLI read a file **outside** the
    working directory in the live test; without it, `Read`/`Glob`/`Grep` work inside the working directory and are
    denied outside it.
  - `ROLL6_API_KEY` and `ROLL6_URL` are removed from the environment of **every** Claude process the console starts (not
    only read-only runs), together with the Anthropic key variables.
  - A private question is a whisper to the master (`[null]`); when the master asks privately it has no target (only
    him).
  - Answers render with `MarkdownView strict` (`strictMarkdownOptions`): links/images/media removed (their text kept), raw
    HTML skipped, every URL dropped.
- **T040 (partial)**: verified live against the Claude Code CLI 2.1.301 with the exact read-only arguments
  `ClaudeRunner.Arguments(…, readOnly: true)` builds — only `Read`/`Glob`/`Grep`/`Skill` are listed as tools, no MCP
  server is loaded, `Write`/`Edit`/`Bash` are unavailable, a read outside the working directory comes back in
  `permission_denials`. **Not verified**: the full round trip
  console ↔ dev API ↔ chat (no PostgreSQL on this machine), the quickstart §3 battery through the site, and a real
  `perguntar` skill in the GM's repository.
- **Numbers**: backend 2087 tests passing; frontend lint clean, 104 files / 952 tests passing, build OK. MCP 124
  operations / 125 tools.
