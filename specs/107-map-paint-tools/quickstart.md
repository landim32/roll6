# Quickstart: Pintura do mapa (107)

1. Backend: `cd backend && dotnet build Roll6.sln && dotnet test` (paint domain, service, MCP counts 133/134).
   Apply `dotnet ef database update --project Roll6.Infra --startup-project Roll6.API` (or
   `database/migrations/107-map-paint.sql`) on a reachable database.
2. Frontend: `cd frontend && npm test -- mapPaint && npm run lint && npm run build`.
3. Manual (master + one player in another browser, same campaign, current map open):
   - Bar shows "Editar mapa" only to the master; Imagem/Ajustar imagem appear only after turning it on.
   - 2D → "Pintar" → toolbar on the left. Fill a drag of hexes with Água; Marcação "Baú" on one hex; player sees both
     within ~2 s without reloading. Reload: still there.
   - Draw a red rectangle, a blue circle, a pencil stroke, a line and an arrow; Esc during a drag discards it;
     Apagar removes one; Limpar (confirm) removes all.
   - Switch to Isométrica: "Pintar" disappears and paint mode turns off.
   - Open the same model in another campaign: no paint.
   - `GET /api/map/{id}/hex?x=&y=` on the "Baú" hex, on a hex covered by a size-3 piece and outside the grid (400).
   - Share the map: the JPEG shows marks and drawings.
