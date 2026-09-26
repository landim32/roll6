# UI Contract: sincronização em tempo real (017)

## `RealtimeContext` (`Contexts/RealtimeContext.tsx` + `hooks/useRealtime.ts`)

- Posição no provider chain: `AuthProvider` → `CampaignProvider` → **`RealtimeProvider`** →
  `CharacterProvider` → … (todos os que reagem a eventos ficam abaixo).
- Conecta quando há sessão; `stop()` no logout/401. Entra no grupo da campanha atual
  (`JoinCampaign`) sempre que ela muda ou a conexão volta; `LeaveCampaign` ao sair da campanha.
- Expõe:
  - `status: 'connected' | 'reconnecting' | 'disconnected'`
  - `subscribe(handler: (event: TableEvent) => void): () => void`
- Ao conectar/reconectar e ao entrar numa campanha, emite o evento local `{ type: 'resync' }`.

## Quem reage a quê

| Context | Eventos | Reação |
|---|---|---|
| `MapTokenContext` | `mapToken.upserted` / `mapToken.deleted` (mapa aberto) | aplica no array (`lib/realtimeEvents.applyTokenEvent`) |
| | `mapTokens.changed` (mapa aberto ou `mapId` nulo), `resync` | `refresh()` |
| `CharacterContext` | `party.changed`, `resync` | `refresh(true)` + `refreshParty()` |
| `NpcContext` | `campaignNpcs.changed`, `resync` | `refreshCampaignNpcs()` |
| `TurnContext` | `turn.changed`, `turn.finished`, `resync` | `refresh()` (a notificação sai do `trackTurn` como hoje) |
| `MapEditorContext` | `map.current` (jogador; mapa ≠ aberto) | abre o mapa (`GET /api/map/{id}`) + toast `realtime.followedMap`; com rascunho sujo: não troca, toast `realtime.mapChangedDirty` |
| | `map.saved` (modelo aberto) | relê o modelo mantendo a vista; sujo → não aplica, toast |
| | `map.deleted` (mapa aberto) | novo mapa vazio + toast `realtime.mapDeleted` |
| `CampaignContext` | `campaign.changed` | substitui `currentCampaign` |
| | `campaign.deleted` | sai da campanha + toast `realtime.campaignDeleted` |

## Mapa atual

- Mestre: ao abrir um mapa **da campanha atual** (modal ou restauração) diferente de
  `currentCampaign.currentMapId`, chama `PUT /api/campaign/{id}/current-map`.
- Participante: ao entrar na campanha, se `currentMapId` existir e for diferente do aberto, abre-o (prioridade
  sobre `roll6:map`).

## Polling

- `status === 'connected'`: sem polling de grupo, NPCs e turno (convites continuam a cada 60 s).
- Senão: polling de 15 s como hoje.

## Indicador

- No `GridSizeFooter`, à esquerda depois do turno: selo `realtime.reconnecting` ("Reconectando…") ou
  `realtime.offline` ("Sem tempo real") quando não conectado; nada quando conectado.

## Textos (pt-BR)

`realtime.reconnecting`, `realtime.offline`, `realtime.followedMap` ("O mestre abriu o mapa {{name}}."),
`realtime.mapChangedDirty` ("O mapa foi alterado por outra pessoa; salve ou descarte para ver a nova
versão."), `realtime.mapDeleted` ("O mapa aberto foi excluído."), `realtime.campaignDeleted` ("A campanha
foi excluída.").
