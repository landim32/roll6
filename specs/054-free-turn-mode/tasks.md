# Tasks: Modo livre do turno

**Input**: Design documents from `/specs/054-free-turn-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-and-api.md, quickstart.md

**Tests**: incluídos — o plano lista os testes de serviço (xUnit) que pinam as quatro regras relaxadas e os testes Vitest das regras puras (`lib/freeMode`, `lib/movement` ilimitado); os testes de cobertura/paridade/descrição do MCP são obrigatórios por `CLAUDE.md`. `cd backend && dotnet test`; `cd frontend && npm test`.

**Organization**: fases por história de usuário. Backend em `backend/` (Domain → Infra → API → Mcp → Tests), frontend em `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história a que a tarefa pertence (US1–US4)
- Caminhos exatos em cada tarefa

## Path Conventions

Web app: `backend/Roll6.Domain/`, `backend/Roll6.DTO/`, `backend/Roll6.Infra/`, `backend/Roll6.API/`, `backend/Roll6.Mcp/`, `backend/Roll6.Tests/`; `frontend/src/lib/`, `frontend/src/components/`, `frontend/src/Contexts/` (uppercase), `frontend/src/Services/` (uppercase), `frontend/src/hooks/`, `frontend/src/types/`, `frontend/src/i18n/locales/pt-BR.json`; scripts em `database/`.

---

## Phase 1: Setup (a flag no modelo, no banco e nos DTOs)

**Purpose**: a coluna `free_mode`, o modelo e os DTOs que todas as histórias leem. Nada de regra ainda.

- [X] T001 Em `backend/Roll6.Domain/Models/Campaign.cs`: propriedade `public bool FreeMode { get; set; }` (comentário: modo livre, 054) e `public void SetFreeMode(bool freeMode)` que grava o valor e `UpdatedAt = DateTime.UtcNow`.
- [X] T002 Em `backend/Roll6.Infra/Context/Roll6Context.cs`, bloco `campaigns`: `entity.Property(e => e.FreeMode).HasColumnName("free_mode").HasDefaultValue(false);` ao lado de `status`.
- [X] T003 Gerar a migração: `cd backend && dotnet ef migrations add AddCampaignFreeMode --project Roll6.Infra --startup-project Roll6.API`; conferir que o `Up` só adiciona `free_mode boolean not null default false` em `campaigns`. Regenerar `database/roll6.sql` com `dotnet ef migrations script --idempotent --project Roll6.Infra --startup-project Roll6.API -o ../database/roll6.sql` (manter o cabeçalho).
- [X] T004 [P] Criar `database/migrations/054-campaign-free-mode.sql` com `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS free_mode boolean NOT NULL DEFAULT false;` e um comentário de cabeçalho no padrão dos scripts anteriores (`051-npc-instances.sql`).
- [X] T005 [P] DTOs em `backend/Roll6.DTO/Campaign/`: `CampaignInfo.cs` e `CampaignTableInfo.cs` ganham `[JsonPropertyName("freeMode")] public bool FreeMode { get; set; }` (comentário 054); criar `CampaignFreeModeInfo.cs` com `[JsonPropertyName("freeMode")] public bool FreeMode { get; set; }`.
- [X] T006 Em `backend/Roll6.Domain/Services/CampaignService.cs`: `MapToDtoAsync` preenche `FreeMode = campaign.FreeMode`; `ListTableAsync` preenche `FreeMode = row.FreeMode` — adicionar `FreeMode` a `CampaignTableRow` e à projeção de `backend/Roll6.Infra/Repository/CampaignRepository.cs` (`ListTableAsync`).
- [X] T007 [P] Em `backend/Roll6.Tests/Domain/Models/CampaignTests.cs`: `SetFreeMode_TogglesAndBumpsUpdatedAt` (false → true → false, `UpdatedAt` avança) e `NewCampaign_IsNotFree` (padrão false).
- [X] T008 [P] Frontend: `frontend/src/types/campaign.ts` — `freeMode: boolean` em `CampaignInfo` e `CampaignTableInfo` (comentário 054: ausente = false).
- [X] T009 [P] Chaves em `frontend/src/i18n/locales/pt-BR.json`: `turn.freeMode` "Livre", `turn.freeModeTitle` "Modo livre: várias ações por personagem, movimento livre sem rastro e sem lista de pendentes", `turn.freeBadge` "Turno livre", `toast.freeModeOn` "Modo livre ligado", `toast.freeModeOff` "Modo livre desligado".

---

## Phase 2: Foundational (a regra pura do frontend)

**Purpose**: o módulo puro que todas as telas consultam. Bloqueia as fases de UI das US1–US4.

- [X] T010 Criar `frontend/src/lib/freeMode.ts` (puro, sem React): `isFreeMode(campaign: { freeMode?: boolean } | null | undefined): boolean` (true só com `freeMode === true`); `showPending(status: number | undefined, freeMode: boolean)` = `isPlayable(status) && !freeMode` (importar `isPlayable` de `./campaignStatus`); `showTrails(freeMode: boolean)` = `!freeMode`; `movementKindFor(tokenType: number, freeMode: boolean): MovementKind` → `MOVEMENT_KIND.free` para objetos (`MAP_TOKEN_TYPE.object`), `MOVEMENT_KIND.unlimited` em modo livre, senão `MOVEMENT_KIND.limited` (a constante `unlimited` nasce na T031; até lá a função fica na T031 — ver dependências). Cabeçalho explicando que o servidor decide e isto só espelha.
- [X] T011 [P] Criar `frontend/src/lib/freeMode.test.ts`: `isFreeMode` com null/undefined/`{}`/`{ freeMode: false }`/`{ freeMode: true }`; `showPending` nas 4 combinações (status Ativa 2 / Pausada 3 × freeMode); `showTrails`; `movementKindFor` para objeto (sempre `free`), personagem em modo livre (`unlimited`) e fora dele (`limited`).

---

## Phase 3: User Story 1 — Mestre liga e desliga o modo livre (Priority: P1) 🎯 MVP

**Goal**: o endpoint, a ferramenta MCP, a chave "Livre" do mestre e a indicação "Turno livre" para todos; ligar/desligar nunca toca o turno; ao ligar os rastros somem e as peças ficam.

**Independent Test**: quickstart passos 1, 2, 8 (só a parte "sem pergunta, turno não muda") e 9: ligar numa aba, ver o badge na outra sem recarregar, rastros somem, recarregar mantém, desligar não pergunta nem muda o turno, funciona com a campanha pausada.

- [X] T012 [US1] Em `backend/Roll6.Domain/Interfaces/ICampaignService.cs` + `backend/Roll6.Domain/Services/CampaignService.cs`: `Task<CampaignInfo> SetFreeModeAsync(long userId, long campaignId, CampaignFreeModeInfo info)` no molde de `SetStatusAsync` — `GetOwnedAsync` (403/404), mesmo valor → devolve o DTO sem evento, senão `campaign.SetFreeMode`, `UpdateAsync` e `campaign.changed` com o `CampaignInfo`. **Não** chamar `EnsurePlayable` (FR-015: qualquer status).
- [X] T013 [US1] Em `backend/Roll6.API/Controllers/CampaignController.cs`: `[HttpPut("{id:long}/free-mode")]` `SetFreeMode(long id, [FromBody] CampaignFreeModeInfo info)` → `Ok(await _campaignService.SetFreeModeAsync(CurrentUserId, id, info))` dentro do `try/catch HandleException`, com `ProducesResponseType(typeof(CampaignInfo), 200)` e summary "Switches the campaign's free mode (054, master)".
- [X] T014 [P] [US1] Em `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`: `SetFreeMode_OnlyMaster` (outro usuário → `UnauthorizedAccessException`), `SetFreeMode_SameValue_PublishesNothing` (nenhum `PublishAsync`), `SetFreeMode_Change_PublishesCampaignChanged` (evento `campaign.changed` com `freeMode` true no `data`), `SetFreeMode_AllowedWhilePaused` (status Pausada → não lança).
- [X] T015 [US1] Em `backend/Roll6.Mcp/Tools/CampaignTools.cs`: ferramenta `set_campaign_free_mode` (`[ApiOperation("PUT", "/api/campaign/{id}/free-mode")]`, `ReadOnly = false, Idempotent = true, Destructive = false`, parâmetros `campaignId` e `freeMode` descritos) com `[Description]` em inglês — *What it does* (várias ações válidas por ator; movimentos sem limite e sem registro; `finish_turn` sem lista de pendentes; sem aviso de maioria; `process_turn`, o número do turno e o chat não mudam; ligar/desligar nunca altera o turno), *Who can use it* (só o mestre, em qualquer status), *Returns* (campanha com `freeMode`), *Common errors* (403, 404), *Related tools* (`finish_turn`, `act_in_turn`, `move_map_token`, `set_campaign_status`).
- [X] T016 [US1] Em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs`: contagens `expected.Should().HaveCount(101)` e `tools.Should().HaveCount(101 + 1)` (102 ferramentas); rodar `dotnet test --filter "FullyQualifiedName~Mcp"` até passar (cobertura, paridade e descrição).
- [X] T017 [P] [US1] Em `backend/Roll6.Mcp/Roll6Guide.cs`: nova seção `## Free mode` (após "Campaign status") com as regras do contrato (o que relaxa, o que não muda, como se liga, que desligar não pergunta nem fecha o turno e que a próxima ação volta a cancelar as anteriores); na seção "Turns", o primeiro bullet passa a dizer que o "move once / one valid action" vale **outside free mode**. Mencionar `set_campaign_free_mode` na lista de ferramentas da campanha, se o guia tiver uma.
- [X] T018 [US1] Frontend `frontend/src/Services/campaignService.ts`: `async setFreeMode(id: number, freeMode: boolean): Promise<CampaignInfo>` → `PUT ${API_BASE}/${id}/free-mode` com `{ freeMode }`, mesmo padrão de `setStatus`.
- [X] T019 [US1] `frontend/src/Contexts/CampaignContext.tsx`: `setFreeMode: (freeMode: boolean) => Promise<CampaignInfo>` no `CampaignContextType` (comentário 054, lança o erro da API e o valor anterior fica) e a implementação no molde de `setCampaignStatus` (aplica a campanha devolvida em `currentCampaign` e atualiza `tableCampaigns`); exportar no `useMemo`/deps.
- [X] T020 [US1] `frontend/src/components/menu/TurnControls.tsx`: a chave "Livre" — `div.form-check.form-switch.form-check-inline` com `input.form-check-input[type=checkbox role=switch]` + `label` `t('turn.freeMode')`, `title`/`aria-label` `t('turn.freeModeTitle')`, `checked={isFreeMode(currentCampaign)}`, `onChange` → `setFreeMode(!checked)` com `toast.success(t(next ? 'toast.freeModeOn' : 'toast.freeModeOff'))` e `toast.error` em falha (sem confirmação, FR-004). Renderizada para o mestre **em qualquer status** (mover o `return null` de `!isPlayable` para envolver só o botão "Finalizar turno"; a chave aparece sempre que `turnNo !== null && isMaster`). Disabled enquanto a chamada corre.
- [X] T021 [P] [US1] `frontend/src/components/map/GridSizeFooter.tsx`: após "Turno N", `<span className="badge text-bg-info ms-2">{t('turn.freeBadge')}</span>` quando `isFreeMode(currentCampaign)` (todos os participantes).
- [X] T022 [P] [US1] `frontend/src/components/menu/TableSelect.tsx`: badge "Livre" (`badge text-bg-info`) ao lado do nome da campanha quando `campaign.freeMode` (linha da campanha atual e lista), ao lado do badge de status quando os dois se aplicam — usar `tableCampaigns[].freeMode`.
- [X] T023 [US1] `frontend/src/components/map/MapCanvas.tsx`: `const freeMode = isFreeMode(currentCampaign)`; `trails = showTrails(freeMode) ? movementTrails(turnEntries, draft.mapId) : []` (FR-013: os rastros somem ao ligar, as peças ficam — nada mais muda aqui nesta fase).
- [X] T024 [US1] Conferir que `RealtimeContext` aplica `campaign.changed` com o `freeMode` (já aplica o `CampaignInfo` inteiro em `frontend/src/Contexts/RealtimeContext.tsx`; se o handler copiar campo a campo, incluir `freeMode`) e que `CampaignContext.refreshTableCampaigns` traz `freeMode` para o `TableSelect`.
- [X] T025 [US1] Rodar `cd backend && dotnet build Roll6.sln && dotnet test` e `cd frontend && npm run lint && npx tsc --noEmit && npm test`; executar os passos 1, 2 e 9 do quickstart.

---

## Phase 4: User Story 2 — Várias ações por personagem no turno livre (Priority: P1)

**Goal**: em modo livre nenhuma ação cancela a anterior (agir, converter mensagem em ação); o resumo/dados listam todas; o balão mostra a última; apagar cancela só uma; resetar cancela todas sem mover a peça; ao sair do modo a próxima ação cancela todas as anteriores.

**Independent Test**: quickstart passos 3, 4, 7 e a parte de ações do passo 8.

- [X] T026 [US2] Em `backend/Roll6.Domain/Services/TurnService.cs` `ActAsync`: `var cancelled = campaign.FreeMode ? new List<Turn>() : await CancelValidActionsAsync(...)` (comentário 054: em modo livre todas as ações do ator ficam válidas); o resto (salvar, `PublishUpdatedAsync` dos cancelados — lista vazia —, `turn.changed`, `NotifyActionAsync`) fica igual.
- [X] T027 [US2] Em `backend/Roll6.Domain/Services/TurnService.ChatActions.cs` `ConvertAsync` (ramo `to == "action"`): mesmo desvio — `cancelled` vazio em `campaign.FreeMode`.
- [X] T028 [US2] Em `backend/Roll6.Domain/Services/TurnService.cs` `ResetAsync`: em `campaign.FreeMode`, filtrar `entries` para `TurnType.Action` apenas (`movement` fica null → `reverted` false → nada move, nenhum `DeleteRangeAsync`); devolver `Reverted = true` como hoje quando `movement == null`. Comentário 054: movimentos não são gravados em modo livre e um gravado antes não teleporta a peça.
- [X] T029 [P] [US2] Em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`: `Act_InFreeMode_KeepsPreviousActionValid` (campanha `FreeMode = true` com uma ação válida do ator; agir de novo → `UpdateAsync` do antigo **não** chamado, nenhum `chat.updated`, `turn.changed` publicado, N2 enfileirado); `Act_AfterLeavingFreeMode_CancelsAllEarlierActions` (`FreeMode = false`, `ListValidActionsAsync` devolve 3 → 3 `UpdateAsync` com `CancelledAt`); `Reset_InFreeMode_CancelsActionsOnly` (entradas com 1 Movement + 2 Action → 2 cancelados, `DeleteRangeAsync` não chamado, peça não atualizada, `Reverted` true); `Convert_ToAction_InFreeMode_CancelsNothing` (em `TurnServiceChatTests.cs` se o convert estiver testado lá).
- [X] T030 [US2] Textos MCP: `backend/Roll6.Mcp/Tools/TurnTools.cs` `act_in_turn` ("…cancels the actor's previous valid action **unless the campaign is in free mode** (`set_campaign_free_mode`), when every action stays valid and the map shows the last one") e `reset_turn` ("in free mode it only cancels the actions; the piece stays"); `backend/Roll6.Mcp/Tools/ChatTools.cs` `convert_chat_entry` (mesma nota do `act_in_turn`). Rodar `dotnet test --filter "FullyQualifiedName~McpDescriptionTests"`.
- [X] T031 [US2] Frontend: confirmar (sem código novo) que `lib/turnStatus.lastActions` já devolve a última ação por ator (balões 2D `SpeechBubbleLayer` e 3D `BubbleLayer`) e que `ChatItem`/`permissionsFor` mostram várias ações válidas; executar os passos 3, 4 e 7 do quickstart e a parte de ações do passo 8. Se `currentAction` (campo "Agir" pré-preenchido com a ação atual) incomodar em modo livre, manter como está (spec não pede mudança).

---

## Phase 5: User Story 3 — Ninguém é cobrado no turno livre (Priority: P2)

**Goal**: sem figuras de pendentes, "Finalizar turno" fecha de imediato, sem aviso de maioria; tudo volta ao sair do modo.

**Independent Test**: quickstart passo 6 e a parte de pendentes do passo 8.

- [X] T032 [US3] Em `backend/Roll6.Domain/Services/TurnService.cs` `FinishAsync`: `if (missingIds.Count > 0 && !info.Force && !campaign.FreeMode)` (comentário 054: em modo livre ninguém deve a jogada). O modo **não** é desligado ao finalizar.
- [X] T033 [US3] Em `backend/Roll6.Domain/Services/TurnService.Notices.cs` `NotifyMajorityAsync`: `if (campaign.FreeMode || campaign.MajorityNotifiedTurn == campaign.CurrentTurn) return;`.
- [X] T034 [P] [US3] Em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`: `Finish_InFreeMode_IgnoresPending` (2 aprovados, 0 ações, `Force = false` → `Finished` true, `AdvanceTurn`, divisor inserido, `turn.finished`; `campaign.FreeMode` continua true) e `Act_InFreeMode_SendsNoMajorityNotice` (1 de 2 aprovados agindo → nenhum `TableNotices.Majority` na fila, `TrySetMajorityNotifiedAsync` não chamado).
- [X] T035 [US3] Texto MCP `finish_turn` em `backend/Roll6.Mcp/Tools/CampaignTools.cs`: "in free mode it finishes at once (no pending list) and the mode stays on".
- [X] T036 [US3] `frontend/src/components/chat/PendingPlayers.tsx`: `if (pending.length === 0 || !showPending(currentCampaign?.status, isFreeMode(currentCampaign))) return null;` (substitui o `isPlayable` direto; importar de `../../lib/freeMode`).
- [X] T037 [US3] Executar o passo 6 do quickstart e a parte de pendentes do passo 8 (as figuras voltam ao desligar).

---

## Phase 6: User Story 4 — Movimento livre, sem rastro e sem contador (Priority: P2)

**Goal**: em modo livre, personagens e NPCs movem quantas vezes quiserem para qualquer hex onde caibam, sem custo, sem registro, sem rastro e sem contador; ao sair, uma vez por turno e limitado de novo.

**Independent Test**: quickstart passos 5, 10 e a parte de movimento do passo 8.

- [X] T038 [US4] Em `backend/Roll6.Domain/Services/MapTokenService.cs` `MoveAsync`: carregar a campanha uma vez (reaproveitar a de `EnsureMapEditableAsync` — fazê-la devolver a `Campaign`, ou buscar por `map.CampaignId`); passar `campaign.FreeMode` para `EnsurePlayerMoveAsync` (em modo livre só a checagem de dono/aprovado, sem custo — comentário 054) e para `PrepareMovementTurnAsync` (em modo livre devolver `null` antes de `ExistsMovementAsync`: nada gravado, sem regra de um movimento, sem `turn.changed`). `layout.EnsureFits` continua para todos.
- [X] T039 [P] [US4] Em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: `Move_InFreeMode_RecordsNothing` (personagem; `ITurnRepository.InsertAsync` e `ExistsMovementAsync` não chamados; `turn.changed` não publicado; `mapToken.upserted` publicado); `Move_InFreeMode_AcceptsSecondMoveAndAnyCost` (`ExistsMovementAsync` → true e custo > `CurrentMove` → ainda 200); `Move_InFreeMode_StillRefusesOccupiedHex` (409) e `Move_InFreeMode_StillRefusesAnotherPlayersPiece` (403); `Move_OutOfFreeMode_StillLimited` (teste existente continua).
- [X] T040 [US4] Texto MCP `move_map_token` em `backend/Roll6.Mcp/Tools/MapTokenTools.cs`: "In free mode (`set_campaign_free_mode`) characters and NPC pieces move any number of times, without the Deslocamento limit, and no Movement entry is written; an occupied hex or a hex outside the grid is still refused."
- [X] T041 [US4] `frontend/src/lib/movement.ts`: `MOVEMENT_KIND.unlimited`; tipo `Fits = (x: number, y: number, look: number) => boolean`; `hoverPath(state, hex, fits?)` — para `unlimited`: `target = hex`, `trail = []`, `cost = hex && fits?.(hex.x, hex.y, state.field.start.look) ? 0 : null`; `pointFacing(state, look, fits?)` — para `unlimited`: `cost = fits?.(destination.x, destination.y, look) ? 0 : null`, `trail` vazio; `statusOf` → `'free'` para `unlimited`; `previewOf` para `unlimited` em `path` = `start` (sem virar), em `facing` = destino com `look`; `previewHexes` para `unlimited` em `path` = `footprint(target, start.look, space)` quando há target. `canPickDestination`/`canConfirm` inalterados (aceitam `cost === 0`). Completar `movementKindFor` em `lib/freeMode.ts` (T010) com a constante nova.
- [X] T042 [P] [US4] `frontend/src/lib/movement.test.ts` (criar ou estender): peça `unlimited` — hover em hex que cabe → `cost 0`, `trail []`, status `'free'`, `canPickDestination(state, false)` true (jogador); hover em hex que não cabe → `cost null`, não pode escolher; `pickDestination` → fase `facing` com o `look` inicial; `pointFacing` com `fits` false → `cost null`, `canConfirm` false; `previewHexes` = footprint no alvo; peça `limited` continua como antes (teste existente, se houver, intacto).
- [X] T043 [US4] `frontend/src/hooks/useTokenMovement.ts`: `start(token)` usa `movementKindFor(token.tokenType, isFreeMode(currentCampaign))` (obter `currentCampaign` de `useCampaign`); para `unlimited` não construir o BFS — `field = { start: {x, y, look}, … }` mínimo aceito pelo tipo `MovementField` (ou `movementField` com `maxCost 0`, o que for mais simples sem quebrar o tipo) — e guardar um `fits` = `(x, y, look) => fitsAt(occupancy, footprint(x, y, look, token.space), draft.gridWidth, draft.gridHeight, token.mapTokenId)` via `lib/occupancy`; `hover`/`face` passam o `fits` quando a peça é `unlimited`; `total: null` para `unlimited`. Novo `useEffect`: mudar `isFreeMode(currentCampaign)` com um movimento em curso → `setState(IDLE)` (quickstart passo 10).
- [X] T044 [US4] `frontend/src/components/map/MapCanvas.tsx`: `canMove` ignora `hasMoved` quando `freeMode` (`return token.tokenType === MAP_TOKEN_TYPE.object || freeMode || !hasMoved(...)`); `MovementCounter` já é só para `limited` (confirmar); `MovementLayer` recebe `kind={moveState.piece.kind}`.
- [X] T045 [US4] `frontend/src/components/map/MovementLayer.tsx`: prop `kind?: MovementKind`; para `unlimited` não desenhar a polilinha do trail, só o contorno do destino (verde `status 'free'`… usar a cor "ok" quando `cost === 0` e a vermelha quando o alvo não cabe — receber `status` como hoje e, para `unlimited`, mapear cabe/não cabe em `ok`/`over` no `MapCanvas` antes de passar).
- [X] T046 [US4] Executar os passos 5 e 10 do quickstart e a parte de movimento do passo 8 (contador e rastro voltam; "Já se moveu neste turno." e o limite voltam).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T047 [P] `CLAUDE.md`: entrada em "Recent Changes" (054) e, nos bullets de turnos (016/044) e movimento (015), uma frase sobre o modo livre (flag `campaigns.free_mode`, endpoint, o que relaxa, nada gravado para movimentos, MCP 101 operações / 102 ferramentas); seção Active Technologies já atualizada pelo plano.
- [X] T048 [P] Rever `backend/Roll6.Mcp/Roll6Guide.cs` e as cinco descrições alteradas (T015, T017, T030, T035, T040) em `dotnet test --filter "FullyQualifiedName~Mcp"`; conferir que `McpToolCatalog` não exclui a rota nova.
- [X] T049 (automatic part done: backend build + 1466 tests, frontend lint + tsc + 684 tests + build; the quickstart 1–10 is left to the production test) Rodar tudo: `cd backend && dotnet build Roll6.sln && dotnet test`; `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build`; passar o quickstart inteiro (1–10) com mestre e jogador.
- [ ] T050 (no reachable database on the dev machine; production applies `AddCampaignFreeMode` on startup — note it in the PR) Aplicar a migração onde houver banco (`dotnet ef database update` ou `database/migrations/054-campaign-free-mode.sql`) e registrar no PR que a produção aplica no startup.

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → US1 (Phase 3)**: a flag e os DTOs antes de tudo; `lib/freeMode.ts` antes de qualquer tela. `movementKindFor` (T010) só fica completo com a constante `unlimited` da T041 — na T010 implementá-la já importando `MOVEMENT_KIND` e adicionando a constante em `lib/movement.ts` se for mais simples (então T041 só acrescenta as funções).
- **US1 é o MVP**: endpoint + chave + badge + rastros escondidos. Sem ela nada liga o modo.
- **US2, US3 e US4 são independentes entre si** e dependem só da Phase 1 (backend) e das Phases 1–2 + T019 (frontend, para ler `currentCampaign.freeMode`). Podem ser feitas em qualquer ordem após a US1; a ordem sugerida é a das prioridades.
- **Phase 7** depois de tudo.

## Parallel Execution Examples

- Phase 1: T004, T005, T007, T008, T009 em paralelo após T001–T003.
- US1: T014, T017, T021, T022 em paralelo enquanto T012–T013 e T018–T020 avançam em sequência.
- US2/US3/US4: os testes (T029, T034, T039, T042) e os textos MCP (T030, T035, T040) em paralelo com o código de serviço de cada história.

## Implementation Strategy

1. **MVP = Phase 1 + 2 + US1**: a flag existe, o mestre liga/desliga, a mesa vê, os rastros somem. Já dá para demonstrar.
2. **US2 + US3** (backend quase só `if`s + um `return null` no `PendingPlayers`): o modo passa a valer para ações e para a cobrança.
3. **US4**: a parte mais extensa (Mover ilimitado no frontend + `MoveAsync`).
4. **Polish**: `CLAUDE.md`, guia MCP, testes completos, migração.

## Notes

- Toda regra é decidida no servidor logo após carregar a campanha e **depois** de `EnsurePlayable`/`EnsureMapEditable` (049): fora de Ativa continua tudo recusado.
- Ligar/desligar nunca grava nada além de `campaigns.free_mode` (FR-004): sem cancelar, sem finalizar, sem apagar.
- `process_turn`, `set_current_turn`, `create_turn_entry`/`update_turn_entry`, `poke` e o chat não mudam.
- Contagem MCP: 101 operações / 102 ferramentas.
