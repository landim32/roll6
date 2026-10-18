# Quickstart: Pontos de encaixe de armas nos tokens 3D (083)

## Preparation

- A token with a Mixamo-skeleton `.glb` with finger bones (the 055–061 example characters), and one without fingers if
  available.
- Weapon files: a sword exported **lying along X** (so the pose must be turned), a shield, a dagger. One of them in
  centimetres.
- The 082 state for US4: before applying the migration, a token with a sword on the right hand at 120 %.

## Checks

1. **Grip and pose (US1)**:
   - User menu › "Armas" › Enviar: pick the sword. The stage shows it with the green arrow (cima) and the red one
     (direita) and a golden marker at its middle.
   - Turn it with the buttons until the tip points along the green arrow and the edge along the red one: every press is
     exactly 90°, the angles shown are 0/90/180/270.
   - Click on the handle: the marker jumps there. "Pega no meio" puts it back.
   - Send, reopen with the pencil: same pose and marker. Another account sees them but has no buttons.
2. **Sockets (US2)**:
   - Edit the token › "Armas": Mão D. = sword. **Without touching anything else**, the handle is in the palm and the blade
     leaves the fist on the thumb side; play Parado / Caminhando / Caído.
   - Mão E. = the same sword: held the same way by the left hand (edge toward the knuckles, not mirrored).
   - Mão E. = shield (grip on its handle): the shield sits in front of the forearm, face outward.
   - Costas = sword: diagonal behind the back, handle above the right shoulder. Coldre D. = dagger: tip down at the hip.
   - "Tamanho" grows the weapon around the grip point.
   - Save; open the map in 3D: every socket shows, also walking in free mode and lying; a second browser sees the same
     without a reload.
   - Change the sword's pose or grip point in the library: both tokens update (table and preview) with no re-save.
3. **Fine adjustment (US3)**:
   - On the token without fingers the hand is approximate: open "Ajuste fino", move/turn, save; the table matches the
     preview; the toggle shows "ajustado"; "Voltar ao padrão" clears it and keeps the size.
   - The same sword on another token keeps its own adjustment.
4. **082 bindings (US4)**: after the migration the pre-existing token shows the sword in Mão D. at 120 %, Costas and
   Coldres empty; deleting the sword is still refused (409). Manual check of the copy (the raw SQL is PostgreSQL-only,
   so there is no unit test): before, `SELECT token_id, right_weapon_id, right_weapon_grip FROM tokens WHERE
   right_weapon_id IS NOT NULL`; after, `SELECT token_id, socket, weapon_id, grip FROM token_weapons` has one row per
   hand with socket 1/2, the same weapon and `{"scale": N}` (N from the old grip, 100 when it had none), and
   `\d tokens` no longer lists the four columns.
5. **Unavailable sockets**: a model without `Spine2`/`Hips` disables Costas/Coldres with the reason; the hands still
   work; a saved binding stays.
6. **Pose photo**: "Gerar imagem" includes every socket.
7. **Unchanged**: 2D map, 2,5D figures, Mover, turns, chat.
8. **MCP**: `update_weapon` with `pose: { rz: 270 }` and `gripPoint`; `update_token` with `weapons: [{ socket: 3,
   weaponId }]`; a `pose.rx` of 45 → 400; two entries with `socket: 1` → 400 `weapons[1].socket`. Counts 120 / 121.
