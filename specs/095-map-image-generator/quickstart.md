# Quickstart: Gerador de imagens de mapa

## Prerequisites

- API + frontend running; `Roll6.Console` from this branch connected (`ROLL6_API_KEY`), Codex CLI logged in
  (`codex login`), `codex features list` showing `image_generation true`.

## Scenarios

1. **New map** — Biblioteca › Mapas › Gerador, "taverna com balcão, seis mesas e lareira, piso de madeira" → an image
   appears; "mais duas mesas perto da janela" → version 2; "Salvar" → name + grid (suggested) → the map is in "Meus
   mapas" and opens on the table.
2. **Top-down battery** — castelo, rua de cidade, caverna, floresta, interior de igreja: no wall faces, no furniture
   sides, no trunks, no horizon (SC-002). Then "faça em vista isométrica" → still top-down, the answer says so.
3. **Marks** — "Marcar" on a version, circle the fireplace, arrow to a corner, "mova para cá" → the new version
   moves it; no red marks in it.
4. **Edit** — "Editar no gerador" on an own map → version 0 is its image; a change → "Salvar" asks "Substituir a
   imagem do mapa" / "Criar um mapa novo"; replace updates the map everywhere, new keeps the original.
5. **Console off** — stop the console: the page says it must be connected and disables sending.
6. **Leave guard** — with an unsaved version, navigate away → confirmation.
7. **Stop / timeout** — "Parar" mid-generation → the request ends as stopped; a run over 5 minutes fails.

## Commands

```bash
cd backend && dotnet test --filter "FullyQualifiedName~Codex|FullyQualifiedName~Generator|FullyQualifiedName~MapGeneratorPrompt"
cd frontend && npm test -- mapGeneratorState generatedMapGrid libraryRoutes
```
