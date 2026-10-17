# Quickstart: Biblioteca de armas dos tokens 3D (082)

## Preparation

- A token with a Mixamo-skeleton `.glb`, e.g. the example characters used in 055–061.
- Two weapon `.glb` files: a sword with its origin at the handle, and a shield. A third file in centimetres helps test
  the default size.

## Checks

1. **Library (US1)**:
   - User menu › "Armas" › Enviar: send the sword with the name "Espada longa".
   - It shows in Minhas, and its preview turns.
   - Sending a `.png` renamed to `.glb`, or a file over 20 MB, is refused with a message.
   - Rename it, replace its file, and it still has the same id.
   - In another account, Buscar finds it, and that account cannot edit or delete it.
2. **Binding (US2)**:
   - Edit the token › "Armas": sword on Direita, shield on Esquerda.
   - The preview shows both. Play Parado, Caminhando and Caído on the timeline: the weapons stay in the hands.
   - Save.
   - Open a map with the piece in 3D: the weapons are there, also while walking in free mode and lying down.
   - A second browser sees the same without a reload.
3. **Grip (US3)**:
   - Move the sliders: the preview follows at once.
   - "Voltar ao padrão" resets.
   - Save, and the table shows the same fit.
   - Put the same sword on another token and adjust it differently: the first token does not change.
4. **Size**:
   - The centimetre weapon starts at about half the character's height.
   - Changing the model's "Tamanho" (063) scales the weapon with the character.
5. **In use**: deleting the sword while a token holds it is refused (409 toast). After removing it from the token, the
   delete works.
6. **No hands**: a model without a Mixamo skeleton gets the warning in "Armas", the controls are disabled, and the saved
   binding is kept.
7. **Pose photo**: "Gerar imagem" includes the weapons.
8. **Unchanged**: the 2D map, the 2,5D figures, Mover, turns and chat behave as before.
9. **MCP**: `upload_token_model` + `create_weapon`, then `update_token` with `rightWeapon`, and the site shows the
   weapon.
