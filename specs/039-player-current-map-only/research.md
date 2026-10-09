# Research: Jogadores só abrem o mapa atual da campanha (039)

Nenhum `NEEDS CLARIFICATION` ficou aberto. As decisões abaixo partem do código atual: `hooks/useTableRoute.ts`, `Contexts/MapEditorContext.tsx` (restauração de `roll6:map` e "seguir o mestre", 017), `components/modals/MapModal.tsx` e `Roll6.Application/Realtime/SignalRRealtimeNotifier.cs`.

## D1 — Uma regra pura decide o que o usuário pode abrir

- **Decision**: novo `frontend/src/lib/viewerMap.ts` (puro, testado com Vitest):
  - `isMasterOf(campaign, userId)` → `campaign.userId === userId`;
  - `viewerMapDecision({ isMaster, mapId, mapCampaignId, campaignId, currentMapId })` → `{ kind: 'open' }` (mestre, mapa atual ou mapa de outra campanha), `{ kind: 'redirect', mapId: currentMapId }` (jogador num mapa não atual da mesma campanha) ou `{ kind: 'none' }` (jogador e campanha sem mapa atual);
  - `visibleCampaignMaps(items, { isMaster, currentMapId })` → o mestre vê todos, o jogador só o item `mapId === currentMapId`.
- **Rationale**: os três caminhos (link, mapa lembrado, troca do mestre) e a lista aplicam a mesma regra, que pode ser testada sem React (padrão de `lib/characterSelection.ts` e `lib/movement.ts`).

## D2 — Link `/map/:slug` (FR-002, FR-004)

- **Decision**: `MapEditorContext.openCampaignMapBySlug` deixa de carregar às cegas. Ele lê o mapa pelo slug, obtém a campanha dona (a atual se for a mesma, senão `campaignService.getById`) e aplica `viewerMapDecision` **antes** de `loadMapModel`:
  - `open`: carrega o mapa pedido;
  - `redirect`: carrega `currentMapId` (via `mapService.getById`);
  - `none`: não carrega nada e fecha qualquer mapa da campanha que estiver aberto.

  Devolve `{ map, campaign, outcome: 'opened' | 'redirected' | 'noCurrentMap' }`. O `useTableRoute` seleciona a campanha devolvida (em vez de buscá-la de novo), mostra o toast `route.notCurrentMap` em `redirected` e `route.noCurrentMap` em `noCurrentMap`, e o efeito estado → URL já existente substitui o endereço pelo do mapa aberto, ou por `/campaign/:slug` quando não há mapa.
- **Rationale**: decidir antes de carregar evita que o mapa não revelado apareça por um instante. A troca de URL continua só no `useTableRoute` (regra de 029).
- **Alternatives considered**: carregar e depois redirecionar num efeito, rejeitado porque o mapa não revelado pisca na tela e as peças chegam a ser lidas.

## D3 — Mapa lembrado (`roll6:map`, FR-003)

- **Decision**: na restauração (`MapEditorContext`, efeito "reopen the remembered map"), depois de ler o mapa lembrado e antes de `loadMapModel`, obter a campanha do mapa e aplicar a mesma decisão: `redirect` carrega o atual **sem toast**, e `none` não abre nada (esquecendo `roll6:map`). Modelos sem campanha (`mapId === null`) seguem como hoje.

## D4 — Seguir o mestre sempre (FR-005)

- **Decision**: no efeito "Players follow the master's map", remover a exceção `explicitMap && enteredCampaign` e o comentário "Opening another map on their own is fine until the next switch". Além disso, quando o jogador tiver aberto um mapa da campanha que não é o atual, por qualquer caminho, o efeito abre o atual. Quando `currentMapId` vira `null` com um mapa da campanha aberto, o efeito fecha esse mapa (`newMap` sem guarda, porque o jogador não edita mapas da campanha) e a tela mostra a mensagem do D6. A guarda `isDirty` fica: para jogadores ela nunca é verdadeira em mapas da campanha (`canEdit` é falso), o que cumpre o FR-008 sem código novo.
- **Rationale**: um único efeito garante a regra mesmo se surgir outro caminho no futuro.

## D5 — Listas (FR-006)

- **Decision**: em `MapModal`, aba "Mapas da campanha", aplicar `visibleCampaignMaps` aos itens da página para jogadores. Sem mapa atual, a lista fica vazia com o texto `map.noCurrentMap`. O `TableSelect` já mostra só o mapa atual, e `CampaignMapsTab` (configurações) é exclusivo do mestre: nenhum dos dois muda. A paginação continua a do servidor; para jogadores, a página mostra no máximo um item.
- **Rationale**: o FR-006 pede o filtro na tela, e a API não muda (FR-009).

## D6 — Sem mapa atual (FR-004)

- **Decision**: o `MainPage` mostra um aviso centralizado sobre a área do mapa, `map.noCurrentMap` = "O mestre ainda não escolheu um mapa", quando há campanha, o usuário não é o mestre, `currentMapId === null` e nenhum mapa está aberto. Como é um componente de apresentação, não há modal.

## D7 — Eventos em tempo real (FR-010)

- **Decision**:
  - Função pura `Domain/Realtime/TableEventAudience.For(TableEventInfo, long? currentMapId)` → `Everyone` ou `MasterOnly`. É `MasterOnly` quando o tipo é `mapToken.upserted`, `mapToken.deleted` ou `mapTokens.changed` **e** `MapId` não é nulo **e** `MapId != currentMapId`.
  - `SignalRRealtimeNotifier.PublishAsync`, para esses tipos, lê a campanha por `IServiceScopeFactory` → `ICampaignRepository<Campaign>.GetByIdAsync` (o notifier é singleton e o repositório é scoped). Em `MasterOnly`, envia só para `TableConnections.ConnectionsOf(campaign.UserId, campaignId)` com `Clients.Clients(ids)`; nos outros casos, para o grupo como hoje.
  - Os demais tipos não consultam nada.
  - Falhas continuam só registradas no log, e se a campanha não for encontrada o evento não é enviado.
- **Rationale**: um só ponto, nenhuma das ~10 publicações nos services muda, e a regra fica testável (`TableEventAudienceTests`). Uma consulta por evento de peça é barata (busca por chave).
- **Alternatives considered**:
  - Cada service escolher o público: espalha a regra por 10 lugares.
  - Um grupo SignalR do mestre: exige manter a pertença ao grupo a cada troca de mestre ou transferência, e `ConnectionsOf` já resolve.
  - Filtrar `maps.changed` e `map.saved`: fora do FR-010, porque não trazem peças nem NPCs.

## D8 — Nada mais muda no servidor (FR-009)

- **Decision**: nenhuma leitura, ação, permissão, DTO, endpoint ou ferramenta MCP muda. `McpCoverageTests` continua em 86 operações / 87 ferramentas.
