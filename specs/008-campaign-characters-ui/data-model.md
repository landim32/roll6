# Data Model: Personagens na Campanha

**Sem mudança de esquema nem migration.** As tabelas `characters` e `campaign_characters` (features
001/005) já atendem; muda só o comportamento e há DTO novo.

## Backend

### Regras alteradas

| Onde | Antes | Depois |
|---|---|---|
| `CampaignCharacter.RequestAccess(campaignId, characterId, bool autoApprove)` | `autoApprove` = campanha aberta | `autoApprove` = campanha aberta **ou** quem pede é o mestre |
| Remoção de participação | não existia | `CampaignCharacterService.RemoveAsync(userId, id)`: só o mestre; qualquer status; apaga a linha |

Transições da 005 (inalteradas): Invited → Approved/Denied (dono aceita/recusa); RequestedAccess →
Approved/Denied (mestre aprova/recusa); convite sobre Denied → Invited; convite sobre RequestedAccess
→ Approved.

### DTO novo — `DTO/Character/CharacterSearchInfo.cs`

| Campo (JSON) | Tipo | Origem |
|---|---|---|
| `characterId` | long | `Character.CharacterId` |
| `name` | string | `Character.Name` |
| `imageUrl` | string? | URL pré-assinada de `Character.Image` |
| `ownerId` | long | `Character.UserId` |
| `ownerName` | string | `User.Name` |

### Repositórios (métodos novos)

- `ICharacterRepository.ListPagedAsync(string? search, int skip, int take)` → `(Items, TotalCount)`,
  `ILike` no nome, ordem nome + id.
- `ICampaignCharacterRepository.ListByCampaignAndUserAsync(long campaignId, long userId)` →
  participações de personagens cujo `UserId` é o usuário, na campanha.
- `ICampaignCharacterRepository.DeleteAsync(long id)`.

## Frontend

### Tipos (`src/types/character.ts`, `src/types/campaignCharacter.ts`)

- `CharacterInfo` (espelha `DTO/Character/CharacterInfo`), `CharacterInsertInfo`,
  `CharacterSearchInfo`.
- `CampaignCharacterInfo` (espelha `DTO/CampaignCharacter/CampaignCharacterInfo`),
  `CampaignCharacterRequestInfo { campaignId; characterId }`.
- `CAMPAIGN_CHARACTER_STATUS = { invited: 1, requestedAccess: 2, approved: 3, denied: 4 } as const`
  (sem `enum`, por `erasableSyntaxOnly`).

### Estado do `CharacterContext`

| Campo | Conteúdo |
|---|---|
| `myCharacters` | `CharacterInfo[]` do usuário (`GET /api/character`) |
| `myParticipations` | `CampaignCharacterInfo[]` dos personagens do usuário na campanha atual (`GET /api/campaigncharacter/mine`) |
| `options` | derivado: `'gm'` (se mestre) + personagens próprios `Approved` |
| `currentSelection` | `'gm' \| number \| null`, resolvido contra `options` |
| `invites` | `CampaignCharacterInfo[]` com status Invited (`GET /api/campaigncharacter/invites`) |

### Persistência local

`roll6:character` = `{ "<campaignId>": "gm" | <characterId> }`; apagado no logout.

### Validação do cadastro (`lib/characterForm.ts`)

nome obrigatório (trim, ≤ 260); vida/energia/movimento inteiros ≥ 0 (padrão 0); estado ≤ 260;
ficha ≤ 20.000 — iguais a `Character.Update` (`Guard.RequiredText`/`OptionalText`/`NonNegative`).
