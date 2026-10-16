# Tasks: Painel de NPCs só com os NPCs do mapa (076)

**Input**: Design documents from `specs/076-npc-panel-map-filter/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/npc-panel.md, quickstart.md

**Tests**: the user asked for tests of the map filter ("acrescente os do filtro por mapa"), so test tasks are included.

**Paths**: frontend only, under `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **[Story]**:
  - US1: only the scene's NPCs.
  - US2: follows the map and the pieces.
  - US3: allies on every map.

---

## Phase 1: Setup

- [X] T001 Confirm `npm test`, `npm run lint` and `npx tsc -b` are green on the branch before changing anything
  (`frontend/`).

---

## Phase 2: Foundational (blocking)

- [X] T002 Add `onMap(npcs, pieces, mapId)` to `frontend/src/lib/npcCategory.ts`.
  - Inputs: `npcs: readonly CampaignNpcInfo[]`, `pieces: readonly Pick<MapTokenInfo, 'tokenType' | 'mapId' |
    'npcId'>[]`, `mapId: number | null`.
  - Rule:
    - an ally (`isAlly`) always passes;
    - with `mapId === null`, no enemy or neutral passes;
    - otherwise an enemy or neutral passes when some piece has `tokenType === MAP_TOKEN_TYPE.npc`,
      `piece.mapId === mapId` and `piece.npcId === npc.npcId`.
  - Keeps the input order.
  - Doc comment citing 076 Q1/Q2.
- [X] T003 In the same file, add `afterAddAction(canPlace: boolean): 'place' | 'join'`, the picker rule of Q1 = A.

**Checkpoint**: the pure rules exist; components can use them.

---

## Phase 3: User Story 1 - Só os NPCs da cena no painel (P1) 🎯 MVP

**Goal**: the right panel shows only the enemies and neutrals with a piece on the open map, and its title counts them.

**Independent Test**: 20 enemies/neutrals in the campaign, 8 with a piece on the open map. The panel shows 8 cards and
the title says 8.

- [X] T004 [P] [US1] Add to `frontend/src/lib/npcCategory.test.ts` a `describe('onMap (076)')`:
  - the reported case: 20 NPCs, 8 with pieces on map 5 and others only on map 6 → exactly those 8, in order;
  - an NPC with two pieces on the map is kept once;
  - pieces of another map are ignored;
  - character and object pieces never make an NPC pass;
  - `mapId` null keeps only the allies.
- [X] T005 [US1] In `frontend/src/components/map/NpcPanel.tsx`:
  - read `draft.mapId` from `useMapEditor` and `mapTokens` from `useMapToken`;
  - compute `scene = onMap(allNpcs, mapTokens, draft.mapId)` with `useMemo`;
  - use `party.length === 0 ? scene : groupNpcs(scene, partyIds).right` as the list;
  - the title count and the players' "no panel when empty" rule use that list;
  - update the component's doc comment (076: only the scene's enemies and neutrals).
- [X] T006 [US1] In `frontend/src/i18n/locales/pt-BR.json`, change `npcs.empty` to "Nenhum NPC neste mapa.".

---

## Phase 4: User Story 2 - A lista acompanha a troca de mapa e as peças (P1)

**Goal**: map switches, piece events and new NPCs reflect at once. A newly included NPC gets a piece, so it shows.

**Independent Test**: switch A ↔ B and the list follows. "Incluir NPC" → "Novo NPC" with a map open gives a piece and a
card. With no room, the NPC joins the campaign and the master sees a warning.

- [X] T007 [P] [US2] Add to `frontend/src/lib/npcCategory.test.ts` `afterAddAction`: `true` → `'place'`, `false` →
  `'join'`.
- [X] T008 [US2] In `frontend/src/components/modals/NpcPickerModal.tsx`:
  - read `canPlace` from `useMapToken`;
  - write a local `joinAndPlace(npc)` used by `add` (an NPC not yet in the campaign) and `onCreate`:
    - `await addToCampaign(npc.npcId)`;
    - when `afterAddAction(canPlace) === 'place'`, try `await placeOnMap(npc.npcId)` and toast
      `t('toast.npcAddedPlaced', { name })`; on any error, toast `t('npcs.addedNotPlaced', { name })` as a warning
      and keep the NPC;
    - otherwise toast `t('npcs.addedNoMap', { name })` as info;
  - an NPC already in the campaign keeps the 052 path;
  - update the component's doc comment.
- [X] T009 [US2] Add `toast.npcAddedPlaced`, `npcs.addedNotPlaced` and `npcs.addedNoMap` to
  `frontend/src/i18n/locales/pt-BR.json`, with the texts in `data-model.md`. Drop the keys `toast.npcAdded` /
  `toast.npcCreated` if nothing uses them anymore (the `keys.test` only checks used keys).
- [X] T010 [US2] Verify, without new code, that `MapTokenContext` reloads the pieces when `draft.mapId` changes and
  applies piece events, so `NpcPanel` recomputes. If the old map's pieces linger during the switch, `onMap`'s `mapId`
  comparison already ignores them. Note it in `research.md` if anything differs.

---

## Phase 5: User Story 3 - Aliados em todos os mapas (P1)

**Goal**: allies keep showing on every map, with or without a piece.

**Independent Test**: an ally with no piece shows on A, B and A again. Turned Neutro, it follows the filter.

- [X] T011 [P] [US3] Add to `frontend/src/lib/npcCategory.test.ts`:
  - an ally with no piece passes `onMap` on any map and with `mapId` null;
  - the same NPC as Neutro passes only where it has a piece.
- [X] T012 [US3] Confirm that `frontend/src/components/map/PartyPanel.tsx` stays unfiltered (allies from
  `groupNpcs(campaignNpcs, …)`) and that `NpcPanel` with an empty party still lists allies (through `onMap`). No change
  expected.

---

## Phase 6: Polish & Cross-Cutting

- [X] T013 Run `npx tsc -b`, `npm run lint` and `npm test` in `frontend/`, and fix what fails.
- [X] T014 Check in a local test page (`frontend/zz-076.html`/`.tsx` served by Vite, with mocked contexts or the pure
  function fed with the reported 20/8 data) that `NpcPanel`'s list and count follow the map. Delete the page
  afterwards.
- [X] T015 [P] Update `CLAUDE.md`:
  - the "NPC panel (feature 014)" and "NPC categories UI (071)" paragraphs: `onMap` and the picker placing new NPCs;
  - a "Recent Changes" entry for 076.
- [X] T016 [P] Mark every task done in this file.

---

## Dependencies & Execution Order

- T001 → T002/T003 → US1 (T004–T006) → US2 (T007–T010) → US3 (T011–T012) → Polish.
- US1 and US3 both rely only on `onMap`. US2's picker relies on `afterAddAction`.
- T004, T007 and T011 edit the same test file, so they run in sequence even though each is marked [P] against
  component work.

## Parallel Example

```text
T004 onMap tests                (lib/npcCategory.test.ts)
T008 picker joins and places    (components/modals/NpcPickerModal.tsx)
T015 CLAUDE.md
```

## Implementation Strategy

- **MVP = US1**: the panel shows only the scene's NPCs. It fixes the reported 20 → 8.
- **Then US2**: new NPCs get a piece, so the master can still bring them to the scene.
- **US3** is mostly verification: allies already bypass the filter by design.

## Implementation notes

- T014: `NpcPanel` needs most of the table's contexts (campaign, NPCs, party, pieces, editor, turn), so the local page
  was not built. The list rule is the pure `onMap`, covered by the reported 20 → 8 case and the other unit tests. The
  cards and the panel layout are unchanged.
- T010: `MapTokenContext.refresh` runs on every `draft.mapId` change. The old map's pieces stay in memory until the new
  list arrives, and `onMap` ignores them because it compares `piece.mapId`.
- `npcs.empty` is still used by Configurações › NPCs ("Nenhum NPC na campanha."). The panel uses the new
  `npcs.emptyOnMap`.
