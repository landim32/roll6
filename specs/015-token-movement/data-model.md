# Data Model: Movimentação de Tokens

Sem mudança de schema.

## Peça do mapa (`map_tokens`) — campos usados

| Campo | Uso |
|---|---|
| `x`, `y` | posição (odd-q) — alterada ao confirmar |
| `look` | sentido 0–5 — alterado ao confirmar |
| `token_type` | 1 personagem, 2 NPC, 4 objeto |
| `campaign_character_id` | define o dono (dono do personagem) |
| `map_npc_id` | NPC (movimento do NPC) |

`MapTokenInfo.move` já traz o movimento do personagem (participação) ou do NPC.

## Estado do modo Mover (frontend, `lib/movement.ts`)

| Campo | Descrição |
|---|---|
| `phase` | `idle` · `path` (escolhendo destino) · `facing` (escolhendo sentido) |
| `piece` | peça em movimento (id, tipo, x, y, look inicial) |
| `total` | movimento (personagem/NPC); objetos: sem total |
| `field` | resultado do BFS: `dist` e `parent` por estado `(x, y, look)` |
| `target` | hex sob o mouse (fase `path`) |
| `destination` | hex escolhido (fase `facing`) |
| `look` | sentido escolhido (fase `facing`) |
| `cost` | custo atual (fase `path`: menor chegada de frente; `facing`: `dist(destino, look)`) |
| `status` | `ok` (≤ total) · `over` (> total) · `free` (objeto) |

Transições: `idle` →(Mover)→ `path` →(clique em hex alcançável)→ `facing` →(clique)→ gravar → `idle`;
Esc/botão direito/troca de mapa → `idle` restaurando a peça.

## Funções de hex (espelhadas em `HexGrid.cs`)

| Função | Resultado |
|---|---|
| `LOOK_DIRECTIONS` | 6 vetores axiais na ordem de `look` |
| `neighbor(x, y, look)` | hex vizinho (odd-q) na direção |
| `turnCost(from, to)` | `min(|d|, 6 − |d|)` giros |
| `movementField(start, columns, rows, blocked)` | BFS em `(x, y, look)` → `dist`, `parent` |
| `movementCost(start, end, columns, rows, blocked)` | `dist(end)` ou `null` se inalcançável |
| `lookToward(center, point)` | lado mais próximo do ângulo do ponto (só frontend) |
