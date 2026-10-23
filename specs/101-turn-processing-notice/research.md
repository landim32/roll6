# Research: Aviso de turno em processamento (101)

## D1 — Where the state lives

- **Decision**: an in-memory singleton `TurnProcessingRegistry` (Domain, pure, `ConcurrentDictionary<long campaignId,
  Entry { TurnNo, UserId, StartedAt }>`), behind `ITurnProcessingRegistry`, registered in `Startup` and taken by
  `TurnService` as an **optional last constructor parameter** (DI supplies the singleton; tests that don't care get a
  private instance).
- **Rationale**: the spec accepts losing the badge on a restart; the GM run state (096) and the hub presence already
  live in memory on the single API instance. No migration, no column to clean.
- **Alternatives**: `campaigns.processing_turn`/`processing_at` columns — durable but needs a migration and cleanup in
  every turn-moving path for a cosmetic flag; rejected.

## D2 — Ending without hooks

- **Decision**: `Current(campaign, now)` returns the entry only when `entry.TurnNo == campaign.CurrentTurn` and
  `now − StartedAt < 30 min`; otherwise none (and the stale entry is dropped). `FinishAsync`/`ProcessAsync`/
  `SetCurrentAsync` additionally call `Clear` after commit (memory only, no line, no event — `turn.finished`/
  `turn.changed` already make the clients reload the status).
- **Rationale**: FR-005 covers every path that moves the turn without wiring each one to the registry's correctness;
  the explicit clear is only tidiness.
- **Frontend**: the footer hides the badge when `processingTurn !== turnNo` or `processingUntil` passed (a timer to
  that instant), so a stale status never shows even before the next reload (SC-002/SC-003).

## D3 — The chat line

- **Decision**: reuse `Turn.GmNotice` (type 15, kind `gm`: centered blue line, no reply/reaction/delete, author = the
  master's user, display "GM") with the texts in `Domain/Gm/GmTurn`-like pure helpers `TurnProcessingTexts.Started(n)` =
  "O mestre começou a processar o turno N." and `Stopped(n, reason)` = "O mestre interrompeu o processamento do turno
  N." / "…do turno N: motivo." (reason trimmed, ≤ 200, line ≤ 260).
- **Rationale**: "pode ser as mensagens azuis igual as no modo GM" — same type, same look, no new kind for the chat,
  the MCP `ITEM` docs or the skills.

## D4 — Idempotence and the GM mode

- Start of the turn already registered → no line, same result (FR-004). Start while `IGmDispatcher.RunningTurnOf(id)`
  equals the current turn → ignored (`ignored: "gm"`), FR-010. Stop without an entry → no line, `processingTurn: null`.

## D5 — Transport to the clients

- **Decision**: `AskStatusInfo` (already the chat's "agent status": `available`, `waitingTurnId`, `gmRunningTurn`) gains
  `processingTurn` (int?) and `processingUntil` (UTC, the expiry). A change publishes `turn.processing { turnNo,
  processing }` to the campaign group; `ChatContext` reloads `askStatus` on it, as it does on `gm.changed`.
- **Alternatives**: a field on `CampaignInfo` — would need `campaign.changed` and `CampaignContext` plumbing; rejected.

## D6 — Skill

- `processar_turno.py` gets two subcommands that wrap `roll6.py chamar set_turn_processing`: `processando --campanha N`
  and `parei --campanha N [--motivo "…"]`. SKILL.md: after `VEREDITO: PRONTO` (and before reading files/resolving)
  run `processando`; on any stop without `process_turn` (doubt for the master, error) run `parei` with the reason.
  `process_turn` needs nothing (the turn advancing ends it). The `gm` skill is unchanged (the GM mode has its own lines).
