# Tasks: Administração do log de turnos (API e MCP)

**Input**: Design documents from `/specs/030-turn-log-admin/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/mcp.md, quickstart.md

**Tests**: incluídos — o projeto mantém testes de domínio (`Roll6.Tests`) para cada regra de serviço, e os testes de
cobertura do MCP (`McpCoverageTests`/`McpRouteParityTests`) quebram sem as ferramentas novas.

**Organization**: por user story. Todos os caminhos relativos a `backend/`. Frontend **não** é tocado (FR-015).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 alterar, US2 incluir em turnos antigos, US3 excluir, US4 definir turno atual, US5 MCP

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde antes de mexer: `cd backend && dotnet build Roll6.sln && dotnet test` (anotar falhas pré-existentes, se houver)

---

## Phase 2: Foundational (bloqueia as stories)

**Purpose**: repositório, dependência nova do serviço e validações compartilhadas de turno/ator.

- [X] T002 [P] Adicionar a `ITurnRepository<TModel>` em `Roll6.Infra.Interfaces/Repository/ITurnRepository.cs` os métodos `Task<TModel> UpdateAsync(TModel entity)`, `Task<List<int>> ListTurnNosAfterAsync(long campaignId, int turnNo)` (números distintos de turno `> turnNo` com registros, crescente) e `Task<int> DeleteAfterTurnAsync(long campaignId, int turnNo)` (exclui `turn_no > turnNo`, devolve a quantidade), com `<summary>` curtos como os existentes
- [X] T003 Implementar os três métodos em `Roll6.Infra/Repository/TurnRepository.cs` seguindo o estilo dos vizinhos (`UpdateAsync` com `_context.Turns.Update` + `SaveChangesAsync`; `ListTurnNosAfterAsync` com `Where/Select(TurnNo)/Distinct/OrderBy`; `DeleteAfterTurnAsync` com `ExecuteDeleteAsync` como `DeleteByCampaignAsync`) — depende de T002
- [X] T004 Injetar `ICampaignNpcRepository<CampaignNpc>` no `TurnService` (`Roll6.Domain/Services/TurnService.cs`), mantendo `IRealtimeNotifier notifier` como **último** parâmetro do construtor; ajustar a construção em `Roll6.Tests/Domain/Services/TurnServiceTests.cs` (novo `Mock<ICampaignNpcRepository<CampaignNpc>>`). O DI em `Roll6.Application/Startup.cs` resolve sozinho (confirmar que o repositório já está registrado)
- [X] T005 Criar o partial `Roll6.Domain/Services/TurnService.Admin.cs` com os helpers privados usados por US1/US2: `CheckTurnNo(int turnNo, Campaign campaign)` (400 `turnNo`: "O turno deve estar entre 1 e o turno atual ({n})."), `EnsureMapInCampaignAsync(long mapId, long campaignId)` (mapa existe e `map.CampaignId == campaignId`, inclusive Deleted; senão 400 `mapId`) e `EnsureActorInCampaignAsync(long campaignId, long? characterId, long? npcId, long? mapNpcId)` (research D3: `characterId` precisa de participação via `_campaignCharacterRepository.GetAsync(campaignId, characterId)` em qualquer status; `npcId` via `_campaignNpcRepository.GetAsync(campaignId, npcId)`; `mapNpcId` precisa existir, ter `NpcId == npcId` e estar em mapa da campanha; senão 400 no campo) — depende de T004

**Checkpoint**: build verde; stories podem começar.

---

## Phase 3: User Story 2 - Incluir registros em turnos antigos (Priority: P1) 🎯 MVP

**Goal**: `POST /api/turn` aceita os 5 tipos, `moved`, `changes`, limita `turnNo` a 1…turno atual e valida ator/mapa.

**Independent Test**: campanha no turno 6; incluir narração e CharacterUpdate no turno 3 → 201 e aparecem no resumo/narração do turno 3; `turnNo: 7` → 400; personagem de outra campanha → 400.

> Feita antes da US1 porque a US1 (alterar) reaproveita as mesmas validações e a US5 amplia a ferramenta desta rota.

### Tests for User Story 2

- [X] T006 [P] [US2] Em `Roll6.Tests/Domain/Services/TurnServiceTests.cs`, testes de `CreateAsync`: narração (tipo 5) sem ator gravada com `CharacterId/NpcId/MapNpcId` nulos e autor = mestre; narração com `characterId` → 400 `characterId`; CharacterUpdate (tipo 4) com `changes` gravado; CharacterUpdate sem `changes` → 400 `changes`; movimento com `moved` gravado mesmo com movimento já existente no turno (não consulta `ExistsMovementAsync`); `turnNo` > atual e `turnNo` 0 → 400 `turnNo`; `turnNo` omitido = turno atual; personagem sem participação na campanha → 400 `characterId`; NPC fora da campanha → 400 `npcId`; `mapId` de outra campanha → 400 `mapId`; não mestre → `UnauthorizedAccessException`; nenhum `UpdateAsync` de peça/participação/ocorrência é chamado; publica `turn.changed`

### Implementation for User Story 2

- [X] T007 [P] [US2] Em `Roll6.DTO/Turn/TurnInsertInfo.cs` adicionar `[JsonPropertyName("moved")] int? Moved` e `[JsonPropertyName("changes")] List<TurnChangeInfo>? Changes`, e atualizar o comentário de `TurnType` em `Roll6.DTO/Turn/TurnInfo.cs` para "1 Movement, 2 Action, 3 ActionResult, 4 CharacterUpdate, 5 Narration."
- [X] T008 [US2] Reescrever `TurnService.CreateAsync` em `Roll6.Domain/Services/TurnService.cs`: `turnNo = info.TurnNo ?? campaign.CurrentTurn` + `CheckTurnNo`; `mapId` informado → `EnsureMapInCampaignAsync`; tipo 5 → recusar qualquer ator (400 no campo informado) e usar `Turn.Narration(...)`; tipos 1–4 → `EnsureActorInCampaignAsync`; tipo 1 passa `moved: info.Moved`; tipo 4 usa `Turn.CharacterUpdate(...)` com `info.Changes` convertido em `TurnChange` (lista nula = vazia → a fábrica já dá 400 `changes`; `field` vazio → 400 `changes`); mensagem do tipo inválido passa a citar 1–5; atualizar o `<summary>` ("Direct entry by the master in any turn up to the current one…") — depende de T005, T007
- [X] T009 [US2] Rodar `dotnet test --filter "FullyQualifiedName~TurnServiceTests"` até T006 passar

**Checkpoint**: US2 funcional pela API (Swagger/curl do quickstart §2).

---

## Phase 4: User Story 1 - Corrigir um registro de turno (Priority: P1)

**Goal**: `PUT /api/turn/{id}` altera parcialmente um registro, mantendo tipo, ator, autor e data.

**Independent Test**: criar uma ação, alterar o texto → mesma `turnId`/`userId`/`createdAt`, texto novo no resumo; alterar `x` de um movimento não move a peça.

### Tests for User Story 1

- [X] T010 [P] [US1] Em `Roll6.Tests/Domain/Models/TurnTests.cs`, testes dos métodos novos do `Turn`: `ChangeText` em Action/ActionResult (limite 2000) e Narration (limite 10000), vazio → 400, em Movement/CharacterUpdate → 400 `description`; `ChangeMovement` aplica só os valores informados, look fora de 0–5 → 400 no campo, `moved` negativo → 400, em Action → 400; `ChangeChanges` vazia → 400 `changes`, `field` vazio → 400, em Action → 400; `MoveToTurn` 0 e > atual → 400 `turnNo`; tipo/ator/`UserId`/`CreatedAt` nunca mudam
- [X] T011 [P] [US1] Em `Roll6.Tests/Domain/Services/TurnServiceTests.cs`, testes de `UpdateAsync`: registro inexistente → `KeyNotFoundException`; não mestre (inclusive dono do personagem) → `UnauthorizedAccessException`; alteração de texto grava via `_repository.UpdateAsync` e devolve `TurnInfo` com o mesmo `TurnId`; `turnNo` 1…atual aceito, fora → 400; `mapId` de outra campanha → 400; corpo todo nulo → nada muda mas responde 200; nenhuma peça/participação/ocorrência é atualizada; publica `turn.changed`

### Implementation for User Story 1

- [X] T012 [P] [US1] Adicionar em `Roll6.Domain/Models/Turn.cs` os métodos `MoveToTurn(int turnNo, int currentTurn)`, `ChangeText(string? text)` (limite `MAX_NARRATION` para Narration, `MAX_DESCRIPTION` para Action/ActionResult, campo `description`), `ChangeMovement(int? beforeX, int? beforeY, int? beforeLook, int? x, int? y, int? look, int? moved)` (só Movement; reusa `CheckLook`; `moved < 0` → 400), `ChangeChanges(IReadOnlyCollection<TurnChange> changes)` (só CharacterUpdate; não vazia; `Field` obrigatório) e `ChangeMap(long mapId)`, conforme data-model.md; tipo errado → `DomainValidationException` no campo recebido ("Este campo não vale para este tipo de registro.")
- [X] T013 [P] [US1] Criar `Roll6.DTO/Turn/TurnUpdateInfo.cs` com `turnNo`, `mapId`, `description`, `beforeX`, `beforeY`, `beforeLook`, `x`, `y`, `look`, `moved` (todos `int?`/`long?`/`string?`) e `changes` (`List<TurnChangeInfo>?`), cada um com `[JsonPropertyName]` camelCase e `<summary>` "null = keep"
- [X] T014 [US1] Adicionar `Task<TurnInfo> UpdateAsync(long userId, long turnId, TurnUpdateInfo info)` em `Roll6.Domain/Interfaces/ITurnService.cs` e implementar em `Roll6.Domain/Services/TurnService.Admin.cs`: carrega o registro (404 `Registro de turno não encontrado.`), `GetMasteredCampaignAsync`, aplica na ordem `MoveToTurn` (se `TurnNo`), `ChangeMap` (se `MapId`, após `EnsureMapInCampaignAsync`), `ChangeText` (se `Description != null`), `ChangeMovement` (se algum campo de movimento), `ChangeChanges` (se `Changes != null`); `_repository.UpdateAsync`; devolve `MapToDtoAsync(...).Single()`; `PublishTurnChangedAsync` — depende de T005, T012, T013
- [X] T015 [US1] Adicionar em `Roll6.API/Controllers/TurnController.cs` a ação `[HttpPut("{id:long}")] Update(long id, [FromBody] TurnUpdateInfo info)` com `ProducesResponseType(typeof(TurnInfo), 200)`, `try { return Ok(await _service.UpdateAsync(CurrentUserId, id, info)); } catch (Exception ex) { return HandleException(ex); }` e `<summary>` — depende de T014
- [X] T016 [US1] Rodar `dotnet test --filter "FullyQualifiedName~TurnTests|FullyQualifiedName~TurnServiceTests"` até T010/T011 passarem

**Checkpoint**: US1 + US2 funcionais pela API (quickstart §1 e §2).

---

## Phase 5: User Story 3 - Excluir registros de turno (Priority: P2)

**Goal**: garantir que `DELETE /api/turn/{id}` vale para qualquer tipo/turno sem desfazer efeitos (já implementado).

**Independent Test**: excluir a narração do turno 2 → `GET /api/campaign/{id}/turn/narration?turnNo=2` responde 204.

- [X] T017 [P] [US3] Em `Roll6.Tests/Domain/Services/TurnServiceTests.cs`, testes de `DeleteAsync` (se ainda não existirem): exclui Narration e CharacterUpdate de turno antigo chamando `_repository.DeleteAsync`; não chama nenhum `UpdateAsync` de peça/participação/ocorrência; não mestre → `UnauthorizedAccessException`; inexistente → `KeyNotFoundException`
- [X] T018 [US3] Atualizar o `<summary>` de `TurnService.DeleteAsync` (`Roll6.Domain/Services/TurnService.cs`) e da ação `Delete` em `Roll6.API/Controllers/TurnController.cs`: "Deletes any entry of any turn (master only); pieces and values are not rolled back."

**Checkpoint**: US3 coberta.

---

## Phase 6: User Story 4 - Definir o turno atual (Priority: P2)

**Goal**: `PUT /api/campaign/{id}/turn/current` avança/volta o turno, com 409 ou descarte explícito dos registros posteriores.

**Independent Test**: turno 5 → definir 8 (200, `turn.finished`); com registros no 5, definir 3 → 409; com `discardLaterEntries` → 200 `{ previousTurn: 5, turnNo: 3, discardedEntries: n }`.

### Tests for User Story 4

- [X] T019 [P] [US4] Em `Roll6.Tests/Domain/Models/` (arquivo `CampaignTests.cs`, criar se não existir), testes de `Campaign.SetCurrentTurn`: valor ≥ 1 grava e atualiza `UpdatedAt`; 0/negativo → `DomainValidationException` `turnNo`
- [X] T020 [P] [US4] Em `Roll6.Tests/Domain/Services/TurnServiceTests.cs`, testes de `SetCurrentAsync`: não mestre → 403; campanha inexistente → 404; `turnNo` 0 → 400; igual ao atual → resultado com `discardedEntries = 0`, sem `_campaignRepository.UpdateAsync` e sem publicar; avanço → grava e publica `turn.finished` com `finishedTurn = turnNo - 1`; retrocesso sem registros posteriores (`ListTurnNosAfterAsync` vazio) → grava e publica `turn.changed`; retrocesso com registros e sem descarte → `ConflictException` cuja mensagem lista os turnos, nada gravado; com descarte → `DeleteAfterTurnAsync` + `UpdateAsync` dentro de `_unitOfWork.ExecuteInTransactionAsync`, `discardedEntries` = retorno do delete, publica `turn.changed`

### Implementation for User Story 4

- [X] T021 [P] [US4] Adicionar `SetCurrentTurn(int turnNo)` em `Roll6.Domain/Models/Campaign.cs` (400 `turnNo` "O turno deve ser maior que zero."; atualiza `CurrentTurn` e `UpdatedAt`), ao lado de `AdvanceTurn`
- [X] T022 [P] [US4] Criar `Roll6.DTO/Turn/TurnSetCurrentInfo.cs` (`turnNo` int, `discardLaterEntries` bool) e `Roll6.DTO/Turn/TurnSetCurrentResultInfo.cs` (`previousTurn`, `turnNo`, `discardedEntries`), com `[JsonPropertyName]` camelCase e `<summary>`
- [X] T023 [US4] Adicionar `Task<TurnSetCurrentResultInfo> SetCurrentAsync(long userId, long campaignId, TurnSetCurrentInfo info)` em `Roll6.Domain/Interfaces/ITurnService.cs` e implementar em `Roll6.Domain/Services/TurnService.Admin.cs` conforme a tabela de transições do data-model.md (409 via `ConflictException`: "Existem registros nos turnos 4, 5. Envie discardLaterEntries = true para excluí-los."; avanço publica `TableEventType.TURN_FINISHED` com `data: new { finishedTurn = turnNo - 1, turnNo }`; retrocesso publica `TURN_CHANGED`; publicar só depois da gravação) — depende de T003, T021, T022
- [X] T024 [US4] Adicionar em `Roll6.API/Controllers/CampaignController.cs`, logo após `FinishTurn`, a ação `[HttpPut("{id:long}/turn/current")] SetCurrentTurn(long id, [FromBody] TurnSetCurrentInfo info)` com `ProducesResponseType(typeof(TurnSetCurrentResultInfo), 200)`, `<summary>` e o padrão `try/HandleException` — depende de T023
- [X] T025 [US4] Rodar `dotnet test --filter "FullyQualifiedName~CampaignTests|FullyQualifiedName~TurnServiceTests"` até T019/T020 passarem

**Checkpoint**: todas as operações da API prontas (quickstart §3).

---

## Phase 7: User Story 5 - Tudo disponível para assistentes de IA (Priority: P1)

**Goal**: ferramentas MCP para cada operação, guia atualizado, testes de cobertura verdes.

**Independent Test**: pelo MCP com a chave do mestre, `update_turn_entry` e `set_current_turn` alteram os dados; com a chave de um jogador devolvem `isError` com o 403.

- [X] T026 [US5] Em `Roll6.Mcp/Tools/TurnTools.cs`, ampliar `create_turn_entry`: parâmetros `moved` (int?) e `changes` (lista `TurnChangeInfo`, descrita como `[{ field, before, after }]`), `turnType` descrito como "1 Movement, 2 Action, 3 ActionResult, 4 CharacterUpdate, 5 Narration (no actor, up to 10000 characters)", `turnNo` "1 up to the current turn; omit for the turn in progress", descrição explicando que não move peças, não altera valores e ignora o limite de um movimento; erros comuns incluem actor/map not in the campaign; Related tools incluem `update_turn_entry`, `set_current_turn` — depende de T007
- [X] T027 [US5] Em `Roll6.Mcp/Tools/TurnTools.cs`, nova ferramenta `update_turn_entry` (`[McpServerTool(Name = "update_turn_entry", Title = "Update turn entry", ReadOnly = false, Idempotent = true, Destructive = true, OpenWorld = false)]`, `[ApiOperation("PUT", "/api/turn/{id}")]`), parâmetros `turnId` + todos os campos opcionais de `TurnUpdateInfo`, descrição no padrão What it does / Who can use it / Returns / Common errors / Related tools, com `{{McpDocs.DESTRUCTIVE}}`; envia `api.SendAsync(HttpMethod.Put, $"/api/turn/{turnId}", new TurnUpdateInfo { ... })` — depende de T013
- [X] T028 [US5] Em `Roll6.Mcp/Tools/TurnTools.cs`, nova ferramenta `set_current_turn` (`Idempotent = true, Destructive = true`, `[ApiOperation("PUT", "/api/campaign/{id}/turn/current")]`), parâmetros `campaignId` (`McpDocs.CAMPAIGN_ID`), `turnNo`, `discardLaterEntries = false`; descrição explica avanço (= finish sem verificar pendentes, avisa os jogadores), retrocesso (reabre o turno) e o 409; Related tools `finish_turn`/`process_turn`/`get_turn_state` (conferir os nomes reais em `TurnTools.cs`) — depende de T022. Atualizar também a descrição de `delete_turn_entry` (qualquer tipo, qualquer turno)
- [X] T029 [US5] Em `Roll6.Mcp/Roll6Guide.cs`, acrescentar a seção "Fixing the turn log" (contracts/mcp.md): corrigir com `update_turn_entry`, registrar turnos passados com `create_turn_entry` + `turnNo`, apagar com `delete_turn_entry`, ajustar o turno com `set_current_turn`; lembrar que nada disso muda o mapa ou os personagens (usar `process_turn`, `update_participation`, `update_map_npc`)
- [X] T030 [US5] Atualizar `Roll6.Tests/Mcp/McpCoverageTests.cs` (83 → 85 operações, 84 → 86 ferramentas) e, se `Roll6.Tests/Mcp/McpRouteParityTests.cs` tiver casos explícitos por ferramenta, incluir `update_turn_entry` e `set_current_turn`; rodar `dotnet test --filter "FullyQualifiedName~Mcp"` até passar (inclui `McpDescriptionTests`)

**Checkpoint**: API e MCP completos.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T031 Rodar `cd backend && dotnet build Roll6.sln && dotnet test` completo; confirmar que nada em `frontend/` mudou (`git status frontend`)
- [X] T032 [P] Atualizar `CLAUDE.md` (bullet "Turns (feature 016)" em "Backend layout and commands"): `PUT /api/turn/{id}` (parcial, mestre), `POST /api/turn` com tipos 1–5 e `turnNo` 1…atual, ator/mapa da campanha, sem efeitos no mapa/valores, e `PUT /api/campaign/{id}/turn/current` (`discardLaterEntries`, 409, `turn.finished`/`turn.changed`); mencionar MCP `update_turn_entry`/`set_current_turn` e a contagem de 86 ferramentas na linha do 020; acrescentar a entrada `030-turn-log-admin` em `## Recent Changes`
- [X] T033 [P] (pulada: não existe `docs/` no repositório) Se existir documentação de turnos/MCP em `docs/`, pedir ao agente `analyst` para atualizá-la com as duas operações novas (senão, pular)
- [ ] T034 (pendente: sem PostgreSQL acessível nesta máquina; só os testes unitários rodaram) Validar manualmente o `quickstart.md` contra uma API com banco acessível (se disponível no ambiente; senão, registrar que só os testes unitários foram executados)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → stories.
- **US2 (Phase 3)**: depende só da Foundational. MVP.
- **US1 (Phase 4)**: depende da Foundational (helpers de T005); independente de US2 em comportamento, mas edita `TurnService.Admin.cs`/`TurnServiceTests.cs` depois dela — fazer em sequência.
- **US3 (Phase 5)**: independente (só testes e comentários).
- **US4 (Phase 6)**: depende de T003 (repositório); independente de US1/US2.
- **US5 (Phase 7)**: depende dos DTOs de US1 (T013), US2 (T007) e US4 (T022) e das rotas existirem para a paridade.
- **Polish (8)**: depois de tudo.

### Within Each User Story

- Testes escritos antes e falhando → modelo/DTO → serviço → controller → rodar testes.

### Parallel Opportunities

- T002 em paralelo com a leitura/planejamento de T004.
- US2: T006 e T007 em paralelo.
- US1: T010, T011, T012, T013 em paralelo (arquivos diferentes; T011 e T006 tocam o mesmo arquivo de teste — não rodar juntos).
- US4: T019, T021, T022 em paralelo; T020 depois de T011 (mesmo arquivo).
- Polish: T032 e T033 em paralelo.

## Parallel Example: User Story 1

```text
Task: "T010 [US1] Testes dos métodos de alteração em Roll6.Tests/Domain/Models/TurnTests.cs"
Task: "T012 [US1] Métodos MoveToTurn/ChangeText/ChangeMovement/ChangeChanges/ChangeMap em Roll6.Domain/Models/Turn.cs"
Task: "T013 [US1] TurnUpdateInfo em Roll6.DTO/Turn/TurnUpdateInfo.cs"
```

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2.
2. Phase 3 (US2 — incluir em turnos antigos com todos os tipos) → validar com quickstart §2.
3. Phase 4 (US1 — alterar) → validar com quickstart §1.

### Incremental Delivery

4. US3 (exclusão, só garantia) → US4 (turno atual) → US5 (MCP; obrigatório antes do merge porque `McpCoverageTests` quebra sem as ferramentas das rotas novas) → Polish.

## Notes

- Nenhuma migração, nenhuma mudança em `frontend/`.
- Conflitos sempre com `ConflictException` (nunca `InvalidOperationException`).
- Publicar eventos em tempo real só depois da gravação com sucesso.
