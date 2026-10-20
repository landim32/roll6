# Data model: Modo GM (096)

## Campaign (existing entity, one new column)

| Field | Column | Type | Rules |
|---|---|---|---|
| `GmMode` | `campaigns.gm_mode` | `boolean not null default false` | Set by the master only (`Campaign.SetGmMode`), any status; every campaign from before is off. `HasDefaultValue(false)` — an explicit true is written. |

Read as `gmMode` in `CampaignInfo` (and left out of `CampaignTableInfo`). Migration `AddCampaignGmMode` +
`database/migrations/096-gm-mode.sql` (idempotent, like `072-pending-notice.sql`); `database/roll6.sql` regenerated.

## Turn (existing entity, one new type)

| Value | Name | Group | Meaning |
|---|---|---|---|
| 15 | `TurnType.GmNotice` | conversation (`TurnTypes.CONVERSATION`, `IsConversation`) | A line of the GM about a turn: started, stopped, failed, ended without closing. `user_id` = the master, `character_id` null, `display_name` "GM", `description` = the Portuguese line (≤ 260), `turn_no` = the turn it is about. Never deletable, never a reply target, no reaction, no N1 notice, not a turn record. Chat kind `"gm"`. |

No schema change: the column `turn_type` is an integer.

## Notice (existing catalog, one new kind)

| Value | Name | Recipients | Text |
|---|---|---|---|
| 9 | `NoticeKind.Gm` (N9) | the master only | "GM: o turno N não foi fechado — {motivo}" (`NoticeTexts.Gm`, ≤ 120 chars, first names/markdown rules as the others) |

Stored in `user_notifications` like every notice; simulate kind `gm`.

## GmJob (in memory, `AnimationConnections`)

```text
GmJob(CampaignId, TurnNo, MasterUserId, CampaignName)
EditorRequest.Gm : GmJob?     IsGm => Gm != null
```

- Queued by `EnqueueGm(job, now)` on the master's per-user FIFO, **refused (null) while a GM request of the same
  campaign is queued or running**; runs on the master's free agent like asks and editor requests (one running request
  per agent).
- States: Queued → Running → finished (`Finish`), with `TimedOut` set by the 10-minute timer before the stop.
- `RunningTurnOf(campaignId)` → the turn number of the queued/running GM request of the campaign, else null
  (`AskStatusInfo.gmRunningTurn`).
- Dropped with the agent (`RemoveAgent` → failed "O agente caiu."), as every request.

## Realtime

| Event | Audience | Data |
|---|---|---|
| `campaign.changed` (existing) | the campaign group | the mode changed (the `CampaignInfo` is reloaded) |
| `gm.changed` (new, `TableEventType.GM_CHANGED`) | the campaign group | `{ running: bool, turnNo: int? }` when a GM run starts or ends |
| `ask.changed` (existing) | every campaign the master owns | `{ available }` — the console connected or dropped; the chat re-reads the status |
| `chat.message` (existing) | the campaign group | the GM lines |

## AskStatusInfo (existing DTO, one new field)

```json
{ "available": true, "waitingTurnId": null, "gmRunningTurn": 7 }
```

`gmRunningTurn`: the turn a GM run is queued or running for in this campaign, else null.

## State transitions of a GM run

```text
[complete turn + gm_mode + Active + console connected + no run of the campaign]
    → queued ──(agent free)──▶ running ──▶ done: turn advanced (narration in the chat)       — nothing more
                                        ├─▶ done: turn still open  → "terminou sem fechar" + N9
                                        ├─▶ failed (console dropped, error, denial) → "falhou: …" + N9
                                        ├─▶ stopped (mode turned off) → "interrompido"
                                        └─▶ timed out (10 min) → "falhou: demorou demais" + N9
```

## Skill `gm` (table repository, files only)

```text
c:\repos\gurps-adventure\.claude\skills\gm\
├── SKILL.md            # the autonomous processar-turno (see contracts/skill-gm.md)
└── scripts\gm.py       # contexto (turn + movement check in one screen) · fechar (process_turn through roll6.py)
```
