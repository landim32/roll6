# Data Model: Status da campanha

## CampaignStatus (new enum, `Roll6.Domain/Enums/CampaignStatus.cs`)

| Value | Name | pt-BR |
|---|---|---|
| 1 | Preparing | Preparando |
| 2 | Active | Ativa |
| 3 | Paused | Pausada |
| 4 | Finished | Finalizada |

## Campaign (existing, changed)

| Field | Type | Rule |
|---|---|---|
| status | `integer not null default 2` | 1–4. Existing rows → 2 (Active). New campaigns → 1 (Preparing). Changed only by the master (`SetStatus`). |

Methods:
- `SetStatus(int status)`: an invalid value → `DomainValidationException("status", "Status inválido.")`. It updates `UpdatedAt`.
- `EnsurePlayable()`: unless Active → `ConflictException("A campanha está {label}.")`.
- `EnsureMapEditable(bool isMaster)`: Active → ok; Preparing && isMaster → ok; otherwise the same `ConflictException`.

`label` is "em preparação", "pausada" or "finalizada".

## Transitions

Any status to any other, by the master. Nothing else changes with it: the turn, pieces, records and pending participations stay as they are.

| Operation | Active | Preparing | Paused / Finished |
|---|---|---|---|
| Conversation chat (text, photo, audio, roll, poll, vote, reaction, reply, whisper, delete) | ✓ | ✓ | ✓ |
| Pieces / NPC occurrences / map into campaign: master | ✓ | ✓ | ✗ |
| Pieces: player | ✓ | ✗ | ✗ |
| Act, convert, reset, finish, process, set current turn, poke | ✓ | ✗ | ✗ |
| Request, invite, approve, accept | ✓ | ✗ | ✗ |
| Settings, plan, sheets, archive map, current map, deny/decline/remove | ✓ | ✓ | ✓ |
