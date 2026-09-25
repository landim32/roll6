# API Contract (delta): Posição x/y e Direção do Olhar do Token no Mapa

**Feature**: 004-maptoken-position-look | Base: `specs/001-backend-core-entities/contracts/api.md`

Rotas não mudam. `q` e `r` deixam de existir.

## MapToken

`POST /api/maptoken` — `MapTokenInsertInfo`:

```json
{ "mapId": 1, "tokenId": 2, "name": null, "tokenType": 3, "sheet": null,
  "life": 7, "energy": 0, "status": null, "move": 6, "x": 3, "y": 2, "look": 1 }
```

`PUT /api/maptoken/{id}` — `MapTokenUpdateInfo`:

```json
{ "name": "Goblin 1", "tokenType": 3, "sheet": null, "life": 4, "energy": 0,
  "status": "Ferido", "move": 6, "x": 4, "y": 0, "look": 5 }
```

- `x` = coluna, `y` = linha da grid do modelo (colunas ímpares deslocadas meia altura para baixo).
  Vazios → 0.
- `look` = lado do hexágono (0 cima, 1 cima-direita, 2 baixo-direita, 3 baixo, 4 baixo-esquerda,
  5 cima-esquerda). Vazio → 0; fora de 0..5 → 400 em `look`.

Respostas (`POST`, `PUT`, `GET /api/map/{id}/token`) — `MapTokenInfo` com `x`, `y`, `look` no
lugar de `q`, `r`.
