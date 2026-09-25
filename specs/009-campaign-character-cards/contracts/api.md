# API Contracts: Cards dos Personagens da Campanha

Todas com `Authorization: Bearer {token}`; erros em `ProblemDetails` (400/403/404/409).

## Alterados

### `CampaignCharacterInfo` (todas as respostas de participação)

```json
{
  "campaignCharacterId": 12, "campaignId": 5, "campaignName": "Mesa", "campaignOwnerName": "Ana",
  "characterId": 7, "characterName": "Aria", "characterImageUrl": "https://…",
  "characterOwnerId": 3, "characterOwnerName": "Rodrigo", "status": 3,
  "currentLife": 8, "currentEnergy": 5, "totalLife": 12, "totalEnergy": 6,
  "createdAt": "…", "updatedAt": "…"
}
```

### `GET /api/character/{id}` e `PUT /api/character/{id}`

Permitidos ao dono **ou** ao mestre de uma campanha em que o personagem está Approved (antes só o
dono). 403 para os demais. `PUT` com `life`/`energy` negativos → 400. Após o `PUT`, os valores atuais
acima dos novos totais são reduzidos em todas as campanhas. `DELETE` continua só do dono.

## Novo

### `PUT /api/campaigncharacter/{id}/vitals`

```json
{ "currentLife": 8, "currentEnergy": 5 }
```

- Dono do personagem ou mestre da campanha da participação; senão 403.
- Participação não Approved → 409.
- `currentLife > totalLife` ou `currentEnergy > totalEnergy` → 400 (campos `currentLife`/`currentEnergy`).
- 200 → `CampaignCharacterInfo` atualizado.

## Inalterado, consumido pelo painel

`GET /api/campaign/{id}/character` — mestre: todos; participante aprovado: só aprovados; demais: 403.
