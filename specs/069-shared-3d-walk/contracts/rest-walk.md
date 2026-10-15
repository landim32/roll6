# REST contract: 069

## PUT /api/maptoken/{id}/position (changed)

Request (`MapTokenPositionInfo`):

```json
{ "x": 7, "y": 4, "look": 2, "walk": true }
```

- **Without `walk`, or with `walk: false`:** unchanged ("Mover"; Q2 = B: an occupied hex → 409, also in free mode).
- **With `walk: true`:** free-mode walk position (069).
  - 200 with the `MapTokenInfo`, and `mapToken.upserted` is published to the campaign (the 2D of everyone follows).
  - Other pieces are ignored, so the result may overlap them.
  - Nothing is written to the turn and no Deslocamento is spent.
  - Errors:

| Status | When | Body |
|---|---|---|
| 409 | campaign not in free mode | `detail`: "Só é possível andar no modo livre." |
| 409 | the map is not the campaign's current map | "Só é possível andar no mapa atual da campanha." |
| 409 | the piece is lying (down or out of combat) | "Um personagem caído não anda." |
| 409 | campaign not playable or map not editable (049) | as today |
| 403 | not a Character piece of the caller's own approved character (the master too) | "Você só pode andar com os seus personagens." |
| 400 | the whole shape is not inside the grid | `errors.x` |
| 404 | piece or map not found / map deleted | as today |

MCP `move_piece`: gains the optional `walk` parameter (boolean), described as "free-mode walk: ignores other pieces,
owner's standing character only, current map only". No new tool.

## PUT /api/campaign/{id}/free-mode (changed)

- `{ "freeMode": true }` and the same value: unchanged.
- **`{ "freeMode": false }` while free mode is on:** every non-deleted map of the campaign is checked for pieces
  sharing a hex (whole shapes).
  - **None:** switched off as today (200, `campaign.changed`).
  - **Any:** **409**, free mode stays on, and no event is published. The body:

    ```json
    { "status": 409, "detail": "Não é possível sair do modo livre: Aria e Borin estão no mesmo hex." }
    ```

    With several groups the names are joined with "; " ("Aria e Borin; Guarda, Guarda 2 e Orc estão no mesmo
    hex."). The `detail` is at most 300 characters, ending with "…" when cut.

MCP `set_campaign_free_mode`: its description lists the new 409 under *Common errors*. The guide section "Free mode"
explains the shared walk and the exit rule.
