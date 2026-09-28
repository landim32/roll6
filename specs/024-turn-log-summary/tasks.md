# Tasks: Registro completo do turno e resumo em markdown

**Input**: Design documents from `specs/024-turn-log-summary/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: incluídos — o projeto cobre regras de domínio em `Roll6.Tests` e regras puras com Vitest; o exemplo da spec
é o caso de referência do gerador do resumo; os testes do MCP exigem a ferramenta nova.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 = registro completo com autor; US2 = resumo em markdown; US3 = modal no rodapé

---

## Phase 1: Setup

Nada a configurar: sem pacote ou projeto novo.

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T001 [P] Adicionar `CharacterUpdate = 4` em `backend/Roll6.Domain/Enums/TurnType.cs` (doc: alteração de personagem/NPC gerada pelo sistema)
- [X] T002 [P] Criar `backend/Roll6.Domain/Models/TurnChange.cs`: `record`/classe `{ Field, Before, After }` (strings) + `static List<TurnChange> Diff(params (string Field, object? Before, object? After)[] pairs)` que devolve só os pares cujo texto difere (null = "")
- [X] T003 Em `backend/Roll6.Domain/Models/Turn.cs`: propriedades `UserId` (long), `Moved` (int?), `Changes` (List<TurnChange>?); fábricas passam a receber `long userId` (obrigatório, > 0) — `Movement(..., userId, moved)`, `Action(..., userId)`, `ActionResult(..., userId)` — e nova `CharacterUpdate(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, userId, changes)` que recusa lista vazia (depende de T001, T002)
- [X] T004 Mapear em `backend/Roll6.Infra/Context/Roll6Context.cs`: `user_id` (obrigatório, FK `fk_user_turn` → `User`, `ClientSetNull`, índice `ix_turns_user`), `moved`, `changes` (`jsonb`, `ValueConverter` List<TurnChange> ⇄ JSON com `System.Text.Json`, `ValueComparer` por conteúdo) (depende de T003)
- [X] T005 Gerar a migração `dotnet ef migrations add AddTurnAuthorMovedChanges --project Roll6.Infra --startup-project Roll6.API` e reescrever o `Up` em 3 passos: adiciona `user_id` nulo + `moved` + `changes`; `migrationBuilder.Sql` com o backfill (Movement/Action com `character_id` → `characters.user_id`; demais → `campaigns.user_id`); `AlterColumn` para `NOT NULL`, índice e FK (depende de T004)
- [X] T006 [P] DTOs em `backend/Roll6.DTO/Turn/`: `TurnInfo` + `userId`, `userName`, `moved`, `changes`; novo `TurnChangeInfo { field, before, after }`; novo `TurnSummaryInfo { campaignId, turnNo, markdown }`
- [X] T007 Ajustar todas as chamadas às fábricas de `Turn` (`MapTokenService`, `TurnService`) e os testes existentes (`TurnTests`, `TurnServiceTests`, `MapTokenServiceTests`) para compilar com o `userId` (depende de T003)

**Checkpoint**: `dotnet build backend/Roll6.sln` e `dotnet test` verdes.

---

## Phase 3: User Story 1 - Toda alteração fica registrada no turno, com autor (Priority: P1) 🎯 MVP

**Goal**: movimentos com autor e pontos gastos; ações/resultados com autor; alterações de personagem/NPC viram `CharacterUpdate`.

**Independent Test**: quickstart passos 1–3 e 6 conferidos pela lista do turno (`GET /api/campaign/{id}/turn`).

### Tests for User Story 1

- [X] T008 [P] [US1] `backend/Roll6.Tests/Domain/Models/TurnTests.cs`: fábricas exigem `userId` > 0; `CharacterUpdate` recusa lista vazia e guarda as mudanças; `TurnChange.Diff` ignora campos iguais (inclusive null vs "")
- [X] T009 [P] [US1] `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: movimento do jogador grava `UserId` = jogador e `Moved` = custo calculado; movimento do mestre também grava `Moved` e o mestre como autor
- [X] T010 [P] [US1] `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`: `UpdateAsync` do mestre mudando vida/energia/status cria **um** `CharacterUpdate` com as três mudanças e o mestre como autor no turno atual; sem mudanças não cria; mudança só nas anotações cria com campo `notes`
- [X] T011 [P] [US1] `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs`: `UpdateAsync` cria `CharacterUpdate` com `NpcId`/`MapNpcId` só quando nome/vida/energia/status mudam
- [X] T012 [P] [US1] `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`: `UpdateAsync` mudando vida total cria um `CharacterUpdate` em cada campanha com participação aprovada (turno atual de cada uma); mudar só imagem/ficha não cria
- [X] T013 [P] [US1] `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`: `ActAsync`/`CreateAsync` gravam o autor; `ResetAsync` apaga só Movement/Action e mantém `CharacterUpdate`; `FinishAsync` ignora `CharacterUpdate` nas pendências; `CreateAsync` com `turnType` 4 → 400

### Implementation for User Story 1

- [X] T014 [US1] `backend/Roll6.Domain/Services/MapTokenService.cs`: em `MoveAsync`/`PrepareMovementTurnAsync`, calcular o custo com `HexGrid.MovementCost` para toda peça de personagem/NPC (se não houver caminho com obstáculos, calcular sem obstáculos) e criar o `Movement` com `userId` e `moved`; o jogador continua limitado pelo `move` (depende de T007)
- [X] T015 [US1] `backend/Roll6.Domain/Services/TurnService.cs`: autor em `ActAsync`/`CreateAsync`; `CreateAsync` recusa `TurnType.CharacterUpdate`; `ResetAsync` filtra `Movement`/`Action`; `MapToDtoAsync` preenche `userId`, `userName` (via `IUserRepository.ListByIdsAsync`), `moved`, `changes`
- [X] T016 [US1] Criar helper `backend/Roll6.Domain/Turns/TurnRecorder.cs` (ou método privado compartilhado) que, dado campanha + ator + autor + mudanças, insere o `CharacterUpdate` no turno em andamento e devolve se inseriu — usado pelos três serviços abaixo
- [X] T017 [US1] `backend/Roll6.Domain/Services/CampaignCharacterService.cs`: em `UpdateAsync`, capturar os valores antes, aplicar `UpdatePlay`, `TurnChange.Diff(currentLife, currentEnergy, characterStatus, notes)` e, se houver mudança, inserir o `CharacterUpdate` (mapa = mapa atual da campanha) na mesma transação; publicar `turn.changed` (depende de T016)
- [X] T018 [US1] `backend/Roll6.Domain/Services/MapNpcService.cs`: idem em `UpdateAsync` com `name`, `life`, `energy`, `status`, `npc_id` + `map_npc_id`, mapa da ocorrência (injetar `ITurnRepository`, `ICampaignRepository` se preciso; `IRealtimeNotifier` segue último parâmetro) (depende de T016)
- [X] T019 [US1] `backend/Roll6.Domain/Services/CharacterService.cs`: em `UpdateAsync`, `Diff(name, life, energy, move)` e, se houver mudança, um `CharacterUpdate` para cada campanha com participação aprovada (`ICampaignCharacterRepository` + `ICampaignRepository` para o turno atual) na transação existente; publicar `turn.changed` por campanha (depende de T016)
- [X] T020 [P] [US1] Frontend `frontend/src/types/turn.ts`: `TURN_TYPE.characterUpdate: 4`, `TurnChangeInfo`, campos `userId`, `userName`, `moved`, `changes` em `TurnInfo`; conferir em `frontend/src/lib/turnStatus.ts` (e seu teste) que balões, rastros e pontos de status ignoram `characterUpdate`

**Checkpoint**: registros novos aparecem na lista do turno com autor, pontos gastos e mudanças.

---

## Phase 4: User Story 2 - Resumo do turno em markdown (Priority: P1)

**Goal**: texto com "Ações" e "Posições" para qualquer turno; sem número = turno em andamento.

**Independent Test**: o teste de referência do `TurnSummary` reproduz o exemplo da spec; `GET /api/campaign/{id}/turn/summary` devolve o texto.

### Tests for User Story 2

- [X] T021 [P] [US2] Criar `backend/Roll6.Tests/Domain/Turns/TurnSummaryTests.cs`: caso de referência = exemplo da spec (movimento de Cedric por José com custo 3, alteração do GM Rodrigo em vida/energia/status, ação de Comam por Rodrigo, posições de Cedric/Comam/Goblin) comparado linha a linha; turno vazio → "Nenhuma ação registrada."; dono alterando o próprio personagem → "Cedric (José): Alterou: …"; anotações → "Anotações alteradas"; movimento sem `moved` omite o custo; total "(T)" soma os movimentos do ator; escape de `*`, `_`, `#`, `[` em nomes; direções 0–5
- [X] T022 [P] [US2] Em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`: `GetSummaryAsync` sem `turnNo` usa o turno atual; com turno passado usa a posição do último movimento até ele; `turnNo` < 1 ou > atual → 400; quem não lê a campanha → 403

### Implementation for User Story 2

- [X] T023 [US2] Criar `backend/Roll6.Domain/Turns/TurnSummary.cs` (puro, sem I/O): tipos de entrada (`SummaryEntry`, `SummaryActor`, `SummaryPosition`), `Directions` pt-BR (0 Norte, 1 Nordeste, 2 Sudeste, 3 Sul, 4 Sudoeste, 5 Noroeste), rótulos de campos, escape markdown e `Build(...)` no formato de `research.md` R7 (depende de T021)
- [X] T024 [US2] `backend/Roll6.Domain/Interfaces/ITurnService.cs` + `backend/Roll6.Domain/Services/TurnService.cs`: `Task<TurnSummaryInfo> GetSummaryAsync(long userId, long campaignId, int? turnNo)` — leitura como `GetStateAsync`; carrega registros, personagens/donos, ocorrências/NPCs, autores, peças do mapa (mapa atual para o turno em andamento; mapa dos registros para turnos passados) e posições históricas (último `Movement` por ator com `turn_no ≤ N`, novo `ITurnRepository.ListLastMovementsAsync(campaignId, turnNo)`), sem N+1 (depende de T023)
- [X] T025 [US2] Implementar `ListLastMovementsAsync` em `backend/Roll6.Infra.Interfaces/Repository/ITurnRepository.cs` e `backend/Roll6.Infra/Repository/TurnRepository.cs`
- [X] T026 [US2] `backend/Roll6.API/Controllers/CampaignController.cs`: `[HttpGet("{id:long}/turn/summary")]` com `[FromQuery] int? turnNo` → `TurnSummaryInfo` (padrão `try/HandleException`) — declarar **antes** de `{id}/turn/{turnNo:int}` não é necessário (restrição `:int`), mas conferir a rota (depende de T024)
- [X] T027 [US2] MCP: `get_turn_summary` em `backend/Roll6.Mcp/Tools/TurnTools.cs` (`[ApiOperation("GET", "/api/campaign/{id}/turn/summary")]`, `campaignId`, `turnNo?` como query, descrição com as seções padrão, ReadOnly/Idempotent) e contagens em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (+1 operação, +1 ferramenta)

**Checkpoint**: resumo correto pela API e pelo MCP.

---

## Phase 5: User Story 3 - Copiar o resumo pelo rodapé (Priority: P2)

**Goal**: clicar em "Turno N" abre o resumo com seletor de turno e "Copiar".

**Independent Test**: quickstart passos 4–5 no navegador.

- [X] T028 [P] [US3] `TurnSummaryInfo` em `frontend/src/types/turn.ts` e `summary(campaignId: number, turnNo?: number): Promise<TurnSummaryInfo>` em `frontend/src/Services/turnService.ts`
- [X] T029 [US3] Criar `frontend/src/components/modals/TurnLogModal.tsx` conforme `contracts/ui.md` (select de turnos N..1, `<pre className="stm-turn-log">`, Copiar com `navigator.clipboard.writeText` + toasts, recarrega quando `useTurn().turnNo`/`entries` mudam) e o estilo `.stm-turn-log` (monoespaçado, `white-space: pre-wrap`, altura máxima com rolagem) no CSS global existente (depende de T028)
- [X] T030 [US3] `frontend/src/components/map/GridSizeFooter.tsx`: o badge "Turno N" vira `<button type="button">` com o mesmo visual e `title`, abrindo o `TurnLogModal` (depende de T029)
- [X] T031 [P] [US3] Textos em `frontend/src/i18n/locales/pt-BR.json`: título, rótulo do seletor, "(em andamento)", Copiar, Fechar, "Resumo copiado", "Não foi possível copiar", title do botão do rodapé

**Checkpoint**: resumo aberto e copiado a partir do rodapé.

---

## Phase 6: Polish & Cross-Cutting

- [X] T032 Aplicar a migração no banco de desenvolvimento, regenerar `database/roll6.sql` (mantendo o cabeçalho) e gerar `database/migrations/024-turn-log-summary.sql` (da última migração da `main` até `AddTurnAuthorMovedChanges`, idempotente, com cabeçalho)
- [X] T033 [P] Atualizar `CLAUDE.md` (Turns: `user_id`, `moved`, `changes`, `CharacterUpdate`, quem gera, reset, resumo e endpoint; frontend `TurnLogModal`; MCP) e `## Recent Changes`; mencionar o resumo em `backend/Roll6.Mcp/Roll6Guide.cs`
- [X] T034 [P] Bruno: requisição `Turn/Summary` (`GET /api/campaign/{{campaignId}}/turn/summary`) na coleção `bruno/`
- [X] T035 Rodar `dotnet build`, `dotnet test`, `npm run lint`, `npm test`, `npm run build`
- [X] T036 Validar o `quickstart.md` contra a API local

---

## Dependencies & Execution Order

- Phase 2: T001 ∥ T002 ∥ T006 → T003 → T004 → T005; T007 depois de T003.
- US1: testes T008–T013 → T014/T015 → T016 → T017 ∥ T018 ∥ T019 (arquivos diferentes); T020 livre.
- US2 depende da Phase 2 (e usa dados de US1 para ter conteúdo): T021/T022 → T023 → T025 → T024 → T026 → T027.
- US3 depende de T026 (endpoint): T028 → T029 → T030; T031 livre.
- Polish por último.

### Parallel Opportunities

- T001 ∥ T002 ∥ T006; T008–T013 entre si; T017 ∥ T018 ∥ T019; T021 ∥ T022; T028 ∥ T031; T033 ∥ T034.
- Frontend (T020, T028–T031) em paralelo ao backend depois dos contratos.

### Parallel Example: User Story 1

```text
T008 TurnTests | T009 MapTokenServiceTests | T010 CampaignCharacterServiceTests | T011 MapNpcServiceTests | T012 CharacterServiceTests | T013 TurnServiceTests
T017 CampaignCharacterService | T018 MapNpcService | T019 CharacterService
```

## Implementation Strategy

1. **MVP**: Phase 2 + US1 + US2 — registros completos e resumo pela API/MCP.
2. **Incremento**: US3 — modal no rodapé com cópia.
3. Polish: scripts SQL, documentação, Bruno e validação.
