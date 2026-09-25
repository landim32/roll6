# Data Model: Frontend — Login e Editor de Mapa

**Feature**: 006-frontend-map-editor | **Date**: 2026-09-25

Tipos TypeScript (`src/types/`, sempre `interface`, Princípio IV) espelhando os DTOs do backend.

## Tipos da API

| Arquivo | Interfaces |
|---|---|
| `common.ts` | `PagedList<T>` { items, page, pageSize, totalCount }; `ProblemDetails` { title, status, detail?, errors? } |
| `auth.ts` | `UserInfo` { userId, name, email }; `UserLoginInfo`; `UserInsertInfo`; `UserTokenInfo` { token, expiresAt, user } |
| `campaign.ts` | `CampaignInfo` { campaignId, userId, ownerName, name, open, createdAt, updatedAt }; `CampaignInsertInfo` { name, open } |
| `mapModel.ts` | `MapModelInfo` { mapModelId, userId, name, description, image, imageUrl, gridWidth, gridHeight, imageWidth, imageHeight, imageTop, imageLeft, hexSize, createdAt, changedAt }; `MapModelInsertInfo` |
| `map.ts` | `MapInfo` { mapId, campaignId, mapModelId, mapModelName, mapModelImageUrl, gridWidth, gridHeight, imageWidth, imageHeight, imageTop, imageLeft, hexSize, userId, sequence, name, status }; `MapInsertInfo` { campaignId, mapModelId } |
| `image.ts` | `ImageUploadInfo` { fileName, url } |

## Estado do cliente

### `AuthState` (`Contexts/AuthContext.tsx`)

| Campo | Tipo | Persistência |
|---|---|---|
| `session` | `UserTokenInfo \| null` | `localStorage` `roll6:auth` |
| `loading`, `error` | padrão da skill | — |

Expirada (`expiresAt` passado) ou 401 → logout.

### `CampaignState` (`Contexts/CampaignContext.tsx`)

| Campo | Tipo | Persistência |
|---|---|---|
| `currentCampaign` | `CampaignInfo \| null` | `localStorage` `roll6:campaign` (só o id; recarregado da API) |
| `myCampaigns`, `searchResults` | `PagedList<CampaignInfo>` | — |
| `isMaster` | derivado: `currentCampaign.userId === session.user.userId` | — |

### `MapEditorState` (`Contexts/MapEditorContext.tsx`)

| Campo | Tipo | Notas |
|---|---|---|
| `draft` | `MapDraft` | o que está na tela |
| `saved` | `MapDraft \| null` | snapshot do último estado gravado |
| `isDirty` | derivado | `!equal(draft, saved)`; mapa sem `mapModelId` com imagem ou grid alterada é sujo |
| `canEdit` | derivado | falso quando o mapa atual é de campanha em que o usuário não é mestre |
| `resizeMode` | boolean | liga/desliga as alças |
| `view` | `{ zoom, panX, panY }` | não gravado; zoom 0,1–4,0 |

`MapDraft`:

| Campo | Tipo | Origem |
|---|---|---|
| `mapModelId` | `number \| null` | null = mapa novo |
| `mapId` | `number \| null` | mapa da campanha, quando aberto por "Mapas da campanha" |
| `ownerUserId` | `number \| null` | dono do modelo; ≠ usuário → salvar cria cópia |
| `name`, `description` | `string`, `string \| null` | |
| `image`, `imageUrl` | `string \| null` | `fileName` do upload e URL temporária |
| `gridWidth`, `gridHeight` | `number` | 1–500, padrão 20 |
| `imageWidth`, `imageHeight` | `number \| null` | preenchidos com o tamanho natural ao carregar a imagem |
| `imageTop`, `imageLeft` | `number` | ≥ 0, < tamanho |

### Fluxo de "Salvar mapa"

```text
isDirty? ──não──> (botão oculto)
   │sim
mapModelId e ownerUserId == eu ──> PUT /mapmodel/{id} ──> saved = draft ──> toast
   │senão (novo ou de outro)
SaveMapModal(nome) ──> POST /mapmodel ──> campanha atual e isMaster? ──sim──> POST /map
                                        └────────────────────────────────────> saved = draft ──> toast
```

## Geometria — `src/lib/hexGrid.ts`

| Função | Regra |
|---|---|
| `calculateHexSize(cols, rows, w, h)` | igual ao backend (arredonda 4 casas) |
| `offsetToAxial(x, y)` / `axialToOffset(q, r)` | odd-q |
| `hexCenter(x, y, size)` | `(size + 1,5·size·x, √3/2·size + √3·size·y + (x & 1 ? √3/2·size : 0))` |
| `hexCorners(cx, cy, size)` | 6 vértices a 0°, 60°, … 300° (flat-top) |
| `gridPath(cols, rows, size)` | `d` de um `<path>` com todos os hexágonos |
