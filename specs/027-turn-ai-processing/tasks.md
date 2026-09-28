# Tasks: Dados do turno e processamento do turno para IA

**Input**: Design documents from `specs/027-turn-ai-processing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: incluídos — o projeto cobre regras de domínio em `Roll6.Tests`; atomicidade e validação do lote são o
núcleo da funcionalidade; os testes do MCP exigem as ferramentas novas.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 = Dados do Turno; US2 = Processar o Turno; US3 = resposta com os dados atualizados

---

## Phase 1: Setup

Nada a configurar.

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T001 [P] `backend/Roll6.Domain/Enums/TurnType.cs`: `Narration = 5` (doc: narração do turno, sem ator, criada pelo processamento)
- [X] T002 `backend/Roll6.Domain/Models/Turn.cs`: `MAX_NARRATION = 10000`; fábrica `Narration(campaignId, mapId, turnNo, userId, text)` sem ator (não passa pela regra "exatamente um de personagem/NPC"), texto obrigatório ≤ 10000; `userId` > 0 e `turnNo` ≥ 1 como nas demais (depende de T001)
- [X] T003 `backend/Roll6.Infra/Context/Roll6Context.cs`: `description` com `HasMaxLength(Turn.MAX_NARRATION)`; migração `dotnet ef migrations add TurnNarration --project Roll6.Infra --startup-project Roll6.API` (só altera o tamanho) (depende de T002)
- [X] T004 [P] DTOs em `backend/Roll6.DTO/Turn/`: `TurnDataInfo`, `TurnDataCharacterInfo`, `TurnDataNpcInfo`, `TurnProcessInfo`, `TurnProcessCharacterInfo`, `TurnProcessNpcInfo`, `TurnProcessResultInfo` conforme `data-model.md` (camelCase, doc comments)
- [X] T005 `backend/Roll6.Domain/Turns/TurnSummary.cs`: linha de `TurnType.Narration` (`{autor}: Narração: {texto}` escapado) e `BuildActions(lines)` que devolve só a seção "## Ações" (o `Build` passa a usá-la); teste em `backend/Roll6.Tests/Domain/Turns/TurnSummaryTests.cs`
- [X] T006 [P] `backend/Roll6.Tests/Domain/Models/TurnTests.cs`: narração sem ator é válida, exige texto, recusa > 10000; ações continuam limitadas a 2000

**Checkpoint**: build e testes verdes.

---

## Phase 3: User Story 1 - A IA lê o turno inteiro em uma chamada (Priority: P1) 🎯 MVP

**Goal**: `GET /api/campaign/{id}/turn/data` com personagens, NPCs e ações.

**Independent Test**: quickstart passo 1.

### Tests for User Story 1

- [X] T007 [P] [US1] `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`: `GetDataAsync` devolve personagens aprovados (com jogador, atuais/totais, status e posição/`lookName` quando há peça no mapa atual; sem peça → posição nula), ocorrências do mapa atual (duas ocorrências do mesmo NPC = duas entradas, com totais do NPC) e `actions` igual à seção "## Ações" do resumo; sem `turnNo` = turno atual; `turnNo` fora do intervalo → 400; estranho → 403

### Implementation for User Story 1

- [X] T008 [US1] `backend/Roll6.Domain/Services/TurnService.cs`: extrair de `GetSummaryAsync` um `LoadSnapshotAsync(campaign, turnNo)` (registros, peças do mapa, participações, personagens, donos, ocorrências, NPCs, usuários, linhas e posições) e reescrever `GetSummaryAsync` sobre ele sem mudar a saída (os testes do resumo seguem verdes)
- [X] T009 [US1] `GetDataAsync(userId, campaignId, turnNo?)` em `backend/Roll6.Domain/Interfaces/ITurnService.cs` e `backend/Roll6.Domain/Services/TurnService.cs`: participações aprovadas (`ListByCampaignAsync(approvedOnly: true)`) + personagens + donos; ocorrências do mapa atual (`IMapNpcRepository.ListByMapAsync`) + NPCs; peças do mapa atual para posição; `actions` via `TurnSummary.BuildActions`; `lookName` via `TurnSummary.Direction` (depende de T008)
- [X] T010 [US1] `backend/Roll6.API/Controllers/CampaignController.cs`: `[HttpGet("{id:long}/turn/data")]` com `[FromQuery] int? turnNo` → `TurnDataInfo`

**Checkpoint**: dados do turno numa chamada.

---

## Phase 4: User Story 2 - A IA grava o resultado do turno em uma chamada (Priority: P1)

**Goal**: `POST /api/campaign/{id}/turn/process` atômico que finaliza o turno.

**Independent Test**: quickstart passos 2–6.

### Tests for User Story 2

- [X] T011 [P] [US2] `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs` (processamento): lote válido grava participação (vida/fadiga/status), ocorrência, move a peça, insere `CharacterUpdate`/`Movement`/`Narration` com o mestre como autor, avança o turno e publica `party.changed`, `mapTokens.changed` e `turn.finished`; item só com status muda só o status; `clearStatus` apaga
- [X] T012 [P] [US2] Mesmo arquivo (validação/atomicidade): lote vazio → 400 `batch`; item repetido → 400; personagem não aprovado / ocorrência de outro mapa → 400 no item; vida acima do total → 400 `characters[0].currentLife`; destino ocupado, fora da grid ou dois itens no mesmo hex → 400; troca de hex entre duas peças do lote é aceita; em todos os erros nenhuma escrita e `current_turn` inalterado; não mestre → 403

### Implementation for User Story 2

- [X] T013 [US2] `ProcessAsync(userId, campaignId, TurnProcessInfo)` em `ITurnService`/`TurnService`: fase de validação (acumula erros por `characters[i].campo`/`npcs[i].campo`; carrega participações, personagens, ocorrências, NPCs, peças e o modelo do mapa — injetar `IMapModelRepository<MapModel>` antes do `IRealtimeNotifier`, ajustando o construtor nos testes), usando `CampaignCharacter.UpdatePlay` (mantendo `Sheet`) e `MapNpc.Update` para as regras de vitais/status e `HexGrid.IsInsideGrid` + conjunto de destinos finais para posições (depende de T009)
- [X] T014 [US2] Fase de escrita em `IUnitOfWork.ExecuteInTransactionAsync`: atualizar participações/ocorrências/peças, inserir `CharacterUpdate` (só campos que mudaram: `currentLife`, `currentEnergy`, `characterStatus`/`status`), `Movement` (antes/depois, `moved` = `HexGrid.MovementCost` sem obstáculos, sem a regra de um movimento por turno), `Narration` (mapa atual), e `campaign.AdvanceTurn()` + `UpdateAsync`; depois publicar os eventos (depende de T013)
- [X] T015 [US2] `backend/Roll6.API/Controllers/CampaignController.cs`: `[HttpPost("{id:long}/turn/process")]` com `[FromBody] TurnProcessInfo` → `TurnProcessResultInfo`

**Checkpoint**: um lote grava tudo e fecha o turno; um lote inválido não muda nada.

---

## Phase 5: User Story 3 - Resposta pronta para conferir (Priority: P2)

- [X] T016 [US3] `ProcessAsync` devolve `TurnProcessResultInfo { finishedTurn, turnNo, data = GetDataAsync(turno processado) }` e teste em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs` comparando `data` com `GetDataAsync` do turno processado (depende de T014)

---

## Phase 6: Polish & Cross-Cutting

- [X] T017 [P] MCP em `backend/Roll6.Mcp/Tools/TurnTools.cs`: `get_turn_data` (GET, ReadOnly/Idempotent) e `process_turn` (POST, Destructive — finaliza o turno; parâmetros `campaignId`, `characters`, `npcs`, `narration`; descrição com o fluxo `get_turn_data` → decidir → `process_turn` e onde ficam ficha/anotações); contagens em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (+2 operações, +2 ferramentas); guia `backend/Roll6.Mcp/Roll6Guide.cs`
- [X] T018 [P] Frontend: `TURN_TYPE.narration: 5` em `frontend/src/types/turn.ts` e rótulo em `frontend/src/components/modals/TurnSummaryModal.tsx` + `frontend/src/i18n/locales/pt-BR.json` (`turn.narration`); conferir `lib/turnStatus.ts` (narração não conta como ação)
- [X] T019 Aplicar a migração no banco de dev, regenerar `database/roll6.sql` e criar `database/migrations/027-turn-narration.sql` (a partir de `RenameMapNpcCurrentVitals`)
- [X] T020 [P] `CLAUDE.md` (Turns: `Narration`, `turn/data`, `turn/process`, atomicidade, finalização) e `## Recent Changes`; Bruno `bruno/Turn/Data.bru` e `bruno/Turn/Process.bru`
- [X] T021 Rodar `dotnet build`, `dotnet test`, `npm run lint`, `npm test`, `npm run build` e validar o `quickstart.md` contra a API local

---

## Dependencies & Execution Order

- Phase 2: T001 ∥ T004 → T002 → T003; T005, T006 após T002.
- US1: T007 → T008 → T009 → T010.
- US2 depende de US1 (reusa o snapshot e o `GetDataAsync`): T011/T012 → T013 → T014 → T015.
- US3: T016 após T014.
- Polish: T017, T018, T020 em paralelo; T019 e T021 no fim.

### Parallel Opportunities

- T001 ∥ T004; T005 ∥ T006; T011 ∥ T012 (mesmo arquivo — escrever em sequência se preferir); T017 ∥ T018 ∥ T020.

## Implementation Strategy

1. **MVP**: Phase 2 + US1 + US2 — ler o turno e processá-lo em duas chamadas.
2. US3: resposta com os dados atualizados.
3. Polish: MCP, frontend mínimo, SQL, docs, Bruno e validação.
