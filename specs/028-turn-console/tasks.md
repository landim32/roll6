# Tasks: Console de turnos na barra inferior

**Input**: Design documents from `specs/028-turn-console/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: incluídos — regra de paginação no backend (`Roll6.Tests`), merge/dedupe da lista no frontend (Vitest) e a
cobertura do MCP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 = abrir o console; US2 = lista infinita; US3 = tempo real; US4 = ampliar

---

## Phase 1: Setup

Nada a configurar.

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T001 [P] DTOs em `backend/Roll6.DTO/Turn/TurnHistoryInfo.cs`: `TurnHistoryPageInfo { campaignId, currentTurn, items, nextBefore }` e `TurnHistoryItemInfo { turnNo, actions, finishedAt }` (camelCase, doc comments)
- [X] T002 [P] `ListByCampaignTurnRangeAsync(long campaignId, int fromTurn, int toTurn)` em `backend/Roll6.Infra.Interfaces/Repository/ITurnRepository.cs` e `backend/Roll6.Infra/Repository/TurnRepository.cs` (ordem: `turn_no`, `created_at`, `turn_id`; `AsNoTracking`)
- [X] T003 [P] Testes em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs` para `GetHistoryAsync`: turno atual 12 sem `before` → itens 11..7 (limite 5) com `nextBefore` 7; `before` 3 → itens 2 e 1 com `nextBefore` null; turno atual 1 → vazio e `nextBefore` null; `limit` limitado a 1–20; `before` < 1 → 400; estranho → 403; o texto de cada item é o `BuildActions` dos registros daquele turno (turno sem registros → "Nenhuma ação registrada.") e `finishedAt` = hora do último registro
- [X] T004 `GetHistoryAsync(userId, campaignId, before?, limit?)` em `backend/Roll6.Domain/Interfaces/ITurnService.cs` e `backend/Roll6.Domain/Services/TurnService.Processing.cs`: leitura como o turno; intervalo de turnos finalizados; uma consulta de registros (T002) + `LoadNamesAsync` uma vez; agrupar por turno e `TurnSummary.BuildActions(BuildLines(...))` (depende de T001, T002)
- [X] T005 `backend/Roll6.API/Controllers/CampaignController.cs`: `[HttpGet("{id:long}/turn/history")]` com `[FromQuery] int? before, [FromQuery] int? limit` → `TurnHistoryPageInfo` (depende de T004)
- [X] T006 MCP `get_turn_history` em `backend/Roll6.Mcp/Tools/TurnTools.cs` (`[ApiOperation("GET", "/api/campaign/{id}/turn/history")]`, ReadOnly/Idempotent, descrição com as seções padrão e o uso do `nextBefore`) e contagens +1 em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs`
- [X] T007 [P] Frontend: `TurnHistoryPageInfo`/`TurnHistoryItemInfo` em `frontend/src/types/turn.ts` e `history(campaignId, before?, limit?)` em `frontend/src/Services/turnService.ts`
- [X] T008 [P] `frontend/src/lib/turnHistory.ts` (+ `turnHistory.test.ts`): `mergeTurnPages(current, incoming)` (dedupe por `turnNo`, ordem decrescente), `actionLines(actions)` (remove o cabeçalho "## Ações" e linhas vazias), `newTurnsCount(knownTop, turnNo)`

**Checkpoint**: endpoint e MCP respondendo; `dotnet test` e `npm test` verdes.

---

## Phase 3: User Story 1 - Abrir o console de turnos sobre o mapa (Priority: P1) 🎯 MVP

**Goal**: botão central na barra e o painel semitransparente com o histórico.

**Independent Test**: quickstart passos 1 e 3.

- [X] T009 [US1] `frontend/src/hooks/useTurnHistory.ts`: carrega a primeira página da campanha atual (reinicia ao trocar de campanha), expõe `{ items, loading, error, done, loadMore, retry }`; nada é pedido quando `TurnContext.turnNo` é null (sem acesso) (depende de T007, T008)
- [X] T010 [US1] `frontend/src/components/turns/TurnHistoryList.tsx`: blocos "Turno N" (+ hora) com as linhas de `actionLines` em texto puro (`white-space: pre-wrap`), estados vazio ("Nenhum turno finalizado ainda"), carregando, erro com "Tentar de novo" e fim ("Início da campanha"); prop `compact` para a fonte pequena (depende de T009)
- [X] T011 [US1] `frontend/src/components/map/TurnConsole.tsx`: faixa acima da barra (cabeçalho "Turnos" + botão "Ampliar"), usando `TurnHistoryList compact`; `frontend/src/components/map/GridSizeFooter.tsx`: botão central com chevron ↑/↓ (`aria-expanded`), visível só com `turnNo !== null`, estado em localStorage `roll6:console-open` (try/catch), renderiza o `TurnConsole` quando aberto (depende de T010)
- [X] T012 [P] [US1] Estilos em `frontend/src/styles/app.css`: botão central da barra (`position: absolute; left: 50%`), `.stm-turn-console` (bottom = altura da barra, largura central, `max-height: 35vh`, fundo semitransparente com `backdrop-filter`, fonte ~0.75rem, rolagem interna, `pointer-events` só no painel), responsivo em telas pequenas
- [X] T013 [P] [US1] Textos em `frontend/src/i18n/locales/pt-BR.json` (`turnConsole.*`: título, abrir/fechar, ampliar, vazio, carregando, erro, tentar de novo, início da campanha, novidades, "Turno {{no}}")

**Checkpoint**: console abre/fecha pela seta e lembra o estado.

---

## Phase 4: User Story 2 - Histórico infinito (Priority: P1)

**Goal**: carregar turnos mais antigos ao rolar até o fim.

**Independent Test**: quickstart passo 2.

- [X] T014 [US2] `TurnHistoryList`: sentinela no fim com `IntersectionObserver` (root = contêiner rolável) que chama `loadMore` quando visível e não está carregando/fim/erro; `useTurnHistory.loadMore` usa `nextBefore` e `mergeTurnPages`; erro mantém os itens e mostra "Tentar de novo" (depende de T010)

---

## Phase 5: User Story 3 - Atualização em tempo real (Priority: P1)

**Goal**: turno finalizado aparece no topo para todos, sem pular a leitura.

**Independent Test**: quickstart passo 4.

- [X] T015 [US3] `useTurnHistory`: observar `useTurn().turnNo`; quando sobe acima do último conhecido, buscar `history(before = turnNo, limit = novos)` e fazer merge no topo (funciona com o evento `turn.finished` e com a verificação periódica sem tempo real) (depende de T009)
- [X] T016 [US3] `TurnHistoryList`: ao receber blocos no topo com o contêiner rolado, preservar a posição (ajustar `scrollTop` pela diferença de `scrollHeight`) e mostrar o botão "Novidades" que rola ao topo; rolado no topo, só mostrar (depende de T014, T015)

---

## Phase 6: User Story 4 - Ampliar em tela cheia (Priority: P2)

- [X] T017 [US4] `frontend/src/components/modals/TurnConsoleModal.tsx`: `Modal wide` "Histórico de turnos" com `TurnHistoryList` (fonte normal, mesmo hook/estado para não recarregar); aberto pelo "Ampliar" do `TurnConsole`; fechar volta ao console como estava (depende de T011)

---

## Phase 7: Polish & Cross-Cutting

- [X] T018 [P] `CLAUDE.md` (Turns: `GET …/turn/history` paginado por `before`; frontend `TurnConsole`/`TurnConsoleModal`/`TurnHistoryList`/`useTurnHistory`, `roll6:console-open`) e `## Recent Changes`; `backend/Roll6.Mcp/Roll6Guide.cs` (histórico em lotes); Bruno `bruno/Turn/History.bru`
- [X] T019 Rodar `dotnet build`, `dotnet test`, `npm run lint`, `npm test`, `npm run build` e validar o `quickstart.md` (API local; UI até onde for possível)

---

## Dependencies & Execution Order

- Phase 2: T001 ∥ T002 ∥ T003 ∥ T007 ∥ T008 → T004 → T005 → T006.
- US1: T009 → T010 → T011; T012, T013 livres.
- US2: T014 após T010. US3: T015 após T009; T016 após T014 + T015. US4: T017 após T011.
- Polish por último.

### Parallel Opportunities

- Backend (T001–T006) e frontend base (T007–T008) juntos; T012 ∥ T013; T018 com o restante pronto.

## Implementation Strategy

1. **MVP**: Phase 2 + US1 + US2 + US3 — console com histórico infinito e atualização ao finalizar o turno.
2. US4: janela ampliada.
3. Polish: docs, guia, Bruno e validação.
