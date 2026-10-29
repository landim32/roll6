# Data Model: Miniaturas de mesa na vista isométrica (104)

Nada é salvo nem trafega de novo: tudo é derivado do `MapTokenInfo` que a vista isométrica já recebe (`posture`,
`tokenType`, `npcCategory`, `space`, `look`, `modelFileUrl`, imagens 2,5D, `upImageUrl`, `downImageUrl`).

## MiniatureState (puro, `lib/isoMiniature`)

| Campo | Tipo | Regra |
|---|---|---|
| `tipped` | boolean | `posture` ∈ { Down 2, OutOfCombat 3 } e a peça não é objeto (`tokenType` 4 nunca tomba) |
| `gray` | boolean | `posture` = OutOfCombat 3 e a peça não é objeto |

Transições: Standing ↔ Down ↔ OutOfCombat chegam pelo tempo real (`mapTokens.changed` / `mapToken.upserted`); cada uma
muda só `tipped`/`gray` — nunca recarrega modelo nem imagem.

## MiniatureBase (puro)

| Campo | Tipo | Regra |
|---|---|---|
| `radius` | number (px de mapa) | `0.85 × √(space × área do hex / π)` (círculo com a área da forma) |
| `height` | number | `BASE_HEIGHT = 4` |
| `rimColor` | string | `baseColorOf(token)` (azul, vermelho, verde-água, cinza) |

Só existe para peças `kind` = `model` ou `figure` (Q2); `flat` não tem base.

## TipPose (puro)

Para `yaw = look × 60°`, a frente no chão é `f = (sin yaw, −cos yaw)` (x, z da cena).

| Campo | Regra |
|---|---|
| `pivot` | ponto do chão `center − f × radius` (borda de trás da base) |
| `axis` | horizontal, perpendicular a `f`: `(cos yaw, 0, sin yaw)` |
| `angle` | 90°, no sentido que leva o topo (+Y) para `−f` (as costas) |

## IsoPiece (alterado, `components/iso/isoPieces`)

Ganha `tipped`, `gray`, `base` (`MiniatureBase | null`) e `downImageUrl`. A `signature` (o que força recarregar) ganha
`downImageUrl` mas **não** a postura.

## ModelSetOptions (alterado, `components/story/modelSet`)

| Opção | Tipo | Sem ela |
|---|---|---|
| `mount` | `(id: number) => Object3D \| null` | o modelo vai para a `scene` (como hoje) |
| `patchMaterial` | `(material: Material, id: number) => void` | o `id` é novo e opcional para quem já passa a função |
