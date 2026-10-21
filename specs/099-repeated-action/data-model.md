# Data Model: Ação repetida (099)

## Columns

| Table | Column | Type | Notes |
|---|---|---|---|
| `campaign_characters` | `repeated_action` | `varchar(2000) null` | The standing order of the character in this campaign; null = none. |
| `campaign_characters` | `repeated_action_user_id` | `bigint null` | Who set it (author of the applied actions). No FK. |
| `map_npcs` | `repeated_action` | `varchar(2000) null` | Same, per NPC instance. |
| `map_npcs` | `repeated_action_user_id` | `bigint null` | Same. |
| `turns` | `repeated` | `integer null` | `RepeatSource`: 1 Declared (applied when set, Q2), 2 TurnStart (applied at turn start). Null = an ordinary entry. |

Migration `AddRepeatedAction` + `database/migrations/099-repeated-action.sql`.

## Domain

- `RepeatSource` enum (1 Declared, 2 TurnStart).
- `CampaignCharacter.SetRepeatedAction(string text, long userId)` / `ClearRepeatedAction()` → bool (changed);
  `MapNpc` the same; `MapNpc.Remove` clears. Text: `Guard.RequiredText(…, "description", Turn.MAX_DESCRIPTION)`.
- `Turn.Repeated : RepeatSource?`; `Turn.Action(…, target, repeated)`; `ToMessage` clears it.
- `GmTurn.Complete(approved, acted, anyDeclared)` — complete only with `anyDeclared`.

## DTOs

- `TurnRepeatInfo { mapTokenId?, campaignId?, characterId?, description? }` — same actor rules as `TurnActInfo`;
  empty/null description = remove.
- `TurnRepeatResultInfo { active, description, applied (TurnInfo?) }` — `applied` set when Q2 recorded it now.
- `TurnInfo.repeated` / `ChatItemInfo.repeated`: `"declared" | "turnStart" | null`.
- `MapTokenInfo.repeatedAction` (character pieces: the participation's; NPC pieces: the instance's),
  `CampaignCharacterInfo.repeatedAction`, `TurnDataCharacterInfo.repeatedAction`, `TurnDataNpcInfo.repeatedAction`.
- `TurnProcessCharacterInfo.clearRepeatedAction`, `TurnProcessNpcInfo.clearRepeatedAction` (bool, default false).

## Frontend

- `types/turn.ts`: `RepeatKind = 'declared' | 'turnStart'`, `TurnInfo.repeated?`; `types/chat.ts` `repeated?`;
  `MapTokenInfo.repeatedAction?`, `CampaignCharacterInfo.repeatedAction?`.
- `lib/repeatedAction.ts`: `repeatedActionOf(piece)`, `REPEATED_EXAMPLE`, `submitsOnEnter` reuse.
