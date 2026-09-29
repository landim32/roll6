# MCP contract (031)

Total: 86 operações de API cobertas, 87 ferramentas (`McpCoverageTests` 85 → 86 e 86 → 87).

## Nova — `set_piece_posture`

- `[ApiOperation("PUT", "/api/maptoken/{id}/posture")]`, `Idempotent = true`, `Destructive = false`.
- Parâmetros: `mapTokenId` (long), `posture` (int: 1 standing, 2 down, 3 out of combat).
- Descrição (inglês, formato padrão): *What it does* — sets whether a character/NPC piece is standing, down or out of
  combat; down pieces lie down and may take more hexes (the token's down size, behind the piece), out-of-combat pieces
  are also drawn in black and white; a character's posture is shared by all its pieces in the campaign; never refused
  for lack of space. *Who can use it* — the character's owner or the master; NPC pieces only the master. *Returns* —
  the piece. *Common errors* — 400 object piece / invalid value, 403, 404, 409 not approved. *Related tools* —
  list_map_tokens, update_participation, update_map_npc, process_turn.

## Alteradas

| Ferramenta | Mudança |
|---|---|
| `update_participation` | parâmetro opcional `posture` (null keeps) |
| `update_map_npc` | parâmetro opcional `posture` (null keeps) |
| `process_turn` | `posture` opcional em cada item de `characters`/`npcs` (descrição do JSON) |
| `create_token`, `update_token` | `upSpace`/`downSpace`: "1, 2, 3, 7 or 10 hexes" + formatos |
| `move_map_token`, `place_character_on_map`, `place_npc_on_map`, `add_object_to_map` | erros mencionam formato inteiro fora da grade/ocupado |
| leituras (`list_map_tokens`, `get_participation`, `get_turn_data`, …) | *Returns* cita `posture` e `space` |

## `roll6://guide`

Seção nova "Posture and piece size": valores de postura, quem altera, tamanhos 1/2/3/7/10 e formatos (2 = position +
hex behind; 3 = line along the facing, position in the middle; 7 = position + 6 neighbors; 10 = line of 4 along the
facing — position is the second from the front — plus a line of 3 on each side), sobreposição tolerada após cair.
