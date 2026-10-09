# Quickstart: Notificações da mesa (Web Push)

## Keys (once)

```bash
npx web-push generate-vapid-keys   # or the library's VapidHelper; keep the private key secret
```
Set `Push__PublicKey`, `Push__PrivateKey`, `Push__Subject` (`mailto:…` or `https://roll6.site`) in
`appsettings.Development.json`; in prod via GitHub secrets `ROLL6_VAPID_PUBLIC_KEY` / `ROLL6_VAPID_PRIVATE_KEY`
(heredoc of `deploy-prod.yml` → `.env.prod`) and `docker-compose-prod.yml`.

## Database

`dotnet ef database update` (migration `AddWebPush`) or `database/migrations/043-web-push.sql`.

## Automated

```bash
cd backend && dotnet test        # NoticeTexts, Majority, PushService, poke, dispatcher routing, MCP counts
cd frontend && npm test          # lib/push, lib/notices
```

## Manual pass (needs the production frontend: the service worker exists only there)

Accounts: master M, players A, B, C, each with one approved character in campaign X.

1. B: menu → Notificações → Ativar neste aparelho → accept. Close the app.
2. A writes "Vamos pela ponte" → M and B get "Aria · X / Vamos pela ponte"; A gets nothing. Five more messages → one notification of X in B's tray.
3. A acts "Ataco o orc" → only M gets the action with its text.
4. With 3 characters, A acts (1/3), B acts (2/3 ≥ ⌈3/2⌉=2) → C gets "Falta apenas você". A new action in the same turn → nothing again.
5. M finishes the turn → A, B, C get "Turno N terminado. Pode agir novamente".
6. M sets A's PV to -3 (total 13) → A gets "Você está com -3/13 PV"; energy → "… de Fadiga".
7. B opens X in the browser (map only) and A pokes → B sees a toast (campaign on screen); C (app closed) gets the push; chat shows "Ana cutucou Bruno e Caio". Poke again within 1 min → "Aguarde um minuto…".
8. B with the chat visible → no N1/N2 for B. B mutes X → nothing from X.
9. B logs out → no more notifications on that device. Revoke permission → next send removes the subscription (404/410).
10. iPhone without install → "Ativar" shows the install guide; installed (iOS 16.4+) → steps 2–7 work.
