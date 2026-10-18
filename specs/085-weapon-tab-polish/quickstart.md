# Quickstart: Melhorias das armas no token (085)

## Preparation

- The ogre of the print (`C:\repos\gurps-adventure\personagens\gorbag-o-moedor\ogre.glb`, Mixamo rig with its own
  idle clip "Homem gordo parado") and the elf (`sae-varyn/elfo-negro.glb`).
- The axe (`gurps-adventure/armas/machado/machado.glb`) posed as in `arma.jpg` (X 0° · Y 342° · Z 4°, grip on the
  handle), plus a generated sword and shield.

## Checks

1. **Orientation (US1)**:
   - Token with the ogre › "Armas" › Mão D. = the axe. With the idle playing, the head points forward (a little up),
     the edge down, the handle under the fist — no fine adjustment. Mão E.: the same, mirrored. Both hands with a sword:
     the blades point forward, not across the belly.
   - The elf: same.
   - "3D" tab (rest pose, T-pose): the weapon is still right (forward, edge along the fingers).
   - Change the idle to a library animation: the weapon is placed again for that pose at once; set it to "Sem animação":
     placed on the rest pose.
   - Save, open the map in 3D: same orientation as the preview, also walking.
   - A shield in Mão E.: faces outward in the idle pose.
2. **Zoom (US2)**:
   - Wheel over the token preview: zooms in/out, the page does not scroll; "+"/"−" buttons; on a phone, pinch.
   - Zoom in until the hand fills the stage, drag a fine slider: the weapon moves close up.
   - Switch "3D" ↔ "Animação" ↔ "Armas" and the state: the zoom is kept; open another token: back to 1.
   - The weapon editor: the same inputs; a click still picks the grip point when zoomed.
   - "Gerar imagem" is unaffected by the zoom.
3. **Side layout (US3)**:
   - Desktop (≥ 768 px): "Armas" shows the preview on the left and the socket controls on the right with "Ajuste
     fino" open; no scrolling needed to drag a slider and see the result.
   - Narrow the window: the controls wrap under the preview, the model is not reloaded and the zoom stays.
   - Phone: controls under the preview, fine adjustment collapsed.
4. **Unchanged**: 2D map, figures, "3D"/"Animação" tabs' controls, the table's own zoom.
