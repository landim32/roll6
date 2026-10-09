# Contracts: Chat como no WhatsApp

## REST

| Verb | Route | Body | Response / errors |
|---|---|---|---|
| POST | `/api/campaign/{id}/chat` | + `replyToTurnId?: number` | 400 reply target not replyable / other campaign |
| POST | `/api/campaign/{id}/chat/roll` | + `replyToTurnId?` | idem |
| POST | `/api/turn/action` | + `replyToTurnId?` | cancels the actor's previous valid action of the turn |
| POST | `/api/turn/reset` | — | Actions are cancelled (shown "Ação cancelada"), Movements deleted |
| DELETE | `/api/chat/{id}` | — | on a valid Action (owner of the character or master): cancels it (204); on a cancelled one: 400 |
| PUT | `/api/chat/{id}/reaction` | `{ kind: 'like' \| 'love' \| null }` | the updated `ChatItemInfo` · 400 not reactable · 403 no access |
| POST | `/api/chat/{id}/convert` | `{ to: 'action' \| 'message' }` | the updated `ChatItemInfo` · 400 not convertible / other turn / text > 2000 / piece not on the current map · 403 not owner nor master |

## ChatItemInfo additions

```json
{
  "cancelled": false,
  "replyTo": { "key": "t120", "turnId": 120, "displayName": "Aria", "kind": "text", "excerpt": "Vamos pela ponte", "deleted": false, "cancelled": false },
  "reactions": [{ "userId": 3, "name": "Bruno", "kind": "like" }],
  "canReply": true,
  "canReact": true,
  "canConvert": "action"
}
```

## Realtime

- New `chat.updated` (data = `ChatItemInfo`): reaction changed, converted, cancelled. Clients merge by key and recompute per-viewer flags.

## MCP

- `react_to_chat_message` → `PUT /api/chat/{id}/reaction`
- `convert_chat_entry` → `POST /api/chat/{id}/convert`
- `send_chat_message`, `act_in_turn`: new optional `replyToTurnId`
- Counts 95 operations / 96 tools.

## UI

| Element | Behavior |
|---|---|
| Long press 500 ms / right click / ContextMenu key on a bubble | `ChatItemActions` bar: Curtir (thumbs up), Amei (heart), Responder, Ação/Mensagem, Apagar — only the allowed ones, 48 px each |
| Swipe right (touch) ≥ 60 px, horizontal | starts a reply |
| Reply card (composer) | author colored + excerpt, ✕ cancels; next send carries `replyToTurnId` |
| Quote in a bubble | tap → scroll to the original, flash 1 s; "Mensagem apagada" when deleted |
| Reactions badge | icons present + total at the bubble's bottom corner; tap → popover "nome — reação" |
| Cancelled action | bubble muted, text struck through, label "Ação cancelada" |
| Paste image in the field | preview with Enviar/Cancelar; caption = field text |
