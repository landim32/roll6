# Quickstart: Token 3D — posição defensiva visível e animação de morte (058)

## Build and automated checks

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd ../frontend && npm run lint && npm test && npm run build
```

Database: apply `AddTokenModelDownClip` (`dotnet ef database update …`), or run `database/migrations/058-token-model-down-clip.sql`. Production applies it on startup.

## Manual check

Prerequisites:
- A campaign map with the 3D mask.
- The example orc (`orc-gordo.glb`, Mixamo skeleton, no clips) on a token placed as a character piece.
- A token with only "2,5D" images.

### US1 — guard stance

1. Edit the orc's token → "3D" → Parado = "Posição defensiva (Roll6)". Expected:
   - Arms raised in front with elbows bent, legs apart and bent, body lower.
   - Clearly different from "Animação do Roll6".
   - The warning "Esta animação pode deformar este modelo…" shows.
2. Switch back to "Animação do Roll6": the old warning about reduced movement may show, and the guard warning goes away.
3. Save. On the map's 3D view the standing orc plays the guard.

### US2 — down pieces in 3D

1. Open the 3D view with the orc standing. In 2D (or from another session), set its posture to **Caído**. Expected: in 3D it falls on its back in about 1.4 s and stays lying, centered over its two hexes.
2. Reload the page in 3D: the orc is already lying, no fall.
3. Change Caído → **Fora de combate**: nothing replays; it is still lying and in color.
4. Change to **Em pé**: it stands and breathes again.
5. Walk the camera so a wall, then a 2,5D figure, is between the camera and the lying orc: they hide it.
6. Set the 2,5D-only token to Caído: it is still not shown in 3D (as before).
7. Set the orc's Caído to "Sem animação" in the token form and save: the down piece shows the orc tipped on its back.

### US3 — form

1. "3D" tab → state selector "Caído": the death plays once and stops at the end; the bar is at the right and the button says "Continuar".
2. "Continuar": it plays again from the start.
3. Drag the bar to the middle of the fall, then back to the end.
4. At the end → "Gerar imagem" → "Imagem Caído": the lying field gets a top view of the orc lying in the 2-hex frame.
5. Select options of Caído:
   - Automático (Morte do Roll6), "Morte (Roll6)" and "Sem animação" are offered.
   - No "Posição defensiva".
   - With a `.glb` that has a "Death" clip, "Automático (do arquivo: Death)".
6. Save, reopen: the choice is kept. Remove the model and save: the choices are gone.
