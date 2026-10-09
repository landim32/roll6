# Real-time, MCP and UI contracts (041)

## Real-time (`/hubs/table`, `tableEvent`)

| Type | `data` | When |
|---|---|---|
| `chat.message` (new) | `ChatItemInfo` | a conversation message or a turn-finished divider was saved |
| `chat.deleted` (new) | `{ itemKey }` | a conversation message or narration was deleted |
| `turn.changed`, `turn.finished` (existing) | — | client asks `after` its last item and reloads the newest page, replacing the turn items (`movement`…`narration`) of that range |

Audience: whole campaign group. `TABLE_EVENT` (frontend) mirrors the two new types.

## MCP

| Tool | Operation |
|---|---|
| `list_chat_messages` | `GET /api/campaign/{id}/chat` — describes that the chat **is** the campaign's turn record (conversation + every turn entry) |
| `send_chat_message` | `POST /api/campaign/{id}/chat` — `characterId` optional (omit = master); photo via `upload_image` |
| `delete_chat_message` | `DELETE /api/chat/{id}` (destructive) |

Turn tools unchanged (same names/params/responses); their descriptions and `roll6://guide` say turn entries are chat messages. Excluded: `PUT /api/campaign/{id}/chat/read`, `POST /api/chat/audio`. Coverage 89 / 90.

## UI

- **`LayoutToggle`** (TopMenu): 3 icon buttons (`map`, `layout-split`, `chat-dots`), `aria-pressed`, `title`/`aria-label` ("Mapa", "Mapa e chat", "Chat"), unread badge (`99+`) on the chat icon in `map` mode. Modes: `map` (as today) · `split` (50/50 fixed, map on top) · `chat` (map/3D not mounted). `roll6:layout`, default `map`, cleared on logout.
- **`ChatPanel`**: list (older pages on scroll to top, "Novas mensagens" divider, opens at first unread or bottom); items per the appearance table in research D13; consecutive discreet lines compacted; delete menu where `canDelete` (with confirmation).
- **`ChatComposer`**:
  - Character selected: segmented **Conversa / Ação**.
  - Conversa: textarea (Enter sends, Shift+Enter new line, counter near 4000), photo button (`image/png,image/jpeg,image/webp`, camera allowed), mic button (hidden without `MediaRecorder`; tap to record, 2-min auto stop, listen, send/discard), send.
  - Ação: textarea only (≤ 2000), sends through `turnService.act(mapTokenId)` of the character's piece on the current map; disabled with "Coloque o personagem no mapa para agir" when there is no piece.
  - "Mestre (GM)": Conversa only. No allowed identity: disabled with "Escolha um personagem aprovado para falar".
  - Pending items: "enviando…" / "Falhou — tentar de novo".
- **Removed**: `TurnConsole`, `TurnConsoleModal`, `TurnLogModal`, the footer chevron, clickable "Turno N" (label stays). Balloons and the bell "Turno N finalizado" stay.
- **i18n**: `chat.*`, `layout.*` in `pt-BR.json`.
