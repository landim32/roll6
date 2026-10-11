# Tasks: Instâncias de NPC no mapa

**Input**: Design documents from `/specs/051-npc-map-instances/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mapnpc.md, quickstart.md

**Tests**: included — plan.md lists the xUnit and Vitest cases.

**Organization**: by user story. The two columns (`current_move`, `removed_at`) and the repository filters are Foundational, because US1 (soft removal) and US3 (deslocamento) both need them. US2 (names) is server-only. US4 is the panel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 (retirar do mapa), US2 (nomes numerados), US3 (editar a instância), US4 (painel)

## Path Conventions

- Backend: `backend/Roll6.*/…`
- Frontend: `frontend/src/…`
- SQL: `database/…`

---

## Phase 1: Setup

No project setup: no new dependency, no new project.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the model and schema both P1 stories and US3 depend on.

- [X] T001 In `backend/Roll6.Domain/Models/MapNpc.cs` add `CurrentMove` (`int`), `RemovedAt` (`DateTime?`) and `IsRemoved => RemovedAt.HasValue`. `FromNpc` copies `npc.Move` into `CurrentMove`. Add `Remove(DateTime now)` (sets `RemovedAt`, `UpdatedAt`; false when already removed). Extend `Update(string? name, int currentLife, int currentEnergy, int? currentMove, string? status, int totalLife, int totalEnergy)`: `currentMove` null keeps, else `Guard.NonNegative(currentMove, "currentMove")`. Add the pure `public static string NextName(string npcName, IEnumerable<string> namesInUse)`: trimmed exact compare; returns `npcName` when not in use, else `"{npcName} {N}"` for the smallest `N ≥ 2` not in use; cut the base so the result is ≤ 260 characters.
- [X] T002 In `backend/Roll6.Infra/Context/Roll6Context.cs` (MapNpc entity) map `current_move` (`integer`, not null, no DB default — the model always sets it, so no `HasSentinel` is needed) and `removed_at` (`timestamp without time zone`, null).
- [X] T003 Generate the migration `AddMapNpcInstances` (`dotnet ef migrations add AddMapNpcInstances --project Roll6.Infra --startup-project Roll6.API`). Edit it so `current_move` is added with `defaultValue: 0`, then `UPDATE map_npcs m SET current_move = n.move FROM npcs n WHERE n.npc_id = m.npc_id;`, and `removed_at` is added nullable. `Down` drops both.
- [X] T004 [P] Write `database/migrations/051-npc-instances.sql` (idempotent, same header style as `050-turn-chat-at.sql`, scripted from `20261011044452_AddTurnChatAt` to the new migration) and regenerate `database/roll6.sql` keeping its 8-line header.
- [X] T005 In `backend/Roll6.Infra.Interfaces/Repository/IMapNpcRepository.cs` document that `ListByMapAsync` and `ListIdsByCampaignAndNpcAsync` return only **active** instances (not removed) while `GetByIdAsync`/`ListByIdsAsync` return any; add `Task FollowMoveAsync(long npcId, int oldMove, int newMove)` (active instances at `oldMove` → `newMove`), `Task<Dictionary<long, int>> CountByCampaignAsync(long campaignId)` (active instances per `npcId` across the campaign's maps), `Task DeleteByNpcAsync(long npcId)` (hard delete of every instance of the NPC — used only when the NPC leaves the library). Implement them in `backend/Roll6.Infra/Repository/MapNpcRepository.cs` with `ExecuteUpdateAsync`/`ExecuteDeleteAsync` and add `RemovedAt == null` to the two listings.
- [X] T006 [P] Tests in `backend/Roll6.Tests/Domain/Models/MapNpcTests.cs`:
  - `FromNpc` copies `Move` into `CurrentMove`;
  - `Update` with `currentMove` null keeps, with a value sets, negative → 400 `currentMove`;
  - `Remove` sets `RemovedAt` once and returns false the second time;
  - `NextName`: none → "Guarda"; ["Guarda"] → "Guarda 2"; ["Guarda", "Guarda 3"] → "Guarda 2"; ["Sargento"] → "Guarda"; a 260-char name still fits.

**Checkpoint**: `dotnet build` and `dotnet test` pass; nothing visible changed.

---

## Phase 3: User Story 1 — Retirar uma instância do mapa (P1) 🎯 MVP

**Goal**: the master removes an instance from the map (hex menu or card) without touching the NPC in the campaign or the other instances; the history stays.

**Independent Test**: quickstart steps 2–4 and 7.

### Tests for User Story 1

- [X] T007 [P] [US1] Tests in `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs`: `DeleteAsync` deletes the piece (`DeleteByMapNpcIdsAsync` on the token repo), calls `UpdateAsync` with `RemovedAt` set, **never** calls `ITurnRepository.DeleteByMapNpcIdsAsync`, publishes `mapTokens.changed` and `turn.changed`; a removed instance → `KeyNotFoundException` on `DeleteAsync` and `UpdateAsync`.
- [X] T008 [P] [US1] Tests in `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: deleting an NPC piece marks the instance removed and keeps the turn entries (no `DeleteByMapNpcIdsAsync` on turns, no `IMapNpcRepository.DeleteAsync`).
- [X] T009 [P] [US1] Tests in `backend/Roll6.Tests/Domain/Services/CampaignNpcServiceTests.cs`: `RemoveAsync` removes (soft) every active instance, keeps turn entries; `MapToDtoAsync` fills `mapNpcCount` from `CountByCampaignAsync`.
- [X] T010 [P] [US1] Tests in `backend/Roll6.Tests/Domain/Services/NpcServiceTests.cs`: `DeleteAsync` calls `ITurnRepository.DeleteByNpcAsync` then `IMapNpcRepository.DeleteByNpcAsync` before `DeleteAsync`.

### Implementation for User Story 1

- [X] T011 [US1] In `backend/Roll6.Domain/Services/MapNpcService.cs`: `GetOwnedAsync` throws `KeyNotFoundException("NPC do mapa não encontrado.")` when `mapNpc.IsRemoved`; `DeleteAsync` deletes the piece, calls `mapNpc.Remove(DateTime.UtcNow)` + `_repository.UpdateAsync`, no turn deletion; keep the two publishes. Update the XML docs ("the entries stay").
- [X] T012 [US1] In `backend/Roll6.Domain/Services/MapTokenService.cs` `DeleteAsync`: for a piece with `MapNpcId`, load the instance, `Remove(now)` + `UpdateAsync` instead of `_turnRepository.DeleteByMapNpcIdsAsync` + `_mapNpcRepository.DeleteAsync`.
- [X] T013 [US1] In `backend/Roll6.Domain/Services/CampaignNpcService.cs` `RemoveAsync`: load the active instances (`ListByIdsAsync(ListIdsByCampaignAndNpcAsync(...))`), delete their pieces, mark each removed + `UpdateAsync`, no turn deletion. Add `MapNpcCount` to `backend/Roll6.DTO/CampaignNpc/CampaignNpcInfo.cs` (`[JsonPropertyName("mapNpcCount")]`) and fill it in `MapToDtoAsync` with `CountByCampaignAsync(campaignId)`.
- [X] T014 [US1] In `backend/Roll6.Domain/Services/NpcService.cs` `DeleteAsync`: after `_turnRepository.DeleteByNpcAsync(npcId)` call `_mapNpcRepository.DeleteByNpcAsync(npcId)` (inject `IMapNpcRepository` if not already there — it is, for `ClampVitalsAsync`).
- [X] T015 [P] [US1] Frontend types/service: add `mapNpcCount: number` to `CampaignNpcInfo` in `frontend/src/types/npc.ts`; add `remove(mapNpcId)` (`DELETE /api/mapnpc/{id}`) to `frontend/src/Services/mapNpcService.ts`.
- [X] T016 [US1] In `frontend/src/Contexts/NpcContext.tsx` add `removeFromMap(mapNpcId: number): Promise<void>` (`run(() => mapNpcService.remove(id))` then `refreshMapTokens()`), expose it in the context type and value.
- [X] T017 [US1] Hex menu: in `frontend/src/components/map/HexMenu.tsx` add an optional prop `deleteLabel?: string` (default `t('hexMenu.deleteToken')`) used by the destructive item. In `frontend/src/components/map/MapCanvas.tsx` pass `deleteLabel={menuToken?.mapNpcId !== null ? t('hexMenu.removeNpc') : undefined}` and include `mapNpcId` in the `onDeleteToken` target (`{ mapTokenId, name, mapNpcId }`).
- [X] T018 [US1] In `frontend/src/pages/MainPage.tsx` the delete `ConfirmModal` uses, when `toDelete.mapNpcId` is set, `t('npcs.removeFromMapTitle')`, `t('npcs.removeFromMapMessage', { name })` and `t('hexMenu.removeNpc')`; otherwise the current texts. The action stays `deleteToken(mapTokenId)` (the server now soft-removes).
- [X] T019 [US1] In `frontend/src/components/modals/NpcFormModal.tsx` the "Retirar da campanha" message becomes `t('npcs.removeMessage', { name, count: npc.mapNpcCount })` with plural forms (`removeMessage_one` / `removeMessage_other`, i18next count).
- [X] T020 [US1] i18n in `frontend/src/i18n/locales/pt-BR.json`: `hexMenu.removeNpc` "Retirar do mapa"; `npcs.removeFromMapTitle` "Retirar NPC do mapa"; `npcs.removeFromMapMessage` "Retirar {{name}} do mapa? O NPC continua na campanha e o que ele fez fica no chat."; `npcs.removeMessage_one` "Retirar {{name}} da campanha? A peça dele sai do mapa; o que ela fez fica no chat. O NPC continua na sua biblioteca."; `npcs.removeMessage_other` "Retirar {{name}} da campanha? As {{count}} peças dele saem dos mapas da campanha; o que elas fizeram fica no chat. O NPC continua na sua biblioteca."; `npcs.removeMessage` (count 0) kept as the base text without pieces. Run `npm test -- keys`.

**Checkpoint**: quickstart steps 2 (removal part), 3, 7 and 8 (menu part) work.

---

## Phase 4: User Story 2 — Instâncias com nomes numerados (P1)

**Goal**: the first instance of an NPC on a map takes the NPC's name, the next ones "{nome} N" with the smallest free number on that map.

**Independent Test**: quickstart steps 1–2.

- [X] T021 [P] [US2] Tests in `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs`: `CreateAsync` with `ListByMapAsync` returning ["Guarda"] of the same NPC → the inserted `MapNpc.Name` and the piece name are "Guarda 2"; with instances of another NPC only → "Guarda"; with ["Guarda", "Guarda 3"] → "Guarda 2".
- [X] T022 [US2] In `backend/Roll6.Domain/Services/MapNpcService.cs` `CreateAsync`: after loading the NPC, `var names = (await _repository.ListByMapAsync(map.MapId)).Where(m => m.NpcId == npc.NpcId).Select(m => m.Name);` and set `instance.Name = MapNpc.NextName(npc.Name, names)` before inserting (the piece is placed with `saved.Name`, as today).
- [X] T023 [P] [US2] MCP text in `backend/Roll6.Mcp/Tools/MapNpcTools.cs` `place_npc_on_map`: the occurrence is named after the NPC, or "{name} N" with the smallest free number among the NPC's occurrences on that map.

**Checkpoint**: quickstart step 1 and the reuse in step 2 work.

---

## Phase 5: User Story 3 — Editar a instância (P2)

**Goal**: the master edits name, current life/energy, deslocamento, status and posture of one instance; each instance has its own move, which follows the library move only while untouched.

**Independent Test**: quickstart steps 5–6.

### Tests for User Story 3

- [X] T024 [P] [US3] Tests in `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs`: `UpdateAsync` with `currentMove` logs a `CharacterUpdate` with the `currentMove` change; null keeps it and logs nothing for it; `MapToDtoAsync` returns `currentMove`.
- [X] T025 [P] [US3] Test in `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: an NPC piece's `MapTokenInfo.move` is the instance's `CurrentMove`, not the NPC's `Move`.
- [X] T026 [P] [US3] Test in `backend/Roll6.Tests/Domain/Services/NpcServiceTests.cs`: `UpdateAsync` changing `move` 6 → 8 calls `FollowMoveAsync(npcId, 6, 8)`; an unchanged move doesn't.
- [X] T027 [P] [US3] Test in `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs` (processing section): `process_turn` `npcs[].currentMove` is applied and logged; negative → 400 `npcs[0].currentMove`.
- [X] T028 [P] [US3] Vitest `frontend/src/lib/npcInstanceForm.test.ts` for `validateInstance`: name required/≤ 260, integers, life/energy ≤ totals, move ≥ 0, status ≤ 260; `toUpdateInfo` builds the PUT body.

### Implementation for User Story 3

- [X] T029 [P] [US3] DTOs: `CurrentMove` (`int`) in `backend/Roll6.DTO/MapNpc/MapNpcInfo.cs`; `CurrentMove` (`int?`, "null keeps") in `backend/Roll6.DTO/MapNpc/MapNpcUpdateInfo.cs`; `CurrentMove` (`int?`) in `TurnProcessNpcInfo` in `backend/Roll6.DTO/Turn/TurnProcessInfo.cs`.
- [X] T030 [US3] In `backend/Roll6.Domain/Services/MapNpcService.cs` `UpdateAsync`: pass `info.CurrentMove` to `mapNpc.Update`, add `("currentMove", before.CurrentMove, mapNpc.CurrentMove)` to the diff, and `CurrentMove = m.CurrentMove` in `MapToDtoAsync`.
- [X] T031 [US3] In `backend/Roll6.Domain/Services/MapTokenService.cs` `MapToDtoAsync`: `info.Move = mapNpc.CurrentMove` for NPC pieces.
- [X] T032 [US3] In `backend/Roll6.Domain/Services/NpcService.cs` `UpdateAsync`: capture `npc.Move` before `Update`; when it changed call `_mapNpcRepository.FollowMoveAsync(npc.NpcId, oldMove, npc.Move)` next to `ClampVitalsAsync`.
- [X] T033 [US3] In `backend/Roll6.Domain/Services/TurnService.Processing.cs` (NPC items): read `item.CurrentMove ?? mapNpc.CurrentMove`, error `"{prefix}.currentMove"` when negative, pass it to `mapNpc.Update`, add the `currentMove` diff — mirror of the character branch at ≈ line 310.
- [X] T034 [P] [US3] MCP: `currentMove` parameter on `update_map_npc` in `backend/Roll6.Mcp/Tools/MapNpcTools.cs` (optional, "deslocamento of this occurrence, ≥ 0; omitted keeps") and on the `npcs` items description of `process_turn` in `backend/Roll6.Mcp/Tools/TurnTools.cs`; mention `currentMove` in `list_map_npcs`/`MapNpcInfo` texts. Guide `backend/Roll6.Mcp/Roll6Guide.cs` NPC section: instances per map, numbered names, own deslocamento, removal keeps the history, `delete_map_npc` vs `remove_npc_from_campaign`.
- [X] T035 [P] [US3] Frontend: `currentMove: number` on `MapNpcInfo` and a new `MapNpcUpdateInfo { name, currentLife, currentEnergy, currentMove?: number | null, status, posture }` in `frontend/src/types/npc.ts`; `update(mapNpcId, data)` (`PUT /api/mapnpc/{id}`) in `frontend/src/Services/mapNpcService.ts`.
- [X] T036 [US3] `frontend/src/lib/npcInstanceForm.ts`: `InstanceForm { name, currentLife, currentEnergy, currentMove, status, posture }` as strings/numbers, `fromPiece(piece: MapTokenInfo)` (seeds from the piece: name, life, energy, move, status, posture), `validateInstance(form, totals) → errors`, `toUpdateInfo(form) → MapNpcUpdateInfo`.
- [X] T037 [US3] In `frontend/src/Contexts/NpcContext.tsx` add `updateInstance(mapNpcId, data: MapNpcUpdateInfo)` → `mapNpcService.update` then `refreshMapTokens()`.
- [X] T038 [US3] New `frontend/src/components/npcs/MapNpcFormModal.tsx` (Radix Dialog like `NpcFormModal`): props `piece: MapTokenInfo | null`, `onClose`; fields Nome, Vida atual (≤ `totalLife`, shown as "/ total"), Energia atual, Deslocamento, Status, Postura (select 1/2/3); Salvar → `updateInstance(piece.mapNpcId, toUpdateInfo(form))`, toast errors; no delete button (removal is on the menu/card).
- [X] T039 [US3] Hex menu "Editar NPC": optional `onEditNpc?: () => void` prop in `frontend/src/components/map/HexMenu.tsx` (pencil icon, shown for the master on pieces with `mapNpcId`); `MapCanvas` prop `onEditNpc: (piece: MapTokenInfo) => void`; `frontend/src/pages/MainPage.tsx` keeps `editingInstance` state and renders `MapNpcFormModal`.
- [X] T040 [US3] i18n in `frontend/src/i18n/locales/pt-BR.json`: `hexMenu.editNpc` "Editar NPC"; `npcInstance.title` "Editar {{name}}", `npcInstance.name`, `currentLife` "Vida atual", `currentEnergy` "Energia atual", `move` "Deslocamento", `moveHint` "Pontos de movimento por turno desta peça; o cadastro do NPC não muda.", `status`, `posture`, `save`, errors (`nameRequired`, `nameTooLong`, `notInteger`, `negativeMove`, `lifeAboveTotal`, `energyAboveTotal`, `statusTooLong`).

**Checkpoint**: quickstart steps 5–6 work; the Mover counter on an NPC piece shows the instance's move.

---

## Phase 6: User Story 4 — Painel mostra as instâncias (P3)

**Goal**: the NPC card lists every instance on the open map by name with its values and, for the master, edit and remove per row.

**Independent Test**: quickstart step 4 and the read-only check of step 8.

- [X] T041 [US4] In `frontend/src/components/map/NpcCard.tsx`: always show the instance name on each row (drop the `occurrences.length > 1` condition); add props `onEditInstance?: (piece: MapTokenInfo) => void` and `onRemoveInstance?: (piece: MapTokenInfo) => void` (master only) rendering a `PencilIcon` and an `XIcon` (Bootstrap `x-lg`, add to `components/ui/icons.tsx` if missing) per row with `title`/`aria-label` (`npcs.editInstance`, `npcs.removeInstance` with `{ name }`); without the props (players) nothing changes.
- [X] T042 [US4] In `frontend/src/components/map/NpcPanel.tsx` wire the two props for the master: edit → the same `MapNpcFormModal` as the menu (lift `editingInstance` to `MainPage` or render the modal in the panel); remove → the same `ConfirmModal` texts as T018, calling `removeFromMap(piece.mapNpcId)`.
- [X] T043 [US4] i18n in `frontend/src/i18n/locales/pt-BR.json`: `npcs.editInstance` "Editar {{name}}", `npcs.removeInstance` "Retirar {{name}} do mapa".

**Checkpoint**: quickstart step 4 works and players see rows without controls.

---

## Phase 7: Polish & Cross-Cutting

- [X] T044 [P] `delete_map_npc` description in `backend/Roll6.Mcp/Tools/MapNpcTools.cs`: "removes the occurrence and its piece from the map; its turn entries and chat lines stay with its name"; `list_campaign_npcs` in `backend/Roll6.Mcp/Tools/CampaignTools.cs`: `mapNpcCount`. Run `McpDescriptionTests`/`McpCoverageTests` (still 99 operations / 100 tools).
- [X] T045 [P] Update `CLAUDE.md`: a 051 note in the NPCs paragraph (instances: numbered names per map, `current_move` + `FollowMoveAsync`, soft removal `removed_at` keeping the entries, `mapNpcCount`, the instance form and menu items) and a Recent Changes line.
- [X] T046 Run `cd backend && dotnet build Roll6.sln && dotnet test`, then `cd frontend && npm run lint && npm test && npm run build`. Fix what fails.
- [ ] T047 Walk through `specs/051-npc-map-instances/quickstart.md` (manual, by the user on homolog), including step 9 (Mover mode cancelled when the piece is removed) and step 10 (old data).

---

## Dependencies & Execution Order

- **Foundational (T001–T006)** blocks every story.
- **US1 (T007–T020)** and **US2 (T021–T023)** are independent of each other after Foundational; US1 first (the reported problem).
- **US3 (T024–T040)** needs Foundational (`CurrentMove`) and reuses US1's menu plumbing (T017) for "Editar NPC".
- **US4 (T041–T043)** needs US1 (`removeFromMap`) and US3 (`MapNpcFormModal`).
- **Polish** last.

Within a phase: tests → DTO/types → repository → service → frontend lib → context → components → i18n.

## Parallel Examples

- Foundational: T004 and T006 in parallel after T001–T003; T005 in parallel with T004.
- US1: T007–T010 together; then T011–T014 (backend, different files) in parallel with T015 → T016 → T017 → T018/T019 → T020.
- US2: T021 and T023 together, then T022.
- US3: T024–T029 together; then T030–T034 (backend) in parallel with T035 → T036 → T037 → T038 → T039 → T040.
- Polish: T044 and T045 together.

## Implementation Strategy

1. **MVP**: Foundational + US1 — the master can remove an instance from the map, the NPC stays in the campaign and the history stays.
2. **US2** gives distinct names on creation (server only, tiny).
3. **US3** adds the instance form and the deslocamento per instance.
4. **US4** finishes the panel.
5. Polish: MCP texts, CLAUDE.md, full build and tests, manual pass.
