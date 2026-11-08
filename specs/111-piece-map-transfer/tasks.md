# Tasks: Mudar peça de mapa

**Input**: Design documents from `/specs/111-piece-map-transfer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/change-piece-map.md, quickstart.md

**Tests**: incluídos — o projeto cobre serviços de domínio, a grade e o MCP com testes (CLAUDE.md, quickstart.md), e
`McpCoverageTests` falha sem a ferramenta nova.

**Organization**: por história da spec — US1 personagem (P1), US2 NPC (P1), US3 posição ocupada/fora da grade (P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3

---

## Phase 1: Setup

Nada a preparar: sem projeto, dependência ou migração nova (plan.md). Seguir direto para a Phase 2.

---

## Phase 2: Foundational (bloqueia as histórias)

**Purpose**: contrato da rota, esqueleto do serviço e cliente do frontend usados pelas três histórias.

- [X] T001 [P] Criar `MapTokenMapInfo` (`[JsonPropertyName("mapId")] long MapId`) em `backend/Roll6.DTO/MapToken/MapTokenMapInfo.cs`
- [X] T002 [P] Criar `MapTokenMapResultInfo` (`mapToken: MapTokenInfo`, `fromMapId: long`, `adjusted: bool`, todos com `[JsonPropertyName]`) em `backend/Roll6.DTO/MapToken/MapTokenMapResultInfo.cs`
- [X] T003 Declarar `Task<MapTokenMapResultInfo> ChangeMapAsync(long userId, long mapTokenId, MapTokenMapInfo info)` em `backend/Roll6.Domain/Interfaces/IMapTokenService.cs` (depende de T001, T002)
- [X] T004 Criar o partial `backend/Roll6.Domain/Services/MapTokenService.ChangeMap.cs` com `ChangeMapAsync` fazendo as validações comuns do data-model (ordem 1–4): peça (404 "Token do mapa não encontrado."), origem `EnsureNotDeleted`, campanha da origem com mestre = `userId` (403 "Apenas o mestre muda peças de mapa."), `campaign.EnsureMapEditable(true)`, peça sem `CampaignCharacterId` e sem `MapNpcId` → `DomainValidationException("mapTokenId", "Só personagens e NPCs mudam de mapa.")`, destino inexistente/apagado/de outra campanha → 404 "Mapa não encontrado.", destino = origem → `ConflictException("A peça já está neste mapa.")`, destino `MapStatus.Archived` → `ConflictException("Este mapa está arquivado.")`; deixar os ramos personagem/NPC lançando `NotImplementedException` por ora (depende de T003)
- [X] T005 Adicionar `[HttpPut("{id:long}/map")] ChangeMap(long id, [FromBody] MapTokenMapInfo info)` (`try { return Ok(await _mapTokenService.ChangeMapAsync(CurrentUserId, id, info)); } catch (Exception ex) { return HandleException(ex); }`) em `backend/Roll6.API/Controllers/MapTokenController.cs` (depende de T003)
- [X] T006 [P] Adicionar `interface MapTokenMapResultInfo { mapToken: MapTokenInfo; fromMapId: number; adjusted: boolean }` em `frontend/src/types/mapToken.ts`
- [X] T007 Adicionar `changeMap(mapTokenId: number, mapId: number): Promise<MapTokenMapResultInfo>` (Fetch `PUT /api/maptoken/{id}/map`, corpo `{ mapId }`, `handleResponse`) em `frontend/src/Services/mapTokenService.ts` (depende de T006)
- [X] T008 [P] Criar `MapTokenServiceChangeMapTests` com o setup de mocks copiado de `MapTokenServiceTests` (campanha com mestre 1, mapas A e B ativos da mesma campanha, mapa C de outra campanha) e os casos comuns: não-mestre → 403, campanha pausada → 409, objeto → 400 `mapTokenId`, destino de outra campanha → 404, destino = origem → 409, destino arquivado → 409, em `backend/Roll6.Tests/Domain/Services/MapTokenServiceChangeMapTests.cs`

**Checkpoint**: `dotnet build backend/Roll6.sln` compila; os testes comuns de T008 passam.

---

## Phase 3: User Story 1 — Mestre leva um personagem para outro mapa (P1) 🎯 MVP

**Goal**: "Mudar de mapa" no menu da peça de personagem leva a mesma peça ao mesmo hex e direção do mapa escolhido; a tela do jogador acompanha.

**Independent Test**: personagem em (5, 3) olhando 2 no mapa A → "Mudar de mapa" → B; está só em B, (5, 3), olhando 2, sem movimento no turno; o jogador vê B.

### Tests for User Story 1

- [X] T009 [P] [US1] Teste `MoveToMap_KeepsLookAndForgetsTheWalk` (mapa e hex mudam, `Look` mantido, `WalkX/WalkY/WalkYaw` nulos, nome trocado só quando informado) em `backend/Roll6.Tests/Domain/Models/MapTokenTests.cs`
- [X] T010 [P] [US1] Casos de personagem em `backend/Roll6.Tests/Domain/Services/MapTokenServiceChangeMapTests.cs`: mesmo hex e look em B com `adjusted = false`, `fromMapId = A`; `UpdateAsync` da mesma linha (nenhum `InsertAsync`); nenhum `ITurnRepository.InsertAsync`; participação não aprovada → 409; hex ocupado em B → 409 "Não há um hex livre para a peça neste mapa." (comportamento provisório até a US3); eventos `MAP_TOKEN_DELETED` (A), `MAP_TOKEN_UPSERTED` (B) e `CHARACTER_MAP` ao mestre e ao dono

### Implementation for User Story 1

- [X] T011 [US1] Adicionar `public void MoveToMap(long mapId, int x, int y, string? name = null)` (muda `MapId`, nome via `Guard.RequiredText(name, "name", 260)` quando não nulo, chama `MoveTo(x, y)` que limpa a caminhada, mantém `Look`) em `backend/Roll6.Domain/Models/MapToken.cs`
- [X] T012 [US1] Implementar o ramo personagem em `backend/Roll6.Domain/Services/MapTokenService.ChangeMap.cs`: participação aprovada da mesma campanha (409 "Só personagens aprovados nesta campanha podem ser colocados no mapa."), espaço `MapOccupancyLoader.PieceSpace(token, participation.Posture)`, `layout = await _occupancy.LoadAsync(target)`, se `Fits(HexGrid.Footprint(x, y, look, space))` não for ok → 409 "Não há um hex livre para a peça neste mapa."; `piece.MoveToMap(target.MapId, piece.X, piece.Y)`; `_repository.UpdateAsync` dentro de `_unitOfWork.ExecuteInTransactionAsync`; depois publicar `MAP_TOKEN_DELETED` na origem (`{ mapTokenId }`), `PublishPieceAsync(target, …)` e `PublishCharacterMapAsync(campaign, userId, character.UserId, participationId, target.MapId)`; retornar `MapTokenMapResultInfo` (depende de T004, T011)
- [X] T013 [US1] Adicionar a ferramenta `change_piece_map` (`[McpServerTool(Name = "change_piece_map", Title = "Move piece to another map", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]`, `[ApiOperation("PUT", "/api/maptoken/{id}/map")]`, parâmetros `mapTokenId` (`McpDocs.MAP_TOKEN_ID`) e `mapId`, descrição *What it does / Who can use it / Returns / Common errors / Related tools* conforme o contrato) em `backend/Roll6.Mcp/Tools/MapTokenTools.cs`
- [X] T014 [US1] Atualizar as contagens/listas pinadas de `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (e `McpRouteParityTests` se houver lista explícita) para a nova rota/ferramenta; descrever a mudança de mapa na seção de peças/mapas de `backend/Roll6.Mcp/Roll6Guide.cs`
- [X] T015 [P] [US1] Criar o puro `canChangeMap(piece, ctx)` (mestre que pode editar o mapa — `ctx.canPlace` — e peça de personagem, `campaignCharacterId !== null`; NPC entra na US2) com testes em `frontend/src/lib/mapInteraction.ts` e `frontend/src/lib/mapInteraction.test.ts`
- [X] T016 [P] [US1] (já existia em `icons.tsx`; só importado) Adicionar o ícone `MapIcon` (path do SVG oficial `map` do Bootstrap Icons, `currentColor`, prop `size`) em `frontend/src/components/ui/icons.tsx`
- [X] T017 [P] [US1] Adicionar as chaves `hexMenu.changeMap`, `changeMap.title`, `changeMap.hint`, `changeMap.noOtherMap`, `changeMap.characters`, `toast.pieceMapChanged`, `toast.pieceMapAdjusted`, `toast.openMap` (textos do contrato) em `frontend/src/i18n/locales/pt-BR.json`
- [X] T018 [US1] Adicionar `changeMap(piece: MapTokenInfo, mapId: number): Promise<MapTokenMapResultInfo | null>` em `frontend/src/Contexts/MapTokenContext.tsx`: chama `mapTokenService.changeMap`, tira a peça da lista local quando `fromMapId === draft.mapId`, devolve o resultado; erro → toast com a mensagem do `ProblemDetails` e `null` (depende de T007)
- [X] T019 [US1] Adicionar a prop opcional `onChangeMap?: () => void` e o item "Mudar de mapa" (`MapIcon`, `hexMenu.changeMap`) junto de "Editar NPC" em `frontend/src/components/map/HexMenu.tsx` (depende de T016, T017)
- [X] T020 [US1] Adicionar `onChangeMap: (piece: MapTokenInfo) => void` em `MapInteractionProps` de `frontend/src/hooks/useMapInteraction.ts` e passá-lo em `frontend/src/components/map/MapHexMenu.tsx` só quando `canChangeMap(menuToken, ctx)` (depende de T015, T019)
- [X] T021 [US1] Criar `frontend/src/components/modals/ChangeMapModal.tsx` com a skill `react-modal` (props `piece`, `onClose`, `onChoose(mapId)`): título `changeMap.title`, dica `changeMap.hint`, lista de botões com os mapas de `CampaignContext.tableCampaigns` da campanha atual (`CampaignTableInfo.maps`) menos `draft.mapId`, com `changeMap.characters`; vazio → `changeMap.noOtherMap`; botões desabilitados enquanto envia (depende de T017)
- [X] T022 [US1] Em `frontend/src/pages/MainPage.tsx`: estado `changingMap: MapTokenInfo | null` passado como `onChangeMap` ao `MapCanvas` e ao `IsoView`, render do `ChangeMapModal`, e no `onChoose` chamar `MapTokenContext.changeMap`; sucesso → `toast.success` `toast.pieceMapChanged` (ou `toast.pieceMapAdjusted` se `adjusted`) com ação `toast.openMap` que abre o mapa destino pelo mesmo caminho de "Mapas da campanha" (guard de não salvos) (depende de T018, T020, T021)

**Checkpoint**: US1 completa — roteiro manual 1, 5, 6 e 7 do quickstart com um personagem.

---

## Phase 4: User Story 2 — Mestre leva um NPC para outro mapa (P1)

**Goal**: a mesma instância de NPC e sua peça vão para o destino, com estado, histórico e ação repetida intactos; nome renumerado só se repetido.

**Independent Test**: Goblin com vida 3/8 em (2, 4) do mapa A → B; em B está em (2, 4), vida 3/8, mesmo status/postura; não está em A; entradas de turno com o mesmo `map_npc_id`.

### Tests for User Story 2

- [X] T023 [P] [US2] Teste `MoveToMap_ChangesMapAndName` (e instância removida recusada) em `backend/Roll6.Tests/Domain/Models/MapNpcTests.cs`
- [X] T024 [P] [US2] Casos de NPC em `backend/Roll6.Tests/Domain/Services/MapTokenServiceChangeMapTests.cs`: instância e peça atualizadas na mesma transação com o mesmo `MapNpcId`; vida/fadiga/status/postura/`CurrentMove`/`RepeatedAction` inalterados; "Guarda 2" mantém o nome em B sem conflito e vira "Guarda 3" quando B já tem "Guarda 2"; peça recebe o nome final; instância removida → 404; nenhuma entrada de turno; `MAP_TOKENS_CHANGED` com `mapId` A e com `mapId` B

### Implementation for User Story 2

- [X] T025 [US2] Adicionar `public void MoveToMap(long mapId, string name)` (instância removida → `KeyNotFoundException("NPC do mapa não encontrado.")`, `MapId = mapId`, `Name = Guard.RequiredText(name, "name", 260)`) em `backend/Roll6.Domain/Models/MapNpc.cs`
- [X] T026 [US2] Implementar o ramo NPC em `backend/Roll6.Domain/Services/MapTokenService.ChangeMap.cs`: carregar `MapNpc` (404) e `Npc`; espaço `await _occupancy.SpaceOfTokenAsync(piece.TokenId, mapNpc.Posture)` (ou `PieceSpace`); mesmo teste de posição de T012; nomes em uso = `_mapNpcRepository.ListByMapAsync(target.MapId)` com o mesmo `NpcId`; nome final = o atual se livre, senão `MapNpc.NextName(npc.Name, nomes)`; `mapNpc.MoveToMap(target.MapId, nome)` + `piece.MoveToMap(target.MapId, x, y, nome)`; os dois `UpdateAsync` numa transação; publicar `MAP_TOKENS_CHANGED` para a origem e para o destino (depende de T012, T025)
- [X] T027 [US2] Estender `canChangeMap` para peças com `mapNpcId !== null` (e os testes) em `frontend/src/lib/mapInteraction.ts` / `frontend/src/lib/mapInteraction.test.ts`
- [X] T028 [US2] Garantir em `frontend/src/Contexts/MapTokenContext.tsx` (e conferir `frontend/src/Contexts/NpcContext.tsx`) que a peça/instância do NPC sai da tela do mestre após a mudança (remoção local + recarga por `mapTokens.changed`) e que o `NpcPanel` deixa de listar a instância no mapa aberto

**Checkpoint**: US1 e US2 funcionam — roteiro manual 2 e 4.

---

## Phase 5: User Story 3 — Posição ocupada ou fora do mapa (P2)

**Goal**: sem lugar no hex original, a peça vai para o livre mais próximo dele (`adjusted: true`); sem nenhum, 409 sem alterar nada.

**Independent Test**: (5, 3) ocupado em B → peça no livre mais próximo de (5, 3), toast de ajuste; B cheio → mensagem de erro e peça continua em A.

### Tests for User Story 3

- [X] T029 [P] [US3] Testes de `NearestFree` em `backend/Roll6.Tests/Domain/Grid/OccupancyTests.cs`: livre no próprio ponto devolve o ponto; ocupado devolve um vizinho a distância 1 (desempate linha de cima, depois coluna à esquerda); ponto fora da grade (10, 8) numa grade 4 × 4 devolve o hex mais próximo dentro; forma grande cabe inteira; grade cheia → null; os testes de `FirstFree` existentes continuam passando
- [X] T030 [P] [US3] Casos em `backend/Roll6.Tests/Domain/Services/MapTokenServiceChangeMapTests.cs`: personagem e NPC com hex ocupado em B → posição ajustada e `adjusted = true`; destino menor → hex dentro; B cheio → 409 sem `UpdateAsync` (substitui o caso provisório de T010)

### Implementation for User Story 3

- [X] T031 [US3] Adicionar `public (int X, int Y)? NearestFree(int x, int y, int look, int space, int columns, int rows)` (distância cúbica a partir de `HexGrid.OffsetToAxial(x, y)`, mesma ordenação e teste `Fits(HexGrid.Footprint(...))` de hoje) e fazer `FirstFree` delegar com `(columns / 2, rows / 2)` em `backend/Roll6.Domain/Grid/Occupancy.cs`
- [X] T032 [US3] Expor `NearestFree(int x, int y, int look, int space)` no `MapLayout` (como `FirstFree`, 409 "Não há um hex livre para a peça neste mapa." quando nulo) em `backend/Roll6.Domain/Services/MapOccupancyLoader.cs` (depende de T031)
- [X] T033 [US3] Trocar o teste de posição dos dois ramos de `backend/Roll6.Domain/Services/MapTokenService.ChangeMap.cs` por um helper `PlaceIn(layout, x, y, look, space)` → `(X, Y, Adjusted)` que usa o hex original quando cabe, senão `layout.NearestFree`; preencher `adjusted` no resultado (depende de T026, T032)
- [X] T034 [US3] Conferir que `frontend/src/pages/MainPage.tsx` mostra `toast.pieceMapAdjusted` quando `adjusted` e que o 409 aparece como toast de erro com a janela continuando aberta

**Checkpoint**: todas as histórias — roteiro manual 3 do quickstart.

---

## Phase 6: Polish & Cross-Cutting

- [X] T035 [P] Atualizar `CLAUDE.md`: no bloco "Character pieces" (backend) a rota `PUT /api/maptoken/{id}/map` e suas regras (só mestre, mesmo hex e look, livre mais próximo, sem turno, mesma instância de NPC com renumeração, eventos); no frontend o item "Mudar de mapa" + `ChangeMapModal`; em "Recent Changes" uma linha `111-piece-map-transfer`
- [X] T036 Rodar `dotnet build backend/Roll6.sln` e `dotnet test` em `backend/` (todas as classes, incluindo `Mcp`) e corrigir falhas
- [X] T037 Rodar `npm run lint`, `npm test` e `npm run build` em `frontend/` (inclui `src/i18n/keys.test.ts`) e corrigir falhas
- [ ] T038 (pendente: precisa de API com banco) Executar o roteiro manual de `specs/111-piece-map-transfer/quickstart.md` contra uma API com banco acessível (2D e isométrica)

---

## Dependencies & Execution Order

- **Phase 2** (T001–T008) bloqueia todas as histórias.
- **US1** (T009–T022) depende só da Phase 2 — é o MVP.
- **US2** (T023–T028): o ramo NPC (T026) reaproveita o teste de posição e a montagem do resultado de T012, por isso vem depois de US1 no backend; o frontend (T027) depende de T015.
- **US3** (T029–T034): `NearestFree` (T031–T032) é independente e pode ser feito em paralelo com US1/US2; T033 precisa de T012 e T026.
- **Polish** depois das histórias desejadas.

### Within each story

Testes primeiro (devem falhar) → modelos → serviço → controller/MCP → frontend.

## Parallel Examples

```text
Phase 2:  T001, T002, T006, T008 juntos; depois T003 → T004/T005; T007 após T006
US1:      T009, T010, T015, T016, T017 juntos; T011 → T012 → T013 → T014; T018/T019/T021 → T020 → T022
US2:      T023, T024 juntos; T025 → T026; T027 em paralelo com o backend
US3:      T029, T030, T031 juntos; T032 → T033; T034 no fim
```

## Implementation Strategy

1. **MVP**: Phase 2 + US1 — o mestre já leva personagens de mapa pelo menu (recusa quando o hex não serve).
2. **US2**: o mesmo para NPCs.
3. **US3**: posição ajustada em vez de recusa.
4. Polish, testes completos e roteiro manual; commit `feat: mudar personagem/NPC de mapa pelo menu da peça (111)`.
