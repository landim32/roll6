# Tasks: Sincronização em tempo real da mesa

**Input**: Design documents from `/specs/017-realtime-signalr-sync/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/realtime.md, contracts/ui.md, quickstart.md

**Tests**: incluídos — o projeto cobre todo service de domínio com testes unitários (xUnit + Moq) e as regras
puras do frontend com Vitest; SC-002 exige a suíte atual intacta.

**Organization**: por user story (US1 peças, US2 turno/cartões, US3 mapa, US4 resiliência).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirmar a base verde (`dotnet test` em `backend/`; `npm run lint` + `npm test` em `frontend/`) e carregar as skills `dotnet-architecture` e `react-architecture`
- [X] T002 [P] Instalar `@microsoft/signalr` (8.x) em `frontend/package.json` (`npm install @microsoft/signalr`)
- [X] T003 [P] Proxy do hub no dev server: `'/hubs': { target: apiProxy, changeOrigin: true, ws: true }` em `frontend/vite.config.ts`
- [X] T004 [P] nginx: `location /hubs/ { proxy_pass http://api:8080; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header Host $host; proxy_read_timeout 3600s; }` antes de `location /` em `frontend/nginx.conf`

---

## Phase 2: Foundational (bloqueia todas as stories)

**Backend — contrato e publicação**

- [X] T005 [P] DTOs `TableEventInfo` (`type`, `campaignId`, `mapId`, `actorUserId`, `data` como `object?`, todos com `[JsonPropertyName]`) e `TableEventType` (constantes string: `MAP_TOKEN_UPSERTED = "mapToken.upserted"`, `MAP_TOKEN_DELETED`, `MAP_TOKENS_CHANGED`, `PARTY_CHANGED`, `CAMPAIGN_NPCS_CHANGED`, `TURN_CHANGED`, `TURN_FINISHED`, `MAP_SAVED`, `MAPS_CHANGED`, `MAP_DELETED`, `MAP_CURRENT`, `CAMPAIGN_CHANGED`, `CAMPAIGN_DELETED`) em `backend/Roll6.DTO/Realtime/TableEventInfo.cs` e `backend/Roll6.DTO/Realtime/TableEventType.cs`
- [X] T006 [P] `IRealtimeNotifier` com `Task PublishAsync(TableEventInfo tableEvent)` e `Task RemoveUserFromCampaignAsync(long userId, long campaignId)` em `backend/Roll6.Infra.Interfaces/AppServices/IRealtimeNotifier.cs`
- [X] T007 `ICampaignService.CanReadAsync(userId, campaignId)` (mestre ou `HasApprovedCharacterAsync`; `KeyNotFoundException` se não existir) em `backend/Roll6.Domain/Interfaces/ICampaignService.cs` e `backend/Roll6.Domain/Services/CampaignService.cs`
- [X] T008 `TableConnections` (singleton, thread-safe: `connectionId → (userId, campaignId?)`, `userId → connectionIds`) em `backend/Roll6.Application/Realtime/TableConnections.cs`
- [X] T009 `TableHub : Hub` com `[Authorize]`: `JoinCampaign(long campaignId)` (usuário do claim `sub`; `CanReadAsync` via `ICampaignService` → `HubException("forbidden"/"not-found")`; sai do grupo anterior; `Groups.AddToGroupAsync(connectionId, $"campaign:{id}")`; registra em `TableConnections`; retorna `true`), `LeaveCampaign()`, `OnDisconnectedAsync` limpa o registro, em `backend/Roll6.Application/Realtime/TableHub.cs`
- [X] T010 `SignalRRealtimeNotifier : IRealtimeNotifier` (`IHubContext<TableHub>`, `Clients.Group($"campaign:{id}").SendAsync("tableEvent", event)`; `RemoveUserFromCampaignAsync` tira do grupo as conexões do usuário naquela campanha; toda exceção logada com `ILogger` e engolida) em `backend/Roll6.Application/Realtime/SignalRRealtimeNotifier.cs`
- [X] T011 `Startup`: `services.AddSignalR()`, `AddSingleton<TableConnections>()`, `AddSingleton<IRealtimeNotifier, SignalRRealtimeNotifier>()`; no `AddJwtBearer`, `Events.OnMessageReceived` lê `access_token` da query só quando o path começa com `/hubs` em `backend/Roll6.Application/Startup.cs`
- [X] T012 `app.MapHub<TableHub>("/hubs/table")` depois de `MapControllers` em `backend/Roll6.API/Program.cs`
- [X] T013 Helper interno de publicação nos services: método privado `PublishAsync(type, campaignId, mapId, actorUserId, data)` que monta o `TableEventInfo`; convenção: publicar **depois** do `ExecuteInTransactionAsync`/gravação. Criar `backend/Roll6.Domain/Realtime/TableEvents.cs` (fábrica estática `TableEvents.Create(...)`) para os services reutilizarem
- [X] T014 [P] Testes: `CampaignService.CanReadAsync` (mestre ok, aprovado ok, estranho false, inexistente 404) em `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`

**Frontend — conexão**

- [X] T015 [P] Tipos: `TABLE_EVENT` (constantes com os mesmos nomes do backend + `resync: 'resync'`), `TableEvent` (`type`, `campaignId`, `mapId`, `actorUserId`, `data`), `REALTIME_STATUS` (`connected`, `reconnecting`, `disconnected`) em `frontend/src/types/realtime.ts`
- [X] T016 [P] `realtimeService`: `createConnection()` com `HubConnectionBuilder().withUrl(`${API_URL}/hubs/table`, { accessTokenFactory: () => readStoredSession()?.token ?? '' }).withAutomaticReconnect([0, 2000, 5000, 10000, 30000])`; `joinCampaign(connection, id)`, `leaveCampaign(connection)` em `frontend/src/Services/realtimeService.ts`
- [X] T017 `RealtimeContext` + `hooks/useRealtime.ts`: conecta quando há sessão (`stop()` sem sessão); `status`; lista de handlers com `subscribe(handler) → unsubscribe`; `on('tableEvent')` repassa aos handlers **só** se `event.campaignId === currentCampaign?.campaignId`; entra na campanha atual (`JoinCampaign`) ao conectar, ao reconectar (`onreconnected`) e quando a campanha muda (`LeaveCampaign` sem campanha); após cada entrada bem-sucedida emite `{ type: 'resync' }`; `onclose` → `disconnected` e nova tentativa de `start()` a cada 30 s; erro de `JoinCampaign` é silencioso (sem acesso) em `frontend/src/Contexts/RealtimeContext.tsx` e `frontend/src/hooks/useRealtime.ts`
- [X] T018 Registrar `RealtimeProvider` entre `CampaignProvider` e `CharacterProvider` (atualizar o comentário da cadeia) em `frontend/src/main.tsx`
- [X] T019 [P] `lib/realtimeEvents.ts` (puro): `applyTokenEvent(tokens, event, openMapId)` (upsert por `mapTokenId` / remoção; ignora outro mapa), `affectsMap(event, openMapId)` (`mapId` nulo = todos) + testes em `frontend/src/lib/realtimeEvents.test.ts`

**Checkpoint**: backend compila, hub aceita conexões autenticadas e entrada na campanha; frontend conecta e entra no grupo.

---

## Phase 3: User Story 1 - Peças se movem na hora (P1) 🎯 MVP

**Goal**: mover/incluir/trocar/alterar/excluir peças (inclusive NPCs no mapa) aparece para toda a mesa.

**Independent Test**: dois navegadores no mesmo mapa; mover no primeiro, ver no segundo em ≤ 2 s.

- [X] T020 [US1] `MapTokenService`: injetar `IRealtimeNotifier` (último parâmetro); publicar `mapToken.upserted` (`MapTokenInfo` retornado) em `CreateAsync`, `PlaceCharacterAsync`, `MoveAsync`, `ChangeTokenAsync`, `UpdateAsync`; `mapToken.deleted` (`{ mapTokenId }`) em `DeleteAsync`; `MoveAsync` também `turn.changed` quando gravou Movement — campanha pelo `map.CampaignId`, `mapId` da peça, `actorUserId = userId`, em `backend/Roll6.Domain/Services/MapTokenService.cs`
- [X] T021 [US1] `MapNpcService`: publicar `mapTokens.changed` (`mapId`) em `CreateAsync`, `UpdateAsync`, `DeleteAsync` (+ `turn.changed` no delete) em `backend/Roll6.Domain/Services/MapNpcService.cs`
- [X] T022 [P] [US1] Atualizar os construtores dos testes com `Mock<IRealtimeNotifier>` e testar: mover publica `mapToken.upserted` + `turn.changed`; excluir publica `mapToken.deleted`; movimento recusado (409/403) não publica; `MapNpcService.UpdateAsync` publica `mapTokens.changed` em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs` e `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs`
- [X] T023 [US1] `MapTokenContext`: `subscribe` → `mapToken.upserted`/`deleted` com `applyTokenEvent` no mapa aberto; `mapTokens.changed` que afeta o mapa aberto e `resync` → `refresh()` em `frontend/src/Contexts/MapTokenContext.tsx`
- [X] T024 [US1] `useTokenMovement`: se a peça em movimento sumir ou mudar de posição por evento durante o modo Mover, cancelar o modo (`IDLE`) em `frontend/src/hooks/useTokenMovement.ts`

**Checkpoint**: US1 funcional e demonstrável sozinha.

---

## Phase 4: User Story 2 - Turno, ações e cartões na hora (P1)

**Goal**: ações, reset, finalizar turno, vida/energia/status de personagens e NPCs e listas de grupo/NPCs
atualizam para todos.

**Independent Test**: jogador age → mestre vê balão/círculo; mestre finaliza → jogador vê "Turno N+1" e a
notificação na hora.

- [X] T025 [US2] `TurnService`: injetar `IRealtimeNotifier`; `turn.changed` em `ActAsync`, `CreateAsync`, `DeleteAsync`; `ResetAsync` → `turn.changed` + (se reverteu) `mapToken.upserted` da peça — ou `mapTokens.changed` com o `mapId`; `FinishAsync` finalizado → `turn.finished` `{ finishedTurn, turnNo }` em `backend/Roll6.Domain/Services/TurnService.cs`
- [X] T026 [US2] `CampaignCharacterService`: injetar `IRealtimeNotifier`; `party.changed` em `RequestAccessAsync` (quando auto-aprovado), `ApproveRequestAsync`, `DenyRequestAsync`, `AcceptInviteAsync`, `DeclineInviteAsync`, `RemoveAsync`, `UpdateAsync`; `RemoveAsync`/`UpdateAsync` também `mapTokens.changed` (`mapId` nulo); `RemoveAsync`/`DenyRequestAsync` chamam `RemoveUserFromCampaignAsync` quando o dono deixa de ter personagem aprovado na campanha em `backend/Roll6.Domain/Services/CampaignCharacterService.cs`
- [X] T027 [US2] `CharacterService.UpdateAsync`/`DeleteAsync`: para cada campanha em que o personagem tem participação aprovada, `party.changed` + `mapTokens.changed` (`mapId` nulo) em `backend/Roll6.Domain/Services/CharacterService.cs` (usar a lista de participações já carregada/`ListByCharacterAsync`)
- [X] T028 [US2] `CampaignNpcService` (`AddAsync`, `RemoveAsync` → `campaignNpcs.changed`; `RemoveAsync` também `mapTokens.changed` nulo) e `NpcService.UpdateAsync` (`campaignNpcs.changed` para cada campanha com o NPC — `ICampaignNpcRepository.ListCampaignIdsByNpcAsync`, criar se não existir) em `backend/Roll6.Domain/Services/CampaignNpcService.cs`, `backend/Roll6.Domain/Services/NpcService.cs` e `backend/Roll6.Infra.Interfaces/Repository/ICampaignNpcRepository.cs` + `backend/Roll6.Infra/Repository/CampaignNpcRepository.cs`
- [X] T029 [P] [US2] Testes: agir publica `turn.changed`; finalizar publica `turn.finished` só quando finaliza; aprovar publica `party.changed`; remover participação chama `RemoveUserFromCampaignAsync`; incluir NPC na campanha publica `campaignNpcs.changed`; demais construtores de testes recebem o mock em `backend/Roll6.Tests/Domain/Services/{TurnServiceTests,CampaignCharacterServiceTests,CharacterServiceTests,CampaignNpcServiceTests,NpcServiceTests}.cs`
- [X] T030 [US2] `TurnContext`: `subscribe` → `turn.changed`, `turn.finished`, `resync` → `refresh()`; polling de 15 s só quando `status !== 'connected'` em `frontend/src/Contexts/TurnContext.tsx`
- [X] T031 [US2] `CharacterContext`: `party.changed`/`resync` → `refresh(true)` + `refreshParty()`; polling do grupo só desconectado (convites continuam a cada 60 s) em `frontend/src/Contexts/CharacterContext.tsx`
- [X] T032 [US2] `NpcContext`: `campaignNpcs.changed`/`resync` → `refreshCampaignNpcs()`; polling só desconectado em `frontend/src/Contexts/NpcContext.tsx`

**Checkpoint**: US1 + US2 cobrem o turno inteiro sem polling.

---

## Phase 5: User Story 3 - Troca de mapa e alterações do mapa (P2)

**Goal**: jogadores seguem o mapa do mestre; mapa salvo/excluído propaga; campanha alterada/excluída propaga.

**Independent Test**: mestre abre o mapa B → jogador passa a B; mestre salva a imagem → jogador vê.

- [X] T033 [US3] `Campaign.CurrentMapId` (`long?`) + `SetCurrentMap(long? mapId)`; `CampaignInfo.CurrentMapId` (`currentMapId`) no DTO e no `MapToDto`; `CampaignCurrentMapInfo` (`mapId`) em `backend/Roll6.Domain/Models/Campaign.cs`, `backend/Roll6.DTO/Campaign/CampaignInfo.cs`, `backend/Roll6.DTO/Campaign/CampaignCurrentMapInfo.cs` e `backend/Roll6.Domain/Services/CampaignService.cs`
- [X] T034 [US3] `Roll6Context`: coluna `current_map_id` + FK `fk_map_campaign_current` (`HasOne<Map>().WithMany().HasForeignKey(c => c.CurrentMapId)`, `ClientSetNull`) em `backend/Roll6.Infra/Context/Roll6Context.cs`; gerar `dotnet ef migrations add AddCampaignCurrentMap` e aplicar no banco de dev (`Host=::1`, credenciais do `.env` só na variável de ambiente do comando)
- [X] T035 [US3] `CampaignService.SetCurrentMapAsync(userId, campaignId, CampaignCurrentMapInfo)`: só mestre; `mapId` nulo limpa; senão o mapa precisa ser da campanha e não excluído (400); sem mudança → retorna sem publicar; senão grava e publica `map.current` (`mapId`); `RenameAsync`/`SetOpenAsync` publicam `campaign.changed` (`CampaignInfo`); `DeleteAsync` publica `campaign.deleted` depois de apagar em `backend/Roll6.Domain/Services/CampaignService.cs` e `backend/Roll6.Domain/Interfaces/ICampaignService.cs`
- [X] T036 [US3] Endpoint `[HttpPut("{id:long}/current-map")]` → `SetCurrentMapAsync` em `backend/Roll6.API/Controllers/CampaignController.cs`
- [X] T037 [US3] `MapService`: `CreateAsync`/`UpdateAsync` → `maps.changed` (`MapInfo`); `DeleteAsync` → se era o mapa atual, `campaign.SetCurrentMap(null)` e grava; publica `map.deleted`; `MapModelService.UpdateAsync` → `map.saved` `{ mapModelId }` para cada campanha com mapas não excluídos desse modelo (`IMapRepository.ListCampaignIdsByModelAsync`, criar) em `backend/Roll6.Domain/Services/MapService.cs`, `backend/Roll6.Domain/Services/MapModelService.cs` e `backend/Roll6.Infra.Interfaces/Repository/IMapRepository.cs` + `backend/Roll6.Infra/Repository/MapRepository.cs`
- [X] T038 [P] [US3] Testes: `SetCurrentMapAsync` (mestre ok + publica; jogador 403; mapa de outra campanha 400; mesmo mapa não publica); excluir o mapa atual limpa; salvar modelo publica `map.saved` por campanha; renomear publica `campaign.changed` em `backend/Roll6.Tests/Domain/Services/{CampaignServiceTests,MapServiceTests,MapModelServiceTests}.cs`
- [X] T039 [US3] Frontend: `currentMapId` em `CampaignInfo` (`frontend/src/types/campaign.ts`); `campaignService.setCurrentMap(campaignId, mapId)` em `frontend/src/Services/campaignService.ts`; `CampaignContext` reage a `campaign.changed` (substitui `currentCampaign` e o salvo) e `campaign.deleted` (`selectCampaign(null)` + toast) em `frontend/src/Contexts/CampaignContext.tsx`
- [X] T040 [US3] `MapEditorContext`: `loadMapModel(id, map, { keepView })`; mestre ao abrir mapa da campanha atual ≠ `currentMapId` → `setCurrentMap` (inclusive na restauração); participante ao entrar na campanha abre `currentMapId` (prioridade sobre `roll6:map`); eventos: `map.current` (não mestre, mapa ≠ aberto, sem rascunho sujo → abre + toast `realtime.followedMap`; sujo → toast `realtime.mapChangedDirty`), `map.saved` do modelo aberto (limpo → recarrega com `keepView`; sujo → toast), `map.deleted` do mapa aberto (`newMap()` + toast `realtime.mapDeleted`) em `frontend/src/Contexts/MapEditorContext.tsx`
- [X] T041 [P] [US3] Textos `realtime.followedMap`, `realtime.mapChangedDirty`, `realtime.mapDeleted`, `realtime.campaignDeleted` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: a mesa inteira acompanha o mapa do mestre.

---

## Phase 6: User Story 4 - Conexão resiliente (P2)

**Goal**: reconexão automática, ressincronização e indicador de conexão.

**Independent Test**: jogador offline → mestre altera → jogador online → sincronizado em ≤ 5 s.

- [X] T042 [US4] Garantir `resync` após `onreconnected` e após `start()` bem-sucedido depois de `onclose`; logout/401 → `stop()` e limpa handlers pendentes em `frontend/src/Contexts/RealtimeContext.tsx`
- [X] T043 [US4] Selo de conexão no rodapé (à esquerda, depois do turno): `realtime.reconnecting` ("Reconectando…") ou `realtime.offline` ("Sem tempo real") quando há sessão e o status não é `connected` em `frontend/src/components/map/GridSizeFooter.tsx`
- [X] T044 [P] [US4] Textos `realtime.reconnecting`, `realtime.offline` e estilo `.stm-realtime-badge` em `frontend/src/i18n/locales/pt-BR.json` e `frontend/src/styles/app.css`

**Checkpoint**: todas as stories funcionais.

---

## Phase 7: Polish & Cross-Cutting

- [X] T045 [P] Atualizar `CLAUDE.md` (hub, eventos por service, `IRealtimeNotifier`, `RealtimeContext` na cadeia de providers, polling condicional, `current_map_id`, proxies `/hubs`)
- [X] T046 Rodar `dotnet build` + `dotnet test`; `npm run lint` + `npm test` + `npm run build`
- [ ] T047 Executar `specs/017-realtime-signalr-sync/quickstart.md` com mestre e jogador em dois navegadores

---

## Dependencies & Execution Order

- **Setup (T001–T004)** → **Foundational (T005–T019)** → stories.
- **US1 (T020–T024)** e **US2 (T025–T032)** dependem só do Foundational; entre si são independentes (US2 usa
  `turn.changed` que US1 também publica no movimento — sem conflito).
- **US3 (T033–T041)** depende do Foundational; a migração (T034) antes de T035–T037.
- **US4 (T042–T044)** depende do `RealtimeContext` (T017); independente das demais.
- Construtores de services mudam em US1/US2/US3: tarefas que tocam o mesmo service rodam em sequência
  (ex.: T021 e T028 não compartilham arquivo; T026 e T027 são arquivos diferentes).

## Parallel Opportunities

- Setup: T002, T003, T004 juntos.
- Foundational: T005, T006, T015, T016, T019 juntos; depois T007–T013; T014 em paralelo com o frontend.
- US1: T022 (testes) em paralelo com T023/T024 (frontend).
- US2: T029 em paralelo com T030–T032.
- US3: T038 e T041 em paralelo com T039/T040.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US1 → peças sincronizadas (a maior lacuna hoje). Validar com os passos 1–3
   do quickstart.
2. **Incremento 2**: US2 → turno e cartões sem polling.
3. **Incremento 3**: US3 → mapa atual e alterações de mapa/campanha.
4. **Incremento 4**: US4 → indicador e ressincronização robusta.
5. Polish: documentação e validação completa.
