# Data Model: Mudar peça de mapa (111)

**Nenhuma tabela, coluna, índice ou migração nova.** A operação só muda valores de colunas existentes.

## Linhas afetadas

### `map_tokens` (peça)

| Coluna | Personagem | NPC |
|---|---|---|
| `map_id` | → mapa de destino | → mapa de destino |
| `x`, `y` | mesmo hex, ou o livre mais próximo | idem |
| `look` | **mantido** | mantido |
| `walk_x`, `walk_y`, `walk_yaw` | limpos (`MoveTo` já limpa) | limpos |
| `name` | mantido | = nome final da instância |
| `token_id`, `campaign_character_id`, `map_npc_id`, `posture` | mantidos | mantidos |
| `updated_at` | agora (`TimeProvider`) | agora |

Unicidades respeitadas: `ix_map_tokens_campaign_character` (a mesma linha, o personagem nunca fica em dois mapas) e
`map_npc_id` único (peça e instância andam juntas).

### `map_npcs` (instância, só NPC)

| Coluna | Efeito |
|---|---|
| `map_id` | → mapa de destino |
| `name` | mantido, ou `MapNpc.NextName(npc.Name, nomes ativos do mesmo NPC no destino)` se repetido |
| `current_life`, `current_energy`, `status`, `posture`, `current_move`, `repeated_action*`, `removed_at` | inalterados |

### Não tocadas

`turns` (nenhuma entrada nova; as antigas continuam com seu `map_id` original e `map_npc_id`/`character_id`),
`campaign_characters`, `campaign_npcs` (categoria e personagem-mestre inalterados), `maps`.

## Métodos de domínio novos

- `MapToken.MoveToMap(long mapId, int x, int y, string? name = null)` — muda mapa e hex, mantém `look`, limpa a caminhada
  (via `MoveTo`), troca o nome quando informado.
- `MapNpc.MoveToMap(long mapId, string name)` — muda mapa e nome (`Guard.RequiredText`, mesmo limite do nome); recusa
  instância removida (`KeyNotFoundException`).
- `Occupancy.NearestFree(int x, int y, int look, int space, int columns, int rows)` → `(int X, int Y)?` — puro; `FirstFree`
  passa a delegar para ele a partir do meio da grade.

## Validações (ordem)

1. Peça existe (404 "Token do mapa não encontrado."); mapa de origem existe e não apagado.
2. Campanha da origem: chamador é o mestre (403 "Apenas o mestre muda peças de mapa."); `EnsureMapEditable(true)` (409).
3. Peça é personagem ou NPC (400 `mapTokenId` "Só personagens e NPCs mudam de mapa.").
4. Destino existe, não apagado e da mesma campanha (404 "Mapa não encontrado."); diferente da origem (409 "A peça já
   está neste mapa."); ativo (409 "Este mapa está arquivado.").
5. Personagem: participação aprovada (409 "Só personagens aprovados nesta campanha podem ser colocados no mapa."). NPC:
   instância não removida (404).
6. Posição: `layout.Fits(footprint(x, y, look, space))` no destino; senão `NearestFree` a partir de `(x, y)`; nenhum →
   409 "Não há um hex livre para a peça neste mapa.". `adjusted = posição ≠ (x, y)`.

## Transições

```text
peça no mapa A (x, y, look) ──PUT /api/maptoken/{id}/map {mapId: B}──▶ peça no mapa B (x', y', look)
                                                                      (x', y') = (x, y) se couber, senão o livre mais próximo
```
