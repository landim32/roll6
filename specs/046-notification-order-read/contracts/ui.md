# UI contract: the notification bell

- **Badge**: invites + unread inbox notices + unread turn notices (99+ cap).
- **Menu, top to bottom**:
  1. "Marcar tudo como lido" (icon check2-all) — enabled only with something unread; keeps the menu open.
  2. One list of items, newest first, each with its time (HH:mm today, dd/MM before):
     - invite: text + Aceitar / Recusar (never "read"; leaves when answered);
     - turn: "Turno N finalizado" + hint; unread dot until read; tap → marks read + opens the turn summary;
     - inbox: brand icon, title · time, body, unread dot; tap → marks read + navigates to its url.
  3. "Nenhuma notificação" when empty.
- **Opening the menu marks nothing.**
- **API used (unchanged)**: `GET /api/push/inbox`, `PUT /api/push/inbox/read` `{ userNotificationId: number | null }`.
