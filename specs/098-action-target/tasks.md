# Tasks: "Ação sobre…" — a ação declarada sobre um hex do mapa

**Input**: Design documents from `/specs/098-action-target/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-action-target.md,
contracts/skills-action-target.md, quickstart.md

**Tests**: the project keeps unit tests for every pure rule and service branch (xUnit, Vitest); the test tasks below
pin the shared hex distance (constitution VII), the target snapshot/text, the `ActAsync` branches and the pure
frontend helpers.

**Organization**: by user story — US1 (the target declared, stored, shown), US2 (the skills read it), US3 (Enter
submits). US1 is the MVP; US2 depends on US1's read contract; US3 is independent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 / US2 / US3

## Path Conventions

- Backend: `backend/Roll6.{DTO,Domain,Infra,Application,API,Mcp,Tests}/…`
- Frontend: `frontend/src/…`
- Table repository (files only, never committed by this feature): `c:\repos\gurps-adventure\.claude\skills\…`

---

## Phase 1: Setup

**Purpose**: nothing to scaffold — the feature lives in existing projects. One check only.

- [X] T001 Confirm the branch `098-action-target` is checked out and `backend/Roll6.sln` + `frontend/` build clean
      before any change (`dotnet build backend/Roll6.sln`, `cd frontend && npm run lint`)

---

## Phase 2: Foundational (shared grid math, model, storage)

**Purpose**: the hex distance (both sides), the `TurnTarget` value object, the `turns.target` column and the DTOs —
every story reads or writes them.

- [X] T002 [P] Add `HexGrid.Distance(int x1, int y1, int x2, int y2)` (Red Blob cube distance after `OffsetToAxial`:
      `max(|dq|, |dr|, |dq + dr|)`) in `backend/Roll6.Domain/Grid/HexGrid.cs`, next to `Neighbor`, with a doc comment
      naming the guide's "distances" section
- [X] T003 [P] Add `distance(a: Offset, b: Offset): number` (exact mirror of T002) in `frontend/src/lib/hexGrid.ts`
- [X] T004 [P] Pin the shared reference cases (0,0)→(0,0)=0, (0,0)→(1,0)=1, (1,0)→(2,1)=1, (0,0)→(2,0)=2, (0,0)→(0,3)=3,
      (0,0)→(3,2)=4, (2,3)→(5,1)=4 in `backend/Roll6.Tests/Domain/Grid/HexGridTests.cs` (new `Distance_*` facts)
- [X] T005 [P] Pin the same seven cases in `frontend/src/lib/hexGrid.test.ts` (`describe('distance')`)
- [X] T006 [P] Create `backend/Roll6.Domain/Models/TurnTarget.cs` (data-model.md): the value object (`X`, `Y`,
      `Distance`, `MapTokenId`, `Kind`, `Side`, `Name`, `CharacterId`, `MapNpcId`, `Look`, `Posture`, `Status`,
      `CurrentLife`, `TotalLife`, `CurrentEnergy`, `TotalEnergy`; string constants `KIND_CHARACTER/NPC/OBJECT`,
      `SIDE_SELF/ALLY/ENEMY/NEUTRAL/OBJECT`), the factories `Hex(x, y, distance)` and
      `Piece(x, y, distance, mapTokenId, kind, side, name, …)` and the pure labels `KindLabel()`, `SideLabel()`,
      `PostureLabel()` (1 "Em pé", 2 "Caído", 3 "Fora de combate") and `Describe()` — "o hex (9, 7), a 3 hexes" /
      "si mesmo em (4, 4)" / "Goblin guerreiro (inimigo, NPC) em (9, 7), a 3 hexes, olhando para o Sudeste, Caído,
      PV 5/12, Fadiga 3/10, status: \"atordoado\"" (facing via `TurnSummary.Direction`; posture only when ≠ 1;
      vitals and status only when present; "a 1 hex" singular)
- [X] T007 [P] Create `backend/Roll6.Tests/Domain/Turns/TurnTargetTests.cs`: `Describe` for an empty hex, the own piece,
      a standing enemy NPC without status, a down ally character with vitals and status, an object; singular "1 hex"
- [X] T008 Add `public TurnTarget? Target { get; set; }` to `backend/Roll6.Domain/Models/Turn.cs`, a new
      `Turn.Action(…, string? description, TurnTarget? target)` overload (the old signature keeps calling it with null),
      and clear `Target` in `ToMessage` (044); doc comment: a target implies an Action with a piece actor
- [X] T009 Map `turns.target` in `backend/Roll6.Infra/Context/Roll6Context.cs` (the `Turn` entity block): a
      `TURN_TARGET_JSON` options field (web defaults, `DefaultIgnoreCondition = WhenWritingNull`),
      `.HasColumnName("target").HasColumnType("jsonb")` with a `HasConversion` + `ValueComparer` copied from `Changes`
- [X] T010 Add the migration `dotnet ef migrations add AddTurnTarget --project Roll6.Infra --startup-project Roll6.API`
      (from `backend/`), check it only adds the nullable jsonb column, write `database/migrations/098-turn-target.sql`
      (`ALTER TABLE turns ADD COLUMN IF NOT EXISTS target jsonb NULL;` + the `__EFMigrationsHistory` insert like
      `096-gm-mode.sql`) and regenerate `database/roll6.sql` with the idempotent script command, keeping its header
- [X] T011 [P] Create `backend/Roll6.DTO/Turn/TurnTargetInfo.cs` (every `TurnTarget` field + `lookName`, `kindLabel`,
      `sideLabel`, `postureLabel`, `text`; `[JsonPropertyName]` camelCase) and add `TurnTargetInsertInfo { x, y,
      mapTokenId? }` + `TurnActInfo.Target` in `backend/Roll6.DTO/Turn/TurnActInfo.cs`; add `Target` to
      `backend/Roll6.DTO/Turn/TurnInfo.cs` and `backend/Roll6.DTO/Chat/ChatItemInfo.cs` (doc comments: null without
      target or when the whispered action is masked)
- [X] T012 [P] Add the frontend types in `frontend/src/types/turn.ts` (`TurnTargetInfo`, `TurnInfo.target?`,
      `ActionTargetWrite { x, y, mapTokenId?: number | null }`) and `frontend/src/types/chat.ts`
      (`ChatItemInfo.target?: TurnTargetInfo | null`)

**Checkpoint**: `dotnet build` + `dotnet test --filter "FullyQualifiedName~HexGridTests|FullyQualifiedName~TurnTargetTests"`
and `npm test -- hexGrid` pass; the migration exists.

---

## Phase 3: User Story 1 — Declarar uma ação sobre um hex (Priority: P1) 🎯 MVP

**Goal**: "Ação sobre…" above "Agir" → pick a hex → the action is saved with the target snapshot and shown in the
chat, the summary and the turn reads.

**Independent Test**: quickstart steps 1–5 and 8 (table, chat, `GET /api/campaign/{id}/turn`, `get_turn_data`).

### Backend

- [X] T013 [US1] In `backend/Roll6.Domain/Services/TurnService.cs` add `ResolveTargetAsync(Map map, MapToken actor,
      Campaign campaign, TurnTargetInsertInfo target)`: `MapLayout` from `_occupancy.LoadAsync(map)`; 400 `target`
      "O hex está fora do mapa." unless `HexGrid.IsInsideGrid`; the piece covering the hex = `target.MapTokenId` when
      given (must be on this map and its footprint must contain the hex, else 400 `target` "Não há essa peça nesse
      hex.") or the covering piece with the greatest `MapTokenId` (add `PiecesAt(x, y)` to
      `backend/Roll6.Domain/Grid/Occupancy.cs` returning every id of the hex, keeping `PieceAt`); distance =
      `HexGrid.Distance(actor.X, actor.Y, x, y)`; then the snapshot: own piece → `Side = self`; character piece →
      participation (`_campaignCharacterRepository`) + character name/totals, side `ally`; NPC piece → `MapNpc`
      (`_mapNpcRepository`) + NPC totals + `CampaignNpc.Category` (`_campaignNpcRepository`: 1 enemy, 2 neutral,
      3 ally); object → name of the token, side/kind `object`
- [X] T014 [US1] In `ActAsync` (same file): with `info.Target` and a `campaignId + characterId` actor → 400 `target`
      "A ação sobre um hex precisa de uma peça no mapa."; with a piece actor → `ResolveTargetAsync` and
      `Turn.Action(…, info.Description, target)`; keep everything else (cancel, whisper, reply, notices, `CheckAsync`)
- [X] T015 [P] [US1] Add `Target` to `SummaryLine` in `backend/Roll6.Domain/Turns/TurnSummary.cs` and append
      ` → sobre {Escape(target.Describe())}` to the `TurnType.Action` line when set; fill it in `BuildLines`
      (`backend/Roll6.Domain/Services/TurnService.Processing.cs`, `Target = e.Target`)
- [X] T016 [P] [US1] Map the DTO: a private `ToTargetInfo(TurnTarget?)` helper (shared by `MapToDtoAsync` in
      `backend/Roll6.Domain/Services/TurnService.cs` and `FillLogItem` in
      `backend/Roll6.Domain/Services/TurnService.Chat.cs`) filling `TurnTargetInfo` with the labels and `text`
- [X] T017 [P] [US1] In `backend/Roll6.Domain/Services/TurnService.Whispers.cs` `MaskForViewerAsync` also sets
      `entry.Target = null` on the masked actions (in-memory only), so `TurnInfo`, chat items, summary and turn data
      hide it with the text
- [X] T018 [P] [US1] Tests in `backend/Roll6.Tests/Domain/Turns/TurnSummaryTests.cs`: an action line with a target
      ("→ sobre …", markdown escaped) and without one (unchanged)
- [X] T019 [US1] Tests in `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs` (after T013–T017): `ActAsync`
      with a target on an enemy NPC (snapshot fields, distance, side enemy), on an empty hex, on the own piece
      (self), with `mapTokenId` not covering the hex → 400 `target`, outside the grid → 400 `target`, with
      `campaignId + characterId` → 400 `target`, overlap picks the greatest id; the masked whispered action returns
      `Target == null` for an outsider and the snapshot for the master
- [X] T020 [P] [US1] MCP: `targetX`, `targetY`, `targetMapTokenId` on `act_in_turn` in
      `backend/Roll6.Mcp/Tools/TurnTools.cs` (both or neither → the pair builds `Target`; description from
      contracts/api-action-target.md), `target` in the shared `ENTRY` text and the chat `ITEM` text
      (`backend/Roll6.Mcp/Tools/ChatTools.cs` or wherever `ITEM` lives), the "→ sobre …" note on `get_turn_data` /
      `get_turn_summary`, and a paragraph in the "Turns" section of `backend/Roll6.Mcp/Roll6Guide.cs`; run
      `dotnet test --filter "FullyQualifiedName~Mcp"` (still 125 operations / 126 tools)

### Frontend

- [X] T021 [P] [US1] Create the pure `frontend/src/lib/actionTarget.ts`: `ActionTargetPick { x, y, piece: { mapTokenId,
      name, kind: 'character'|'npc'|'object', side: 'self'|'ally'|'enemy'|'neutral'|'object' } | null }`;
      `pickTarget(hex, actor: MapTokenInfo, pieces: MapTokenInfo[])` (piece covering the hex through
      `lib/occupancy` whole footprints, ties = greatest `mapTokenId`; side from `tokenType`/`npcCategory`/the actor's
      own id); `targetTitle(pick)` → "Goblin 2" / "o hex (9, 7)" / "si mesmo"; `toTargetWrite(pick)` →
      `ActionTargetWrite`; `targetLabel(target: TurnTargetInfo)` → "Goblin 2 (inimigo, NPC) · (9, 7) · 3 hexes" /
      "o hex (12, 4) · 5 hexes" (singular "1 hex") for the chat
- [X] T022 [P] [US1] Create `frontend/src/lib/actionTarget.test.ts` for the four helpers (piece/empty/self/overlap,
      labels, singular)
- [X] T023 [P] [US1] Add `CrosshairIcon` (Bootstrap Icons "crosshair" path, `currentColor`, `size`) to
      `frontend/src/components/ui/icons.tsx`
- [X] T024 [P] [US1] i18n in `frontend/src/i18n/locales/pt-BR.json`: `hexMenu.actOn` "Ação sobre…",
      `turn.actOnTitle` "Ação sobre {{target}} — {{name}}", `turn.targetHint` "Clique no hex do alvo (Esc cancela)",
      `chat.actionTarget` "sobre {{target}}"
- [X] T025 [US1] `frontend/src/components/map/HexMenu.tsx`: prop `onActOn?: () => void` rendered **above** the "Agir"
      item (`CrosshairIcon`, `autoFocus={!onMove}` moves to it when present), same visibility rule as `onAct`
- [X] T026 [US1] `frontend/src/lib/turnStatus.ts`: `ActTarget.target?: ActionTargetPick | null`;
      `frontend/src/Services/turnService.ts` and `frontend/src/Contexts/TurnContext.tsx`: `act(target, description,
      replyToTurnId?, whisper?, actionTarget?: ActionTargetWrite | null)` sends `target` when given
- [X] T027 [US1] `frontend/src/components/map/MapCanvas.tsx`: targeting mode — `targeting: ActTarget | null` state;
      `onActOn` of the menu sets it (cancelling a move in progress; starting a move cancels it); while set the svg
      gets `is-targeting`, hover keeps the highlight, `onPointerUp` (click, not panning) on a hex inside the grid calls
      `onAct({ ...targeting, target: pickTarget(hex, actorPiece, mapTokens) })`, `setPickedHex(hex)` and clears the
      mode; Esc (document keydown), right click (`onContextMenu` preventDefault) or a click outside the grid cancels;
      a `mapTokens` change that drops the actor's piece cancels; a toast `turn.targetHint` (info) when the mode starts
- [X] T028 [P] [US1] `frontend/src/styles/app.css`: `.stm-map-canvas.is-targeting { cursor: crosshair; }` (use the
      svg's existing class)
- [X] T029 [US1] `frontend/src/components/modals/ActModal.tsx`: title `turn.actOnTitle` with `targetTitle(piece.target)`
      when the piece has a target (else `turn.actTitle`); `submit` passes `toTargetWrite(piece.target)` as the fifth
      argument of `act`; the field still opens with `currentAction` text
- [X] T030 [US1] `frontend/src/pages/MainPage.tsx`: closing `ActModal` also clears the picked hex (expose
      `clearPickedHex` from `MapCanvas` through the existing pattern, or key `pickedHex` on `acting === null`)
- [X] T031 [P] [US1] `frontend/src/components/chat/ChatItem.tsx` (kind `action`): under the description render
      `<div className="stm-chat-action-target">{t('chat.actionTarget', { target: targetLabel(item.target) })}</div>`
      when `item.target` is set (never for masked actions — the server sends null); small muted style in
      `frontend/src/styles/app.css`
- [X] T032 [P] [US1] `frontend/src/lib/chatItems.ts`: `copyableText` of an action appends " — sobre …" when it has a
      target; a case in `frontend/src/lib/chatItems.test.ts`

**Checkpoint**: backend + frontend tests pass; quickstart 1–5 and 8 verified by hand (two browsers) — US1 shippable.

---

## Phase 4: User Story 2 — As skills recebem o alvo (Priority: P1)

**Goal**: `processar-turno` and `gm` show the target in each declaration and resolve against the pointed piece / hex.

**Independent Test**: quickstart "Skills" — `processar_turno.py contexto --so-mcp --campanha N` on a turn with a
targeted action prints "→ sobre …"; `--json` carries `acoes[].alvo`; `gm.py contexto --campanha N` the same.

- [X] T033 [US2] `c:\repos\gurps-adventure\.claude\skills\processar-turno\scripts\processar_turno.py`: a pure
      `alvo_de(entry, desloc)` (contracts/skills-action-target.md: `xy`, `hex` via `roll6.xy_para_rotulo`,
      `distancia`, `mapTokenId`, `tipo`, `lado`, `nome`, `characterId`, `mapNpcId`, `frente`, `postura`, `status`,
      `pv`, `fadiga`; `None` without target) and `linha_alvo(alvo)` ("o hex J8 (9,7), a 3 hexes" / "Goblin (inimigo,
      NPC) em J8 (9,7), a 3 hexes, olhando Sudeste, Caído, PV 5/12, Fadiga 3/10, status: …"); `montar` stores
      `acoes: [{ "texto", "alvo" }]` for characters and NPCs; `imprimir` prints `AÇÃO: {texto}` + an indented
      `→ sobre …` line when `alvo`; `pendentes`/`so_moveu` keep working on the list length
- [X] T034 [US2] Update every reader of `acoes` as strings: `c:\repos\gurps-adventure\.claude\skills\gm\scripts\gm.py`
      (if it formats actions itself) and the `--json` consumers named in
      `c:\repos\gurps-adventure\.claude\skills\processar-turno\SKILL.md` / `gm\SKILL.md`; run
      `python .claude/skills/processar-turno/scripts/processar_turno.py contexto --so-mcp --campanha 3` and `--json`
      from `c:\repos\gurps-adventure` (read-only calls) to confirm nothing breaks without targets
- [X] T035 [P] [US2] `c:\repos\gurps-adventure\.claude\skills\processar-turno\SKILL.md`: section "## Alvo da ação
      (098)" (the pointed piece is the adversary by identity, distance = range/penalties recomputed after
      `validar-movimento`, empty hex = destination/aimed point, a target no longer there is narrated as seen, no
      target = as before)
- [X] T036 [P] [US2] `c:\repos\gurps-adventure\.claude\skills\gm\SKILL.md`: §5 references the rule (resolve against
      the pointed piece, use the distance, empty hex = destination; an ambiguous target goes to "Dúvidas para o
      mestre", never a question)
- [ ] T037 [US2] Live check (user-driven, production): a targeted action in the campaign, `gm.py contexto --campanha N`
      shows the target, a GM run narrates against the pointed piece (quickstart "Skills")

---

## Phase 5: User Story 3 — Enter confirma a ação (Priority: P2)

**Goal**: Enter submits the action window; Shift+Enter breaks the line; empty text never sends.

**Independent Test**: quickstart step 6 (and step 2's Enter).

- [X] T038 [US3] `frontend/src/components/modals/ActModal.tsx`: textarea `onKeyDown` — Enter without Shift and not
      `nativeEvent.isComposing` → `preventDefault()` + `event.currentTarget.form?.requestSubmit()`; the existing
      `submit` guard (`!text.trim()`) keeps empty text from sending; `saving` disables it
- [X] T039 [P] [US3] A render test (React Testing Library already in use? else skip to the manual check) or a pure
      helper `shouldSubmitOnEnter(event)` in `frontend/src/lib/actionTarget.ts` with cases in
      `frontend/src/lib/actionTarget.test.ts` (Enter → true, Shift+Enter → false, composing → false)

---

## Phase 6: Polish & Cross-Cutting

- [X] T040 [P] Update `CLAUDE.md` (hand-maintained sections, keep BOM + CRLF): a "Ação sobre… (098)" bullet under the
      turn/action notes (the `turns.target` snapshot, resolution rule, summary text, mask, frontend targeting mode,
      Enter, skills, MCP parameters, still 125 operations / 126 tools) and a "Recent Changes" entry
- [X] T041 [P] `backend/Roll6.Console/README.md` / MCP guide consistency check: nothing to change in the console;
      confirm `Roll6Guide` text (T020) and `McpDescriptionTests` pass
- [X] T042 Run the full suites: `cd backend && dotnet test` (use `-p:BaseOutputPath=<scratch>` if a console process
      locks DLLs) and `cd frontend && npm run lint && npm test && npm run build`
- [ ] T043 Run quickstart.md end to end (table, chat, MCP, skills, phone tap) and fix what fails
- [ ] T044 Commit only after the user says "sim" (message via `git commit -F`, feature summary + `Co-Authored-By`
      line); the table repository files stay uncommitted

---

## Dependencies & Execution Order

- **Phase 2** (T002–T012) before everything; inside it T002/T003/T006/T011/T012 are parallel, T004/T005/T007 follow
  their targets, T008 → T009 → T010 sequential.
- **US1** (T013–T032): backend T013 → T014 → T019; T015/T016/T017/T018/T020 parallel after T008/T011; frontend
  T021–T024 parallel after T012, then T025 → T026 → T027 → T029 → T030; T028/T031/T032 parallel after T021.
- **US2** (T033–T037) after US1's read contract (T016) is in place — it can be written in parallel with the frontend
  tasks; T035/T036 parallel with T033; T037 last and user-driven.
- **US3** (T038–T039) independent of US1/US2 (touches `ActModal` — do after T029 to avoid conflicts in the same file).
- **Phase 6** after all.

## Parallel Example (US1)

```text
Backend: T015 ∥ T016 ∥ T017 ∥ T018 ∥ T020   (after T008, T011)
Frontend: T021 ∥ T023 ∥ T024 ∥ T028 ∥ T031 ∥ T032   (after T012)
```

## Implementation Strategy

1. Phase 2 (grid distance mirrored + tested, `TurnTarget`, column, DTOs) — the contract everything else builds on.
2. US1 backend first (the API + summary + chat + mask), then the frontend targeting mode — ship as MVP.
3. US2 (skills, files only) and US3 (Enter) in parallel.
4. Polish: docs, full suites, quickstart.
