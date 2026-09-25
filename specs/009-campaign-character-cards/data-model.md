# Data Model: Cards dos Personagens da Campanha

## Banco (migration `AddCampaignCharacterVitals`)

`campaign_characters` ganha:

| Coluna | Tipo | Regra |
|---|---|---|
| `current_life` | `integer NOT NULL` | ≤ `characters.life`; pode ser ≤ 0 |
| `current_energy` | `integer NOT NULL` | ≤ `characters.energy`; pode ser ≤ 0 |

Linhas existentes: preenchidas com os totais do personagem (SQL na migration).

`characters.life` / `characters.energy` passam a significar **total** (≥ 0).

## Domínio

### `Character`

- `Update(...)`: `Life = Guard.NonNegative(life, "life")`, `Energy = Guard.NonNegative(energy, "energy")`.

### `CampaignCharacter`

| Membro | Comportamento |
|---|---|
| `CurrentLife`, `CurrentEnergy` | novos |
| `RequestAccess(campaignId, characterId, autoApprove, totalLife, totalEnergy)` | atuais = totais |
| `CreateInvite(campaignId, characterId, totalLife, totalEnergy)` | atuais = totais |
| `Invite(totalLife, totalEnergy)` / `AcceptInvite(…)` / `ApproveRequest(…)` | ao virar Approved, atuais = totais |
| `SetVitals(currentLife, currentEnergy, totalLife, totalEnergy)` | só Approved (409); atual ≤ total (400) |

Repositório: `IsApprovedInCampaignOfAsync(characterId, masterUserId)`, `ClampVitalsAsync(characterId,
totalLife, totalEnergy)`.

## DTOs

- `CampaignCharacterInfo` + `currentLife`, `currentEnergy`, `totalLife`, `totalEnergy`.
- Novo `CampaignCharacterVitalsInfo` `{ currentLife, currentEnergy }` (corpo do PUT).

## Frontend

- `types/campaignCharacter.ts`: campos novos em `CampaignCharacterInfo`; `CampaignCharacterVitalsInfo`.
- `CharacterContext`: `party: CampaignCharacterInfo[]` (só Approved), `refreshParty()`,
  `canEdit(member)` = `isMaster || member.characterOwnerId === userId`, `getCharacter(id)`,
  `updateCharacter(id, data)`, `updateVitals(campaignCharacterId, data)`.
- `lib/vitals.ts`: `vitalPercent`, `isFallen`, `validateVitals` → `'notInteger' | 'aboveTotal' | null`.
- localStorage `simple-tabletop-map:party-collapsed` = `"1"` quando recolhido.
