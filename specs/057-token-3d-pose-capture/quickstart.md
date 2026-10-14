# Quickstart: Token 3D improvements (057)

## Build and automated checks

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd ../frontend && npm run lint && npm test && npm run build
```

No migration: nothing to apply to the database.

## Manual check

Prerequisites: a campaign map with the 3D mask, one token with a `.glb` (the example orc) and one token with only "2,5D" images, both placed standing a few hexes apart.

### US1 — figure in front of a model

1. Open the map in 3D on **Padrão**. Walk the camera (or, in free mode, the character) until the 2,5D figure is between the camera and the model: the figure covers the model; the model shows between the figure's arms/around its head.
2. Go around until the model is between the camera and the figure: the model covers the figure.
3. Repeat on **Alta** and **Ultra** ("Qualidade do 3D" in the user menu). Walls still hide both. No flicker while turning.

### US2 — timeline

1. Edit the orc's token → "3D" tab: the bar moves with the animation and restarts with each loop.
2. Pause: model and bar stop together. Drag the bar: the pose follows; release: stays paused. Arrow keys step.
3. Switch Parado/Caminhando or pick another animation: the bar restarts, playing.
4. Pick "Sem animação": the bar and the pause button are disabled.

### US3 — photo of the pose

1. Pause on a pose → "Gerar imagem" → "Imagem em Pé": toast; on the "Token" tab the standing field shows the photo from above (front at the bottom, transparent background, whole model).
2. "Gerar imagem" → "Imagem Caído": the lying field gets the same view in the 2-hex frame.
3. Close without saving → reopen: old images. Generate again and save → on the 2D map the piece standing / down uses the photos, facing the same way as hand-made tokens.
4. Rotate the preview by dragging before generating: the photo is the same.

### US4 — guard stance

1. In "Animações", Parado → "Posição defensiva (Roll6)": the preview shows the guard (legs bent apart, arms up in front).
2. Save; on the map's 3D view the standing piece plays it.
3. A token whose skeleton is not Mixamo does not offer the option.
