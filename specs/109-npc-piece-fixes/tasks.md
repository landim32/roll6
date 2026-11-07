# Tasks: Peças de NPC e de objeto — postura, arrasto, retirada e painel

**Input**: Design documents from `/specs/109-npc-piece-fixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos — o projeto cobre regras de domínio (xUnit) e módulos puros do frontend (Vitest), e a spec exige
um teste que reproduza a peça duplicada (FR-012).

**Organization**: por user story (US1 corpo, US2 postura de objeto, US3 arrasto da unidade, US4 peça duplicada, US5 painel).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- Caminhos relativos à raiz do repositório (`C:\repos\Roll6`)

---

## Phase 1: Setup

- [X] T001 Reproduzir a peça duplicada em dev (`dotnet run --project backend/Roll6.API` + `npm run dev`), com o log de rede aberto, nos fluxos: soltar card no 2D, soltar card no isométrico, "Incluir NPC" com NPC novo e mapa aberto, "Incluir NPC" com NPC já na campanha, e "Incluir NPC" seguido de arrastar o card; anotar quantos `POST /api/mapnpc` cada gesto faz (e com/sem `x`/`y`) na seção "R4 — Diagnóstico" de `specs/109-npc-piece-fixes/research.md`

---

## Phase 2: Foundational (bloqueia US1 e US2)

**Purpose**: a postura de objeto é a base do corpo deixado (US1) e da postura editável (US2).

- [X] T002 Adicionar `public Posture Posture { get; set; } = Posture.Standing;`, `bool ChangePosture(int posture)` (fora de 1–3 → `DomainValidationException("posture", "A postura deve ser 1 (Em pé), 2 (Caído) ou 3 (Fora de Combate).")`, mesmo valor → `false`, senão atualiza `UpdatedAt`) e `void LeaveBody(string name, Posture posture)` (só quando `MapNpcId` não é null: `MapNpcId = null`, `TokenType = Object`, `Posture = posture`, `Name = Guard.RequiredText(name, "name", 260)`, `Life = Energy = Move = 0`, `Status = Sheet = null`, walk limpo, mantém id/mapa/token/X/Y/Look) em `backend/Roll6.Domain/Models/MapToken.cs`
- [X] T003 Mapear a coluna em `backend/Roll6.Infra/Context/Roll6Context.cs` (bloco de `MapToken`): `entity.Property(e => e.Posture).HasColumnName("posture").HasConversion<int>().HasDefaultValue(Posture.Standing).HasSentinel((Posture)0);`
- [X] T004 Gerar a migração `AddObjectPosture` (`dotnet ef migrations add AddObjectPosture --project Roll6.Infra --startup-project Roll6.API` em `backend/`), escrever `database/migrations/109-object-posture.sql` (`ALTER TABLE map_tokens ADD COLUMN posture integer NOT NULL DEFAULT 1;` + inserção em `__EFMigrationsHistory`, no formato de `database/migrations/108-character-single-map.sql`) e regenerar `database/roll6.sql` mantendo o cabeçalho
- [X] T005 Usar a postura da peça para objetos: em `backend/Roll6.Domain/Services/MapOccupancyLoader.cs` (`PosturesAsync`: peças sem participação nem instância → `p.Posture`) e em `MapToDtoAsync` de `backend/Roll6.Domain/Services/MapTokenService.cs` (valores base `Posture = (int)mapToken.Posture`, `Space = MapOccupancyLoader.PieceSpace(token, mapToken.Posture)`; `UpSpace` continua com `null`)
- [X] T006 [P] Testes de `MapToken.ChangePosture`/`LeaveBody` (valores inválidos, mesmo valor, campos zerados e mantidos, `LeaveBody` em peça de objeto lança) em `backend/Roll6.Tests/Domain/Models/MapTokenTests.cs`

**Checkpoint**: `dotnet build backend/Roll6.sln` e `dotnet test --filter "FullyQualifiedName~MapTokenTests"` passam.

---

## Phase 3: User Story 1 - Retirar um NPC caído deixa o corpo no mapa (P1) 🎯 MVP

**Goal**: retirar uma instância Caída/Fora de Combate deixa a peça no mesmo hex como objeto; em pé, apaga como hoje.

**Independent Test**: NPC caído no mapa → X do card / "Retirar do mapa" / "Retirar da campanha" → a peça fica no hex,
deitada e cinza de objeto; o card some; os registros do turno continuam.

### Tests for User Story 1

- [X] T007 [P] [US1] Testes da regra pura `NpcRemoval.Decide` (Standing → Delete; Down e OutOfCombat → Body) em `backend/Roll6.Tests/Domain/Npcs/NpcRemovalTests.cs`
- [X] T008 [P] [US1] Testes de `MapNpcService.DeleteAsync` em `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs`: instância Caída → `IMapTokenRepository.UpdateAsync` com a peça convertida (tipo 4, `MapNpcId` null, nome e postura da instância, mesmo X/Y/Look) e nenhum `DeleteByMapNpcIdsAsync`; instância Em pé → `DeleteByMapNpcIdsAsync` como hoje; a instância é marcada removida nos dois casos
- [X] T009 [P] [US1] Testes de `MapTokenService.DeleteAsync` para peça de NPC em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: Fora de Combate → peça atualizada (não apagada) e evento `mapToken.upserted` em vez de `mapToken.deleted`; Em pé → comportamento atual
- [X] T010 [P] [US1] Testes de `CampaignNpcService.RemoveAsync` em `backend/Roll6.Tests/Domain/Services/CampaignNpcServiceTests.cs`: com uma instância caída e uma em pé, só a peça em pé é apagada e a caída vira objeto

### Implementation for User Story 1

- [X] T011 [US1] Criar a regra pura `public static class NpcRemoval { public enum Outcome { Delete, Body } public static Outcome Decide(MapNpc instance) }` em `backend/Roll6.Domain/Npcs/NpcRemoval.cs` (Body quando `instance.Posture != Posture.Standing`)
- [X] T012 [US1] Em `backend/Roll6.Domain/Services/MapNpcService.cs` `DeleteAsync`: buscar a peça (`_mapTokenRepository.GetByMapNpcIdAsync`), e na transação, se `NpcRemoval.Decide(mapNpc) == Body` e houver peça, `piece.LeaveBody(mapNpc.Name, mapNpc.Posture)` + `UpdateAsync`; senão `DeleteByMapNpcIdsAsync` como hoje; atualizar o comentário XML do método
- [X] T013 [US1] Em `backend/Roll6.Domain/Services/MapTokenService.cs` `DeleteAsync`: quando a peça é de NPC e `NpcRemoval.Decide(occurrence) == Body`, `mapToken.LeaveBody(occurrence.Name, occurrence.Posture)` + `_repository.UpdateAsync` em vez de `DeleteAsync`, e publicar `PublishPieceAsync(map, userId, await MapToDtoAsync(mapToken))` em vez de `MAP_TOKEN_DELETED`; manter `TURN_CHANGED`
- [X] T014 [US1] Em `backend/Roll6.Domain/Services/CampaignNpcService.cs` `RemoveAsync`: carregar as peças com `_mapTokenRepository.ListByMapNpcIdsAsync(mapNpcIds)`, converter (`LeaveBody` + `UpdateAsync`) as das instâncias com `Body` e apagar só as outras (`DeleteByMapNpcIdsAsync` com os ids das instâncias `Delete`), tudo na transação existente
- [X] T015 [US1] Na confirmação de retirada de `frontend/src/pages/MainPage.tsx` (título `npcs.removeFromMapTitle`), usar a mensagem `npcs.removeFromMapLeavesBody` quando `toDelete.posture !== POSTURE.standing`; criar a chave em `frontend/src/i18n/locales/pt-BR.json` ("{{name}} sai do painel; o corpo fica no mapa como objeto.") e aplicar a mesma escolha à confirmação do X da linha no card (mesmo `ConfirmModal`)
- [X] T016 [P] [US1] Atualizar as descrições MCP em `backend/Roll6.Mcp/Tools/MapNpcTools.cs` (remover instância), `backend/Roll6.Mcp/Tools/MapTokenTools.cs` (excluir peça) e `backend/Roll6.Mcp/Tools/CampaignNpcTools.cs` (retirar da campanha): "an instance that is Down or OutOfCombat leaves its piece on the map as an Object piece (same id, hex and token)"

**Checkpoint**: US1 testável pelo roteiro 2 do `quickstart.md`.

---

## Phase 4: User Story 2 - Postura em peças de objeto (P1)

**Goal**: o mestre muda a postura de objetos pelo menu do hex; desenho e espaço seguem a postura.

**Independent Test**: "Incluir token" → Postura → Caído / Fora de Combate, visto no 2D, iso e por outro participante.

### Tests for User Story 2

- [X] T017 [P] [US2] Testes de `MapTokenService.SetPostureAsync` para objetos em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: mestre → postura gravada, `mapToken.upserted` publicado, nenhum `ITurnRepository.InsertAsync`; não mestre → `UnauthorizedAccessException`; mesmo valor → sem `UpdateAsync` nem evento; `space` devolvido = espaço caído do token
- [X] T018 [P] [US2] Testes Vitest: `canSetPosture` aceita objeto só com `canPlace` em `frontend/src/lib/mapInteraction.test.ts`; `miniatureState` de objeto Caído → `tipped: true`, Fora de Combate → `gray: true` em `frontend/src/lib/isoMiniature.test.ts`

### Implementation for User Story 2

- [X] T019 [US2] Em `backend/Roll6.Domain/Services/MapTokenService.Posture.cs`, trocar o `throw "Objetos não têm postura."` por `SetObjectPostureAsync(userId, map, mapToken, info.Posture)`: `map.UserId != userId` → `UnauthorizedAccessException("Apenas o mestre altera a postura de objetos.")`; `if (!mapToken.ChangePosture(posture)) return;`; `_repository.UpdateAsync(mapToken)`; `PublishPieceAsync(map, userId, await MapToDtoAsync(mapToken))`; sem turno; atualizar o comentário XML ("Objects: master only, no turn entry")
- [X] T020 [US2] Em `frontend/src/lib/mapInteraction.ts` `canSetPosture`: objetos permitidos quando `ctx.canPlace` (mestre), personagens/NPCs como hoje
- [X] T021 [P] [US2] Em `frontend/src/lib/isoMiniature.ts` `miniatureState`: remover a exceção de objetos (tomba e fica cinza pela postura); em `frontend/src/lib/pieceDrawing.ts` corrigir o comentário de `isShownIn3d` ("objects have no posture" → objetos seguem a própria postura)
- [X] T022 [P] [US2] Atualizar a descrição de `set_piece_posture` em `backend/Roll6.Mcp/Tools/MapTokenTools.cs` (objetos: só o mestre, sem registro de turno) e a seção de peças/postura de `backend/Roll6.Mcp/Roll6Guide.cs`

**Checkpoint**: US1 + US2 funcionam; o corpo deixado pode mudar de postura.

---

## Phase 5: User Story 3 - Arrastar uma instância de NPC, não o grupo (P2)

**Goal**: a linha de uma instância arrasta só aquela peça; o cabeçalho cria; a imagem arrastada é uma unidade.

**Independent Test**: NPC com duas instâncias → arrastar a linha de "Guarda 2" → só ela move; arrastar o cabeçalho → nova instância.

### Tests for User Story 3

- [X] T023 [P] [US3] Testes Vitest de `mapNpcDropAction` em `frontend/src/lib/mapTokens.test.ts`: `none` sem hex, `same` no próprio hex, `occupied` sobre outra peça, `blocked` com a forma fora da grade, `move` em hex livre (forma de espaço 3 inclusive)

### Implementation for User Story 3

- [X] T024 [US3] Em `frontend/src/lib/mapTokens.ts`: exportar `MAP_NPC_DRAG_TYPE = 'application/x-roll6-map-npc'` e a função pura `mapNpcDropAction({ hex, piece, tokens, columns, rows })` (`lib/occupancy` + `footprint` com `piece.look`/`piece.space`, ignorando a própria peça) → `{ kind: 'none' | 'same' | 'occupied' | 'blocked' | 'move', mapTokenId? }`
- [X] T025 [US3] Em `frontend/src/components/map/NpcCard.tsx`: cada `<li>` de instância com `draggable={draggable}` e `onDragStart` que chama `event.stopPropagation()`, `setData(MAP_NPC_DRAG_TYPE, String(piece.mapTokenId))`, `effectAllowed = 'move'` e `setDragImage` de um retrato da instância (ref para o avatar); o `onDragStart` do card passa a usar `setDragImage` com o seu `CharacterAvatar` (ref no `<span>`), nunca o card inteiro; botões lápis/X com `draggable={false}`
- [X] T026 [US3] Em `frontend/src/hooks/useMapInteraction.ts`: `acceptsDrag` aceita `MAP_NPC_DRAG_TYPE`, `dropEffectOf` → `'move'` para ele, e `drop` trata o tipo antes de `NPC_DRAG_TYPE`: acha a peça em `mapTokens`, aplica `mapNpcDropAction` e, em `move`, chama `moveToken(mapTokenId, hex.x, hex.y)` + `refreshTurn()` (toasts `mapTokens.hexOccupied`/`mapTokens.doesNotFit`; peça ausente → toast `common.unknownError`); vale para `MapCanvas` e `IsoView` sem mudança neles
- [X] T027 [P] [US3] Estilo de arrasto da linha (`cursor: grab` só para o mestre) em `frontend/src/styles/app.css` (`.stm-party-draggable li[draggable="true"]`)

**Checkpoint**: US3 testável pelo roteiro 3 do `quickstart.md`.

---

## Phase 6: User Story 4 - Uma inclusão de NPC grava uma única peça (P1, depende de US3)

**Goal**: nenhum gesto cria duas instâncias; o posicionamento automático fica visível.

**Independent Test**: roteiro 4 do `quickstart.md`, contando os `POST /api/mapnpc` no log de rede.

### Tests for User Story 4

- [X] T028 [P] [US4] Testes Vitest de `npcDropAction` com `recentAutoPlaced` em `frontend/src/lib/mapTokens.test.ts`: mesmo NPC dentro de 10 s → `move` da peça recente; depois de 10 s ou outro NPC → `place`; hex ocupado → `occupied`
- [X] T029 (não se aplica: R4 — Diagnóstico) [P] [US4] Se T001 mostrar requisição dupla: teste que reproduz a origem (Vitest do módulo culpado ou xUnit em `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs`), escrito antes da correção

### Implementation for User Story 4

- [X] T030 (não se aplica: R4 — Diagnóstico) [US4] Se T001 mostrar requisição dupla: corrigir na origem identificada e registrar a causa em `specs/109-npc-piece-fixes/research.md` (R4 — Diagnóstico)
- [X] T031 [US4] Em `frontend/src/Contexts/NpcContext.tsx`: `placeOnMap` sem `x`/`y` grava `recentAutoPlaced = { npcId, mapTokenId, at: Date.now() }` (peça achada pelo `mapNpcId` devolvido, depois de `refreshMapTokens`) e expõe `recentAutoPlaced` no contexto
- [X] T032 [US4] Em `frontend/src/lib/mapTokens.ts` `npcDropAction`: novos parâmetros opcionais `recentAutoPlaced` e `now`, constante `AUTO_PLACE_GRACE_MS = 10000`; dentro do prazo e mesmo `npcId` → `{ kind: 'move', mapTokenId }` (respeitando `mapNpcDropAction` para ocupado/não cabe)
- [X] T033 [US4] Em `frontend/src/hooks/useMapInteraction.ts` `dropNpc`: passar `recentAutoPlaced` e tratar `move` com `moveToken` + toast `toast.npcMoved` (nova chave em `frontend/src/i18n/locales/pt-BR.json`: "{{name}} foi levado para o hex escolhido.")
- [X] T034 [US4] Em `frontend/src/components/modals/NpcPickerModal.tsx`: depois de cada `placeOnMap(npcId)` sem hex, centralizar a peça nova (`MapEditorContext.centerOn` na posição da instância devolvida) e trocar os toasts `toast.npcAddedPlaced`/`toast.npcPlaced` deste fluxo por `toast.npcAutoPlaced` ("{{name}} entrou no mapa perto do meio. Arraste a linha dele no card para mudar de lugar.") em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: SC-004 conferido no roteiro 4.

---

## Phase 7: User Story 5 - Painel de NPCs não fica sob os botões do mapa (P3)

**Goal**: o painel da direita termina acima da coluna de botões e rola.

**Independent Test**: roteiro 5 do `quickstart.md` (15 NPCs, desktop/celular, mapa/dividido, "Editar mapa" ligado).

- [X] T035 [US5] Em `frontend/src/pages/MainPage.tsx`: `ResizeObserver` sobre o elemento `.stm-controls` dentro de `.stm-map-region` (`mapRegion` já existe) que grava `--stm-controls-space` = `${altura + 8}px` em `mapRegion.style`, removendo a propriedade ao desmontar; observar também a troca de `viewMode`/layout (o elemento pode ser recriado)
- [X] T036 [P] [US5] Em `frontend/src/styles/app.css`: manter `--stm-controls-space: 240px` / `72px` como fallback e garantir `overflow-y: auto` em `.stm-party.stm-side-right` (a lista rola, o título fica visível); conferir que o `max-height` usa a variável herdada de `.stm-map-region`

---

## Phase 8: Polish & Cross-Cutting

- [X] T037 [P] Atualizar `CLAUDE.md`: em "Map, pieces, posture" (objetos têm `map_tokens.posture`, só o mestre, sem turno), em "NPCs" (retirada de instância Caída/Fora de Combate deixa o corpo como objeto) e na seção de frontend do card de NPC (arrasto da linha = mover, cabeçalho = criar, guarda de 10 s, `--stm-controls-space` medido); adicionar a entrada em "Recent Changes"
- [X] T038 Rodar `dotnet test` em `backend/` (incluindo `McpCoverageTests`, `McpRouteParityTests`, `McpDescriptionTests`) e `npm test`, `npm run lint`, `npm run build` em `frontend/`
- [ ] T039 Executar o `specs/109-npc-piece-fixes/quickstart.md` inteiro em dev e anotar o resultado

---

## Dependencies & Execution Order

- **Setup (T001)**: primeiro; o resultado decide T029/T030.
- **Foundational (T002–T006)**: bloqueiam US1 e US2.
- **US1 (T007–T016)** e **US2 (T017–T022)**: depois da Foundational; independentes entre si (T009 e T017 tocam o mesmo arquivo de teste — fazer em sequência).
- **US3 (T023–T027)**: só frontend; pode começar junto com a Foundational.
- **US4 (T028–T034)**: depende de US3 (`mapNpcDropAction`, tratamento de `move` no hook) e de T001.
- **US5 (T035–T036)**: independente de tudo.
- **Polish (T037–T039)**: no fim.

Dentro de cada story: testes antes da implementação; modelos → serviços → frontend → descrições MCP.

## Parallel Examples

```text
# Foundational + frontend em paralelo
T006 (MapTokenTests)  |  T023 (mapTokens.test)  |  T035 (MainPage ResizeObserver)

# US1 — testes em paralelo
T007 NpcRemovalTests  |  T008 MapNpcServiceTests  |  T010 CampaignNpcServiceTests

# US2
T018 (Vitest)  |  T021 (isoMiniature/pieceDrawing)  |  T022 (MCP)
```

## Implementation Strategy

1. **MVP**: T001 → Foundational → US1 + US2 (corpo deixado com postura editável) → validar roteiros 1 e 2.
2. US3 + US4: arrasto da unidade e fim da peça duplicada → roteiros 3 e 4.
3. US5: painel → roteiro 5.
4. Polish e um commit `fix: …` por entrega (correções sobre recursos existentes; ver "Versioning and commit messages").
