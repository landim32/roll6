# API Contract: Administração do log de turnos (030)

Todas as rotas: `[Authorize]` (JWT ou `X-Api-Key`), **somente o mestre** da campanha. Erros no padrão
`ApiControllerBase.HandleException`: 400 `ValidationProblemDetails`, 403, 404, 409 `ProblemDetails`.

## POST /api/turn — incluir registro (ampliado)

```json
{
  "campaignId": 12,
  "turnNo": 3,
  "turnType": 5,
  "mapId": 40,
  "characterId": null, "npcId": null, "mapNpcId": null,
  "description": "O grupo atravessou a ponte...",
  "beforeX": null, "beforeY": null, "beforeLook": null, "x": null, "y": null, "look": null,
  "moved": null,
  "changes": null
}
```

| turnType | Obrigatórios | Proibidos |
|---|---|---|
| 1 Movement | ator, before/after x, y, look | — (`moved` opcional ≥ 0) |
| 2 Action / 3 ActionResult | ator, `description` ≤ 2000 | — |
| 4 CharacterUpdate | ator, `changes` não vazia (`[{ field, before, after }]`) | — |
| 5 Narration | `description` ≤ 10000 | `characterId`, `npcId`, `mapNpcId` |

- `turnNo` omitido = turno atual; informado precisa estar em 1…turno atual (400 `turnNo`).
- Ator e mapa precisam ser da campanha (400 `characterId`/`npcId`/`mapNpcId`/`mapId`).
- Não move peças, não altera valores, não aplica a regra de um movimento por turno.
- **201** `TurnInfo`; publica `turn.changed`.
- Erros: 400 (tipo inválido, campos), 403 (não mestre), 404 (campanha).

## PUT /api/turn/{id} — alterar registro (novo)

```json
{ "description": "Texto corrigido", "turnNo": 4 }
```

Campos (todos opcionais; `null` = mantém): `turnNo`, `mapId`, `description`, `beforeX`, `beforeY`, `beforeLook`, `x`,
`y`, `look`, `moved`, `changes`.

- Campo que não vale para o tipo do registro → 400 naquele campo.
- Mesmas validações da inclusão; `turnNo` em 1…turno atual.
- Tipo, ator, autor e `createdAt` não mudam; não move peças nem altera valores.
- **200** `TurnInfo` atualizado; publica `turn.changed`.
- Erros: 400, 403 (não mestre), 404 (`Registro de turno não encontrado.`).

## DELETE /api/turn/{id} — excluir registro (sem mudança)

- Qualquer tipo, qualquer turno. **204**; publica `turn.changed`. Erros: 403, 404.

## PUT /api/campaign/{id}/turn/current — definir o turno atual (novo)

```json
{ "turnNo": 3, "discardLaterEntries": false }
```

- `turnNo < 1` → 400 `turnNo`.
- Igual ao atual → **200** sem gravar e sem evento.
- Maior → grava; publica `turn.finished` `{ finishedTurn: turnNo - 1, turnNo }`.
- Menor, sem registros em turnos maiores → grava; publica `turn.changed`.
- Menor, com registros em turnos maiores e `discardLaterEntries = false` → **409**
  `Existem registros nos turnos 4, 5. Envie discardLaterEntries = true para excluí-los.`
- Menor com `discardLaterEntries = true` → exclui os registros dos turnos maiores e grava, na mesma transação;
  publica `turn.changed`.
- **200** `TurnSetCurrentResultInfo`:

```json
{ "previousTurn": 5, "turnNo": 3, "discardedEntries": 7 }
```

- Erros: 400, 403 (não mestre), 404 (`Campanha não encontrada.`), 409.
