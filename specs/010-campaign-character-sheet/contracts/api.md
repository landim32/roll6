# API Contract: Status e Ficha do Personagem por Campanha

Todas as rotas exigem `Authorization: Bearer`. Erros em `ProblemDetails`: 400 validação, 403 sem
permissão, 404 não encontrado, 409 conflito de situação.

## Alterados

### `CharacterInfo` / `CharacterInsertInfo`

Sem o campo `status`. Os demais campos não mudam.

### `GET /api/character/{id}`, `PUT /api/character/{id}`

Só o **dono** (403 para qualquer outro, inclusive o mestre de uma campanha em que o personagem esteja
aprovado — revoga a permissão da feature 009).

### `CampaignCharacterInfo` (todas as listas: `/api/campaign/{id}/character`, `/mine`, `/invites`, respostas das ações)

```jsonc
{
  "campaignCharacterId": 7, "campaignId": 3, "campaignName": "…", "campaignOwnerName": "…",
  "characterId": 12, "characterName": "Aria", "characterImageUrl": "https://…",
  "characterOwnerId": 5, "characterOwnerName": "…",
  "status": 3,
  "currentLife": 8, "currentEnergy": 4, "totalLife": 12, "totalEnergy": 6,
  "characterMove": 6,              // novo: movimento do personagem
  "characterStatus": "envenenado", // novo: status nesta campanha (null se vazio)
  "createdAt": "…", "updatedAt": "…"
}
```

A ficha **não** vem nas listas.

## Novos

### `GET /api/campaigncharacter/{id}` → `200 CampaignCharacterDetailInfo`

`CampaignCharacterInfo` + `"sheet": string | null` (ficha da campanha).

Permissão: dono do personagem, mestre da campanha ou usuário com personagem Approved na campanha;
senão 403. 404 se não existir.

### `PUT /api/campaigncharacter/{id}` → `200 CampaignCharacterDetailInfo`

Body `CampaignCharacterUpdateInfo`:

```json
{ "currentLife": 8, "currentEnergy": 4, "characterStatus": "envenenado", "sheet": "Força 3" }
```

- Permissão: dono do personagem ou mestre da campanha (403).
- Participação não Approved → 409.
- Atual acima do total → 400 (`currentLife`/`currentEnergy`); status > 260 → 400
  (`characterStatus`); ficha > 20 000 → 400 (`sheet`).
- Textos vazios/brancos gravados como `null`.

## Removidos

- `PUT /api/campaigncharacter/{id}/vitals` e `CampaignCharacterVitalsInfo` (substituídos pelo `PUT`
  acima).

## Efeitos colaterais nas ações de entrada

`POST /request` (aprovação direta), `POST /invite`, `POST /{id}/accept`, `POST /{id}/approve`:
quando a participação é criada ou passa a Approved, `sheet` recebe a ficha atual do personagem e
`characterStatus` vira `null` (além de atuais = totais).
