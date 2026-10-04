# Contract: MCP tools (033)

Nenhuma ferramenta nova — `McpCoverageTests` continua em **86 operações / 87 ferramentas**. Todo parâmetro novo
tem default (exigência de `McpRouteParityTests`, que injeta `"sample"` em `string` sem default).

## `create_map_model` / `update_map_model` (`Tools/MapModelTools.cs`)

Parâmetros novos, no fim da lista:

| Parâmetro | Tipo | Default | Descrição (inglês, `McpDocs`) |
|---|---|---|---|
| `kind` | `int?` | `null` (→ 1) | "Map kind: 1 = 2D battle map (default), 2 = 2.5D story map (walls, 3D view)." |
| `walls` | `int[][]?` | `null` | "Wall cells of a story map as [[x, y], …] (column/row, odd-q). Duplicates and cells outside the grid are dropped. Walls block pieces only when kind = 2." |
| `skyImage` | `string?` | `null` | "Sky/horizon image shown behind the walls in the 3D view. " + `McpDocs.IMAGE_FILE` |

A descrição de `update_map_model` mantém "replaces all fields … send unchanged values back" e acrescenta que
omitir `walls` apaga as paredes.

## `get_map_model` / `list_map_models`

`Returns` passa a citar `kind`, `walls`, `skyImage`, `skyImageUrl`.

## Ferramentas de posição

As ferramentas que colocam, movem ou reposicionam peças (as de `POST /api/maptoken`,
`POST /api/maptoken/character`, `PUT /api/maptoken/{id}/position`, `POST /api/mapnpc`, `POST /api/turn/reset` e
`process_turn`): o bloco *Common errors* ganha "409 a wall is on that hex (story maps)" (400 com a chave do item
em `process_turn`).

## `roll6://guide` (`Roll6Guide.cs`)

Seção nova **"Story maps (2.5D)"**: tipos de mapa; paredes como células da mesma grade hexagonal, que bloqueiam
peças como um hex ocupado para todos (inclusive o mestre) e só quando `kind = 2`; o céu; a vista 3D é só do
aplicativo web (o MCP edita dados, não câmera).
