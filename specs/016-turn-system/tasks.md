# Tasks: Sistema de Turnos

**Input**: Design documents from `/specs/016-turn-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD; seguindo o padrão do projeto entram testes xUnit do modelo e dos services
e Vitest das regras puras (`lib/turnStatus.ts`). O restante é verificado pelo quickstart.

**Organization**: por user story, na ordem de prioridade (US1, US2, US4 = P1; US3, US5 = P2). Caminhos a
partir da raiz. Entidade nova pelas skills `dotnet-architecture` e `react-architecture` (constituição).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde (`dotnet test`; `npm run lint` + `npm test`) e carregar as skills `dotnet-architecture` e `react-architecture`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: entidade `Turn`, turno atual da campanha, estado do turno na API e `TurnContext`.

### Backend

- [X] T002 [P] Criar `TurnType` (`Movement = 1, Action = 2, ActionResult = 3`) em `backend/Roll6.Domain/Enums/TurnType.cs`
- [X] T003 Criar o modelo `Turn` (campos do `data-model.md`) com fábricas `Movement(campaignId, mapId, characterId?, npcId?, mapNpcId?, turnNo, before (x,y,look), after (x,y,look))`, `Action(...)`/`ActionResult(...)` (texto trim obrigatório ≤ 2000) e validações (exatamente um de personagem/NPC; `look` 0–5; `turnNo` ≥ 1) em `backend/Roll6.Domain/Models/Turn.cs`
- [X] T004 `Campaign`: `public int CurrentTurn { get; set; } = 1;` e `AdvanceTurn()` em `backend/Roll6.Domain/Models/Campaign.cs`; `CampaignInfo.CurrentTurn` (`currentTurn`) em `backend/Roll6.DTO/Campaign/CampaignInfo.cs` e no mapeamento do `CampaignService`
- [X] T005 [P] DTOs `TurnInfo` (+ `actorName`), `TurnInsertInfo`, `TurnActInfo` (`mapTokenId`, `description`), `TurnPieceInfo` (`mapTokenId`), `TurnStateInfo` (`turnNo`, `entries`), `TurnFinishInfo` (`force`), `TurnFinishResultInfo` (`finished`, `pending`, `finishedTurn`, `turnNo`), `TurnResetResultInfo` (`removed`, `reverted`) em `backend/Roll6.DTO/Turn/`
- [X] T006 [P] `ITurnRepository<TModel>` (`GetByIdAsync`, `ListByCampaignTurnAsync(campaignId, turnNo)`, `ExistsMovementAsync(campaignId, turnNo, characterId?, mapNpcId?)`, `ListByActorTurnAsync(campaignId, turnNo, characterId?, mapNpcId?)`, `InsertAsync`, `DeleteAsync`, `DeleteRangeAsync`, `DeleteByCampaignAsync`, `DeleteByCharacterAsync`, `DeleteByNpcAsync`, `DeleteByMapNpcIdsAsync`) e `TurnRepository` em `backend/Roll6.Infra.Interfaces/Repository/ITurnRepository.cs` e `backend/Roll6.Infra/Repository/TurnRepository.cs`
- [X] T007 `Roll6Context`: `DbSet<Turn> Turns`; tabela `turns` inline (colunas snake_case, `description` 2000, FKs `fk_campaign_turn`, `fk_map_turn`, `fk_character_turn`, `fk_npc_turn`, `fk_map_npc_turn` `ClientSetNull`, índice `ix_turns_campaign_turn`); `campaigns.current_turn` `HasDefaultValue(1).HasSentinel(0)` em `backend/Roll6.Infra/Context/Roll6Context.cs`
- [ ] T008 Gerar `dotnet ef migrations add AddTurns …`, aplicar no banco de dev (connection string do `.env` com `Host=localhost`, sem gravar) em `backend/Roll6.Infra/Migrations/<ts>_AddTurns.cs`
- [X] T009 `ITurnService` + `TurnService.GetStateAsync(userId, campaignId)` (mestre ou participante aprovado; registros do turno atual com `actorName` resolvido em lote: personagem pelo nome; NPC pelo nome da ocorrência) e `ListAsync(userId, campaignId, turnNo)` em `backend/Roll6.Domain/Interfaces/ITurnService.cs` e `backend/Roll6.Domain/Services/TurnService.cs`; registrar repo e service em `backend/Roll6.Application/Startup.cs`
- [X] T010 `GET /api/campaign/{id}/turn` e `GET /api/campaign/{id}/turn/{turnNo:int}` no `backend/Roll6.API/Controllers/CampaignController.cs`
- [X] T011 [P] Testes do modelo `Turn` (fábricas e validações) e `Campaign.AdvanceTurn` em `backend/Roll6.Tests/Domain/Models/TurnTests.cs`

### Frontend

- [X] T012 [P] Tipos `TURN_TYPE` (constantes), `TurnInfo`, `TurnStateInfo`, `TurnFinishResultInfo`, `TurnResetResultInfo` em `frontend/src/types/turn.ts`; `currentTurn` em `CampaignInfo` (`frontend/src/types/campaign.ts`)
- [X] T013 [P] `turnService` (`getState(campaignId)`, `list(campaignId, turnNo)`, `act(mapTokenId, description)`, `reset(mapTokenId)`, `finish(campaignId, force)`) em `frontend/src/Services/turnService.ts`
- [X] T014 [P] `lib/turnStatus.ts` (puro): `TURN_STATUS = { none, moved, acted }`, `characterStatus(entries, characterId)`, `occurrenceStatus(entries, mapNpcId)`, `npcStatus(entries, npcId, occurrenceIds)` (vermelho se alguma sem nada / sem peças; amarelo se nenhuma vermelha e alguma só moveu; verde se todas agiram), `hasMoved(entries, piece)`, `hasEntries(entries, piece)`, `lastActions(entries)` → `Map<pieceKey, text>` (chave `c:{characterId}` / `n:{mapNpcId}`), `movementTrails(entries, mapId)` + testes em `frontend/src/lib/turnStatus.test.ts`
- [X] T015 `TurnContext` + `hooks/useTurn.ts`: `turnNo`, `entries` do turno atual da campanha (mestre ou participante com personagem aprovado; senão vazio), polling 15 s com a aba visível e em `visibilitychange`, `refresh()`, `act`, `reset`, `finish`, `listTurn(turnNo)`; ao receber `turnNo` maior que o anterior, empilha a notificação `{ campaignId, turnNo: anterior }` (lidas em localStorage `roll6:turn-seen`) em `frontend/src/Contexts/TurnContext.tsx` e `frontend/src/hooks/useTurn.ts`; registrar `TurnProvider` depois do `NpcProvider` em `frontend/src/main.tsx`

**Checkpoint**: migration aplicada; `GET …/turn` devolve `{ turnNo: 1, entries: [] }`; build/testes verdes.

---

## Phase 3: User Story 1 - Agir e ver o status (Priority: P1) 🎯 MVP

**Goal**: Agir grava ações; círculos nos cards; balões sobre as peças.

**Independent Test**: Aria vermelha → Agir "Ataco o goblin" → verde + balão; outra ação → balão novo.

- [X] T016 [US1] `TurnService.ActAsync(userId, TurnActInfo)`: resolve a peça (personagem → participação aprovada, dono ou mestre; NPC → ocorrência `MapNpcId`, só mestre; objeto → 400), grava `Turn.Action` no turno atual da campanha do mapa em `backend/Roll6.Domain/Services/TurnService.cs`
- [X] T017 [US1] `TurnController`: `[HttpPost("action")]` → 201 em `backend/Roll6.API/Controllers/TurnController.cs`
- [X] T018 [P] [US1] Testes: dono age (ok), outro jogador 403, mestre age com NPC (grava `mapNpcId`/`npcId`), jogador em NPC 403, objeto 400, texto vazio 400, várias ações permitidas em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`
- [X] T019 [P] [US1] `TurnStatusDot` (`{ status }`: círculo 10 px vermelho/amarelo/verde com `title` `turn.status.*`) em `frontend/src/components/ui/TurnStatusDot.tsx` e uso em `PartyCard` (`characterStatus`) e `NpcCard` (`npcStatus` com as ocorrências do NPC nas peças do mapa: `mapTokens` com `npcId`) em `frontend/src/components/map/PartyCard.tsx` e `frontend/src/components/map/NpcCard.tsx`
- [X] T020 [US1] `ActModal` (`{ open; piece: { mapTokenId; name } | null; onClose }`): textarea obrigatória ≤ 2000 → `useTurn().act` → toast `toast.actionRecorded` → fecha em `frontend/src/components/modals/ActModal.tsx`
- [X] T021 [US1] `HexMenu`: item **Agir** (`onAct?`) para personagem/NPC; `MapCanvas` decide quem pode (mestre: personagem/NPC; jogador: peça própria) e abre o `ActModal` via prop `onAct(piece)` para o `MainPage` em `frontend/src/components/map/HexMenu.tsx`, `frontend/src/components/map/MapCanvas.tsx` e `frontend/src/pages/MainPage.tsx`
- [X] T022 [US1] `SpeechBubbleLayer` (`{ tokens; bubbles: Map; hexSize }`): `foreignObject` acima de cada peça com texto, balão com ponta, até 3 linhas + `title`; renderizado no `MapCanvas` depois do `TokenLayer` em `frontend/src/components/map/SpeechBubbleLayer.tsx` e `frontend/src/components/map/MapCanvas.tsx`
- [X] T023 [P] [US1] Estilos `.stm-turn-dot` (cores), `.stm-bubble` (fundo branco, texto escuro, borda, raio, sombra, ponta com `::after`, `line-clamp: 3`) em `frontend/src/styles/app.css`; textos `turn.status.*`, `turn.act`, `turn.actTitle`, `turn.actPlaceholder`, `toast.actionRecorded` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: quickstart passo 3.

---

## Phase 4: User Story 2 - Uma movimentação por turno, com rastro (Priority: P1)

**Goal**: movimento registrado, único por turno, rastros visíveis.

**Independent Test**: mover a Aria → rastro para todos; Mover some do menu; segundo `PUT` → 409.

- [X] T024 [US2] `MapTokenService.MoveAsync`: para peças `Character` (personagem da participação) e `Npc` (`MapNpcId`), recusar (409 "Já se moveu neste turno.") se `ExistsMovementAsync` no turno atual; senão, na mesma transação, mover e inserir `Turn.Movement` (antes/depois, `mapId`, turno atual da campanha do mapa); objetos inalterados em `backend/Roll6.Domain/Services/MapTokenService.cs` (injetar `ITurnRepository`, `ICampaignRepository`)
- [X] T025 [P] [US2] Testes: movimento grava registro com antes/depois; segundo movimento 409 (personagem e ocorrência de NPC); duas ocorrências do mesmo NPC movem cada uma uma vez; objeto sem registro em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`
- [X] T026 [US2] Frontend: após confirmar um movimento, `useTurn().refresh()`; `MapCanvas` esconde "Mover" das peças de personagem/NPC com `hasMoved` no turno em `frontend/src/components/map/MapCanvas.tsx` e `frontend/src/hooks/useTokenMovement.ts`
- [X] T027 [US2] `TurnTrailLayer` (`{ trails; hexSize; columns; rows }`): para cada movimento do mapa aberto, `movementField` a partir do estado antes (sem obstáculos) e `pathTo` até o depois; polyline pelos centros com classe `stm-turn-trail`; renderizado sob as peças no `MapCanvas` em `frontend/src/components/map/TurnTrailLayer.tsx` e `frontend/src/components/map/MapCanvas.tsx`
- [X] T028 [P] [US2] Estilo `.stm-turn-trail` (traço `--bs-info` translúcido, tracejado, `non-scaling-stroke`) em `frontend/src/styles/app.css`; texto `turn.alreadyMoved`

**Checkpoint**: quickstart passo 2.

---

## Phase 5: User Story 4 - Finalizar o turno (Priority: P1)

**Goal**: "Turno N", "Finalizar turno" com pendentes e "Finalizar mesmo assim", notificação.

**Independent Test**: com Bram sem ação → modal com "Bram"; forçar → Turno 2, status zerados, rastros/balões somem, notificação.

- [X] T029 [US4] `TurnService.FinishAsync(userId, campaignId, TurnFinishInfo)`: só mestre; personagens aprovados sem Action no turno atual → `pending` (nomes); com pendentes e `!force` → `{ finished: false, pending }`; senão `campaign.AdvanceTurn()` e grava → `{ finished: true, finishedTurn, turnNo }` em `backend/Roll6.Domain/Services/TurnService.cs`; endpoint `POST /api/campaign/{id}/turn/finish` em `backend/Roll6.API/Controllers/CampaignController.cs`
- [X] T030 [P] [US4] Testes: jogador 403; pendentes sem force → não avança; force → avança; todos agiram → avança; NPC sem ação não bloqueia; campanha sem personagens → avança em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`
- [X] T031 [US4] `TurnControls` (no `TopMenu`): badge `turn.label` para todos com campanha atual; botão `turn.finish` só para o mestre → `finish(false)` → `finished` → toast; pendentes → `FinishTurnModal` em `frontend/src/components/menu/TurnControls.tsx` e `frontend/src/components/menu/TopMenu.tsx`
- [X] T032 [US4] `FinishTurnModal` (`{ pending; onBack; onForce }`): lista de nomes, botões "Voltar" e "Finalizar mesmo assim" (`finish(true)`) em `frontend/src/components/modals/FinishTurnModal.tsx`
- [X] T033 [US4] `NotificationBell`: além dos convites, itens `notifications.turnFinished` do `TurnContext` (contam no badge); clicar marca como lida e abre `TurnSummaryModal` (via callback/estado no `TopMenu`) em `frontend/src/components/menu/NotificationBell.tsx`
- [X] T034 [P] [US4] Textos `turn.label`, `turn.finish`, `turn.pendingTitle`, `turn.pendingMessage`, `turn.finishAnyway`, `turn.back`, `notifications.turnFinished`, `toast.turnFinished`; estilos do badge/botão no menu em `frontend/src/i18n/locales/pt-BR.json` e `frontend/src/styles/app.css`

**Checkpoint**: quickstart passos 1 e 6.

---

## Phase 6: User Story 3 - Resetar o turno (Priority: P2)

**Goal**: dono ou mestre apaga os registros do turno daquela peça e desfaz o movimento.

**Independent Test**: Aria moveu e agiu → Resetar → volta ao hex/sentido de antes, sem balão, vermelha.

- [X] T035 [US3] `TurnService.ResetAsync(userId, TurnPieceInfo)`: permissões como em Agir; registros do personagem/ocorrência no turno atual; se houver Movement e o hex `before` estiver livre → peça volta a `before_x/y/look` (`reverted = true`), senão `reverted = false`; apaga os registros; transação em `backend/Roll6.Domain/Services/TurnService.cs`; endpoint `POST /api/turn/reset` em `backend/Roll6.API/Controllers/TurnController.cs`
- [X] T036 [P] [US3] Testes: reset do dono reverte e apaga; hex ocupado → apaga sem reverter; outro jogador 403 em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`
- [X] T037 [US3] `HexMenu` item **Resetar turno** (`onReset?`, só se `hasEntries`) → `ConfirmModal` no `MainPage` → `useTurn().reset` → toast `toast.turnReset` / `toast.turnResetNotReverted` → `MapTokenContext.refresh()` em `frontend/src/components/map/HexMenu.tsx`, `frontend/src/components/map/MapCanvas.tsx` e `frontend/src/pages/MainPage.tsx`
- [X] T038 [P] [US3] Textos `turn.reset`, `turn.resetTitle`, `turn.resetMessage`, `toast.turnReset`, `toast.turnResetNotReverted` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: quickstart passo 5.

---

## Phase 7: User Story 5 - Resumo e resultados (Priority: P2)

**Goal**: resumo do turno; resultados de ação só via API (mestre).

**Independent Test**: resumo com movimentos, ações e um resultado criado pela API, em ordem.

- [X] T039 [US5] `TurnService.CreateAsync(userId, TurnInsertInfo)` (só mestre; turno informado ou atual; qualquer tipo, inclusive ActionResult) e `DeleteAsync(userId, turnId)` (só mestre) em `backend/Roll6.Domain/Services/TurnService.cs`; endpoints `POST /api/turn` e `DELETE /api/turn/{id}` em `backend/Roll6.API/Controllers/TurnController.cs`
- [X] T040 [P] [US5] Testes: mestre cria ActionResult; jogador 403 em criar/excluir; `ListAsync` em ordem cronológica em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`
- [X] T041 [US5] `TurnSummaryModal` (`{ campaignId; turnNo | null; onClose }`): carrega `listTurn`, lista cronológica com tipo, nome e texto ou "moveu de (x,y) para (x,y)", vazio `turn.summaryEmpty` em `frontend/src/components/modals/TurnSummaryModal.tsx`
- [X] T042 [P] [US5] Textos `turn.summaryTitle`, `turn.summaryEmpty`, `turn.moved`, `turn.result` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: quickstart passo 7.

---

## Phase 8: Polish & Cross-Cutting

- [X] T043 Integridade: excluir ocorrência de NPC (`MapNpcService.DeleteAsync`, `MapTokenService.DeleteAsync` de peça NPC, `CampaignNpcService.RemoveAsync`) apaga os registros dessas ocorrências; `CharacterService.DeleteAsync` apaga os do personagem; `NpcService.DeleteAsync` os do NPC; `CampaignService.DeleteAsync` os da campanha (antes dos mapas) — com testes nos respectivos arquivos em `backend/Roll6.Domain/Services/` e `backend/Roll6.Tests/Domain/Services/`
- [X] T044 [P] Atualizar o `CLAUDE.md` (turnos: entidade, regras, endpoints, `TurnContext`, camadas do mapa)
- [X] T045 Rodar `dotnet build` + `dotnet test`; `npm run lint` + `npm test` + `npm run build`
- [ ] T046 Executar `specs/016-turn-system/quickstart.md` com Mestre e Jogadores

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T015) → US1 → US2 → US4 → US3 → US5 → Polish.
- `TurnService.cs`, `TurnController.cs`, `TurnServiceTests.cs` (T016, T029, T035, T039…), `MapCanvas.tsx`, `HexMenu.tsx`, `MainPage.tsx`, `pt-BR.json`, `app.css` são tocados por várias histórias — em sequência.
- US3 usa o registro de movimento da US2; US5 usa o modal do resumo aberto pela notificação da US4 (pode existir sem o modal até T041).

### Parallel Opportunities

- Foundational: T002, T005, T006, T011 (backend) e T012, T013, T014 (frontend) em paralelo.
- Em cada história: testes, estilos/textos e componentes novos em paralelo com o backend.

## Parallel Example: Foundational

```text
Task: "T005 DTOs em backend/Roll6.DTO/Turn/"
Task: "T006 repositório em backend/Roll6.Infra*/Repository/"
Task: "T014 regras puras em frontend/src/lib/turnStatus.ts"
```

## Implementation Strategy

### MVP (US1)

Setup → Foundational → US1: Agir, status nos cards e balões.

### Incremental

1. US2: movimento registrado e único por turno, rastros.
2. US4: Finalizar turno com pendentes e notificação.
3. US3: Resetar turno.
4. US5: resumo e resultados via API.
5. Polish.
