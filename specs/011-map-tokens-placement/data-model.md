# Data Model: Tokens no Mapa

## Character (`characters`) — alterado

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| **TokenId** | `token_id` | bigint NULL | **novo**; FK `fk_token_character` → `tokens.token_id`, `ClientSetNull` |

- `Update(name, sheet, life, energy, move, image, tokenId)` — dono; o service valida que o token existe.
- `AssignTokenIfMissing(tokenId)` — usado ao colocar o personagem no mapa: grava só se `TokenId` é
  null; retorna se gravou.

## MapToken (`map_tokens`) — alterado

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| **CampaignCharacterId** | `campaign_character_id` | bigint NULL | **novo**; FK `fk_campaign_character_map_token` → `campaign_characters`, `ClientSetNull` |

- Índice único filtrado `ix_map_tokens_map_campaign_character` em `(map_id, campaign_character_id)`
  `WHERE campaign_character_id IS NOT NULL`.
- Regra: `TokenType == Character` ⇔ `CampaignCharacterId != null` (`DomainValidationException`
  `campaignCharacterId`).
- `PlaceCharacter(mapId, tokenId, campaignCharacterId, characterName, x, y)` (fábrica): tipo
  Character, nome = nome do personagem, vida/energia/movimento 0, sem status/ficha próprios, look 0.
- `ChangeToken(tokenId)`: troca só o token (posição, direção, tipo e ligação mantidos).
- `MoveTo(x, y)`: existente.

### Dados exibidos

| Tipo | name / life / energy / status / sheet / move |
|---|---|
| Character | participação (`CurrentLife`, `CurrentEnergy`, `CharacterStatus`, `Sheet`) + personagem (`Name`, `Move`) |
| Npc / Enemy / Object | colunas próprias do token do mapa (inalterado) |

## Regras de serviço

| Ação | Regra |
|---|---|
| Colocar personagem | mestre do mapa; mapa não excluído; participação Approved na campanha do mapa; sem token dela no mapa (409); hex livre (409); token = do personagem ou `tokenId` informado (400 se nenhum; 404 se não existe); personagem sem token recebe o informado |
| Incluir token (NPC) | `POST /api/maptoken` existente + hex livre (409); tipo Character recusado sem participação |
| Mover | mestre; hex livre (outro token no destino → 409) |
| Trocar token | mestre; token existe |
| Excluir token da biblioteca | recusado se usado por personagem (409) ou por token do mapa (regra atual) |
| Remover participação / excluir personagem | apaga antes os tokens do mapa ligados |

Hex ocupado = outro token do mapa com o mesmo `x`/`y` no mesmo mapa.

## Hex math (`HexGrid` / `lib/hexGrid.ts`)

- `HexRound(fq, fr) → (q, r)`: cube rounding do guia.
- `PixelToHex(px, py, size) → (x, y)`: `px' = px − size`, `py' = py − √3/2·size`;
  `fq = (2/3·px') / size`, `fr = (−1/3·px' + √3/3·py') / size`; `HexRound`; `AxialToOffset`.
- `IsInsideGrid(x, y, columns, rows)`: `0 ≤ x < columns`, `0 ≤ y < rows`.
- Referência: `PixelToHex(hexCenter(x, y))` = `(x, y)` para qualquer hex; pontos a 0,9·size do centro
  no eixo horizontal continuam no mesmo hex.

## Migration `AddCharacterTokenAndMapTokenParticipation`

1. `ADD COLUMN token_id bigint NULL` em `characters` + FK `fk_token_character`.
2. `ADD COLUMN campaign_character_id bigint NULL` em `map_tokens` + FK
   `fk_campaign_character_map_token` + índice único filtrado.
3. Dados existentes: nenhum token do mapa atual é ligado (tokens `Character` antigos continuam, mas o
   service passa a exigir a ligação só em criações/alterações de tipo).
