# Research: Ação repetida (099)

## D1 — Where the repetition lives

- **Decision**: on the actor's own row — `campaign_characters.repeated_action` / `repeated_action_user_id` (a character's
  play is per campaign) and `map_npcs.repeated_action` / `repeated_action_user_id` (each NPC instance acts on its own,
  051). Text ≤ 2000 (`Turn.MAX_DESCRIPTION`), trimmed, required when set.
- **Rationale**: one per actor (FR-004) falls out of the schema; removing the instance (`MapNpc.Remove`) or the
  participation already handles the lifecycle; no join table, no FK cascade worries.
- **Alternatives**: a `repeated_actions` table keyed by actor — rejected (one-to-one, more deletes to keep in step).

## D2 — How the turn start applies it

- **Decision**: `TurnService.ApplyRepeatedAsync(campaign, turns)` builds `Turn.Action(…, repeated: TurnStart)` for each
  approved participation (`ICampaignCharacterRepository.ListRepeatingAsync(campaignId)`, approved only) and each active
  instance on a non-deleted map of the campaign (`IMapNpcRepository.ListRepeatingAsync(campaignId)`), author =
  `repeated_action_user_id` (fallback: the master), `map_id` = the campaign's current map for characters and the
  instance's map for NPCs, `turn_no` = the new current turn. Called inside the same transaction by `FinishAsync`,
  `ProcessAsync` (after the batch's own clears) and `SetCurrentAsync` forward (only for the final turn — skipped turns
  get nothing). Publishes nothing extra: `turn.finished` already makes every client reload.
- **Rationale**: the repetition must be in place before anyone reads the new turn; the existing transactions are the
  right boundary.
- **Alternatives**: a background job at turn change — rejected (race with the first reads, more moving parts).

## D3 — Marking the repeated actions (Q1 = B, Q2 = A)

- **Decision**: `turns.repeated integer null` (`RepeatSource` 1 Declared = set while the actor had no action, Q2; 2
  TurnStart = applied at turn start). `GmTurn.Complete(approved, acted, anyDeclared)` adds "some valid Action of the turn
  has `repeated != TurnStart`"; `ActedAsync` returns it. Pending list, "Falta…" and finish treat both kinds as acted.
- **Rationale**: Q1 = B needs to tell an automatic action from a declared one; Q2 = A's immediate application is a
  declaration by the user (it triggers the GM like "Agir").

## D4 — What clears it

- **Decision**: `ActAsync` (any route) and `ConvertAsync(to: action)` call `ClearRepeatedAction` on the actor's row in
  their transaction (FR-006); `SetRepeatedAsync` with empty text clears it (the UI's "Remover"); `process_turn` items
  with `clearRepeatedAction: true` clear it before the turn-start application (FR-007); `MapNpc.Remove` clears it.
  Reset does not (edge case). Clearing never touches the action already applied in the turn in progress — replacing it
  is the normal one-valid-action rule.

## D5 — Notices

- **Decision**: TurnStart actions send no N2 to the master and do not trigger "Falta…" (they are not news); the Declared
  application on activation behaves like `ActAsync` (N2 + "Falta…" + GM check).

## D6 — Menu layout (US3)

- **Decision**: the posture group renders one `.stm-float-menu-iconrow` with three 44 × 44 icon buttons (Bootstrap
  Icons `person-standing` = Em pé, `person-fill-down` = Caído, `heartbreak` = Fora de combate), `role="menuitemradio"`,
  `aria-checked`, `title`/`aria-label` = the posture name, current one `disabled` and highlighted. The CSS rule that
  draws the hairline (`.stm-float-menu-item + .stm-float-menu-item`) stays for loose items; inside `[role=group]` the
  items lose it and the group gets one top rule (`.stm-float-menu > [role=group]` border-top). The "Ação" group holds
  "Agir sobre…", "Agir", "Ação repetida…" (`ArrowRepeatIcon`, a small green dot when active).

## D7 — Skills

- **Decision**: `processar_turno.py` reads `entry.repeated` and the data's `repeatedAction` per actor; prints
  `AÇÃO (repetida): …` and `REPETIÇÃO ATIVA: …`; `processar-turno/SKILL.md` §1d "Ação repetida" and `gm/SKILL.md`: read
  it as a standing order, resolve it like any declaration, and when the stated goal is met (the target died, no enemy
  left, the door opened) send `clearRepeatedAction: true` for that actor in `process_turn` and say so in the narration;
  when unsure, keep it.

## D8 — MCP

- **Decision**: `set_repeated_action` (`PUT /api/turn/repeated-action`), `clearRepeatedAction` on `process_turn`'s items,
  `repeated`/`repeatedAction` in the ENTRY/ITEM/get_turn_data texts, guide "Turns" paragraph → 126 operations / 127 tools
  (`McpCoverageTests` count updated).
