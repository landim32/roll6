# Data Model: Administração do log de turnos (030)

**Nenhuma tabela, coluna ou migração nova.** Só novos comportamentos sobre `turns` e `campaigns.current_turn`.

## Turn (`turns`) — existente

| Campo | Coluna | Alterável nesta feature | Regra |
|---|---|---|---|
| TurnId | `turn_id` | não | — |
| CampaignId | `campaign_id` | não | — |
| TurnType | `turn_type` | não | 1 Movement, 2 Action, 3 ActionResult, 4 CharacterUpdate, 5 Narration |
| CharacterId / NpcId / MapNpcId | `character_id` / `npc_id` / `map_npc_id` | não | Tipos 1–4: exatamente um de character/npc; mapNpc só com npc. Tipo 5: nenhum. Na inclusão o ator precisa ser da campanha (research D3) |
| UserId | `user_id` | não | Autor = quem incluiu |
| CreatedAt | `created_at` | não | — |
| TurnNo | `turn_no` | sim (todos) | `1 ≤ turnNo ≤ campaign.CurrentTurn` |
| MapId | `map_id` | sim (todos, não pode limpar) | mapa da campanha |
| Description | `description` | sim (2, 3, 5) | obrigatório; ≤ 2000 (2, 3), ≤ 10000 (5) |
| BeforeX/BeforeY/BeforeLook, X/Y/Look | `before_*`, `x`, `y`, `look` | sim (1) | looks 0–5 |
| Moved | `moved` | sim (1) | ≥ 0 |
| Changes | `changes` (jsonb) | sim (4, lista inteira) | não vazia; `field` obrigatório |

### Novos métodos de domínio (`Roll6.Domain/Models/Turn.cs`)

- `static Turn Narration(...)` — já existe; usada também pela inclusão direta.
- `static Turn CharacterUpdate(...)` — já existe; usada também pela inclusão direta (`changes` vindo do DTO).
- `void MoveToTurn(int turnNo, int currentTurn)` — 400 `turnNo` fora de 1…current.
- `void ChangeText(string? text)` — só tipos 2/3/5 (limite conforme o tipo); outro tipo → 400 `description`.
- `void ChangeMovement(int? beforeX, int? beforeY, int? beforeLook, int? x, int? y, int? look, int? moved)` — só tipo 1;
  aplica apenas os informados, valida looks e `moved ≥ 0`; outro tipo → 400 no primeiro campo informado.
- `void ChangeChanges(IReadOnlyCollection<TurnChange> changes)` — só tipo 4; lista não vazia, `field` obrigatório.
- `void ChangeMap(long mapId)`.

## Campaign (`campaigns`) — existente

| Campo | Regra nova |
|---|---|
| CurrentTurn (`current_turn`) | `SetCurrentTurn(int turnNo)`: `turnNo ≥ 1` (400 `turnNo`), atualiza `UpdatedAt` |

### Transições de `CurrentTurn`

```text
set(n), n == atual            → nada muda, nenhum evento
set(n), n > atual             → atual = n; evento turn.finished { finishedTurn: n-1, turnNo: n }
set(n), n < atual, sem registros em turnos > n → atual = n; evento turn.changed
set(n), n < atual, com registros em turnos > n
    discardLaterEntries=false → 409 (lista os turnos com registros)
    discardLaterEntries=true  → [transação] exclui registros turn_no > n; atual = n; evento turn.changed
```

## Repositório (`ITurnRepository<Turn>`)

Novos métodos:

- `Task<Turn> UpdateAsync(Turn entity)`.
- `Task<List<int>> ListTurnNosAfterAsync(long campaignId, int turnNo)` — números distintos de turno `> turnNo` com
  registros, crescente.
- `Task<int> DeleteAfterTurnAsync(long campaignId, int turnNo)` — exclui registros `turn_no > turnNo`; devolve
  quantos.

## DTOs (`Roll6.DTO/Turn`)

- `TurnInsertInfo` (existente) + `moved` (`int?`) e `changes` (`List<TurnChangeInfo>?`).
- `TurnUpdateInfo` (novo): `turnNo?`, `mapId?`, `description?`, `beforeX?`, `beforeY?`, `beforeLook?`, `x?`, `y?`,
  `look?`, `moved?`, `changes?` — todos opcionais, `null` = mantém.
- `TurnSetCurrentInfo` (novo): `turnNo` (int), `discardLaterEntries` (bool, default false).
- `TurnSetCurrentResultInfo` (novo): `previousTurn`, `turnNo`, `discardedEntries`.
- `TurnInfo` (existente) — resposta de inclusão e alteração; comentário do `turnType` passa a citar 5 Narration.
