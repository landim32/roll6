# MCP Contract: ferramentas do Roll6 (020)

Endpoint: `POST/GET https://{domínio}/mcp` (Streamable HTTP). Autenticação: cabeçalho `X-Api-Key: r6_…`
(ou `Authorization: Bearer <jwt>`). Sem credencial válida → HTTP 401.

Anotações: **R** = `readOnlyHint`, **D** = `destructiveHint`, **I** = `idempotentHint`.
Parâmetros usam os nomes camelCase dos DTOs da API; `id` vira o nome específico (`campaignId`, `mapTokenId`, …).

## Recursos e ferramenta de guia

| Nome | Tipo | Conteúdo |
|---|---|---|
| `roll6://guide` | recurso (text/markdown) | Guia dos conceitos do Roll6 (inglês) |
| `get_roll6_guide` | ferramenta R I | O mesmo guia, para clientes que não leem recursos |

## Ferramentas (73 operações da API)

| # | Ferramenta | Anot. | Operação da API |
|---|---|---|---|
| 1 | `get_my_profile` | R I | GET /api/user/me |
| 2 | `upload_image` | — | POST /api/image (base64) |
| 3 | `list_tokens` | R I | GET /api/token |
| 4 | `get_token` | R I | GET /api/token/{id} |
| 5 | `create_token` | — | POST /api/token |
| 6 | `update_token` | I | PUT /api/token/{id} |
| 7 | `delete_token` | D | DELETE /api/token/{id} |
| 8 | `list_my_characters` | R I | GET /api/character |
| 9 | `search_characters` | R I | GET /api/character/search |
| 10 | `get_character` | R I | GET /api/character/{id} |
| 11 | `create_character` | — | POST /api/character |
| 12 | `update_character` | I | PUT /api/character/{id} |
| 13 | `delete_character` | D | DELETE /api/character/{id} |
| 14 | `list_my_npcs` | R I | GET /api/npc |
| 15 | `get_npc` | R I | GET /api/npc/{id} |
| 16 | `create_npc` | — | POST /api/npc |
| 17 | `update_npc` | I | PUT /api/npc/{id} |
| 18 | `delete_npc` | D | DELETE /api/npc/{id} |
| 19 | `list_campaigns` | R I | GET /api/campaign |
| 20 | `get_campaign` | R I | GET /api/campaign/{id} |
| 21 | `create_campaign` | — | POST /api/campaign |
| 22 | `rename_campaign` | I | PUT /api/campaign/{id}/name |
| 23 | `set_campaign_open` | I | PUT /api/campaign/{id}/open |
| 24 | `delete_campaign` | D | DELETE /api/campaign/{id} |
| 25 | `set_current_map` | I | PUT /api/campaign/{id}/current-map |
| 26 | `list_campaign_maps` | R I | GET /api/campaign/{id}/map |
| 27 | `list_campaign_characters` | R I | GET /api/campaign/{id}/character |
| 28 | `list_campaign_npcs` | R I | GET /api/campaign/{id}/npc |
| 29 | `list_campaign_plans` | R I | GET /api/campaign/{id}/plan |
| 30 | `get_turn_state` | R I | GET /api/campaign/{id}/turn |
| 31 | `list_turn_entries` | R I | GET /api/campaign/{id}/turn/{turnNo} |
| 32 | `finish_turn` | — | POST /api/campaign/{id}/turn/finish |
| 33 | `request_campaign_access` | — | POST /api/campaigncharacter/request |
| 34 | `invite_character` | — | POST /api/campaigncharacter/invite |
| 35 | `list_my_invites` | R I | GET /api/campaigncharacter/invites |
| 36 | `accept_invite` | — | POST /api/campaigncharacter/{id}/accept |
| 37 | `decline_invite` | — | POST /api/campaigncharacter/{id}/decline |
| 38 | `approve_access_request` | — | POST /api/campaigncharacter/{id}/approve |
| 39 | `deny_access_request` | — | POST /api/campaigncharacter/{id}/deny |
| 40 | `list_my_participations` | R I | GET /api/campaigncharacter/mine |
| 41 | `get_participation` | R I | GET /api/campaigncharacter/{id} |
| 42 | `update_participation` | I | PUT /api/campaigncharacter/{id} |
| 43 | `remove_participation` | D | DELETE /api/campaigncharacter/{id} |
| 44 | `add_npc_to_campaign` | — | POST /api/campaignnpc |
| 45 | `remove_npc_from_campaign` | D | DELETE /api/campaignnpc/{id} |
| 46 | `list_map_models` | R I | GET /api/mapmodel |
| 47 | `get_map_model` | R I | GET /api/mapmodel/{id} |
| 48 | `create_map_model` | — | POST /api/mapmodel |
| 49 | `update_map_model` | I | PUT /api/mapmodel/{id} |
| 50 | `delete_map_model` | D | DELETE /api/mapmodel/{id} |
| 51 | `get_map` | R I | GET /api/map/{id} |
| 52 | `add_map_to_campaign` | — | POST /api/map |
| 53 | `update_map` | I | PUT /api/map/{id} |
| 54 | `delete_map` | D | DELETE /api/map/{id} |
| 55 | `list_map_tokens` | R I | GET /api/map/{id}/token |
| 56 | `list_map_npcs` | R I | GET /api/map/{id}/npc |
| 57 | `add_object_to_map` | — | POST /api/maptoken |
| 58 | `place_character_on_map` | — | POST /api/maptoken/character |
| 59 | `move_map_token` | — | PUT /api/maptoken/{id}/position |
| 60 | `change_map_token_image` | I | PUT /api/maptoken/{id}/token |
| 61 | `update_map_token` | I | PUT /api/maptoken/{id} |
| 62 | `delete_map_token` | D | DELETE /api/maptoken/{id} |
| 63 | `place_npc_on_map` | — | POST /api/mapnpc |
| 64 | `update_map_npc` | I | PUT /api/mapnpc/{id} |
| 65 | `delete_map_npc` | D | DELETE /api/mapnpc/{id} |
| 66 | `act_in_turn` | — | POST /api/turn/action |
| 67 | `reset_turn` | D | POST /api/turn/reset |
| 68 | `create_turn_entry` | — | POST /api/turn |
| 69 | `delete_turn_entry` | D | DELETE /api/turn/{id} |
| 70 | `get_campaign_plan` | R I | GET /api/campaignplan/{id} |
| 71 | `create_campaign_plan` | — | POST /api/campaignplan |
| 72 | `update_campaign_plan` | I | PUT /api/campaignplan/{id} |
| 73 | `delete_campaign_plan` | D | DELETE /api/campaignplan/{id} |

Excluídas (login humano): `POST /api/user`, `POST /api/user/login`, `PUT /api/user/name`,
`PUT /api/user/password`, `GET/POST /api/apikey`, `POST /api/apikey/{id}/revoke`, `DELETE /api/apikey/{id}`.

## Resultado

- Sucesso: `content: [{ type: "text", text: <JSON do DTO> }]` + `structuredContent` com o mesmo objeto;
  operações sem corpo → `{ "ok": true }`.
- Erro: `isError: true`, texto JSON `{ "status": 400|403|404|409|500, "title": "...", "detail": "...",
  "errors": { "campo": ["mensagem"] } }` — mesma tabela do `ApiControllerBase.HandleException`.

## Exemplo de descrição (move_map_token)

> **What it does**: Moves a piece on a campaign map to another hex and optionally turns it. The move is
> recorded in the current turn and pushed to everyone at the table in real time.
> **Who can use it**: the campaign master (any piece, any distance); a player only for the piece of his own
> approved character, once per turn, within the character's `move` points.
> **Coordinates**: `x` = column, `y` = row of the rectangular flat-top hex grid (odd columns shifted half a
> hex down), 0-based, inside `gridWidth` × `gridHeight` of the map. `look` = side the piece faces, 0–5
> clockwise starting at the top side (0 up, 1 up-right, 2 down-right, 3 down, 4 down-left, 5 up-left).
> **Cost** (players): 1 per step into the hex ahead + 1 per 60° turn, shortest path around other pieces.
> **Returns**: the updated piece. **Common errors**: 409 hex occupied / already moved this turn, 400 beyond
> the move, 403 not your piece. **Related**: `list_map_tokens` (ids and positions), `get_turn_state`.
