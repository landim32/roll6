# Research: Sincronização em tempo real da mesa (017)

## R1 — Canal: SignalR embutido no ASP.NET Core

- **Decision**: ASP.NET Core SignalR (já faz parte do shared framework `Microsoft.AspNetCore.App`, sem pacote
  NuGet novo) com um hub `TableHub` em `/hubs/table`; no frontend, o cliente oficial `@microsoft/signalr`.
  Transporte WebSocket com fallback automático (SSE / long polling) do próprio SignalR.
- **Rationale**: pedido explícito do usuário; integra com a autenticação JWT existente; reconexão automática
  pronta no cliente.
- **Alternatives**: WebSocket cru (reimplementar reconexão, grupos e fallback); Server-Sent Events (sem
  grupos no servidor, mais código); manter só polling (não atende SC-001).

## R2 — O canal é só servidor → cliente

- **Decision**: todas as alterações continuam pela API REST (FR-002). O hub expõe apenas `JoinCampaign` /
  `LeaveCampaign`; o servidor envia um único método de cliente `tableEvent` com um envelope
  `{ type, campaignId, mapId, actorUserId, data }`.
- **Rationale**: nenhum contrato existente muda; permissões e validações continuam num lugar só (services);
  um só método de cliente simplifica o tipo discriminado no TypeScript.
- **Alternatives**: comandos via hub (duplicaria a API e as permissões); um método de cliente por tipo de
  evento (mais registros no cliente, sem ganho).

## R3 — Onde publicar: nos services de domínio, via abstração

- **Decision**: interface `IRealtimeNotifier` em `Roll6.Infra.Interfaces/AppServices` (usa só tipos do DTO:
  `TableEventInfo`); os services de domínio chamam `PublishAsync(campaignId, event)` **depois** de gravar
  (após a transação). A implementação `SignalRRealtimeNotifier` (via `IHubContext<TableHub>`) fica em
  `Roll6.Application/Realtime`, junto com o hub, e é registrada no `Startup`. Falha ao publicar é logada e
  engolida — nunca derruba a requisição.
- **Rationale**: só o domínio sabe a campanha de cada alteração (ex.: peça → mapa → campanha) e as cascatas
  internas (movimento grava turno; excluir ocorrência exclui peça). Domínio continua dependendo só de
  abstrações (Clean Architecture). `Application` já referencia ASP.NET Core (JwtBearer).
- **Alternatives**: publicar nos controllers (não sabem a campanha sem nova consulta; cascatas se perdem);
  hub no `Infra` (exigiria FrameworkReference ASP.NET Core no Infra); hub no `API` (DI sairia do `Startup`).

## R4 — Grupos por campanha; filtro de mapa no cliente

- **Decision**: um grupo SignalR por campanha (`campaign:{id}`). `JoinCampaign(campaignId)` verifica no
  domínio (`ICampaignService.CanReadAsync` = mestre ou participante aprovado) e sai do grupo anterior da
  conexão. Eventos de mapa levam `mapId`; o cliente aplica só se for o mapa aberto (FR-005).
- **Rationale**: quem está na campanha já pode ler todos os mapas dela (feature 005), então receber o aviso de
  outro mapa não vaza nada; evita manter "mapa assistido" por conexão no servidor.
- **Alternatives**: grupo por mapa (mais estado e mais chamadas de hub a cada troca de mapa).

## R5 — Perda de acesso durante a sessão

- **Decision**: quando uma participação é removida/negada, o evento `party.changed` chega a todos; o cliente
  do jogador afetado relê as participações e, sem acesso, chama `LeaveCampaign`. Além disso o servidor remove
  do grupo as conexões do usuário afetado (mapa `userId → connectionIds` mantido pelo hub em memória,
  instância única).
- **Rationale**: SC-004 exige zero vazamento; não depender só do cliente.
- **Alternatives**: revalidar a cada envio (caro); ignorar (vazaria até recarregar).

## R6 — Autenticação da conexão

- **Decision**: `accessTokenFactory` do cliente lê o token do localStorage; no servidor
  `JwtBearerEvents.OnMessageReceived` aceita `access_token` da query string **somente** para caminhos
  `/hubs` (WebSockets não enviam header `Authorization` no navegador). Hub com `[Authorize]`; o usuário vem
  do claim `sub` como nos controllers. Logout/401 → `connection.stop()`.
- **Rationale**: padrão documentado do SignalR com JWT Bearer; token continua só no localStorage.

## R7 — Payload dos eventos: dados no caminho quente, "recarregue" no resto

- **Decision**: `mapToken.upserted` leva o `MapTokenInfo` completo (mover, incluir, trocar token, alterar) e
  `mapToken.deleted` leva `{ mapTokenId }` — são os eventos frequentes. Os demais são sinais leves que dizem
  o que recarregar: `mapTokens.changed` (ocorrência de NPC alterada/colocada), `party.changed`,
  `campaignNpcs.changed`, `turn.changed`, `turn.finished { finishedTurn, turnNo }`, `map.saved
  { mapModelId }`, `maps.changed`, `map.deleted`, `map.current { mapId }`, `campaign.changed`,
  `campaign.deleted`.
- **Rationale**: FR-006 permite indicar o que recarregar; mantém o servidor simples e o cliente reaproveita
  os loaders existentes (e as regras de permissão de leitura). URLs pré-assinadas no `MapTokenInfo` servem
  para qualquer leitor.
- **Idempotência**: o autor também recebe o evento; aplicar o mesmo `MapTokenInfo` (substituir por id) ou
  recarregar é idempotente — sem "piscar".

## R8 — Mapa atual da campanha (Q1 → A)

- **Decision**: coluna `campaigns.current_map_id` (bigint nulo, FK `fk_map_campaign_current`
  `ClientSetNull`), exposta como `CampaignInfo.currentMapId`. Novo endpoint aditivo
  `PUT /api/campaign/{id}/current-map` `{ mapId }` (mestre; mapa ativo da própria campanha) que grava e
  publica `map.current`. O frontend do mestre chama ao abrir um mapa da campanha (pelo modal ou na
  restauração) quando difere do atual. Excluir o mapa atual limpa a coluna. Jogadores seguem ao receber
  `map.current` e, ao entrar na campanha, abrem `currentMapId` (tem prioridade sobre `roll6:map`).
- **Alternatives**: estado só em memória no hub (perde-se ao reiniciar; entrada tardia não saberia o mapa).

## R9 — Recarregar a tela do mapa sem perder a vista

- **Decision**: `map.saved` → quem está com um mapa daquele modelo relê o modelo e aplica com
  `loadMapModel(..., { keepView: true })`; se o editor estiver com alterações não salvas (`isDirty`), o
  evento é ignorado e um toast avisa (FR-013). `map.deleted` do mapa aberto → novo mapa vazio + toast.
  Um modelo pode estar em mapas de várias campanhas: o service publica para cada campanha que o usa.

## R10 — Polling e resiliência

- **Decision**: `RealtimeContext` expõe `status` (`connected` / `reconnecting` / `disconnected`).
  Conectado: polling de grupo, NPCs e turno desligado (convites continuam a cada 60 s). Desconectado ou
  reconectando: polling de 15 s como hoje. Ao (re)conectar e ao entrar numa campanha, emite o evento local
  `resync` → todos os contexts recarregam (FR-008). Reconexão com `withAutomaticReconnect([0, 2000, 5000,
  10000, 30000])` e, esgotada, nova tentativa a cada 30 s.
- **Indicador**: pequeno selo no rodapé do mapa ("Sem conexão em tempo real" / "Reconectando…").

## R11 — Proxies

- **Decision**: Vite: `'/hubs': { target: apiProxy, changeOrigin: true, ws: true }`. nginx:
  `location /hubs/` com `proxy_http_version 1.1`, `Upgrade`/`Connection` e `proxy_read_timeout` longo.
  Caddy já faz proxy de WebSocket automaticamente. CORS continua só em Development (mesma origem nos demais).
