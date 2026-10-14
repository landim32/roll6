# Quickstart: Modelo 3D no token e caminhada em terceira pessoa

## Build and test

```bash
cd backend
dotnet build Roll6.sln
dotnet ef migrations add AddTokenModelFile --project Roll6.Infra --startup-project Roll6.API
dotnet ef migrations script --idempotent --project Roll6.Infra --startup-project Roll6.API -o ../database/roll6.sql  # keep the header
dotnet test          # incl. TokenTests (UpdateModel), ImageServiceTests (UploadModelAsync), McpCoverageTests 102/103

cd ../frontend
npm install three@0.186.1 && npm install -D @types/three@0.186.0
npm run lint && npx tsc --noEmit && npm test   # modelFile, modelAnimations, roll6Clips, modelFit, modelCamera, walker, raycastFrame (reference frame unchanged)
npm run build        # three only in lazy chunks: the main bundle must not grow by more than a few kB
npm run dev
```

Reference model: `C:\repos\gurps-adventure\personagens\urzog-bigorna\orc-gordo.glb` (4.7 MB, Mixamo skeleton, no clips).

## Manual pass (master + a player with an approved character on the current map)

1. **Upload**: player → edit the character's token → tab "3D" → choose the orc. Within 5 s the preview shows it standing, breathing; "Parado: animação do Roll6", "Caminhando: animação do Roll6". "Caminhar" makes it walk in place. Save, reopen: same model. A `.png` renamed to `.glb` → "Escolha um arquivo .glb"; a 25 MB file → "no máximo 20 MB"; nothing saved.
2. **Other viewers**: the master opens the same token from the tokens window: preview only, no change/remove buttons.
3. **3D view, turn mode**: put the character's piece on the map; switch to 3D as master and as player: the orc stands where the piece is, facing its `look`, about the height of a 1-hex figure, idle. Walk the free camera around it: other sides; behind a full wall it disappears; behind a half-height wall only its legs are hidden. "Agir" with a text → the balloon appears over its head.
4. **Fallback**: throttle the network: the piece shows its 2,5D figure (or standing image) until the model arrives. Corrupt the file name in the DB (dev only) → the figure stays, the view keeps working.
5. **Quality**: Padrão → chunky model like the walls; Ultra → sharp. No other change.
6. **Free mode walk**: master turns "Livre" on. Player in 3D: camera behind the orc; W walks (walk animation), release → idle in < 1 s; A/D turn; wheel/pinch/zoom buttons change the distance between 1.5 and 8 hexes; there is no "Voltar ao personagem". Walk into a wall, the map edge and another piece: it stops and slides. Phone: the joystick walks and turns.
7. **Local only**: while the player walks, the master's 2D map and 3D view show the piece still on its hex; the chat gets no line; reload the player's page → the orc is back on its hex.
8. **Reset**: while walking, the master moves the piece with "Mover" → the player's orc jumps to the new hex. Master turns "Livre" off → the player's camera is today's camera again, the orc on its piece.
9. **GM**: in free mode the master's 3D camera is the free camera of today.
10. **No model**: a token with only 2,5D images behaves exactly as before in every step; a map with no models does not download the three.js chunk (DevTools network).
11. **MCP**: `upload_token_model` with the orc in base64 → `fileName`; `update_token` with `modelFile` → the model appears in the 3D view.

## Rollback

Remove `modelFile` from the tokens (or revert the frontend): the 3D view falls back to the 2,5D figures. The column can stay (null).
