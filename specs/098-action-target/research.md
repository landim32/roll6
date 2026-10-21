# Research: "Ação sobre…" (098)

No `NEEDS CLARIFICATION` remained in the spec; this file records the design decisions behind the plan.

## D1 — Where the target is stored

- **Decision**: one nullable jsonb column `turns.target` holding a `TurnTarget` snapshot (hex, distance and, when a
  piece was there, its identity and what the table showed of it), written only by `ActAsync` with a piece actor.
- **Rationale**: the spec wants what was seen *at declaration time* (edge cases: the target may leave the map, die, be
  renamed before processing). A snapshot is read back as it was, needs no joins and no FK (a removed instance or a
  deleted character never breaks it). `turns.changes` already stores a jsonb list with a tested EF conversion
  (`TURN_CHANGE_JSON` + `ValueComparer`), so the pattern is copied, not invented.
- **Alternatives considered**: columns `target_x`/`target_y`/`target_map_token_id` resolved live on every read —
  rejected: a live read of a piece that moved shows the wrong place, and a removed piece shows nothing; a separate
  `turn_targets` table — rejected: one-to-one with the action, no query ever filters by target.

## D2 — Who resolves the piece under the hex

- **Decision**: the client sends `target: { x, y, mapTokenId? }`; the server resolves on the actor's own map through
  `MapOccupancyLoader.LoadAsync(map)` (whole footprints, the same occupancy moves use). With `mapTokenId` the piece
  must be on that map and cover the hex (else 400 `target`); without it, the piece covering the hex is taken — when
  several share it (free mode overlap), the **greatest `mapTokenId`** (the last one drawn, "a peça de cima" of
  `TokenLayer`, which renders in list order). The hex must be inside the grid (400 `target`).
- **Rationale**: the SPA sends what it showed the player (deterministic), MCP callers can send only the hex, and the
  server never trusts a client-side snapshot — names, vitals and sides are read from the rows.
- **Alternatives considered**: the client sends the whole snapshot — rejected (a forged snapshot would go to the chat
  and the GM); `Occupancy.PieceAt` (first id of the hex) — rejected only for the tie rule; it returns `ids[0]`, so the
  loader will expose the list per hex (`PiecesAt`) or the service will pick the max among the covering shapes.

## D3 — What the snapshot carries and how it is described

- **Decision** (`Domain/Models/TurnTarget`, pure): `X`, `Y`, `Distance` (hexes from the actor's piece position to the
  target hex), and for a piece: `MapTokenId`, `Kind` (`character` | `npc` | `object`), `Side` (`self` when the target
  is the actor's own piece; `ally` for characters and ally NPCs; `enemy`; `neutral`; `object`), `Name`, `CharacterId`,
  `MapNpcId`, `Look`, `Posture` (characters/NPCs), `Status`, `CurrentLife`/`TotalLife`, `CurrentEnergy`/`TotalEnergy`.
  Characters are read from the participation (current vitals, status, posture), NPC instances from `MapNpc` + the
  NPC's totals + `CampaignNpc.Category`; objects carry only name and position. The text (`TurnTarget.Describe`):
  `Goblin guerreiro (inimigo, NPC) em (9, 7), a 3 hexes, olhando para o Sudeste, Caído, PV 5/12, Fadiga 3/10,
  status: "atordoado"` — vitals/status only when present; an empty hex: `o hex (9, 7), a 3 hexes`; the own piece:
  `si mesmo em (4, 4)`.
- **Rationale**: FR-004 lists exactly these fields; the text is one place (`TurnSummary` uses it for the line, the
  chat shows a shorter label from the structured DTO) so the markdown summary, the turn data and the skills agree.
- **Alternatives considered**: storing only ids — rejected (D1).

## D4 — Distance

- **Decision**: `HexGrid.Distance(x1, y1, x2, y2)` = Red Blob cube distance after `OffsetToAxial` (odd-q):
  `max(|dq|, |dr|, |dq + dr|)`; mirrored as `distance(a, b)` in `lib/hexGrid.ts`; reference cases pinned on both sides:
  (0,0)→(0,0)=0, (0,0)→(1,0)=1, (1,0)→(2,1)=1, (0,0)→(2,0)=2, (0,0)→(0,3)=3, (0,0)→(3,2)=4, (2,3)→(5,1)=3.
- **Rationale**: constitution VII (distance from the guide's axial/cube formulas, never ad hoc; one pure module each
  side). The actor's position is the piece's hex at declaration (its footprint's anchor), the target the clicked hex.

## D5 — Reads, masking and conversions

- **Decision**: `TurnInfo.target` and `ChatItemInfo.target` (`TurnTargetInfo`, same fields + `lookName`, `sideLabel`,
  `kindLabel`, `text`) are filled from the snapshot; `TurnSummary` appends ` → sobre {text}` to the Action line, so
  `get_turn_summary`, `get_turn_data.actions` and the chat `text` carry it. `MaskForViewerAsync` sets `Target = null`
  on the masked entries (in-memory only, like the description). `Turn.ToMessage` (action → text, 044) clears the
  target; `ToAction` never sets one (FR-006). Reset/cancel/delete are untouched (the target lives on the entry).
- **Rationale**: FR-005/FR-009; the skills read entries, not markdown, so the structured field is what they consume.

## D6 — Targeting mode on the map

- **Decision**: `MapCanvas` gets a `targeting: ActTarget | null` state. "Ação sobre…" (`onActOn`, above "Agir",
  `CrosshairIcon`) sets it; while set, the svg has `.is-targeting` (crosshair cursor), hover keeps highlighting the hex
  (the existing `HexHighlight`, whole footprint when a piece is there), a click (< 4 px, same tolerance as the menu)
  on a hex inside the grid calls `onAct({ ...actor, target: pickTarget(hex, pieceAt) })` and marks the hex with
  `setPickedHex` (gray, cleared when the modal closes); Esc, right click or a click outside the grid cancels. The
  movement mode and targeting are exclusive (starting one cancels the other); a piece event that removes the actor
  cancels it.
- **Rationale**: it mirrors the Mover first click, which players already know on desktop and phones (one tap).
- **Alternatives considered**: picking the target inside the modal by name — rejected (the user asked for a hex, and
  an empty hex has no name).

## D7 — Enter in the action window

- **Decision**: `ActModal`'s textarea gets `onKeyDown`: Enter without Shift (and not while composing) → `preventDefault`
  + `form.requestSubmit()`; the submit keeps its guard (empty/whitespace does nothing). The same handler serves "Agir"
  and "Ação sobre…" since they are the same modal.
- **Rationale**: FR-008; `ChatComposer` already does Enter/Shift+Enter the same way.

## D8 — Skills

- **Decision**: `processar_turno.py montar` keeps, per declaration, the structured `alvo` (from `entry.target`) and
  prints `AÇÃO: {text} → sobre {alvo}` where the hex is the table's label through `roll6.xy_para_rotulo(x, y,
  desloc)` plus the raw `(x, y)`, the distance, the side/kind, facing, posture, vitals and status; `--json` exposes
  `acoes: [{ texto, alvo }]` (the old list of strings becomes a list of objects — `gm.py` and the SKILL texts are the
  only readers and are updated together). `processar-turno/SKILL.md` gains "## Alvo da ação (098)": the pointed
  piece is the adversary (identity, not name), the distance feeds range/penalties, an empty hex is the destination
  or aimed point, a target that is no longer there is narrated as such; `gm/SKILL.md` references it in §5.
- **Rationale**: FR-007; local use keeps working (no target → the line is as before).

## D9 — MCP

- **Decision**: `act_in_turn` takes `targetX`, `targetY`, `targetMapTokenId` (all optional; the pair required
  together, only with `mapTokenId`); `ENTRY`/`ITEM` descriptions document `target`; the guide's "Turns" paragraph
  explains "Ação sobre…". No new tool (125 operations / 126 tools unchanged).
