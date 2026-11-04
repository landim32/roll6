# Tasks: Personagem em um único mapa, sem mapa atual (108)

**Input**: `specs/108-character-single-map/` (plan, spec, research, data-model, contracts, quickstart)
**Tests**: testes de unidade dos modelos e serviços (convenção do projeto), contagens do MCP (obrigatórias pelo
`CLAUDE.md`) e Vitest para as regras puras e as chaves de i18n.

**Skills**: alterações em repositórios, DTOs e migração seguem `dotnet-architecture`; alterações em contextos seguem
`react-architecture` (DTO + ProblemDetails, sem o envelope `sucesso` da skill).

**Regra de ordem**: `CurrentMapId` e `MapStatus.Current` continuam compilando até a Fase 6. A remoção e a migração vêm só
depois de todos os substitutos existirem (T059–T069). Sem PostgreSQL local, a migração é gerada, não aplicada.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história da spec (US1…US5)

## Phase 1: Setup

- [X] T001 Confirmar a branch `108-character-single-map`, as contagens 133/134 em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` e registrar a linha de base com `dotnet test` em `backend/` e `npm test` em `frontend/`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: a regra de uma peça por personagem no modelo e a informação de onde cada personagem está.

- [X] T002 Trocar `ix_map_tokens_map_campaign_character` por `ix_map_tokens_campaign_character` (único em `CampaignCharacterId`, filtro `campaign_character_id IS NOT NULL`) em `backend/Roll6.Infra/Context/Roll6Context.cs`
- [X] T003 [P] Criar `MapToken.TransferTo(mapId, tokenId, name, x, y)` (troca `MapId`, `TokenId`, `Name`, `X`, `Y`; `Look = 0`; limpa `WalkX/WalkY/WalkYaw`; atualiza `UpdatedAt`) em `backend/Roll6.Domain/Models/MapToken.cs`
- [X] T004 Adicionar a `IMapTokenRepository` os métodos `GetByCampaignCharacterAsync`, `ListMapsByParticipationsAsync` (participação, `mapId`, `mapName`; só mapas não excluídos), `ListCharacterPiecesByCampaignAsync`, `ListByMapIdsAsync`, `ListCharacterOwnerIdsAsync` (uma consulta só: peças → participações → personagens), `AnyCharacterOnMapAsync`, `DeleteCharactersByMapAsync` em `backend/Roll6.Infra.Interfaces/Repository/IMapTokenRepository.cs` e implementá-los em `backend/Roll6.Infra/Repository/MapTokenRepository.cs`
- [X] T005 Em `MapTokenRepository.InsertAsync` (`backend/Roll6.Infra/Repository/MapTokenRepository.cs`), traduzir `UniqueViolation` de `ix_map_tokens_campaign_character` para `ConflictException("O personagem já está em um mapa.")`, como `MapRepository` faz
- [X] T006 [P] Adicionar `ListByMapIdsAsync(mapIds)` (sem instâncias removidas) em `backend/Roll6.Infra.Interfaces/Repository/IMapNpcRepository.cs` e `backend/Roll6.Infra/Repository/MapNpcRepository.cs`
- [X] T007 [P] Adicionar `mapId` e `mapName` com `[JsonPropertyName]` em `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterInfo.cs` e `CampaignCharacterDetailInfo.cs`
- [X] T008 Preencher `MapId`/`MapName` em lote em `MapToDtoAsync` e `MapToDetailAsync`; em `ListByCampaignAsync`, zerar esses campos para jogadores, exceto nos próprios personagens; arquivo `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T009 Injetar `IMapTokenRepository` e `IUnitOfWork` em `MapService`; em `DeleteAsync`, apagar as peças de personagens com `DeleteCharactersByMapAsync` na mesma transação de `MarkDeleted` e publicar `party.changed` além de `map.deleted`; arquivo `backend/Roll6.Domain/Services/MapService.cs` (ajustar `backend/Roll6.Tests/Domain/Services/MapServiceTests.cs`)
- [X] T010 [P] Adicionar `mapId: number | null` e `mapName: string | null` em `frontend/src/types/campaignCharacter.ts`
- [X] T011 [P] Testes: `TransferTo` em `backend/Roll6.Tests/Domain/Models/MapTokenTests.cs`; `mapId`/`mapName` (mestre vê todos, jogador só os próprios) em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`; excluir mapa apaga peças de personagens e mantém as de NPC em `MapServiceTests.cs`

**Checkpoint**: `dotnet build` e `dotnet test` passam; a API informa o mapa de cada personagem.

---

## Phase 3: User Story 1 — Levar um personagem de um mapa para outro (P1) 🎯 MVP

**Goal**: o mestre traz um personagem de outro mapa com confirmação, e ele nunca fica em dois lugares.

**Independent test**: personagem em A; o mestre abre B, arrasta o card, confirma; o personagem está só em B, no hex escolhido. Cancelando, nada muda.

### Backend

- [X] T012 [P] [US1] Adicionar `Transfer` (`[JsonPropertyName("transfer")]`, bool) em `backend/Roll6.DTO/MapToken/MapTokenCharacterInsertInfo.cs`
- [X] T013 [US1] Reescrever `PlaceCharacterAsync` em `backend/Roll6.Domain/Services/MapTokenService.cs`: exigir o mestre (`campaign.UserId` devolvido por `EnsureMapEditableAsync`, senão 403 `Apenas o mestre coloca personagens nos mapas.`); recusar mapa arquivado com 409 `Este mapa está arquivado.`; buscar a peça com `GetByCampaignCharacterAsync`: no destino → 409 `O personagem já está neste mapa.`; em outro mapa sem `Transfer` → 409 `O personagem está no mapa {nome}.`; com `Transfer`, validar `EnsureFits` e chamar `TransferTo` + `UpdateAsync` dentro da transação existente
- [X] T014 [US1] Depois da transferência, publicar `mapToken.deleted` no mapa de origem e `mapToken.upserted` no destino, em `backend/Roll6.Domain/Services/MapTokenService.cs`
- [X] T015 [US1] Adicionar o parâmetro `transfer` e atualizar descrição, quem pode usar e erros de `place_character_on_map` em `backend/Roll6.Mcp/Tools/MapTokenTools.cs`
- [X] T016 [P] [US1] Testes em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: reescrever `PlaceCharacter_ByTheCharactersOwner_Places` como recusa 403; sem mapa coloca; mesmo mapa 409; outro mapa sem `transfer` 409 com o nome do mapa; com `transfer` move a mesma linha, zera `look` e mantém o id; hex ocupado deixa a peça na origem; destino arquivado 409; NPC sem efeito

### Frontend

- [X] T017 [P] [US1] Adicionar `transfer?: boolean` em `frontend/src/types/mapToken.ts`
- [X] T018 [US1] Criar a função pura `transferSource(participation, openMapId)` (nome do mapa de origem, ou null) e testes em `frontend/src/lib/mapTokens.ts` e `frontend/src/lib/mapTokens.test.ts`
- [X] T019 [US1] `MapTokenContext.placeCharacter` aceita `transfer`, repassado por `frontend/src/Services/mapTokenService.ts`, em `frontend/src/Contexts/MapTokenContext.tsx`; ao terminar chama `refreshParty`
- [X] T020 [US1] Em `drop` de `frontend/src/hooks/useMapInteraction.ts`, nas ações `place` e `chooseToken`, se `transferSource` não for nulo, chamar a nova prop `onConfirmTransfer({ participation, hex, mapName, chooseToken })` em vez de colocar; declarar o tipo junto de `TokenPickRequest`
- [X] T021 [US1] Em `frontend/src/pages/MainPage.tsx`, guardar a solicitação e renderizar `ConfirmModal` com `map.transferConfirm`; ao confirmar, colocar com `transfer: true` (ou abrir `TokenModal` no caso `chooseToken`, levando `transfer`); capturar o erro para o modal fechar e o toast explicar (US1.6). Passar a prop a `MapCanvas` e `IsoView`
- [X] T022 [US1] Tornar cards de jogadores não arrastáveis: `frontend/src/components/map/PartyPanel.tsx` e `acceptsDrag` em `frontend/src/hooks/useMapInteraction.ts`; remover o ramo do jogador em `drop`. Manter `canPlaceOwn` em `useTokenMovement` e `lib/mapInteraction`
- [X] T023 [P] [US1] Adicionar `map.transferConfirm` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: US1 testável inteira pelo painel do mestre.

---

## Phase 4: User Story 2 — O jogador vê o mapa onde seu personagem está (P1)

**Goal**: cada jogador vê só o mapa do personagem escolhido, ou um aviso.

**Independent test**: dois jogadores com personagens em mapas diferentes; cada um vê o seu e não recebe eventos do outro.

### Audiência (backend)

- [X] T024 [US2] Reescrever `TableEventAudience` para `IsMapEvent(type, mapId)` e `For(tableEvent)` → `Map`/`Everyone`, sem `currentMapId`, em `backend/Roll6.Domain/Realtime/TableEventAudience.cs`, e `backend/Roll6.Tests/Domain/Realtime/TableEventAudienceTests.cs`
- [X] T025 [US2] Em `backend/Roll6.Application/Realtime/SignalRRealtimeNotifier.cs`, para eventos de mapa enviar às conexões do mestre + `ListCharacterOwnerIdsAsync(mapId)`
- [X] T026 [US2] Restringir `walk` ao mesmo público: guardar a audiência junto da permissão no cache de 10 s de `backend/Roll6.Application/Realtime/TableConnections.cs` e enviar por `Clients.Clients` em `TableHub.Walk` (`backend/Roll6.Application/Realtime/TableHub.cs`), com a consulta exposta em `IMapTokenService`; testes em `backend/Roll6.Tests/Application/TableConnectionsTests.cs`

### Seleção de mesa (backend)

- [X] T027 [P] [US2] Adicionar `characterCount` e `characterIds` em `TableMapInfo` (`backend/Roll6.DTO/Campaign/CampaignTableInfo.cs`)
- [X] T028 [US2] Em `CampaignService.ListTableAsync` (`backend/Roll6.Domain/Services/CampaignService.cs`), preencher esses campos; para jogadores, devolver em `Maps` apenas mapas com personagens deles; testes em `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`

### Site

- [X] T029 [US2] Expor `participationsLoadedFor` em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T030 [US2] Trocar `currentMapId` por `ownMapId` em `viewerMapDecision` e `visibleCampaignMaps`; criar `ownMapOf(selection, participations)` e `masterDefaultMap(maps)` (maior `characterCount`, depois maior `mapId`, null sem personagens); arquivos `frontend/src/lib/viewerMap.ts` e `frontend/src/lib/viewerMap.test.ts`
- [X] T031 [US2] Em `frontend/src/Contexts/MapEditorContext.tsx`, `viewerDecisionFor` (restauração de `roll6:map` e `openCampaignMapBySlug`) busca `listMine(campaignId)` e resolve com `readStoredSelections` + `resolveSelection`; devolver `outcome: 'noMap'` no lugar de `'noCurrentMap'`
- [X] T032 [US2] Reescrever o efeito de seguir em `frontend/src/Contexts/MapEditorContext.tsx` para o mapa do personagem escolhido: esperar `participationsLoadedFor === campaignId`, usar `ownMapOf`, fechar com `newMap()` quando nulo, e trocar o `catch` vazio por toast `realtime.followFailed`
- [X] T033 [US2] Ajustar toasts e redirecionamento em `frontend/src/hooks/useTableRoute.ts` (`route.notOwnMap`, `map.noCharacterMap`)
- [X] T034 [US2] Trocar `noCurrentMap` por `noCharacterMap` (mesmo aviso, baseado em `ownMapOf`) em `frontend/src/pages/MainPage.tsx`
- [X] T035 [US2] Em `frontend/src/lib/tableSelect.ts`, jogador: mapas de `maps` filtrados por `characterIds` contendo o personagem escolhido (`readStoredSelections`), ou `menu.noMap`; mestre: sem `isCurrent`; testes em `frontend/src/lib/tableSelect.test.ts`
- [X] T036 [US2] Atualizar `frontend/src/components/menu/TableSelect.tsx` (sem badge "Atual"; mostrar `menu.noMap`) e `frontend/src/pages/library/MapsPage.tsx` (`loadCampaignMaps` do jogador pelo mapa do personagem)
- [X] T037 [P] [US2] Adicionar `map.noCharacterMap`, `route.notOwnMap`, `menu.noMap`, `realtime.followFailed` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: grupo dividido funciona ao abrir a campanha; a troca ao vivo vem na US3.

---

## Phase 5: User Story 3 — A tela do jogador acompanha a mudança, com aviso (P1)

**Goal**: a tela muda sozinha e mostra "O mestre está mudando o mapa".

**Independent test**: jogador na tela do mapa A, mestre o leva ao mapa B; a mensagem aparece e a tela termina em B, sem recarregar.

- [X] T038 [P] [US3] Adicionar `CHARACTER_MAP = "character.map"` em `backend/Roll6.DTO/Realtime/TableEventType.cs` e criar `backend/Roll6.DTO/Realtime/CharacterMapEventInfo.cs` (`campaignCharacterId`, `mapId`)
- [X] T039 [US3] Publicar `character.map` por `PublishSplitAsync(full, [mestre, dono], null)` depois da gravação, em colocação, transferência e exclusão de peça de personagem, em `backend/Roll6.Domain/Services/MapTokenService.cs`
- [X] T040 [P] [US3] Testes em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: público mestre + dono; `mapId` nulo ao excluir; nenhuma publicação em recusa; NPC não publica
- [X] T041 [P] [US3] Adicionar `characterMap` em `frontend/src/types/realtime.ts`
- [X] T042 [US3] Em `frontend/src/Contexts/CharacterContext.tsx`, recarregar `refresh` e `refreshParty` em `character.map`
- [X] T043 [US3] Em `frontend/src/Contexts/CampaignContext.tsx` ou `frontend/src/Contexts/RealtimeContext.tsx`, recarregar a seleção de mesa em `character.map` e `party.changed`
- [X] T044 [US3] Em `frontend/src/Contexts/MapEditorContext.tsx`, assinar `character.map`: se for o personagem escolhido, com `mapId`, usuário não mestre e sem alterações não salvas, ligar `mapChanging`. Desligar quando `openCampaignMap` terminar, com mínimo `MAP_CHANGE_MIN_MS` = 1500 e limite de 15 s, usando um contador de sequência para A→B→C. Expor `mapChanging`
- [X] T045 [US3] Com alterações não salvas, mostrar `realtime.mapChangedUnsaved` e não trocar, substituindo `realtime.followedMap`, em `frontend/src/Contexts/MapEditorContext.tsx`
- [X] T046 [US3] Renderizar `.stm-map-changing` com `map.changing`, `role="status"`, dentro de `.stm-map-region` em `frontend/src/pages/MainPage.tsx`, e estilizar em `frontend/src/styles/app.css` usando variáveis de `theme.css`
- [X] T047 [P] [US3] Adicionar `map.changing`, `realtime.mapChangedUnsaved` e remover `realtime.followedMap` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: US1, US2 e US3 completas: o pedido central funciona de ponta a ponta.

---

## Phase 6: User Story 4 — O mapa atual deixa de existir (P2)

**Goal**: nada mais depende do mapa atual, e o grupo dividido joga um turno inteiro.

**Independent test**: turno com grupo em dois mapas, jogado e finalizado; nenhuma tela ou ferramenta menciona mapa atual.

### Turno por mapa

- [X] T048 [P] [US4] Adicionar `TurnMapInfo` (`mapId`, `name`), `maps` em `TurnDataInfo` e `mapId` em `TurnDataCharacterInfo`/`TurnDataNpcInfo`, em `backend/Roll6.DTO/Turn/TurnDataInfo.cs`
- [X] T049 [US4] Reescrever `BuildDataAsync` em `backend/Roll6.Domain/Services/TurnService.Processing.cs` com `ListCharacterPiecesByCampaignAsync` + `ListByMapIdsAsync`: personagens de todos os mapas, NPCs dos mapas com personagens, `mapId` da raiz só com um mapa
- [X] T050 [US4] Reescrever `ProcessAsync` em `backend/Roll6.Domain/Services/TurnService.Processing.cs` com `ProcessMapState` por `mapId` (mapa, modelo, peças, instâncias, ocupação, hexes reclamados): validação final por mapa, `PostureOf` sobre todas as instâncias carregadas, `Movement` com o mapa da peça, narração e divisor com `map_id` nulo, erros `O personagem não está em um mapa.` e `O NPC não está em um mapa com personagens.`
- [X] T051 [US4] Adicionar o mapa em `SummaryPosition` e gerar `### {mapa}` quando houver mais de um em `backend/Roll6.Domain/Turns/TurnSummary.cs`; em `GetSummaryAsync` (`backend/Roll6.Domain/Services/TurnService.cs`), montar as posições de todos os mapas comparando com o `MapId` da peça
- [X] T052 [US4] Carimbar `map_id` do ator em `backend/Roll6.Domain/Services/TurnService.cs` (ação sem peça), `TurnService.Repeat.cs` (lote), `TurnService.ChatActions.cs`, `CampaignCharacterService.cs` e `CharacterService.cs`
- [X] T053 [US4] Gravar `map_id` nulo em conversa, avisos e divisores, em `backend/Roll6.Domain/Services/TurnService.Asks.cs`, `TurnService.Chat.cs`, `TurnService.Polls.cs`, `TurnService.Notices.cs`, `TurnService.Gm.cs`, `TurnService.Admin.cs` e na linha 320 de `TurnService.cs`
- [X] T054 [P] [US4] Testes para dois mapas em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`, `TurnServiceOffMapActionTests.cs`, `TurnServiceRepeatTests.cs`, `TurnServiceChatTests.cs`; e em `backend/Roll6.Tests/Domain/Turns/` para o resumo: dados com `maps`, troca de peças por mapa, hex igual em mapas diferentes não colide, reset depois de transferir não traz a peça

### Regras restantes

- [X] T055 [US4] Tirar a dependência do mapa atual de `CanWalkAsync` e `WalkAsync` em `backend/Roll6.Domain/Services/MapTokenService.Walk.cs`, com testes em `MapTokenServiceTests.cs`
- [X] T056 [US4] Recusar arquivar mapa com personagens em `MapService.UpdateAsync` (`backend/Roll6.Domain/Services/MapService.cs`), 409 `Há personagens neste mapa. Leve-os para outro mapa antes de arquivar.`, com teste em `MapServiceTests.cs`
- [X] T057 [US4] Criar a rota anônima `GET /api/meta/image/campaign/{slug}.jpg` em `backend/Roll6.API/Controllers/MetaController.cs` com `CampaignImageAsync` em `IPageMetaService`/`PageMetaService`; `ForCampaignAsync` usa a imagem da campanha e cai na marca; adicionar `"GET /api/meta/image/campaign/{slug}.jpg"` à lista `EXCLUDED` de `backend/Roll6.Tests/Mcp/McpToolCatalog.cs`; testes em `backend/Roll6.Tests/Domain/Services/PageMetaServiceTests.cs`
- [X] T058 [US4] Mostrar `mapName` ou `party.noMap` no `PartyCard` só para o mestre em `frontend/src/components/map/PartyCard.tsx`; aplicar `masterDefaultMap` uma vez por campanha, em `/campaign/:slug` sem mapa aberto, em `frontend/src/Contexts/MapEditorContext.tsx`; adicionar `party.noMap` em `pt-BR.json`

### Remoção do mapa atual

- [X] T059 [US4] Remover do domínio: `MapStatus.Current`; `Map.IsCurrent`, `IsPlayable`, `MakeCurrent`, `LeaveCurrent`, `USE_MAKE_CURRENT`, `ARCHIVE_CURRENT` e os ramos de `Map.Update`; `Campaign.CurrentMapId`, `SetCurrentMap`; arquivos `backend/Roll6.Domain/Enums/MapStatus.cs`, `backend/Roll6.Domain/Models/Map.cs`, `backend/Roll6.Domain/Models/Campaign.cs`
- [X] T060 [US4] Remover `SetCurrentMapAsync` e os usos em `backend/Roll6.Domain/Services/CampaignService.cs` e `backend/Roll6.Domain/Interfaces/ICampaignService.cs`; o ponteiro em `AfterDeletedAsync` de `MapService.cs`; o endpoint em `backend/Roll6.API/Controllers/CampaignController.cs`; `MAP_CURRENT` em `TableEventType.cs`
- [X] T061 [US4] Remover `currentMapId` de `CampaignInfo`, `currentMap*` de `CampaignTableInfo`, apagar `backend/Roll6.DTO/Campaign/CampaignCurrentMapInfo.cs`; ajustar `backend/Roll6.Infra.Interfaces/Repository/CampaignTableRow.cs`, `ICampaignRepository.cs`, `backend/Roll6.Infra/Repository/CampaignRepository.cs`; `ListPlayableByCampaignsAsync` só Active em `MapRepository.cs`
- [X] T062 [US4] Remover a propriedade, a FK `fk_map_campaign_current` e `ix_maps_campaign_current` de `backend/Roll6.Infra/Context/Roll6Context.cs`
- [X] T063 [US4] Gerar a migração (`dotnet ef migrations add RemoveCurrentMap --project Roll6.Infra --startup-project Roll6.API`) e inserir no começo de `Up`, antes de qualquer alteração de esquema, o SQL de `research.md` R9: apagar peças em mapas arquivados/excluídos; manter uma por participação; `UPDATE maps SET status = 1 WHERE status = 4`
- [X] T064 [US4] Escrever `database/migrations/108-character-single-map.sql` e regenerar `database/roll6.sql` (`dotnet ef migrations script --idempotent … -o ../database/roll6.sql`, mantendo o cabeçalho)
- [X] T065 [US4] MCP: remover `set_current_map` de `backend/Roll6.Mcp/Tools/CampaignTools.cs` e ajustar `Related tools`; atualizar `backend/Roll6.Mcp/Tools/MapTools.cs`, `MapTokenTools.cs`, `TurnTools.cs`, `ChatTools.cs`, `McpDocs.cs`; reescrever as seções de mapa em `backend/Roll6.Mcp/Roll6Guide.cs`, inclusive "Start a table"
- [X] T066 [US4] Ajustar `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` para 132/133 e remover ou adaptar os testes de mapa atual: `CampaignServiceTests.cs`, `MapStatusTests.cs`, `MapPaintServiceTests.cs`, `MapServiceTests.cs`, `CharacterServiceTests.cs`
- [X] T067 [US4] Remover no site: `frontend/src/lib/currentMap.ts` + teste, `frontend/src/components/campaign/MakeCurrentMapButton.tsx`, `PinMapIcon`, `MAP_STATUS_CURRENT`, `mapCurrent`, `campaignService.setCurrentMap`, `makeCurrentMap` e a recarga por `currentMapId` em `CampaignContext.tsx`, o tratamento em `RealtimeContext.tsx`, `currentMapId` em `types/campaign.ts`
- [X] T068 [US4] Limpar telas: `frontend/src/components/campaign/CampaignMapsTab.tsx` (botão, selo, "Arquivar" sempre visível, erro em toast) e `frontend/src/pages/library/MapsPage.tsx`
- [X] T069 [US4] Em `frontend/src/i18n/locales/pt-BR.json`, remover `menu.currentMap` (as duas ocorrências), `campaignSettings.currentMap`, `currentMap.*`, `route.notCurrentMap`, `map.noCurrentMap`; trocar "O mapa atual" por "O mapa aberto" em `unsaved.message`

**Checkpoint**: `dotnet test`, `npm test`, `npm run lint` e `npm run build` passam sem nenhuma referência ao mapa atual.

---

## Phase 7: User Story 5 — NPCs continuam como estão (P2)

**Goal**: garantir que nada mudou para NPCs, aliados incluídos.

**Independent test**: o mesmo NPC em dois mapas e duas vezes em um deles, sem aviso.

- [X] T070 [P] [US5] Testes em `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs`: mesmo NPC em dois mapas; várias instâncias; o índice novo não toca peças de NPC
- [X] T071 [P] [US5] Teste em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: transferir o personagem-mestre não move o aliado comandado
- [X] T072 [P] [US5] Testes em `frontend/src/lib/mapTokens.test.ts`: `npcDropAction` segue sem exigir confirmação

---

## Phase 8: Polish & Cross-Cutting

- [X] T073 Atualizar `CLAUDE.md`: Real-time map, Campaign status, Turns (AI processing, off-map actions, repeated action), Walk, Character pieces, Realtime, MCP, Routing, Map pieces, Current map, Campaign settings, `TopMenu`, localStorage e "Recent Changes"
- [X] T074 [P] Rodar `grep -ri "mapa atual\|currentMap\|current_map" backend frontend/src` e confirmar que só restam as exceções do `quickstart.md`
- [X] T075 Rodar `dotnet test` em `backend/` e `npm run lint`, `npm test`, `npm run build` em `frontend/`
- [ ] T076 Executar o roteiro de `specs/108-character-single-map/quickstart.md` contra um banco acessível, incluindo a consulta da migração; se não houver banco, registrar no resumo final o que ficou sem verificar

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 → Phase 2**: nada começa antes da fundação.
- **Phase 3 (US1)**: depende da Fase 2.
- **Phase 4 (US2)**: depende da Fase 2; pode correr junto da US1.
- **Phase 5 (US3)**: depende de US1 (transferência) e US2 (efeito de seguir).
- **Phase 6 (US4)**: depende de US1–US3, porque remove o que elas substituem.
- **Phase 7 (US5)**: pode rodar a qualquer momento depois da Fase 2.
- **Phase 8**: por último.

### Dentro da Fase 6

T048–T054 (turno) e T055–T058 (regras) vêm antes de T059–T069 (remoção). Na remoção, a ordem é fixa: domínio → serviços → DTOs/Infra → contexto → migração → SQL → MCP → testes → site.

### Parallel Opportunities

- Fase 2: T003, T006, T007, T010.
- US1: backend (T012–T016) e frontend (T017–T023) são independentes depois do contrato.
- US2: audiência (T024–T026), mesa (T027–T028) e site (T029–T037).
- US3: T038, T041 e T047 primeiro.
- US4: T054 depois de T049–T053; T055, T056, T057 entre si.

Atenção: `MapEditorContext.tsx` e `pt-BR.json` aparecem em várias tarefas. Tarefas nesses arquivos não são paralelas entre si, mesmo com [P] em histórias diferentes.

## Parallel Example: User Story 1

```text
T012 Transfer em MapTokenCharacterInsertInfo.cs
T017 transfer? em types/mapToken.ts
T023 map.transferConfirm em pt-BR.json
```

## Implementation Strategy

### MVP

Fases 1–5, que já entregam o pedido central. Nesse ponto ainda existe `current_map_id`, mas sem efeito para os jogadores. **Não publique só o MVP**: "Tornar atual" ficaria visível sem fazer nada, e `process_turn` continuaria preso a um mapa. A entrega é a Fase 8 completa.

### Incremental Delivery

1. Fases 1–2: base sem mudança visível.
2. Fase 3: mestre transfere personagens.
3. Fases 4–5: jogadores acompanham.
4. Fases 6–7: mapa atual removido.
5. Fase 8: documentação e verificação.

### Commit

Conforme o `CLAUDE.md`: mensagem em arquivo com `git commit -F`, prefixo `feat:`, resumo em português com `(108)`.
