# API contract (031)

Erros seguem `ApiControllerBase.HandleException`: 400 `ValidationProblemDetails`, 403, 404, 409 `ProblemDetails`.
`posture`: `1` Em pé, `2` Caído, `3` Fora de combate.

## Novo — `PUT /api/maptoken/{id}/posture`

`[Authorize]`. Muda a postura do personagem (na campanha) ou da ocorrência de NPC ligada à peça.

Request:

```json
{ "posture": 3 }
```

Response 200: `MapTokenInfo` da peça (com `posture` e `space` atualizados).

| Caso | Resposta |
|---|---|
| peça não existe / mapa excluído | 404 `Token do mapa não encontrado.` / `Mapa não encontrado.` |
| peça de objeto | 400 `posture`: `Objetos não têm postura.` |
| valor fora de 1–3 | 400 `posture` |
| personagem: nem dono nem mestre | 403 |
| NPC: não é o mestre | 403 |
| participação não aprovada | 409 |
| mesma postura | 200 sem log/evento |

Efeitos: grava na participação/ocorrência; `CharacterUpdate` no turno atual (`changes: [{ field: "posture", before: "1", after: "3" }]`, autor = usuário); eventos: personagem → `party.changed`, `mapTokens.changed` (mapId null), `turn.changed`; NPC → `mapToken.upserted` (peça), `turn.changed`. **Sem** checagem de ocupação.

## Alterados

### `PUT /api/campaigncharacter/{id}` — `CampaignCharacterUpdateInfo`

`+ "posture": int | null` (null/ausente = mantém). Mudança entra no mesmo `Diff`/`CharacterUpdate`.

### `PUT /api/mapnpc/{id}` — `MapNpcUpdateInfo`

`+ "posture": int | null` (null/ausente = mantém).

### `POST /api/campaign/{id}/turn/process` — itens de `characters[]` / `npcs[]`

`+ "posture": int | null`. Erro `characters[i].posture` / `npcs[i].posture`. A validação de posições do lote passa a usar
os formatos inteiros no estado final (com a postura final de cada peça); a mudança de postura em si não é recusada por
ocupação.

### `POST`/`PUT /api/token` — `TokenInsertInfo`

`upSpace` ∈ {1, 2, 3, 7, 10} (padrão 1); `downSpace` null ou ∈ {1, 2, 3, 7, 10}. Outro valor → 400
`upSpace`/`downSpace`: `O tamanho deve ser 1, 2, 3, 7 ou 10 hexes.`

### Posicionamento (regras novas, mesmos endpoints)

`POST /api/maptoken`, `POST /api/maptoken/character`, `PUT /api/maptoken/{id}`, `PUT /api/maptoken/{id}/position`,
`POST /api/mapnpc`, `POST /api/turn/reset`:

- algum hex do formato fora da grade → 400 `x`: `A peça não cabe na grid do mapa nessa posição.`
- algum hex do formato ocupado por outra peça → 409 `O hex já está ocupado.`
- movimento de jogador: custo calculado com o formato inteiro em cada giro/passo; sem caminho → 400 `move`.
- reset: a peça só volta se o formato couber na posição anterior (senão fica, como hoje).

## Leituras (campos novos)

| Endpoint | Campo |
|---|---|
| `GET /api/map/{id}/token`, respostas de peça, evento `mapToken.upserted` | `posture` (int?, null p/ objeto), `space` (int) |
| `GET /api/campaign/{id}/character`, `GET /api/campaigncharacter/mine`, `GET /api/campaigncharacter/{id}` | `posture` |
| `GET /api/map/{id}/npc`, `MapNpcInfo` | `posture` |
| `GET /api/campaign/{id}/turn/data` | `posture` em cada personagem e NPC |
| `GET /api/campaign/{id}/turn/summary` | linha "Postura de "Em pé" para "Caído"" |
