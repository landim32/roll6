# API Contract: Transferir personagem (021)

## POST /api/character/{id}/transfer

`[Authorize]` (JWT ou `X-Api-Key`). Somente o dono atual.

Request:

```json
{ "email": "outra.pessoa@exemplo.com" }
```

| Resposta | Quando |
|---|---|
| 204 No Content | transferido |
| 400 ValidationProblemDetails | e-mail vazio/inválido (`errors.email`) ou destinatário = o próprio dono |
| 401 | sem credencial |
| 403 ProblemDetails | quem chama não é o dono |
| 404 ProblemDetails | personagem inexistente ou "Usuário não encontrado." |
| 409 ProblemDetails | o personagem mudou de dono durante a operação |

Efeitos: `characters.user_id` = destinatário; `party.changed` e `mapTokens.changed` (mapId nulo) em cada campanha
do personagem, com `actorUserId` = antigo dono.

## MCP: `transfer_character`

`[ApiOperation("POST", "/api/character/{id}/transfer")]` — parâmetros `characterId` e `email`;
`Destructive = true`, `Idempotent = false`, `ReadOnly = false`; resultado `{ ok: true }`.
