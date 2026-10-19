# Quickstart: Token com armas no editor de animação

Requirements: the dev API and the SPA, plus a token of your own with a Mixamo `.glb` and weapons in at least two
sockets (e.g. a sword in the right hand and a shield in the left, set in the token's "Armas" tab). For the Claude step,
`Roll6.Console` must be running.

## 1. Weapons on the stage (US1)

1. Open one of your animations in the editor and choose that token in "Modelo". The stage shows the model with the
   sword and the shield in the hands.
2. Play, pause and drag the time bar. The weapons follow the hands at every instant.
3. Compare with the token on the table's 3D view (same idle and instant). The weapons sit in the same place.
4. Choose a token without weapons: only the model shows. Choose the armed one again: the weapons come back.
5. Click a bone behind the shield. The bone is selected, not the shield.

## 2. Toggle, print and Claude (US2)

1. Click "Armas": the weapons disappear; click again and they return. Reload: the choice is kept.
2. With a token without weapons, "Armas" is disabled.
3. Attach a print with the weapons visible. The caption ends with "O modelo carrega: espada longa (mão direita), escudo
   (mão esquerda)."
4. Send a request. The console's system prompt contains the "Armas do modelo: …" line (see the console's log, or the
   hub test).

## Checks

- `cd backend && dotnet test`
- `cd frontend && npm run lint && npm test && npm run build`
