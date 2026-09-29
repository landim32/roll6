# MCP Contract: Administração do log de turnos (030)

Ferramentas em `backend/Roll6.Mcp/Tools/TurnTools.cs`, cada uma com `[ApiOperation]`, descrição em inglês no padrão
*What it does / Who can use it / Returns / Common errors / Related tools* e parâmetros descritos.

| Ferramenta | Operação | Anotações | Mudança |
|---|---|---|---|
| `create_turn_entry` | `POST /api/turn` | não destrutiva | ganha `moved` e `changes` (array `{ field, before, after }`); descrição cita tipos 4 CharacterUpdate e 5 Narration (sem ator), `turnNo` 1…turno atual, que não move peças nem altera valores e ignora a regra de um movimento |
| `update_turn_entry` | `PUT /api/turn/{id}` | Destructive, Idempotent | **nova**: `turnId` + campos opcionais (`turnNo`, `mapId`, `description`, `beforeX`, `beforeY`, `beforeLook`, `x`, `y`, `look`, `moved`, `changes`) |
| `delete_turn_entry` | `DELETE /api/turn/{id}` | Destructive | descrição menciona turnos antigos e todos os tipos |
| `set_current_turn` | `PUT /api/campaign/{id}/turn/current` | Destructive, Idempotent | **nova**: `campaignId`, `turnNo`, `discardLaterEntries` (default false); explica avanço (= finalização sem verificação de pendentes), retrocesso e o 409 |

- `Roll6Guide` (`roll6://guide`, `get_roll6_guide`, instruções do servidor): seção "Fixing the turn log" — quando
  corrigir (`update_turn_entry`), registrar turnos passados (`create_turn_entry` com `turnNo`), apagar
  (`delete_turn_entry`) e ajustar o turno (`set_current_turn`); lembrar que nada disso muda o mapa ou os personagens
  (para isso: `process_turn`, `update_participation`, `update_map_npc`, peças).
- Testes: `McpCoverageTests` 83 → 85 operações e 84 → 86 ferramentas; `McpRouteParityTests` com as duas rotas novas;
  `McpDescriptionTests` inalterado (deve passar).
