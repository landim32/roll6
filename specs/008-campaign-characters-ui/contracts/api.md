# API Contracts: Personagens na Campanha

Todas exigem `Authorization: Bearer {token}`. Erros seguem o padrão do projeto (`ProblemDetails`;
400 validação, 403 sem permissão, 404 não encontrado, 409 conflito de estado).

## Novos

### `GET /api/character/search?page=1&pageSize=20&search=ari`

Personagens de todos os usuários (incluindo os do próprio usuário). 200:

```json
{
  "items": [
    { "characterId": 7, "name": "Aria", "imageUrl": "https://…", "ownerId": 3, "ownerName": "Rodrigo" }
  ],
  "page": 1, "pageSize": 20, "totalCount": 1
}
```

`pageSize` ≤ 100 (`PageQuery`). Não expõe ficha, vida, energia, estado nem movimento.

### `GET /api/campaigncharacter/mine?campaignId=5`

Participações (qualquer status) dos personagens do usuário na campanha. 200: `CampaignCharacterInfo[]`
(pode ser vazio). 404 se a campanha não existe.

### `DELETE /api/campaigncharacter/{id}`

Remove o personagem **da campanha** (o personagem continua existindo). Só o mestre. 204; 403 se não é
o mestre; 404 se a participação não existe.

## Alterado

### `POST /api/campaigncharacter/request` `{ "campaignId": 5, "characterId": 7 }`

Quando quem pede é o mestre da campanha (e dono do personagem), a participação nasce **Approved**
(antes só em campanha aberta). Demais regras iguais.

## Já existentes, consumidos pelo frontend

| Método | Rota | Uso |
|---|---|---|
| GET | `/api/character` | meus personagens |
| POST | `/api/character` | Incluir Personagem (`CharacterInsertInfo`) |
| POST | `/api/image` | upload da imagem do personagem |
| GET | `/api/campaign/{id}/character` | GM: todos os personagens da campanha |
| POST | `/api/campaigncharacter/invite` | GM convida |
| POST | `/api/campaigncharacter/{id}/approve` / `deny` | GM aprova / declina pedido |
| GET | `/api/campaigncharacter/invites` | notificações |
| POST | `/api/campaigncharacter/{id}/accept` / `decline` | dono aceita / recusa convite |
