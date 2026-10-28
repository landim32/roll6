# Data model: Vista isométrica iluminada (103)

Nada muda no servidor: nenhuma tabela, coluna, DTO, endpoint, evento ou ferramenta MCP. Os tipos abaixo vivem só no
frontend.

## ViewMode (`lib/viewMode.ts`)

| Valor | Vista |
|---|---|
| `'2d'` | mapa 2D (padrão; qualquer valor desconhecido) |
| `'3d'` | vista 3D atual (081) |
| `'iso'` | vista isométrica iluminada (103) |

Guardado em `localStorage` `roll6:view-mode` = `{ [mapModelId]: ViewMode }`, por aparelho, limpo no logout.

## IsoPose (`lib/isoCamera.ts`)

| Campo | Tipo | Regra |
|---|---|---|
| `target` | `Point` (px do mapa) | centro da peça em foco; meio do mapa sem foco |
| `yaw` | radianos | livre, normalizado em (−π, π] |
| `pitch` | graus | 30–70, padrão 35,26 |
| `span` | hexes visíveis na altura | 4–30, padrão 14 |

## Light (`lib/isoLight.ts`)

| Campo | Valor |
|---|---|
| `LIGHT_RADIUS_HEXES` | 5 |
| `lightRadiusPx` | `5 × √3 × HEX_SIZE` (≈ 346 px) |
| `LIGHT_FEATHER_PX` | borda suave (≈ 0,4 hex) |
| `center` | `IsoPose.target` |

`lightFactor(dist)` = 1 dentro, 0 fora, suave na borda; peças: visíveis só onde `dist ≤ lightRadiusPx`.

## Focus (`lib/isoFocus.ts`)

| Campo | Tipo | Regra |
|---|---|---|
| `campaignCharacterId` | `number \| null` | participação aprovada com peça de personagem no mapa aberto; `null` = meio do mapa |

Transições: inicial = personagem escolhido do usuário (se tem peça), senão primeiro do grupo com peça, senão `null`;
clique numa peça de personagem ou seletor → aquele personagem; foco que sai do mapa ou deixa de ser aprovado → inicial.
Estado local da vista: não é salvo, não é compartilhado.

## IsoPiece (spec de desenho, `components/iso/isoRenderer.ts`)

| Campo | Origem |
|---|---|
| `id` | `MapTokenInfo.mapTokenId` |
| `kind` | `model` (tem `modelFileUrl`) / `figure` (tem `frontImageUrl`) / `flat` |
| `center`, `look`, `space` | posição, `look` e tamanho da peça (pegada de `lib/hexGrid.footprint`) |
| `model` | `ModelSpec` do `modelSet` com `still: true`, `lying: false`, `ground: 0`, armas do token |
| `isCharacter` | `tokenType` Character — só estas recebem clique de foco |
