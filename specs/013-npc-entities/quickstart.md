# Quickstart: NPCs (biblioteca, campanha e mapa)

```bash
cd backend
dotnet build Roll6.sln && dotnet test
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API   # AddNpcs
dotnet run --project Roll6.API   # Swagger em /swagger
```

Contas: **Mestre** (campanha C com mapa M ativo) e **Jogador** (personagem aprovado em C).

1. Mestre: `POST /api/token` (Goblin) → `POST /api/npc` com esse `tokenId` → 201; sem `tokenId` → 400.
2. Jogador: `PUT /api/npc/{id}` do NPC do mestre → 403; `GET /api/npc` → não vê o NPC.
3. Mestre: `POST /api/campaignnpc` `{campaignId: C, npcId}` → 201; de novo → 409; jogador → 403.
4. Mestre: `POST /api/mapnpc` `{mapId: M, npcId, x: 2, y: 1}` duas vezes em hexes diferentes → 2
   ocorrências; mesmo hex → 409; `GET /api/map/M/token` mostra 2 peças NPC com `mapNpcId`.
5. Mestre: `PUT /api/mapnpc/{id}` `{life: -1, status: "caído"}` → só aquela ocorrência muda; a peça mostra
   os novos valores; o NPC da biblioteca não muda.
6. Jogador: `GET /api/map/M/npc` → 200; `POST /api/mapnpc` → 403.
7. Mestre: `DELETE /api/maptoken/{peça}` → a ocorrência também some de `GET /api/map/M/npc`.
8. Mestre: `DELETE /api/npc/{id}` com o NPC em C → 409; `DELETE /api/campaignnpc/{id}` → as ocorrências
   restantes somem dos mapas; agora `DELETE /api/npc/{id}` → 204.
9. `DELETE /api/token/{id}` de um token usado por NPC → 409.
