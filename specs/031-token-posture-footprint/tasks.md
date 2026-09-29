# Tasks: Postura das peças e tokens de vários hexes

**Input**: Design documents from `/specs/031-token-posture-footprint/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/mcp.md, contracts/ui.md, quickstart.md

**Tests**: incluídos — o projeto mantém testes de domínio (`Roll6.Tests`) e Vitest para cada regra pura; SC-003 exige
casos de referência idênticos em `HexGridTests` e `hexGrid.test.ts`; os testes de cobertura do MCP quebram sem a
ferramenta nova.

**Organization**: por user story (US1 postura, US2 formatos, US3 postura muda o tamanho). Caminhos a partir da raiz do
repositório.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde: `cd backend && dotnet build Roll6.sln && dotnet test` e `cd frontend && npm test && npm run lint` (anotar falhas pré-existentes)

---

## Phase 2: Foundational (bloqueia as stories)

**Purpose**: enum, colunas, migração (com a normalização de tamanhos) e tipos compartilhados.

- [X] T002 [P] Criar `backend/Roll6.Domain/Enums/Posture.cs` com `Standing = 1`, `Down = 2`, `OutOfCombat = 3` e `<summary>` (Em pé / Caído / Fora de combate; tamanho e desenho dependem dela; objetos não têm postura)
- [X] T003 Em `backend/Roll6.Domain/Models/CampaignCharacter.cs` adicionar `public Posture Posture { get; set; } = Posture.Standing;`, o método `bool ChangePosture(int posture)` (valor fora do enum → `DomainValidationException("posture", "A postura deve ser 1 (Em pé), 2 (Caído) ou 3 (Fora de combate).")`; devolve `false` quando igual; atualiza `UpdatedAt`) e fazer `ResetFrom(character)` voltar para `Standing` — depende de T002
- [X] T004 [P] Em `backend/Roll6.Domain/Models/MapNpc.cs` adicionar `Posture` (padrão `Standing`, também em `FromNpc`) e `ChangePosture(int)` idêntico ao de T003 (extrair a validação para `Guard.Posture(int, string field)` em `backend/Roll6.Domain/Validation/Guard.cs` e usá-la nos dois) — depende de T002
- [X] T005 Em `backend/Roll6.Infra/Context/Roll6Context.cs` mapear `Posture` de `CampaignCharacter` e `MapNpc` como coluna `posture` (`HasConversion<int>()`, `HasDefaultValue(Posture.Standing)`, `HasSentinel` como as outras colunas int com default) — depende de T003, T004
- [X] T006 Gerar a migração `dotnet ef migrations add AddPostureAndTokenSpaces --project Roll6.Infra --startup-project Roll6.API` (em `backend/`) e acrescentar no `Up` o `migrationBuilder.Sql` da normalização (`UPDATE tokens SET up_space = 1 WHERE up_space NOT IN (1,2,3,7,10); UPDATE tokens SET down_space = 2 WHERE down_space IS NOT NULL AND down_space NOT IN (1,2,3,7,10);`); criar `database/migrations/031-posture-footprint.sql` (idempotente, mesmo conteúdo, estilo de `029-slugs.sql`) e regenerar `database/roll6.sql` com `dotnet ef migrations script --idempotent ... -o ../database/roll6.sql` mantendo o cabeçalho — depende de T005
- [X] T007 [P] Em `frontend/src/types/mapToken.ts` adicionar `POSTURE = { standing: 1, down: 2, outOfCombat: 3 } as const`, `type Posture`, e em `MapTokenInfo` os campos `posture: Posture | null` e `space: number`; interface `MapTokenPostureInfo { posture: Posture }`
- [X] T008 [P] Em `frontend/src/i18n/locales/pt-BR.json` adicionar `posture.label` ("Postura"), `posture.1` ("Em pé"), `posture.2` ("Caído"), `posture.3` ("Fora de combate"), `posture.changed`, `tokens.doesNotFit` ("A peça não cabe aqui."), `tokens.spaceOption` ("{{count}} hex"/"{{count}} hexes"), `tokens.noDownState` ("Sem estado deitado")

**Checkpoint**: `dotnet build` e `npm run build` verdes; colunas existem.

---

## Phase 3: User Story 1 - Marcar personagem/NPC como caído ou fora de combate (Priority: P1) 🎯 MVP

**Goal**: postura alterável na tela, API e MCP por dono/mestre (NPC: mestre), registrada no turno, em tempo real, e peça desenhada deitada / em preto e branco (tokens de 1 hex).

**Independent Test**: quickstart "Manual — postura" (passos 1–5) com tokens de 1 hex.

### Tests for User Story 1

- [X] T009 [P] [US1] Em `backend/Roll6.Tests/Domain/Models/CampaignCharacterTests.cs` e `MapNpcTests.cs`: `ChangePosture` válido/igual/inválido (400 `posture`); `ResetFrom` volta a Em pé; `FromNpc` começa Em pé
- [X] T010 [P] [US1] Em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`, testes de `SetPostureAsync`: dono do personagem e mestre alteram (grava na participação, `Turn.CharacterUpdate` com `changes [{ posture, "1", "3" }]`, publica `party.changed` + `mapTokens.changed` sem mapId + `turn.changed`); outro jogador → `UnauthorizedAccessException`; NPC pelo mestre (grava na ocorrência, publica `mapToken.upserted` + `turn.changed`); NPC por jogador → 403; objeto → 400 `posture`; participação não aprovada → `ConflictException`; mesma postura → sem insert de turno nem evento; nunca consulta ocupação
- [X] T011 [P] [US1] Em `CampaignCharacterServiceTests.cs`, `MapNpcServiceTests.cs` e `TurnServiceTests.cs` (backend/Roll6.Tests/Domain/Services/): `posture` opcional no `UpdateAsync` (null mantém; valor muda e entra no `Diff`); `ProcessAsync` com `posture` por item (inválido → 400 `characters[0].posture`) registrando a mudança; `TurnDataInfo` traz `posture`
- [X] T012 [P] [US1] Em `backend/Roll6.Tests/Domain/Turns/TurnSummaryTests.cs`: alteração `posture` 1→2 vira `Postura de "Em pé" para "Caído"`

### Implementation for User Story 1

- [X] T013 [P] [US1] DTOs: `backend/Roll6.DTO/MapToken/MapTokenPostureInfo.cs` (novo, `posture` int); `MapTokenInfo.cs` + `posture` (int?) e `space` (int); `CampaignCharacter/CampaignCharacterInfo.cs` e `CampaignCharacterDetailInfo.cs` + `posture` (int); `CampaignCharacterUpdateInfo.cs` + `posture` (int?, null = mantém); `MapNpc/MapNpcInfo.cs` + `posture` (int); `MapNpcUpdateInfo.cs` + `posture` (int?); `Turn/TurnProcessInfo.cs` (`TurnProcessPieceInfo`) + `posture` (int?); `Turn/TurnDataInfo.cs` + `posture` nos itens de personagem e NPC — todos com `[JsonPropertyName]` e `<summary>` citando 1 Em pé, 2 Caído, 3 Fora de combate
- [X] T014 [US1] Preencher `posture` nos mapeamentos: `MapTokenService.MapToDtoAsync` (`backend/Roll6.Domain/Services/MapTokenService.cs`: participação/ocorrência; null para objeto; `space` = `token?.UpSpace ?? 1` por enquanto), mapeamentos de `CampaignCharacterService` e `MapNpcService`, e `TurnService.Processing` (`BuildData`/equivalente) — depende de T013
- [X] T015 [US1] Em `CampaignCharacterService.UpdateAsync` e `MapNpcService.UpdateAsync` (backend/Roll6.Domain/Services/): aplicar `info.Posture` via `ChangePosture` quando não nulo e incluir `("posture", (int)before, (int)after)` no `TurnChange.Diff` existente — depende de T013
- [X] T016 [US1] Criar o partial `backend/Roll6.Domain/Services/MapTokenService.Posture.cs` com `SetPostureAsync(long userId, long mapTokenId, MapTokenPostureInfo info)`: carrega peça + mapa (não excluído); objeto → 400; personagem → participação aprovada (senão 409) e personagem, permite `character.UserId == userId || map.UserId == userId` (senão 403); NPC → só `map.UserId == userId`; `ChangePosture`; se mudou, em `IUnitOfWork` atualiza participação/ocorrência e insere `Turn.CharacterUpdate` (campanha atual, `campaign.CurrentMapId`/`map.MapId`, como os serviços de T015); publica eventos de research R8; devolve `MapToDtoAsync(peça)`. Declarar em `IMapTokenService` — depende de T014
- [X] T017 [US1] Em `backend/Roll6.API/Controllers/MapTokenController.cs` adicionar `[HttpPut("{id}/posture")]` → `SetPostureAsync(CurrentUserId, id, info)` com `try/catch HandleException` — depende de T016
- [X] T018 [US1] Em `TurnService.Processing.cs` (backend/Roll6.Domain/Services/) aceitar `posture` por item: validar no lote (`characters[i].posture`/`npcs[i].posture`), aplicar e registrar no `CharacterUpdate` do item — depende de T013
- [X] T019 [US1] Em `backend/Roll6.Domain/Turns/TurnSummary.cs` rótulo `"posture" => "Postura"` e valores 1/2/3 → "Em pé"/"Caído"/"Fora de combate" (entre aspas, como texto)
- [X] T020 [US1] MCP: em `backend/Roll6.Mcp/Tools/MapTokenTools.cs` ferramenta `set_piece_posture` (`[ApiOperation("PUT", "/api/maptoken/{id}/posture")]`, `Idempotent = true`, descrição de contracts/mcp.md); `posture` opcional em `update_participation` (`ParticipationTools.cs`), `update_map_npc` (`MapNpcTools.cs`) e na descrição do JSON de `process_turn` (`TurnTools.cs`); *Returns* de leituras citam `posture`; seção "Posture and piece size" (parte de postura) em `backend/Roll6.Mcp/Roll6Guide.cs`; `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` 85→86 e 86→87 — depende de T017
- [X] T021 [US1] Rodar `cd backend && dotnet test` até T009–T012 e os testes MCP passarem
- [X] T022 [P] [US1] Frontend serviço/contexto: `setPosture(mapTokenId, posture)` em `frontend/src/Services/mapTokenService.ts` (`PUT /api/maptoken/{id}/posture`, `handleResponse`) e em `frontend/src/Contexts/MapTokenContext.tsx` (aplica a peça devolvida, toast de erro); `posture` em `frontend/src/types/campaignCharacter.ts` (info/detalhe e `posture?: number | null` no update) e `frontend/src/types/npc.ts` (ocorrência) — depende de T007
- [X] T023 [US1] Em `frontend/src/components/map/HexMenu.tsx` grupo "Postura" com os três itens (atual marcado e desabilitado) para peças de personagem (mestre ou dono) e de NPC (mestre); nada para objetos; clique chama `setPosture` e fecha o menu; a permissão reaproveita as regras já usadas para "Mover" — depende de T022
- [X] T024 [US1] Em `frontend/src/components/map/TokenLayer.tsx` (tokens de 1 hex): postura ≠ Em pé desenha `downImageUrl` se houver, senão a imagem em pé com `rotate(90)` dentro do círculo; `is-out` no grupo quando Fora de combate; CSS `.stm-map-token.is-out { filter: grayscale(1); }` (disco e imagem) no arquivo de estilos do mapa — depende de T007
- [X] T025 [P] [US1] Em `frontend/src/components/map/PartyCard.tsx` e `NpcCard.tsx` selo com `t('posture.N')` quando ≠ Em pé e imagem com classe cinza quando Fora de combate (NpcCard: por ocorrência, a partir da peça)
- [X] T026 [US1] Em `frontend/src/components/modals/CharacterFormModal.tsx`, área "Nesta campanha" (dono/mestre): `<select>` "Postura" enviado como `posture` no `PUT /api/campaigncharacter/{id}`; leitor vê o texto; regra de formulário em `frontend/src/lib/campaignCharacterForm.ts` + teste em `campaignCharacterForm.test.ts` — depende de T022
- [X] T027 [US1] Em `frontend/src/lib/mapSnapshot.ts` desenhar peças deitadas (mesma regra de T024) e, para Fora de combate, desaturar a imagem num canvas auxiliar (luminância `0.299r + 0.587g + 0.114b`) e o disco em cinza; teste do helper de desaturação em `frontend/src/lib/mapSnapshot.test.ts`
- [X] T028 [US1] Rodar `cd frontend && npm test && npm run lint && npm run build`

**Checkpoint**: US1 completa com tokens de 1 hex (MVP).

---

## Phase 4: User Story 2 - Tokens grandes ocupando vários hexes (Priority: P2)

**Goal**: tamanhos 1/2/3/7/10 validados; formatos (research R4) valem para desenhar, clicar, destacar, colocar, arrastar, mover, resetar e processar turno.

**Independent Test**: quickstart "Manual — tamanhos" (passos 1–4).

### Tests for User Story 2

- [X] T029 [P] [US2] Em `backend/Roll6.Tests/Domain/Grid/HexGridTests.cs`: `Footprint` para cada tamanho × 6 direções em (4, 4) e (5, 4) com a lista esperada (posição primeiro); tamanho inválido lança; `MovementCost` com `space` 2/10 recusando giro que colide ou sai da grade e aceitando estado inicial sobreposto
- [X] T030 [P] [US2] Criar `backend/Roll6.Tests/Domain/Grid/OccupancyTests.cs`: `PieceAt` em qualquer hex do formato; `Fits` → `OutsideGrid`, `Occupied`, `Ok` ignorando a própria peça; peças sobrepostas não quebram a construção
- [X] T031 [P] [US2] Em `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs` e `Validation/GuardTests.cs`: `upSpace`/`downSpace` 4 ou 0 → 400; 1/2/3/7/10 aceitos; `downSpace` null continua; padrão 2 com imagem deitada
- [X] T032 [P] [US2] Em `MapTokenServiceTests.cs`, `MapNpcServiceTests.cs`, `TurnServiceTests.cs`: colocar/mover peça de 2 hexes com o hex de trás ocupado → 409; formato saindo da grade → 400 `x`; jogador com giro bloqueado recebe custo maior ou 400 `move`; reset não volta se o formato não couber; processamento em lote recusa formatos finais sobrepostos

### Implementation for User Story 2

- [X] T033 [US2] Em `backend/Roll6.Domain/Grid/HexGrid.cs`: `ALLOWED_SPACES`, `IsAllowedSpace`, `Footprint(x, y, look, space)` exatamente como a tabela de research R4 (axial, `AxialToOffset` no fim) e `MovementCost(..., int space, columns, rows, isBlocked)` validando o formato inteiro em cada estado novo (giro ou passo); atualizar chamadas existentes para `space` — depende de T029
- [X] T034 [US2] Criar `backend/Roll6.Domain/Grid/Occupancy.cs` (puro): `record PieceShape(long MapTokenId, int X, int Y, int Look, int Space)`, `Occupancy.Build`, `PieceAt`, `Fits(IEnumerable<(int X,int Y)> hexes, int columns, int rows, long? except)` → enum `FitResult { Ok, OutsideGrid, Occupied }`, `IsBlocked(x, y, except)` — depende de T033
- [X] T035 [US2] `Guard.TokenSpace(int, string)` em `backend/Roll6.Domain/Validation/Guard.cs` ("O tamanho deve ser 1, 2, 3, 7 ou 10 hexes.") e uso em `backend/Roll6.Domain/Models/Token.cs` (`UpSpace` e `ResolveDownSpace`) no lugar de `NonNegative`
- [X] T036 [US2] Helper de carga no Domain (ex.: `backend/Roll6.Domain/Services/MapOccupancyLoader.cs`, registrado em `backend/Roll6.Application/Startup.cs`, ou método compartilhado injetável): `LoadAsync(long mapId)` → peças do mapa + tokens + posturas (participações/ocorrências em lote) → `Occupancy` e o `space` de cada peça via um único método `PieceSpace(token, posture)` (nesta fase = `token.UpSpace`); `EnsureFitsAsync(map, x, y, look, space, except)` lança 400 `x` "A peça não cabe na grid do mapa nessa posição." ou 409 "O hex já está ocupado." — depende de T034
- [X] T037 [US2] Em `MapTokenService.cs` trocar `EnsureFreeHexAsync` pelo helper (criar objeto: token informado + look; `PlaceCharacterAsync`: token do personagem; `UpdateAsync`; `MoveAsync` com o look final) e `MovementCostAsync`/`EnsurePlayerMoveAsync` passando `space` e `occupancy.IsBlocked`; `MapToDtoAsync` preenche `space` via `PieceSpace` — depende de T036
- [X] T038 [US2] Em `MapNpcService.CreateAsync` (hex livre com o formato do token do NPC, look informado), `TurnService` reset (volta só se `Fits`) e `TurnService.Processing` (validação do estado final com formatos inteiros e custos com `space`) (backend/Roll6.Domain/Services/) usar o helper; remover `ExistsAtAsync` de `backend/Roll6.Infra.Interfaces/Repository/IMapTokenRepository.cs` e `backend/Roll6.Infra/Repository/MapTokenRepository.cs` — depende de T036
- [X] T039 [US2] MCP: descrições de `create_token`/`update_token` (`TokenTools.cs`: "1, 2, 3, 7 or 10 hexes" + formatos), erros de `move_map_token`, `place_character_on_map`, `place_npc_on_map`, `add_object_to_map`, `space` nas leituras e parte de tamanhos da seção "Posture and piece size" em `Roll6Guide.cs` (backend/Roll6.Mcp/)
- [X] T040 [US2] Rodar `cd backend && dotnet test` até T029–T032 passarem
- [X] T041 [P] [US2] Frontend espelho em `frontend/src/lib/hexGrid.ts`: `ALLOWED_SPACES`, `footprint(x, y, look, space)`, `footprintLocal(space, size)` (centros em px na orientação look 3, para o desenho) e `movementField(start, columns, rows, isBlocked, space = 1)` com a mesma regra de T033; casos de referência **idênticos** aos de T029 em `frontend/src/lib/hexGrid.test.ts`
- [X] T042 [P] [US2] Criar `frontend/src/lib/occupancy.ts` (`buildOccupancy(tokens)`, `pieceAt`, `fits` → `'ok' | 'outside' | 'occupied'`, `isBlocked`) usando `token.space`, e `frontend/src/lib/occupancy.test.ts` — depende de T041
- [X] T043 [US2] Em `frontend/src/lib/mapTokens.ts`: `tokenAt` via `pieceAt` (qualquer hex do formato); `characterDropAction`/`npcDropAction` recebem `space`/`look` e devolvem `{ kind: 'blocked' }` quando não cabe; atualizar `frontend/src/lib/mapTokens.test.ts` — depende de T042
- [X] T044 [US2] Em `frontend/src/lib/movement.ts` e `frontend/src/hooks/useTokenMovement.ts`: `movementField` com `space` da peça e `isBlocked` da ocupação; direções que não cabem não são escolhidas em `pointFacing`; teste em `frontend/src/lib/movement.test.ts` — depende de T042
- [X] T045 [US2] Em `frontend/src/components/map/TokenLayer.tsx` desenhar formatos de vários hexes (research R7: disco = união dos contornos a 92 %, `clipPath` igual, imagem no retângulo envolvente com `slice`, marca de frente no hex da frente, tudo em coordenadas de `footprintLocal` dentro do grupo girado) mantendo o círculo para 1 hex; `MovementLayer.tsx` e `HexHighlight.tsx` destacam o formato inteiro (peça sob o cursor, destino do movimento, destino do arraste em vermelho quando não cabe) — depende de T041
- [X] T046 [US2] Em `frontend/src/components/map/MapCanvas.tsx` usar a ocupação para clique/menu (`tokenAt`), destaque do arraste e drop recusado com `toast.error(t('tokens.doesNotFit'))` — depende de T043, T045
- [X] T047 [US2] Em `frontend/src/lib/mapSnapshot.ts` desenhar formatos de vários hexes com a mesma geometria de T045 — depende de T041
- [X] T048 [P] [US2] Em `frontend/src/components/tokens/TokenFormFields.tsx` trocar os inputs numéricos por `<select>` (1/2/3/7/10; deitado com "Sem estado deitado") e em `frontend/src/lib/tokenForm.ts` validar o conjunto; atualizar `frontend/src/lib/tokenForm.test.ts`
- [X] T049 [US2] Rodar `cd frontend && npm test && npm run lint && npm run build`

**Checkpoint**: US2 completa — formatos valem em todo lugar (com a postura ainda sem mudar o tamanho).

---

## Phase 5: User Story 3 - Postura muda o tamanho da peça (Priority: P3)

**Goal**: tamanho vigente = em pé ou deitado conforme a postura; derrubar sem espaço é aceito (sobreposição até mover).

**Independent Test**: quickstart "Manual — postura muda o tamanho" (passos 1–4).

### Tests for User Story 3

- [X] T050 [P] [US3] Em `backend/Roll6.Tests/Domain/Models/TokenTests.cs` (novo, ou em `TokenLibraryServiceTests.cs`): `SpaceFor(null/Standing)` = `UpSpace`; `Down`/`OutOfCombat` = `DownSpace ?? UpSpace`
- [X] T051 [P] [US3] Em `MapTokenServiceTests.cs`: peça 1/2 caída passa a ocupar o hex de trás (outra peça não entra nele); `SetPostureAsync` com o hex de trás ocupado é aceito; mover a peça sobreposta exige formato livre no destino; `space` devolvido muda com a postura

### Implementation for User Story 3

- [X] T052 [US3] `Token.SpaceFor(Posture? posture)` em `backend/Roll6.Domain/Models/Token.cs` e `PieceSpace` do helper de T036 passa a usá-lo (objetos: `null`) — depende de T036
- [X] T053 [US3] Espelho `spaceFor` não é necessário no frontend (o backend envia `space`), mas `TokenLayer.tsx`/`mapSnapshot.ts` passam a usar `downImageUrl` ou a imagem em pé girada 90° **no retângulo do formato** para peças deitadas de vários hexes (mesma regra de T024 generalizada) e `space` vindo da API (frontend/src/components/map/, frontend/src/lib/)
- [X] T054 [US3] Garantir no frontend que, após `setPosture`, as outras peças do mesmo personagem (outros mapas) e a ocupação local se atualizam pelo `mapTokens.changed`/peça devolvida sem recarregar (`frontend/src/Contexts/MapTokenContext.tsx`, `frontend/src/lib/realtimeEvents.ts` se precisar); teste em `frontend/src/lib/realtimeEvents.test.ts` para `mapToken.upserted` com `space` novo
- [X] T055 [US3] Rodar `cd backend && dotnet test` e `cd frontend && npm test && npm run build`

**Checkpoint**: as três stories funcionam juntas.

---

## Phase 6: Polish & Cross-Cutting

- [X] T056 [P] Atualizar `CLAUDE.md`: seções de peças/movimento (formatos, ocupação, `Footprint`/`footprint` espelhados, sobreposição tolerada após cair), postura (colunas, endpoint, quem altera, log `posture`, eventos) e MCP (87 ferramentas, `set_piece_posture`); remover a menção a `ExistsAtAsync` se houver
- [ ] T057 [P] Pedir ao agente `analyst` a atualização das páginas de `docs/` que descrevem peças, tokens e MCP (se existirem)
- [ ] T058 Executar o quickstart manual completo (`specs/031-token-posture-footprint/quickstart.md`), incluindo o compartilhamento do mapa e um segundo navegador para o tempo real
- [X] T059 Rodar a suíte final: `cd backend && dotnet build Roll6.sln && dotnet test`; `cd frontend && npm run lint && npm test && npm run build`

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T008)** → stories.
- **US1 (P1)** depende só da Foundational. **US2 (P2)** depende só da Foundational (usa `UpSpace`; `space` de T014 é substituído em T037). **US3 (P3)** depende de US1 (postura) e US2 (ocupação).
- Dentro de cada story: testes → domínio → serviços → API → MCP → frontend.
- Backend e frontend de uma story podem andar em paralelo depois dos DTOs (T013) / tipos (T007).

## Parallel Examples

- **Foundational**: T002, T007, T008 juntos; depois T003 e T004.
- **US1**: T009, T010, T011, T012, T013 juntos; T022 e T025 em paralelo com o backend.
- **US2**: T029–T032 juntos; T041, T048 em paralelo com T033–T039; T042 → T043/T044 em paralelo.
- **US3**: T050, T051 juntos.

## Implementation Strategy

1. **MVP** = Setup + Foundational + US1: postura completa com tokens de 1 hex (valor imediato na mesa).
2. **Incremento 2** = US2: formatos e ocupação (maior risco — casos de referência primeiro, T029/T041).
3. **Incremento 3** = US3: postura troca o tamanho; derrubar sem espaço aceito.
4. Polish: docs, `CLAUDE.md`, quickstart manual.
