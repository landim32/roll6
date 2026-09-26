# Tasks: Painel de NPCs

**Input**: Design documents from `/specs/014-npc-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD; seguindo o padrão do projeto, entram testes Vitest das regras puras
(`lib/npcForm.ts`, `lib/mapTokens.npcDropAction`). O restante é verificado pelo quickstart.

**Organization**: por user story. Caminhos a partir de `frontend/src/`. Entidades novas pela skill
`react-architecture` (constituição, Princípio I), ajustada ao padrão do projeto (DTO direto, sem envelope).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde (`npm run lint` + `npm test` em `frontend/`) e carregar a skill `react-architecture`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: tipos, services e `NpcContext`; invólucro `SidePanel`.

- [X] T002 [P] Criar os tipos `NpcInfo`, `NpcInsertInfo`, `CampaignNpcInfo`, `CampaignNpcInsertInfo`, `MapNpcInfo`, `MapNpcInsertInfo` (ver `data-model.md`) em `types/npc.ts`; acrescentar `mapNpcId: number | null` e `npcId: number | null` a `MapTokenInfo` em `types/mapToken.ts` (e aos fixtures de `lib/mapTokens.test.ts`)
- [X] T003 [P] Criar os services (classes com `handleResponse` → `handleApiResponse`): `npcService` (`list(query)` → `GET /api/npc`, `getById`, `create`, `update`) em `Services/npcService.ts`; `campaignNpcService` (`listByCampaign(campaignId)` → `GET /api/campaign/{id}/npc`, `add`, `remove(id)`) em `Services/campaignNpcService.ts`; `mapNpcService` (`create` → `POST /api/mapnpc`) em `Services/mapNpcService.ts`
- [X] T004 Criar `NpcContext` + `hooks/useNpc.ts`: `campaignNpcs` (carrega `listByCampaign` quando `isMaster` e a campanha mudam; vazio sem mestre/campanha; descarta respostas de outra campanha), `loading`, `error`, `refreshCampaignNpcs()`, `searchMyNpcs(query)`, `getNpc(id)`, `createNpc(data)`, `updateNpc(id, data)`, `addToCampaign(npcId)`, `removeFromCampaign(campaignNpcId)` (depois recarrega a lista e `useMapToken().refresh()`), `placeOnMap(npcId, x, y)` (`mapNpcService.create` + `useMapToken().refresh()`) em `Contexts/NpcContext.tsx` e `hooks/useNpc.ts`
- [X] T005 Registrar `NpcProvider` dentro do `MapTokenProvider` e atualizar o comentário da cadeia em `main.tsx`
- [X] T006 Extrair `SidePanel` do `PartyPanel` (`{ side: 'left' | 'right'; title: string; storageKey: string; collapseLabel; expandLabel; children; footer?: ReactNode }`: cabeçalho com título e botão ‹ (esquerda) / › (direita), `ul` rolável, rodapé opcional, aba vertical recolhida, estado em localStorage com try/catch) em `components/map/SidePanel.tsx`; o `PartyPanel` passa a usá-lo com `side="left"` e `storageKey="roll6:party-collapsed"` sem mudar o comportamento em `components/map/PartyPanel.tsx`
- [X] T007 [P] Estilos: `.stm-side-right` (`left: auto; right: 8px`, `max-height` descontando `--stm-controls-space: 240px` além de menu/rodapé), aba recolhida à direita, e `--stm-controls-space` em `:root` em `styles/app.css`

**Checkpoint**: painel de personagens continua igual; build e testes verdes.

---

## Phase 3: User Story 1 - Ver os NPCs num painel à direita (Priority: P1) 🎯 MVP

**Goal**: painel direito, só do mestre, com os NPCs da campanha.

**Independent Test**: como mestre, ver um card por NPC da campanha à direita (imagem/inicial, nome, barras base); recolher e recarregar; como jogador, não ver o painel.

- [X] T008 [P] [US1] Criar `NpcCard` (`{ npc: CampaignNpcInfo; onEdit: () => void; draggable: boolean }`): `CharacterAvatar` 32 px com `imageUrl ?? tokenImageUrl`, nome com ellipsis e `title`, lápis (`npcs.edit`), `VitalBar` de vida (`life/life`) e energia (`energy/energy`); classes `stm-party-card` (+ `stm-party-draggable`) em `components/map/NpcCard.tsx`
- [X] T009 [US1] Criar `NpcPanel` (`{ onAdd: () => void; onEdit: (npc: CampaignNpcInfo) => void }`): renderiza só com `isMaster` e campanha atual; `SidePanel side="right" storageKey="roll6:npc-collapsed"` com título `npcs.title` (contagem), um `NpcCard` por NPC, texto `npcs.empty` quando vazio e rodapé com o botão "Incluir NPC" (`btn btn-outline-primary btn-sm w-100`) em `components/map/NpcPanel.tsx`
- [X] T010 [US1] Renderizar `<NpcPanel>` no `MainPage` (estados `npcPickerOpen` e `editingNpc`, usados pelas US2/US3) em `pages/MainPage.tsx`
- [X] T011 [P] [US1] Textos `npcs.title` "NPCs ({{count}})", `npcs.empty`, `npcs.add`, `npcs.edit`, `npcs.collapse`, `npcs.expand` em `i18n/locales/pt-BR.json`

**Checkpoint**: quickstart passos 1, 6 e 7.

---

## Phase 4: User Story 2 - Incluir NPCs pelo fim da lista (Priority: P1)

**Goal**: "Incluir NPC" com as abas "Meus NPCs" e "Novo NPC".

**Independent Test**: cadastrar um Goblin com token e vê-lo no painel; incluir um NPC existente; o já incluído aparece como "Na campanha".

- [X] T012 [P] [US2] Criar `lib/npcForm.ts`: `NpcForm` (strings), `emptyNpcForm()`, `toNpcForm(npc)`, `validateNpcForm(form, tokenId)` → `'nameRequired' | 'nameTooLong' | 'notInteger' | 'negative' | 'sheetTooLong' | 'tokenRequired' | null` (nome ≤ 260, números inteiros ≥ 0 com vazio = 0, ficha ≤ 20 000), `toNpcInsert(form, image, tokenId)` + testes em `lib/npcForm.test.ts`
- [X] T013 [US2] Criar `components/npcs/NpcFormFields.tsx` (`{ idPrefix; form; onField; onImageCrop; currentImage?: { url; name } | null; onRemoveImage?; token: { tokenId; name; imageUrl } | null; onToken: (token | null) => void }`): nome; imagem com `ImageCropper` redondo; linha "Token" (miniatura + nome ou `npcs.noToken`, botão `npcs.chooseToken` que abre um `TokenModal` interno cujo `onSelect` só define o token); vida, energia, movimento; ficha com `MarkdownEditor` lazy (`Suspense`)
- [X] T014 [US2] Criar `NpcPickerModal` (`{ open; onOpenChange }`): `Modal` large + `Tabs` (`mine`, `new`); aba "Meus NPCs": busca (debounce 300 ms) + lista paginada (12) de `searchMyNpcs` com avatar, nome e "Vida x · Energia y · Movimento z"; os que estão em `campaignNpcs` mostram o badge `npcs.inCampaign` e ficam desabilitados; clicar → `addToCampaign` → toast `toast.npcAdded` → fecha; aba "Novo NPC": `NpcFormFields` + Salvar (valida, `cropToFile` + `imageService.upload` da imagem, `createNpc`, `addToCampaign`, toast `toast.npcCreated`, fecha); erros → toast em `components/modals/NpcPickerModal.tsx`
- [X] T015 [US2] Ligar o botão "Incluir NPC" ao `NpcPickerModal` no `MainPage` em `pages/MainPage.tsx`
- [X] T016 [P] [US2] Textos `npcs.pickerTitle`, `npcs.mineTab`, `npcs.newTab`, `npcs.inCampaign`, `npcs.mineEmpty`, `npcs.search`, `npcs.name`, `npcs.image`, `npcs.token`, `npcs.noToken`, `npcs.chooseToken`, `npcs.life`, `npcs.energy`, `npcs.move`, `npcs.sheet`, `npcs.errors.*`, `toast.npcAdded`, `toast.npcCreated` em `i18n/locales/pt-BR.json`

**Checkpoint**: quickstart passos 2 e 3.

---

## Phase 5: User Story 3 - Levar um NPC para o mapa e editá-lo (Priority: P2)

**Goal**: arrastar cards de NPC para hexes livres; lápis edita e permite retirar da campanha.

**Independent Test**: arrastar o Goblin duas vezes (duas peças); hex ocupado → aviso; editar a vida pelo lápis; retirar da campanha → card e peças somem.

- [X] T017 [P] [US3] Em `lib/mapTokens.ts`: `NPC_DRAG_TYPE = 'application/x-roll6-npc'` e `npcDropAction({ hex, tokens })` → `{ kind: 'none' } | { kind: 'occupied' } | { kind: 'place' }`; testes em `lib/mapTokens.test.ts`
- [X] T018 [US3] `NpcCard`/`NpcPanel`: `draggable = useMapToken().canPlace`; `onDragStart` grava `NPC_DRAG_TYPE` = `npcId` e `effectAllowed = 'copy'` em `components/map/NpcCard.tsx` e `components/map/NpcPanel.tsx`
- [X] T019 [US3] `MapCanvas`: `acceptsDrag` aceita `PARTICIPATION_DRAG_TYPE` ou `NPC_DRAG_TYPE` (`dropEffect` `copy` para NPC); no drop de NPC → `npcDropAction` → `occupied` toast `mapTokens.hexOccupied`; `place` → `useNpc().placeOnMap(npcId, x, y)` → toast `toast.npcPlaced`; erros → toast em `components/map/MapCanvas.tsx`
- [X] T020 [US3] Criar `NpcFormModal` (`{ npc: CampaignNpcInfo | null; onClose: () => void }`): carrega `getNpc(npc.npcId)`, `NpcFormFields` preenchido (imagem atual com trocar/remover, token atual); Salvar → validação → upload se nova imagem → `updateNpc` → `refreshCampaignNpcs()` → toast `toast.npcUpdated` → fecha; botão "Retirar da campanha" (`btn-outline-danger me-auto`) → `ConfirmModal` (`npcs.removeTitle`, `npcs.removeMessage` com o nome) → `removeFromCampaign(npc.campaignNpcId)` → toast `toast.npcRemoved` → fecha em `components/modals/NpcFormModal.tsx`
- [X] T021 [US3] Ligar o lápis do `NpcPanel` ao `NpcFormModal` no `MainPage` em `pages/MainPage.tsx`
- [X] T022 [P] [US3] Textos `npcs.editTitle`, `npcs.remove`, `npcs.removeTitle`, `npcs.removeMessage`, `toast.npcUpdated`, `toast.npcRemoved`, `toast.npcPlaced` em `i18n/locales/pt-BR.json`

**Checkpoint**: quickstart passos 4 e 5.

---

## Phase 6: Polish & Cross-Cutting

- [X] T023 [P] Atualizar o `CLAUDE.md` (frontend: `SidePanel`, `NpcPanel`, `NpcContext` na cadeia de providers, `NPC_DRAG_TYPE`, modais de NPC)
- [X] T024 Rodar `npm run lint` + `npm test` + `npm run build` em `frontend/`
- [ ] T025 Executar `specs/014-npc-panel/quickstart.md` com Mestre e Jogador

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T007) → US1 → US2 → US3 → Polish.
- US2 e US3 dependem do painel da US1 (botão e lápis). `MainPage.tsx` (T010, T015, T021) e `pt-BR.json` (T011, T016, T022) são tocados por várias histórias — em sequência.
- US3 depende de `NpcFormFields` (US2) para o `NpcFormModal`.

### Parallel Opportunities

- Foundational: T002, T003, T007 em paralelo; T004 depois de T002/T003; T006 independente.
- US1: T008 e T011 em paralelo.
- US2: T012 e T016 em paralelo.
- US3: T017 e T022 em paralelo.

## Parallel Example: Foundational

```text
Task: "T002 tipos em frontend/src/types/npc.ts"
Task: "T003 services em frontend/src/Services/"
Task: "T007 estilos em frontend/src/styles/app.css"
```

## Implementation Strategy

### MVP (US1)

Setup → Foundational → US1: o mestre vê os NPCs da campanha à direita.

### Incremental

1. US2: incluir NPCs (biblioteca ou novo).
2. US3: arrastar para o mapa, editar e retirar.
3. Polish.
