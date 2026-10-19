# Implementation Plan: Perguntar ao Claude do mestre pelo chat

**Branch**: `093-chat-ask-gm-console` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/093-chat-ask-gm-console/spec.md`

## Summary

"Perguntar" turns a chat message into a **question** answered by the campaign master's local Claude, through the master's
`Roll6.Console` (086), with the skill `perguntar` of the console's working directory.

- **Chat entries**: questions and answers are conversation entries of the campaign timeline. They are new
  `TurnType.Question` (13) and `TurnType.Answer` (14) in `TurnTypes.CONVERSATION`, with `turns.ask_state` (1 waiting,
  2 answered, 3 failed) on the question and `turns.edited_at` on an answer the master corrected.
- **Privacy**: "Privado" reuses the whisper mechanism (047). A private question is a whisper addressed to the master,
  so only the author and the master see it. Its answer is a whisper to the question's speaker (the master always sees
  whispers). Every reader-side filter (chat pages, unread counts, realtime split, notices, MCP) already enforces this.
- **Dispatch**:
  - `POST /api/campaign/{id}/chat/ask` (`TurnService.Asks.cs`) checks three things:
    - the master's console is connected;
    - the author has no waiting question (Q3 = A, else 409);
    - the text is at most 1000 characters.
  - It then saves the question and hands an `AskJob` to `IAskDispatcher`.
  - `AgentDispatcher` (Application, over `IHubContext<AnimationHub>` and `AnimationConnections`) queues the job for
    the master's agent and sends a **read-only** `run`.
  - The console reports progress and the result on the existing hub methods.
  - `Finished` stores the answer (`IAskService.CompleteAsync`), or marks the question failed with a notice.
  - `AskTimeoutWorker` fails any question still waiting after 2 minutes (Q2 = B) and stops its run.
- **Prompt-injection defences**, in depth, in both server and console:
  - **Server**:
    - the question goes inside escaped delimiters as untrusted player text, with fixed rules in the system prompt;
    - no history (fresh session per question);
    - no files or watch;
    - bounded question and answer;
    - the answer is stored as plain text and rendered by a stricter sanitized renderer (no images, no links, no HTML).
  - **Console** (`RunInfo.readOnly`):
    - only `Read, Glob, Grep, Skill` are allowed;
    - every write, exec and network tool is disallowed explicitly;
    - `--strict-mcp-config` with an empty config, so the master's MCP servers (e.g. the Roll6 one with his key) are not
      available;
    - `--max-turns` is bounded and there is no resume;
    - the child environment is scrubbed of `ROLL6_API_KEY`, `ROLL6_URL` and the Anthropic variables;
    - `files[]`/`watch[]` are ignored.
- **Master's correction** (Q1 = B): `PUT /api/chat/{id}/answer` (master only) corrects an answer (`edited_at`,
  "editada pelo mestre"). Deleting uses the existing chat delete.
- **Availability**: `GET /api/campaign/{id}/ask` returns `{ available, waiting }`. The table event `ask.changed` goes
  out when the master's console connects or drops.
- **UI**:
  - the paperclip item "Perguntar" (`QuestionCircleIcon`) and the "/perguntar " prefix;
  - a blue composer with "Privado";
  - question and answer bubbles in blue, "Privado" badge, "Pensando…", "Não foi possível responder", "Corrigir
    resposta".
- **MCP**: `ask_question`, `get_ask_status`, `edit_answer` (124 operations / 125 tools).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (API, Console); TypeScript 5 / React 18 (chat).
**Primary Dependencies**: existing only.
- Backend: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (`TableHub`, `AnimationHub`), `ModelContextProtocol.AspNetCore`
  2.x.
- Console: `Microsoft.AspNetCore.SignalR.Client`, the Claude Code CLI.
- Frontend: React 18, i18next, sonner, `MarkdownView` (sanitized).

**No new dependency.**
**Storage**: PostgreSQL, `turns.ask_state integer null` and `turns.edited_at timestamp null` (migration `AddChatAsk` +
`database/migrations/093-chat-ask.sql`); new `turn_type` values 13/14. No new table.
**Testing**:
- xUnit:
  - `TurnService` asks: availability, one-waiting rule, private = whisper to the master, answer visibility, timeout,
    master edit;
  - `AskPrompt`: delimiters escaped, rules present, bounds;
  - `AgentDispatcher`/`AnimationConnections`: ask jobs queue with animation jobs, read-only run;
  - Console `ClaudeRunner` arguments for read-only runs and the env scrub;
  - MCP coverage/parity.
- Vitest: `lib/askComposer` (prefix parsing, availability), the ask bubbles' rules (`lib/chatItems`), the strict renderer
  options.

**Target Platform**: web; the console on the master's Windows machine.
**Project Type**: web application + console.
**Performance Goals**: an answer is visible within 60 s with a free console (SC-001). Availability changes are pushed
(≤ 5 s, SC-005).
**Constraints**:
- Read-only Claude.
- Private entries never leave the author/master audience.
- One waiting question per participant.
- 2-minute timeout.

**Scale/Scope**:
- 3 endpoints, 2 turn types, 2 columns.
- 1 background worker.
- Console: a read-only mode.
- About 10 frontend files.

## Constitution Check

| Principle | Status |
|---|---|
| I. Skills obrigatórias | ✅ no new entity; new turn types and columns follow the existing `Turn` layering |
| II. Stack fixa | ✅ nothing added |
| III. Case sensitivity | ✅ unchanged folders |
| IV. Convenções | ✅ domain exceptions → `HandleException`; `interface`; constants |
| V. Banco | ✅ snake_case nullable columns, one migration + incremental script, no cascade |
| VI. Auth / segurança | ✅ `[Authorize]`; master/participant checks in the service; whisper audience per reader; the console run is read-only by construction (console-side, not only prompt) |
| VII. Hex grid | ✅ not touched |

Post-design re-check: ✅. The console change keeps it generic: it learns a "read-only run" flag, not what a question is.

## Project Structure

### Documentation (this feature)

```text
specs/093-chat-ask-gm-console/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/api.md          REST + MCP + table event
├── contracts/console.md      RunInfo.readOnly and what the console enforces
├── contracts/skill-perguntar.md   suggested skill for the master's repository (not shipped here)
└── tasks.md                  (/speckit.tasks)
```

### Source Code

```text
backend/
├── Roll6.Domain/Enums/TurnType.cs                 Question = 13, Answer = 14; CONVERSATION += both
├── Roll6.Domain/Models/Turn.cs                    AskState, EditedAt; Question/Answer factories; MarkAnswered/Failed; EditAnswer
├── Roll6.Domain/Asks/AskPrompt.cs (+tests)        system prompt rules + escaped question block (pure)
├── Roll6.Domain/Services/TurnService.Asks.cs      AskAsync, CompleteAsync, FailAsync, EditAnswerAsync, StatusAsync
├── Roll6.Domain/Interfaces/IAskDispatcher.cs      Enqueue(AskJob), Stop(turnId), IsAgentConnected(userId)
├── Roll6.Infra/Context/Roll6Context.cs + migration AddChatAsk
├── Roll6.DTO/Chat/ChatAskInfo.cs, AskStatusInfo.cs, ChatAnswerEditInfo.cs; ChatItemInfo + ask { state, private }, editedAt
├── Roll6.DTO/Realtime/Console/RunInfo.cs          ReadOnly, MaxTurns
├── Roll6.Application/Realtime/AgentDispatcher.cs  IAskDispatcher over IHubContext<AnimationHub> + AnimationConnections
├── Roll6.Application/Realtime/AnimationConnections.cs  jobs of kind Ask (campaignId, turnId) alongside animation requests
├── Roll6.Application/Realtime/AnimationHub.cs     Progress/Finished route ask jobs; agent connect/drop → ask.changed
├── Roll6.Application/Asks/AskTimeoutWorker.cs     BackgroundService: fail waiting > 2 min, stop the run
├── Roll6.API/Controllers/CampaignController.cs    POST {id}/chat/ask, GET {id}/ask
├── Roll6.API/Controllers/ChatController.cs        PUT {id}/answer
├── Roll6.Mcp/Tools/ChatTools.cs                   ask_question, get_ask_status, edit_answer; guide "Asking the master's Claude"
├── Roll6.Console/Claude/ClaudeRunner.cs           read-only arguments + env scrub; Bridge ignores files/watch on read-only
└── Roll6.Tests/                                   domain, prompt, dispatcher, console, MCP counts
database/migrations/093-chat-ask.sql, database/roll6.sql

frontend/src/
├── lib/askComposer.ts (+test)          parseAskPrefix("/perguntar "), canAsk(status, items, userId)
├── lib/chatItems.ts (+test)            question/answer kinds, waiting/failed, copyable text, permissions (edit answer = master)
├── Services/chatService.ts             ask(), askStatus(), editAnswer()
├── Contexts/ChatContext.tsx            askStatus (+ ask.changed), ask(text, private), editAnswer
├── components/chat/ChatComposer.tsx    mode 'ask' (blue), "Privado", /perguntar
├── components/chat/ChatAttachMenu (paperclip)   "Perguntar" item, disabled with reason
├── components/chat/ChatItem.tsx        question/answer bubbles, "Privado", "Pensando…", failure, "editada pelo mestre"
├── components/chat/AnswerEditModal.tsx "Corrigir resposta" (master)
├── components/ui/icons.tsx             QuestionCircleIcon
├── components/ui/strictMarkdownOptions.ts   no images/links/raw HTML
├── styles/app.css                      .is-question/.is-answer blue, .stm-ask-composer
└── i18n/locales/pt-BR.json             chat.ask.*
CLAUDE.md                               093 paragraph + Recent Changes; console README read-only mode
```

**Structure Decision**: questions and answers are timeline entries like the rest of the chat. The console stays a
generic bridge with a read-only switch. Dispatch moves to a hub-context service, so a REST call can queue work for an
agent.

## Phases

1. Domain + data: turn types, columns, migration, `AskPrompt`, `TurnService.Asks` (US1/US2).
2. Dispatch: `AgentDispatcher`, connections, hub routing, timeout worker, `ask.changed` (US1).
3. Console read-only mode (US3).
4. REST + MCP (US1/US2).
5. Frontend composer, bubbles, correction (US1/US2).
6. Docs (CLAUDE.md, console README, skill template), tests, build.

## Complexity Tracking

| Item | Why | Simpler alternative rejected |
|---|---|---|
| `AgentDispatcher` service | A REST call (the chat) must queue work for an agent connected on another hub; the hub's own `Clients` exist only inside hub calls | Sending through the browser's hub connection (the asker is not the master) |
| Console-side read-only enforcement | Prompt rules alone do not stop an injected instruction; the tool and MCP restriction must hold even if the model is fooled | Prompt-only defence |
