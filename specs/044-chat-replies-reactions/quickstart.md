# Quickstart: Chat como no WhatsApp

## Automated

```bash
cd backend && dotnet test     # one valid action, reset cancels, delete = cancel, conversion, replies, reactions, MCP counts
cd frontend && npm test       # chatGestures, reply excerpt, reactions summary, clipboard image
```

## Database

Migration `AddChatRepliesReactions` (applied on startup in homolog/prod) or `database/migrations/044-chat-replies-reactions.sql`.

## Manual pass (phone + desktop, two accounts in one campaign)

1. A acts "Ataco o orc", then "Recuo": the first shows struck as "Ação cancelada"; turn summary/data show only "Recuo"; B (master) got one action notice per action.
2. A resets the turn: "Recuo" becomes "Ação cancelada"; A is back to "falta agir".
3. On the phone, B swipes A's message to the right → reply card → sends → the bubble shows the quote; tapping it scrolls to the original and flashes it.
4. Long-press a message (≈ 0.5 s) → bar with Curtir, Amei, Responder (+ Ação, Apagar when allowed). Scrolling with the finger never opens it.
5. B likes, then loves (switch), then loves again (removed); the badge updates on A's screen in < 2 s.
6. A long-presses his own text "Vou abrir a porta" → Ação: it becomes the valid action; long-press it → Mensagem: back to text, A is pending again.
7. Desktop: right click opens the bar; Ctrl+V of a screenshot shows the preview; Enviar sends it with the typed caption.
