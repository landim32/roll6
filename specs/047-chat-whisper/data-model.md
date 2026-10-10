# Data Model: Sussurro no chat

## Turn (existing) — new column

| Column | Type | Rules |
|---|---|---|
| is_whisper | boolean not null default false | true only for Text, Image, Audio, Roll, Action; set at creation, kept by convert/cancel |

## TurnWhisperTarget — `turn_whisper_targets`

| Column | Type | Rules |
|---|---|---|
| turn_whisper_target_id | bigint PK identity | |
| turn_id | bigint not null | FK `fk_turn_whisper_target` (ClientSetNull); index `ix_turn_whisper_targets_turn` |
| character_id | bigint null | FK `fk_character_whisper_target` (ClientSetNull); null = the master |

Unique (turn_id, character_id) with nulls not distinct semantics enforced in the domain (no duplicate targets).

## Rules
- Targets: ≥ 1; each character approved in the campaign at write time; never the speaker's own character; the master target only if the speaker is not the master.
- Visibility: author, campaign master, current owners of target characters → whole; others → messages hidden, actions masked.
- Deleting turns deletes their targets; deleting a character deletes its target rows (whispers to it keep the other targets; a whisper left with none stays visible only to author + master).

## DTO additions
- In: `whisperCharacterIds: long[]?`, `whisperMaster: bool?` on `ChatSendInfo`, `ChatRollInfo`, `TurnActionInfo`.
- Out (`ChatItemInfo`, `TurnInfo`): `whisper: { master: bool, recipients: [{ characterId|null, name, imageUrl }] } | null` (only for viewers who see it) and `whisperHidden: bool` (masked action). `ChatReplyInfo.hidden: bool`.
