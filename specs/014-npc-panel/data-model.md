# Data Model (frontend): Painel de NPCs

Sem mudança no backend. Tipos em `frontend/src/types/npc.ts`, espelhando os DTOs da feature 013.

| Tipo | Campos |
|---|---|
| `NpcInfo` | `npcId`, `userId`, `tokenId`, `tokenName`, `tokenImageUrl`, `name`, `life`, `energy`, `move`, `sheet`, `image`, `imageUrl`, `createdAt`, `updatedAt` |
| `NpcInsertInfo` | `tokenId`, `name`, `life`, `energy`, `move`, `sheet`, `image` |
| `CampaignNpcInfo` | `campaignNpcId`, `campaignId`, `npcId`, `name`, `tokenId`, `tokenImageUrl`, `imageUrl`, `life`, `energy`, `move`, `createdAt` |
| `CampaignNpcInsertInfo` | `campaignId`, `npcId` |
| `MapNpcInfo` | `mapNpcId`, `mapId`, `npcId`, `mapTokenId`, `name`, `life`, `energy`, `status`, `tokenId`, `tokenImageUrl`, `x`, `y`, datas |
| `MapNpcInsertInfo` | `mapId`, `npcId`, `x`, `y`, `look` |

`MapTokenInfo` ganha `mapNpcId`/`npcId` (opcionais, já enviados pela API).

## Formulário (`lib/npcForm.ts`)

`NpcForm { name; life; energy; move; sheet }` (strings) + `tokenId: number | null` e imagem à parte.
Erros: `nameRequired`, `nameTooLong` (> 260), `notInteger`, `negative`, `sheetTooLong` (> 20 000),
`tokenRequired`. `toNpcInsert(form, image, tokenId)`.

## Estado (`NpcContext`)

| Campo / ação | Fonte |
|---|---|
| `campaignNpcs` | `GET /api/campaign/{id}/npc` (só mestre) |
| `searchMyNpcs(query)` | `GET /api/npc` |
| `getNpc(id)` / `createNpc` / `updateNpc` | `/api/npc` |
| `addToCampaign(npcId)` / `removeFromCampaign(campaignNpcId)` | `/api/campaignnpc` |
| `placeOnMap(npcId, x, y)` | `POST /api/mapnpc` + `MapTokenContext.refresh()` |
