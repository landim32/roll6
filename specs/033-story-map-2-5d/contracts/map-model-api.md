# Contract: Map model API (033)

Nenhum endpoint novo. `MapModelController` já é `[Authorize]`. Campos novos em camelCase com
`[JsonPropertyName]`.

## `MapModelInsertInfo` — `POST /api/mapmodel`, `PUT /api/mapmodel/{id}`

```jsonc
{
  "name": "Masmorra de Kor",
  "description": null,
  "image": "3f2a…c1.webp",
  "gridWidth": 30, "gridHeight": 20,
  "imageWidth": 2400, "imageHeight": 1600, "imageTop": 0, "imageLeft": 0,
  "kind": 2,                       // NOVO — 1 = 2D (default), 2 = história 2,5D
  "walls": [[0, 0], [1, 0], [2, 5]],  // NOVO — células [x, y] odd-q; null/[] = nenhuma
  "skyImage": "9b77…e0.jpg"        // NOVO — nome armazenado; null = sem céu
}
```

- O PUT **substitui todos os campos** (inalterado): omitir `kind` → 1, `walls` → nenhuma, `skyImage` → nenhuma.
- `walls`: duplicatas removidas, células fora da grade descartadas, ordenadas por (y, x). Guardadas mesmo com
  `kind = 1` (sem efeito).
- Só o dono (`PUT`, 403 para os demais); salvar mapa de outra pessoa continua sendo uma cópia via `POST`.

| Erro | Status | Chave |
|---|---|---|
| `kind` fora de {1, 2} | 400 | `kind` |
| item de `walls` sem exatamente 2 inteiros | 400 | `walls` |
| `skyImage` fora do formato `{guid}.{ext}` | 400 | `skyImage` |

Após o PUT, o `map.saved` (017) já publicado para cada campanha que usa o modelo faz os clientes recarregarem.

## `MapModelInfo` — `GET /api/mapmodel`, `GET /api/mapmodel/{id}`, respostas de POST/PUT

Campos novos: `kind` (int), `walls` (`int[][]`, `[]` quando não há), `skyImage` (string | null), `skyImageUrl`
(URL pré-assinada | null). A listagem paginada também os traz (as paredes estão na mesma linha).

## Efeito nas escritas de posição (somente mapas `kind = 2`)

Paredes contam como hex ocupado para **todos**, inclusive o mestre:

| Endpoint | Parede em alguma célula da forma da peça |
|---|---|
| `POST /api/maptoken` (objeto) | 409 `Há uma parede nessa posição.` |
| `POST /api/maptoken/character` | 409 |
| `PUT /api/maptoken/{id}/position` | 409 no destino; o custo do caminho contorna paredes (jogador sem caminho dentro do movimento → 400 atual); o mestre "pulando" peças continua sem atravessar paredes |
| `POST /api/mapnpc` com x/y | 409; sem x/y, a busca de hex livre pula paredes |
| `POST /api/turn/reset` | a peça só volta se o hex anterior estiver livre **e** não for parede |
| `POST /api/campaign/{id}/turn/process` | 400 `characters[i].x` / `npcs[i].x` `Há uma parede nessa posição.` |
| `PUT /api/maptoken/{id}/posture` | **nunca** recusado (regra 031) |

Ordem de verificação: fora da grade (400 `x`) → parede (409) → outra peça (409 `O hex já está ocupado.`).
