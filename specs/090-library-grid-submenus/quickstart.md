# Quickstart: Biblioteca com submenus e listas em colunas

Requirements: the dev API (`dotnet run --project Roll6.API`) on a database where `AddLibraryImages` was applied
(`dotnet ef database update`), the SPA (`npm run dev`) and a logged-in user who:
- masters one campaign and plays in another;
- has maps, tokens, at least one weapon and one animation, some of them from before 090 (no thumbnail).

## 1. Submenus (US1)

1. Open `/library/campaigns`. The left menu shows Minhas campanhas · Buscar · Jogando under Campanhas, the first one
   marked, and the page has no tabs.
2. Click each submenu. The address becomes `/library/campaigns`, `/search` and `/playing`; reloading keeps it.
3. Repeat for Mapas (Meus mapas · Buscar · Da campanha), Tokens, Armas and Animações. Personagens and NPCs have no
   submenus.
4. Open `/library/campaigns?tab=search`: you land on `/library/campaigns/search`. `/library/weapons?tab=upload` leads
   to `/library/weapons/new`.
5. At the table, "Outras campanhas…" opens Campanhas › Buscar.
6. At 390 px width, the dropdown lists the submenus indented under the current section.

## 2. Campaigns and maps (US2)

1. In "Minhas campanhas", a campaign without an image shows the default figure in a 3-column grid (≥ 1200 px).
2. Open its gear, choose "Imagem da campanha", crop and save. The card shows the image, also for a player in
   "Jogando" (after a reload). Remove it and the default comes back.
3. Create a campaign with an image in "Nova campanha".
4. Maps show their scene image in 3 columns. "Da campanha" as a player shows only the current map.
5. Resize: 2 columns at ~900 px, 1 at 390 px, no horizontal scroll.

## 3. Characters, NPCs, tokens (US3)

At 1280 px there are 4 cards per row, and at 390 px 3. Edit, transfer and request/accept on a character card still
work. The token pencil opens the token page.

## 4. Weapons and animations (US4)

1. Armas: no "Enviar" tab. "Incluir" opens `/library/weapons/new`. Send a `.glb`, pose it and save: you land on its
   page, and the list shows its thumbnail as a stored image (the network shows a plain image request, no glb download).
2. An old weapon without a thumbnail is rendered live when its card scrolls into view, one card at a time. Reload:
   it is now a stored image, written by the owner backfill. In "Buscar", someone else's old weapon renders live
   every time.
3. Change a weapon's pose on its page and save. Its thumbnail is redrawn.
4. Animações: "Incluir" → `/library/animations/new`. Send a file: its thumbnail is the skeleton figure in the
   strongest pose.
5. Edit that animation in the editor (or let the console write it). Back in the list it renders live once, then is
   stored again.
6. Start an inclusion, pick a file and click another menu item: "Descartar as alterações?" appears.
7. A corrupt `.glb` in the list (or WebGL disabled) shows the section icon, with no toast.

## Checks

- `cd backend && dotnet test` covers the domain/service rules and the MCP counts (121 operations / 122 tools).
- `cd frontend && npm run lint && npm test && npm run build` must pass.
