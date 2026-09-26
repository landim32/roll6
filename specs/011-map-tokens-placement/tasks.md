# Tasks: Tokens no Mapa

**Input**: Design documents from `/specs/011-map-tokens-placement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD; seguindo o padrão do projeto, entram testes xUnit de modelos/services
alterados e de `HexGrid`, e Vitest das libs puras (`lib/hexGrid.ts`, `lib/mapTokens.ts`). O restante é
verificado pelo quickstart.

**Organization**: por user story. A ordem das fases segue as dependências: a US4 (modal de tokens) vem
antes da US2 e da US3, que a usam. Caminhos a partir da raiz do repositório.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde: `dotnet build Roll6.sln` + `dotnet test` em `backend/` e `npm run lint` + `npm test` em `frontend/`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: colunas novas, DTOs, matemática pixel→hex e as entidades `token`/`mapToken` no frontend.

### Backend

- [X] T002 Adicionar `public long? TokenId { get; set; }` ao modelo; `Update(name, sheet, life, energy, move, image, long? tokenId)` grava `TokenId`; novo `public bool AssignTokenIfMissing(long tokenId)` (grava só se `TokenId` é null, atualiza `UpdatedAt`, retorna se gravou; XML doc citando a exceção da spec FR-001/FR-015) em `backend/Roll6.Domain/Models/Character.cs`
- [X] T003 Adicionar `public long? CampaignCharacterId { get; set; }` ao modelo; em `Update(...)` validar `TokenType == Character` ⇔ `CampaignCharacterId != null` (`DomainValidationException("campaignCharacterId", "Tokens de personagem precisam estar ligados a um personagem da campanha.")`); nova fábrica `public static MapToken PlaceCharacter(long mapId, long tokenId, long campaignCharacterId, string characterName, int x, int y)` (tipo Character, nome = personagem, vida/energia/movimento 0, look 0, `CreatedAt = UpdatedAt`); `public void ChangeToken(long tokenId)` (troca só o `TokenId`, atualiza `UpdatedAt`) em `backend/Roll6.Domain/Models/MapToken.cs`
- [X] T004 No `Roll6Context`: `Character.TokenId` → `HasColumnName("token_id")` + `HasOne<Token>().WithMany().HasForeignKey(e => e.TokenId).OnDelete(DeleteBehavior.ClientSetNull).HasConstraintName("fk_token_character")`; `MapToken.CampaignCharacterId` → `HasColumnName("campaign_character_id")` + FK para `CampaignCharacter` `ClientSetNull` `fk_campaign_character_map_token` + `HasIndex(e => new { e.MapId, e.CampaignCharacterId }).IsUnique().HasFilter("campaign_character_id IS NOT NULL").HasDatabaseName("ix_map_tokens_map_campaign_character")` em `backend/Roll6.Infra/Context/Roll6Context.cs`
- [X] T005 Gerar `dotnet ef migrations add AddCharacterTokenAndMapTokenParticipation --project Roll6.Infra --startup-project Roll6.API` e conferir colunas, FKs e índice filtrado em `backend/Roll6.Infra/Migrations/<timestamp>_AddCharacterTokenAndMapTokenParticipation.cs`
- [X] T006 [P] Adicionar `TokenId` (`long?`) em `backend/Roll6.DTO/Character/CharacterInsertInfo.cs` e `TokenId`, `TokenName` (`string?`), `TokenImageUrl` (`string?`) em `backend/Roll6.DTO/Character/CharacterInfo.cs` (todos com `[JsonPropertyName]` camelCase)
- [X] T007 [P] Adicionar `CharacterTokenId` (`long?`, `characterTokenId`) em `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterInfo.cs` e copiar o campo em `MapToDetailAsync` de `backend/Roll6.Domain/Services/CampaignCharacterService.cs`; preencher `CharacterTokenId = character?.TokenId` em `MapToDtoAsync`
- [X] T008 [P] Adicionar `CampaignCharacterId` (`long?`) e `CharacterId` (`long?`) em `backend/Roll6.DTO/MapToken/MapTokenInfo.cs`; criar `MapTokenCharacterInsertInfo` (`mapId`, `campaignCharacterId`, `tokenId?`, `x`, `y`), `MapTokenPositionInfo` (`x`, `y`) e `MapTokenTokenInfo` (`tokenId`) em `backend/Roll6.DTO/MapToken/`
- [X] T009 [P] Adicionar ao `HexGrid` `public static (int Q, int R) HexRound(double q, double r)` (cube rounding do guia: `s = -q - r`, arredonda os três, corrige o de maior diferença) e `public static (int X, int Y) PixelToHex(double px, double py, double size)` (desfaz a origem `(size, √3/2·size)`, `fq = (2.0/3 * px) / size`, `fr = (-1.0/3 * px + Math.Sqrt(3)/3 * py) / size`, `HexRound`, `AxialToOffset`) e `public static bool IsInsideGrid(int x, int y, int columns, int rows)`, com XML doc apontando "Pixel to Hex" e "Rounding to nearest hex" do guia, em `backend/Roll6.Domain/Grid/HexGrid.cs`
- [X] T010 [P] Testes de `HexRound`, `PixelToHex` (centro de cada hex de uma grid 5×4 volta para o próprio hex; ponto a 0,9·size do centro na horizontal fica no hex; pontos de referência compartilhados com o Vitest: `(40, 34.64)` → `(0,0)`, `(100, 69.28)` → `(1,0)`, `(160, 103.92)` → `(2,1)`) e `IsInsideGrid` em `backend/Roll6.Tests/Domain/Grid/HexGridTests.cs`
- [X] T011 [P] Testes do modelo `MapToken`: `PlaceCharacter` monta tipo Character ligado; `Update` com tipo Character sem participação e com tipo Npc com participação → `DomainValidationException`; `ChangeToken` mantém x/y/look/tipo/ligação em `backend/Roll6.Tests/Domain/Models/MapTokenTests.cs` (criar se não existir)
- [X] T012 [P] Testes de `Character.AssignTokenIfMissing` (grava quando null e retorna true; não troca um token existente e retorna false) e do novo parâmetro de `Update` em `backend/Roll6.Tests/Domain/Models/CharacterTests.cs`
- [X] T013 Aplicar a migration no banco de dev (`dotnet ef database update --project Roll6.Infra --startup-project Roll6.API`, connection string montada a partir do `.env` com `Host=localhost`, sem gravar credenciais) e rodar `dotnet build` + `dotnet test`

### Frontend

- [X] T014 [P] Espelhar em `lib/hexGrid.ts`: `hexRound(q, r): Axial`, `pixelToHex(point: Point, size: number): Offset`, `isInsideGrid(offset, columns, rows)` e `hexPolygon(x, y, size): string` (pontos do hexágono para `<path>`/`<polygon>`), com o mesmo comentário de espelho do `HexGrid.cs` em `frontend/src/lib/hexGrid.ts`
- [X] T015 [P] Testes Vitest com os mesmos valores de referência de T010 (ida e volta `hexCenter` → `pixelToHex` numa grid 5×4, pontos compartilhados, `hexRound` corrigindo o maior erro, `isInsideGrid`) em `frontend/src/lib/hexGrid.test.ts`
- [X] T016 [P] Criar `types/token.ts` (`TokenInfo` e `TokenInsertInfo` espelhando os DTOs, com `upImageUrl`/`downImageUrl`) e `types/mapToken.ts` (`MAP_TOKEN_TYPE = { character: 1, npc: 2, enemy: 3, object: 4 } as const` + tipo derivado; `MapTokenInfo` com `campaignCharacterId`/`characterId`; `MapTokenInsertInfo`, `MapTokenCharacterInsertInfo`, `MapTokenPositionInfo`, `MapTokenTokenInfo`) em `frontend/src/types/`
- [X] T017 [P] Acrescentar `tokenId`, `tokenName`, `tokenImageUrl` a `CharacterInfo` e `tokenId` a `CharacterInsertInfo` em `frontend/src/types/character.ts`; `characterTokenId: number | null` a `CampaignCharacterInfo` em `frontend/src/types/campaignCharacter.ts`; ajustar `toCharacterInsert` (novo parâmetro `tokenId: number | null`) e seus testes em `frontend/src/lib/characterForm.ts` e `frontend/src/lib/characterForm.test.ts`, e os fixtures de `frontend/src/lib/characterSelection.test.ts`
- [X] T018 [P] Criar `TokenService` (classe, `handleResponse` → `handleApiResponse`): `list({ search, page, pageSize })` → `PagedList<TokenInfo>` (`GET /api/token`), `create(data)` (`POST /api/token`) em `frontend/src/Services/tokenService.ts`
- [X] T019 [P] Criar `MapTokenService`: `listByMap(mapId)` (`GET /api/map/{id}/token`), `create(data)` (`POST /api/maptoken`), `placeCharacter(data)` (`POST /api/maptoken/character`), `move(id, data)` (`PUT /api/maptoken/{id}/position`), `changeToken(id, data)` (`PUT /api/maptoken/{id}/token`) em `frontend/src/Services/mapTokenService.ts`
- [X] T020 Criar `TokenContext` (padrão `react-architecture`, sem envelope): `search(query)` → `PagedList<TokenInfo>`, `create(data)`, `loading`, `error`, `clearError` + `hooks/useToken.ts` em `frontend/src/Contexts/TokenContext.tsx` e `frontend/src/hooks/useToken.ts`
- [X] T021 Criar `MapTokenContext`: `mapTokens` do mapa aberto (`useMapEditor().draft.mapId`; lista vazia sem mapa de campanha; descarta respostas de outro mapa), `canPlace` (= `isMaster` e mapa de campanha), `refresh()`, `addToken(tokenId, x, y)`, `placeCharacter(participation, x, y, tokenId?)`, `moveToken(id, x, y)`, `changeToken(id, tokenId)` — cada ação recarrega os tokens; `placeCharacter` que gravou token no personagem chama `refreshParty()` e `refresh(true)` do `CharacterContext` + `hooks/useMapToken.ts` em `frontend/src/Contexts/MapTokenContext.tsx` e `frontend/src/hooks/useMapToken.ts`
- [X] T022 Registrar `TokenProvider` → `MapTokenProvider` dentro do `MapEditorProvider` e atualizar o comentário da cadeia em `frontend/src/main.tsx`

**Checkpoint**: backend e frontend compilam, testes verdes; migration aplicada.

---

## Phase 3: User Story 1 - Ver os tokens e o hex sob o mouse (Priority: P1) 🎯 MVP

**Goal**: tokens do mapa de campanha visíveis e hex sob o mouse destacado em azul claro.

**Independent Test**: abrir um mapa com tokens gravados e vê-los nos hexes; mover o mouse (com zoom/pan) e ver o destaque no hex certo; fora da grid some.

- [X] T023 [US1] Preencher, em `MapToDto`/`ListByMapAsync`, os dados dos tokens de personagem a partir da participação e do personagem (carregar participações e personagens em lote pelos `CampaignCharacterId`: `Name`, `Life = CurrentLife`, `Energy = CurrentEnergy`, `Status = CharacterStatus`, `Sheet`, `Move`, `CampaignCharacterId`, `CharacterId`) em `backend/Roll6.Domain/Services/MapTokenService.cs` (novas dependências `ICampaignCharacterRepository` já injetada e `ICharacterRepository` — registrar no DI se faltar em `backend/Roll6.Application/Startup.cs`)
- [X] T024 [P] [US1] Teste: `ListByMapAsync` devolve nome/vida/energia/status do personagem para token Character e os valores próprios para NPC em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`
- [X] T025 [P] [US1] Criar `hooks/useMapPointer.ts`: `toMapPoint(clientX, clientY, svgRect, view)` puro exportado (`(client − rect − pan) / zoom`) e o hook que devolve `hexAt(event)` → `Offset | null` usando `pixelToHex(…, HEX_SIZE)` e `isInsideGrid` com `draft.gridWidth/gridHeight` em `frontend/src/hooks/useMapPointer.ts`
- [X] T026 [P] [US1] Criar `HexHighlight` (`{ hex: Offset | null }`): `<path d={hexPolygon(...)}>` com classe `stm-hex-highlight`, nada quando `hex` é null em `frontend/src/components/map/HexHighlight.tsx`
- [X] T027 [P] [US1] Criar `TokenLayer`: um `<g>` por `mapTokens` em `hexCenter(x, y, HEX_SIZE)`; `<clipPath>` circular de raio `0.8·HEX_SIZE`, `<image href={upImageUrl}>` ou círculo + inicial de `name`; `<title>{name}</title>`; classe `stm-map-token` (`pointer-events: none`) em `frontend/src/components/map/TokenLayer.tsx`
- [X] T028 [US1] No `MapCanvas`: estado `hoverHex` atualizado em `onPointerMove` (só quando o hex muda; limpo em `onPointerLeave` e durante pan), renderizar `<HexHighlight>` e `<TokenLayer>` depois da grid dentro do grupo transformado em `frontend/src/components/map/MapCanvas.tsx`
- [X] T029 [P] [US1] Estilos `.stm-hex-highlight` (`fill: rgba(13, 202, 240, 0.25)`, `stroke: rgba(13, 202, 240, 0.6)`, `pointer-events: none`), `.stm-map-token` (`pointer-events: none`, círculo de fundo `--bs-secondary-bg`, borda `--bs-border-color`, texto centralizado) em `frontend/src/styles/app.css`
- [X] T030 [P] [US1] Teste Vitest de `toMapPoint` (sem zoom, com zoom 2 e pan) em `frontend/src/hooks/useMapPointer.test.ts`

**Checkpoint**: quickstart US1.

---

## Phase 4: User Story 4 - Modal de tokens (Priority: P2, pré-requisito de US2/US3/US5)

**Goal**: modal com abas "Buscar tokens" (3 colunas) e "Incluir token".

**Independent Test**: buscar "gob" e ver a grade de 3 colunas paginada; cadastrar um token com imagem e vê-lo passado a `onSelect`.

- [X] T031 [P] [US4] Criar `lib/tokenForm.ts`: `TokenForm` (strings), `emptyTokenForm()`, `validateTokenForm` → `'nameRequired' | 'nameTooLong' | 'descriptionTooLong' | 'invalidSpace' | null` (nome ≤ 260, descrição ≤ 2000, espaços inteiros ≥ 0, deitado pode ficar vazio) e `toTokenInsert(form, upImage, downImage)` em `frontend/src/lib/tokenForm.ts` + testes em `frontend/src/lib/tokenForm.test.ts`
- [X] T032 [P] [US4] Textos `tokens.*` (ver `contracts/ui.md`) e `toast.tokenCreated` em `frontend/src/i18n/locales/pt-BR.json`
- [X] T033 [US4] Criar `TokenModal` (`{ open, onOpenChange, title?, onSelect: (token: TokenInfo) => Promise<void> | void }`): `Modal` large + `Tabs` (`search`, `create`); aba Buscar com input de busca (debounce 300 ms), grade `row row-cols-3 g-2` de botões `stm-token-option` (imagem quadrada `object-fit: cover` ou inicial + nome truncado), paginação 12/página "Anterior/Próxima" e mensagem de vazio; aba Incluir com nome, descrição, dois `ImageCropper` (em pé / deitado opcional), espaço em pé (padrão 1) e deitado; salvar → `cropToFile` + `imageService.upload` + `useToken().create` → toast → `onSelect`; estado `busy` enquanto `onSelect` roda; sucesso fecha, erro → toast em `frontend/src/components/modals/TokenModal.tsx`
- [X] T034 [P] [US4] Estilos `.stm-token-option` (card clicável, imagem 1:1, foco visível) em `frontend/src/styles/app.css`

**Checkpoint**: quickstart US4 (abrindo o modal pelas US seguintes).

---

## Phase 5: User Story 2 - Arrastar um personagem para o mapa (Priority: P1)

**Goal**: o mestre solta o card de um personagem num hex e o token dele é colocado (ou movido); sem token, escolhe no modal e grava no personagem.

**Independent Test**: arrastar Aria (com token) para um hex vazio → aparece; de novo → move; Bram (sem token) → modal → token gravado no personagem e colocado; hex ocupado → aviso.

### Backend

- [X] T035 [US2] Adicionar a `IMapTokenService` e implementar `PlaceCharacterAsync(userId, MapTokenCharacterInsertInfo)`: `EnsureMapOwnerAsync`; participação (404) Approved e da campanha do mapa (409); sem token dessa participação no mapa (`IMapTokenRepository.GetByMapAndCampaignCharacterAsync`, 409 "O personagem já está neste mapa."); hex livre (`IMapTokenRepository.ExistsAtAsync(mapId, x, y, exceptId)`, 409 "O hex já está ocupado."); `IsInsideGrid` com o grid do modelo (400); token = `character.TokenId ?? info.TokenId` (400 "Escolha um token para o personagem." se nenhum; 404 se não existe); em `IUnitOfWork.ExecuteInTransactionAsync`: `character.AssignTokenIfMissing` + `ICharacterRepository.UpdateAsync` quando gravou, `MapToken.PlaceCharacter` + insert — em `backend/Roll6.Domain/Interfaces/IMapTokenService.cs` e `backend/Roll6.Domain/Services/MapTokenService.cs`
- [X] T036 [US2] Implementar `MoveAsync(userId, mapTokenId, MapTokenPositionInfo)` (mestre; dentro da grid; destino livre excluindo o próprio token → 409; `MoveTo`) e aplicar a checagem de hex livre também no `CreateAsync` existente, recusando `tokenType = 1` nele (400, personagens entram por `/character`) em `backend/Roll6.Domain/Services/MapTokenService.cs`
- [X] T037 [P] [US2] Adicionar `GetByMapAndCampaignCharacterAsync(long mapId, long campaignCharacterId)`, `ExistsAtAsync(long mapId, int x, int y, long? exceptMapTokenId)` e `DeleteByCampaignCharacterIdsAsync(IEnumerable<long> ids)` em `backend/Roll6.Infra.Interfaces/Repository/IMapTokenRepository.cs` e `backend/Roll6.Infra/Repository/MapTokenRepository.cs`
- [X] T038 [US2] Endpoints `[HttpPost("character")] PlaceCharacter` (201 `MapTokenInfo`) e `[HttpPut("{id:long}/position")] Move` (200), padrão `try/catch → HandleException` em `backend/Roll6.API/Controllers/MapTokenController.cs`
- [X] T039 [US2] Integridade: `CampaignCharacterService.RemoveAsync` apaga antes os tokens do mapa da participação (`DeleteByCampaignCharacterIdsAsync`, dentro de `IUnitOfWork`) e `CharacterService.DeleteAsync` apaga os tokens do mapa das participações do personagem antes de `DeleteByCharacterAsync` em `backend/Roll6.Domain/Services/CampaignCharacterService.cs` e `backend/Roll6.Domain/Services/CharacterService.cs` (injetar `IMapTokenRepository`/`IUnitOfWork` onde faltar; ajustar construtores nos testes)
- [X] T040 [P] [US2] Testes do service: colocar com token do personagem (não altera o personagem); sem token + `tokenId` → grava no personagem e coloca; sem token e sem `tokenId` → 400; não mestre → 403; participação de outra campanha/não aprovada → 409; já no mapa → 409; hex ocupado → 409; `MoveAsync` para hex ocupado → 409 e para hex livre → atualiza em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`
- [X] T041 [P] [US2] Testes: `RemoveAsync` apaga os tokens do mapa da participação; `CharacterService.DeleteAsync` apaga os tokens do mapa das participações em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs` e `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`

### Frontend

- [X] T042 [P] [US2] Criar `lib/mapTokens.ts`: `tokenAt(tokens, x, y)`, `tokenOfParticipation(tokens, campaignCharacterId)`, `characterDropAction({ hex, tokens, participation })` → `{ kind: 'outside' } | { kind: 'occupied' } | { kind: 'move'; mapTokenId } | { kind: 'place' } | { kind: 'chooseToken' }` (ocupado = outro token no hex; soltar no próprio hex = nada/`outside`) + `PARTICIPATION_DRAG_TYPE = 'application/x-roll6-participation'` em `frontend/src/lib/mapTokens.ts`
- [X] T043 [P] [US2] Testes Vitest de `characterDropAction` (fora, ocupado por outro, mesmo hex, move, place com token, chooseToken sem token) e dos helpers em `frontend/src/lib/mapTokens.test.ts`
- [X] T044 [US2] `PartyCard`/`PartyPanel`: prop `draggable` (= `useMapToken().canPlace`); `onDragStart` grava `PARTICIPATION_DRAG_TYPE` = `campaignCharacterId` e `effectAllowed = 'move'`; classe `stm-party-draggable` (cursor `grab`) em `frontend/src/components/map/PartyCard.tsx` e `frontend/src/components/map/PartyPanel.tsx`
- [X] T045 [US2] No `MapCanvas`: `onDragOver` (só se o tipo for `PARTICIPATION_DRAG_TYPE` e `canPlace`: `preventDefault`, `dropEffect = 'move'`, atualiza `hoverHex`), `onDragLeave` limpa, `onDrop` → `hexAt` → `characterDropAction` → `outside` nada; `occupied` toast `mapTokens.hexOccupied`; `move` → `moveToken`; `place` → `placeCharacter`; `chooseToken` → chama `onChooseCharacterToken(participation, hex)` (prop nova) em `frontend/src/components/map/MapCanvas.tsx`
- [X] T046 [US2] No `MainPage`: estado `tokenPicker` (`{ title, onSelect }` | null) e um único `<TokenModal>`; `onChooseCharacterToken` abre o modal com título `mapTokens.chooseCharacterToken` e `onSelect = (token) => placeCharacter(participation, hex.x, hex.y, token.tokenId)` + toast `toast.mapTokenAdded` em `frontend/src/pages/MainPage.tsx`
- [X] T047 [P] [US2] Textos `mapTokens.hexOccupied`, `mapTokens.chooseCharacterToken`, `toast.mapTokenAdded`, `toast.mapTokenMoved` em `frontend/src/i18n/locales/pt-BR.json`; estilo `.stm-party-draggable` em `frontend/src/styles/app.css`

**Checkpoint**: quickstart US2.

---

## Phase 6: User Story 3 - Menu do hex (Priority: P2)

**Goal**: clicar num hex abre "Incluir token" ou "Alterar token" (só mestre).

**Independent Test**: hex vazio → "Incluir token" → token → NPC aparece; clicar nele → "Alterar token" → outro token → imagem muda no mesmo hex; pan não abre menu.

- [X] T048 [US3] Implementar `ChangeTokenAsync(userId, mapTokenId, MapTokenTokenInfo)` (mestre; token existe → 404; `ChangeToken`) em `backend/Roll6.Domain/Interfaces/IMapTokenService.cs` e `backend/Roll6.Domain/Services/MapTokenService.cs` e o endpoint `[HttpPut("{id:long}/token")]` em `backend/Roll6.API/Controllers/MapTokenController.cs`
- [X] T049 [P] [US3] Testes: `ChangeTokenAsync` mantém x/y/look/tipo/ligação; não mestre → 403; `CreateAsync` em hex ocupado → 409 e com `tokenType = 1` → 400 em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`
- [X] T050 [P] [US3] Criar `HexMenu` (`{ position: { left, top } ; occupied: boolean; onAdd; onChange; onClose }`): `ul.dropdown-menu.show` absoluto, um item (`hexMenu.addToken` ou `hexMenu.changeToken`), fecha com clique fora (`pointerdown` no documento), Esc e ao escolher em `frontend/src/components/map/HexMenu.tsx`
- [X] T051 [US3] No `MapCanvas`: guardar o ponto do `pointerdown`; no `pointerup` com deslocamento < 4 px, sem `resizeMode` e com `canPlace`, abrir o menu com o hex (`hexAt`) e a posição do clique relativa ao container; fechar o menu no pan, zoom (wheel) e troca de mapa; prop `onPickToken(request)` para o `MainPage` abrir o `TokenModal` em `frontend/src/components/map/MapCanvas.tsx`
- [X] T052 [US3] No `MainPage`: "Incluir token" → `TokenModal` (`onSelect` = `addToken(token.tokenId, x, y)` + toast `toast.mapTokenAdded`); "Alterar token" → `TokenModal` (`onSelect` = `changeToken(mapTokenId, token.tokenId)` + toast `toast.mapTokenChanged`) em `frontend/src/pages/MainPage.tsx`; `addToken` no `MapTokenContext` envia `tokenType: MAP_TOKEN_TYPE.npc`, `name` = nome do token, números 0, `look` 0
- [X] T053 [P] [US3] Textos `hexMenu.addToken`, `hexMenu.changeToken`, `toast.mapTokenChanged` em `frontend/src/i18n/locales/pt-BR.json`; estilo `.stm-hex-menu` (posição absoluta, `z-index` acima do mapa e abaixo dos modais) em `frontend/src/styles/app.css`

**Checkpoint**: quickstart US3.

---

## Phase 7: User Story 5 - Token do personagem (Priority: P3)

**Goal**: o dono escolhe/remove o token do personagem no cadastro; token em uso por personagem não é excluído.

**Independent Test**: escolher um token no cadastro de Aria, salvar e ver o token usado ao arrastá-la; `DELETE /api/token/{id}` desse token → 409.

- [X] T054 [US5] `CharacterService`: `CreateAsync`/`UpdateAsync` validam `info.TokenId` (404 "Token não encontrado." via `ITokenRepository`) e passam ao `Update`; `MapToDto` preenche `TokenId`, `TokenName`, `TokenImageUrl` (carregar o token; em `ListAsync`, em lote por `ListByIdsAsync`) em `backend/Roll6.Domain/Services/CharacterService.cs` (injetar `ITokenRepository<Token>`)
- [X] T055 [US5] `TokenLibraryService.DeleteAsync` recusa token usado por personagem (`ICharacterRepository.ExistsByTokenAsync`, 409 "O token está em uso por personagens e não pode ser excluído.") em `backend/Roll6.Domain/Services/TokenLibraryService.cs`, com `ExistsByTokenAsync(long tokenId)` em `backend/Roll6.Infra.Interfaces/Repository/ICharacterRepository.cs` e `backend/Roll6.Infra/Repository/CharacterRepository.cs`
- [X] T056 [P] [US5] Testes: criar/atualizar com token inexistente → 404; `GetByIdAsync` traz `TokenName`/`TokenImageUrl`; excluir token usado por personagem → 409 em `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs` e `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`
- [X] T057 [US5] `CharacterFormModal` (inclusão e modo `owner`): estado `token` (`{ tokenId, name, imageUrl } | null`, carregado do personagem); linha "Token" na aba Dados com miniatura (`CharacterAvatar` com a imagem do token), nome ou `characterForm.noToken`, botões `characterForm.chooseToken` (abre `TokenModal` com `onSelect` que só define o estado) e `characterForm.removeToken`; enviar `tokenId` em `toCharacterInsert` em `frontend/src/components/modals/CharacterFormModal.tsx`
- [X] T058 [P] [US5] Textos `characterForm.token`, `characterForm.noToken`, `characterForm.chooseToken`, `characterForm.removeToken` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: todas as histórias funcionando.

---

## Phase 8: Polish & Cross-Cutting

- [X] T059 [P] Atualizar o `CLAUDE.md`: hex math com `pixelToHex`/`hexRound` (espelhado), tokens do mapa (`MapTokenContext`, `TokenLayer`, `HexHighlight`, `HexMenu`, `TokenModal`), regra "personagem sem token recebe o token escolhido, mesmo pelo mestre", providers `TokenProvider` → `MapTokenProvider`, endpoints novos
- [X] T060 Rodar `dotnet build` + `dotnet test` em `backend/` e `npm run lint` + `npm test` + `npm run build` em `frontend/`
- [ ] T061 Executar `specs/011-map-tokens-placement/quickstart.md` com mestre e jogador

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T022)** → histórias.
- **US1 (T023–T030)**: depende da Foundational.
- **US4 (T031–T034)**: depende da Foundational (T016, T018, T020); independente da US1.
- **US2 (T035–T047)**: depende da US1 (`MapCanvas`, `useMapPointer`, `hoverHex`) e da US4 (`TokenModal`).
- **US3 (T048–T053)**: depende da US1 e da US4; toca `MapCanvas`, `MainPage` e `MapTokenService` como a US2 — fazer depois dela.
- **US5 (T054–T058)**: backend independente após a Foundational; o frontend depende da US4 (`TokenModal`).
- **Polish** depois de todas.

### Parallel Opportunities

- Foundational: T006–T012 em paralelo após T002/T003; T014–T019 em paralelo; T020/T021 depois de T018/T019.
- US1: T024, T025, T026, T027, T029, T030 em paralelo; T028 depois de T025–T027.
- US4: T031, T032, T034 em paralelo com T033 no fim.
- US2: T037, T040, T041, T042, T043, T047 em paralelo; backend (T035–T039) e frontend (T042–T046) andam juntos.
- US5: backend (T054–T056) pode ser feito em paralelo com US2/US3.

## Parallel Example: Foundational

```text
Task: "T009 HexGrid.PixelToHex/HexRound em backend/Roll6.Domain/Grid/HexGrid.cs"
Task: "T014 pixelToHex/hexRound em frontend/src/lib/hexGrid.ts"
Task: "T016 types/token.ts e types/mapToken.ts"
Task: "T018 Services/tokenService.ts"
Task: "T019 Services/mapTokenService.ts"
```

## Implementation Strategy

### MVP (US1)

Setup → Foundational → US1: o mapa mostra os tokens gravados e o destaque do hex, para todos.

### Incremental

1. US4: modal de tokens.
2. US2: arrastar personagens (o uso principal).
3. US3: menu do hex para NPCs e troca de token.
4. US5: token do personagem no cadastro + proteção na exclusão.
5. Polish.
