# Data Model: Peça de NPC mostra vida, energia, status e ficha corretos (026)

## MapNpc (`map_npcs`)

| Antes | Depois | Regras |
|---|---|---|
| `life` | `current_life` (`CurrentLife`) | atual; ≤ total do NPC; pode ser ≤ 0 (caído); começa no total |
| `energy` | `current_energy` (`CurrentEnergy`) | idem |

Migração `RenameMapNpcCurrentVitals`: `RenameColumn` (dados preservados). Totais = `npcs.life` / `npcs.energy`.

`MapNpc.Update(name, currentLife, currentEnergy, status, totalLife, totalEnergy)` — erro 400 em `currentLife`/`currentEnergy`
acima do total.

## DTOs

- `MapNpcInfo`: `life`/`energy` → `currentLife`, `currentEnergy`; + `totalLife`, `totalEnergy`.
- `MapNpcUpdateInfo`: `life`/`energy` → `currentLife`, `currentEnergy`.
- `MapTokenInfo`: + `totalLife`, `totalEnergy`; para NPC `sheet` = ficha da peça ?? ficha do NPC.

## Repositório

`IMapNpcRepository.ClampVitalsAsync(long npcId, int totalLife, int totalEnergy)` — `ExecuteUpdate` nas ocorrências do NPC
acima dos novos totais.
