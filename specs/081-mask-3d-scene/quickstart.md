# Quickstart: Mapa 3D de verdade montado pela máscara (081)

## Test map

Make a map with an image and a mask of the same proportion that has:

- a white floor;
- a light gray patch (about 80% luminance: a step, climbable);
- a mid gray patch (about 50%: too high to climb);
- a black wall;
- a light gray "staircase": three light tones getting darker, side by side.

## Checks

1. **Scene (US1)**: open the map in 3D.
   - The gray patches are blocks whose height follows the tone.
   - The black patch is a full-height wall.
   - Tops show the map image, sides show the wall texture (or the map colors).
   - The sky is the 360° background.
   - The floor continues past the map edge with the edge color.
2. **Old mask**: open a map with a pure black and white mask (from before 036). The walls are where they were.
3. **No mask**: the floor is flat with the pieces.
4. **Pitch (US2)**:
   - Drag up and down (mouse, finger), or use R/F.
   - The camera tilts and stops at its limits.
   - It never goes inside a block or under the floor.
   - "Voltar ao personagem" restores it.
5. **Climb (US3)**: in free mode, walk your standing character:
   - onto the light block: it steps up and walks on top;
   - off it: it drops down;
   - into the mid block and the wall: it is blocked;
   - up the staircase: it climbs step by step.
   - Another browser sees it at the same height.
6. **Pieces (US4)**:
   - A piece on a hex over the light block stands on its top.
   - A piece behind the wall is hidden, and so is its balloon.
   - A 2,5D figure in front of a model covers it.
   - The sides of the figures turn with the camera.
   - Down pieces lie on the ground.
7. **Quality (US5)**:
   - Switch Padrão / Alta / Ultra in "Qualidade do 3D". The change is visible: sharper on Alta, shadows on Ultra.
   - The choice survives a reload.
   - On a mid-range phone, a 512-cell mask opens in a few seconds and moves smoothly.
8. **No WebGL**: the toast appears and the view goes back to 2D.
9. **Unchanged**: the 2D map, Mover, turns and the chat behave exactly as before.
