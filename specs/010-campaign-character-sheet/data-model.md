# Data Model: Status e Ficha do Personagem por Campanha

## Character (`characters`) — alterado

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| CharacterId | `character_id` | bigint identity | PK |
| UserId | `user_id` | bigint | dono; FK `fk_user_character` |
| Name | `name` | varchar(260) | obrigatório |
| Sheet | `sheet` | varchar(20000) | opcional — **ficha original** |
| Life / Energy | `life` / `energy` | integer | totais ≥ 0 |
| Move | `move` | integer | ≥ 0 |
| Image | `image` | varchar(260) | `{guid}.{ext}` |
| ~~Status~~ | ~~`status`~~ | — | **removido** (vai para a participação) |

`Character.Update(name, sheet, life, energy, move, image)` — sem `status`. Só o dono altera.

## CampaignCharacter (`campaign_characters`) — alterado

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| CampaignCharacterId | `campaign_character_id` | bigint identity | PK |
| CampaignId / CharacterId | `campaign_id` / `character_id` | bigint | FKs `ClientSetNull`; único (campanha, personagem) |
| Status | `status` | integer | situação: Invited 1, RequestedAccess 2, Approved 3, Denied 4 (inalterado) |
| CurrentLife / CurrentEnergy | `current_life` / `current_energy` | integer | ≤ totais; podem ser ≤ 0 |
| **CharacterStatus** | `character_status` | varchar(260) | **novo**, opcional (texto livre, trim; vazio → null) |
| **Sheet** | `sheet` | varchar(20000) | **novo**, opcional — ficha da campanha |

### Reinício ao entrar (FR-003)

Sempre que a participação é criada (`RequestAccess`, `CreateInvite`) ou passa a Approved (`Invite`
sobre RequestedAccess, `AcceptInvite`, `ApproveRequest`), a partir do `Character` recebido:

- `CurrentLife = character.Life`, `CurrentEnergy = character.Energy`
- `Sheet = character.Sheet`
- `CharacterStatus = null`

Transições da situação: inalteradas (feature 005).

### `UpdatePlay(currentLife, currentEnergy, characterStatus, sheet, totalLife, totalEnergy)`

Substitui `SetVitals`.

- Situação ≠ Approved → `ConflictException` (409).
- `currentLife > totalLife` / `currentEnergy > totalEnergy` → `DomainValidationException` (400).
- `characterStatus` → `Guard.OptionalText(…, "characterStatus", 260)`.
- `sheet` → `Guard.OptionalText(…, "sheet", 20000)`.
- Atualiza `UpdatedAt`.

## Permissões

| Ação | Dono do personagem | Mestre da campanha | Participante aprovado | Outros |
|---|---|---|---|---|
| Ler/alterar personagem (`/api/character/{id}`) | ✅ | ❌ (403) | ❌ | ❌ |
| Ler detalhe da participação (com ficha da campanha) | ✅ | ✅ | ✅ | ❌ (403) |
| Alterar participação (atuais, status, ficha da campanha) | ✅ | ✅ | ❌ (403) | ❌ |

## Migration `MoveCharacterStatusToCampaign`

1. `ADD COLUMN character_status varchar(260) NULL`, `ADD COLUMN sheet varchar(20000) NULL` em
   `campaign_characters`.
2. `UPDATE campaign_characters cc SET character_status = c.status, sheet = c.sheet FROM characters c
   WHERE c.character_id = cc.character_id;`
3. `DROP COLUMN status` de `characters`.

`Down`: recria `characters.status`, copia o `character_status` da participação mais recente de cada
personagem e remove as duas colunas.
