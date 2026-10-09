# Quickstart: validar "só o mapa atual" (039)

## Automático

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd ../frontend && npm run lint && npm test && npm run build
```

- `Roll6.Tests/Domain/Realtime/TableEventAudienceTests`: os três tipos de peça com `mapId` diferente do atual → `MasterOnly`; igual ao atual, `mapId` nulo, campanha sem mapa atual (`MasterOnly` quando o evento tem mapa) e outros tipos (`party.changed`, `map.current`, `maps.changed`) → `Everyone`.
- `frontend/src/lib/viewerMap.test.ts`: mestre → `open`; jogador no atual → `open`; jogador em outro mapa → `redirect(atual)`; sem atual → `none`; mapa de outra campanha → `open`; `visibleCampaignMaps` para mestre e jogador; `isMasterOf`.
- `McpCoverageTests` sem mudança (86/87).

## Manual (homolog ou local, um mestre e um jogador em navegadores diferentes; campanha com mapas A atual e B)

1. **Jogador:** abrir `/map/{slug de B}`. Abre A, o endereço vira `/map/{slug de A}` e aparece o toast "Apenas o mapa atual da campanha pode ser aberto". B não aparece nem por um instante.
2. **Jogador:** com B lembrado (`roll6:map` com o id de B), recarregar em `/`. Abre A, sem toast.
3. **Jogador:** "Mapas…" → "Mapas da campanha" mostra só A.
4. **Mestre:** abrir B. B vira o atual e o jogador vai para B na hora.
5. **Mestre:** com A atual, mover uma peça de B pela API ou pelo MCP do mestre (`move_map_token`). No site, abrir B o tornaria o atual. O jogador conectado **não** recebe `mapToken.upserted` de B: conferir no DevTools → Network → WS. Mover uma peça de A chega ao jogador normalmente.
6. **Mestre:** apagar o mapa atual. O jogador fica sem mapa e vê "O mestre ainda não escolheu um mapa".
7. **Mestre:** abrir qualquer mapa por link, lista ou configurações. Nenhum redirecionamento nem toast novo.
8. **API/MCP do jogador:** `GET /api/map/{id de B}` continua respondendo 200 (FR-009, aceito).
