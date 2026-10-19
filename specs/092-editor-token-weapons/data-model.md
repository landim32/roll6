# Data Model: Token com armas no editor de animação

No database change.

## Frontend

- **Token shown**: the `TokenInfo` chosen in "Modelo", already loaded by `ModelTokenSelect` (own tokens with a model).
  It carries `weapons[]` (083: socket, weaponId, name, modelFileUrl, gripPoint, pose, grip) and the clip choices
  (`modelIdleClip`…).
- **SocketWeapons** (`lib/weaponGrip.socketWeaponsOf(token)`): socket → `{ url, gripPoint, pose, grip }`, handed to the
  stage.
- **Weapons toggle**: `localStorage` `roll6:editor-weapons` = `on` | `off` (missing = on).
- **Weapons line** (`lib/editorWeapons.weaponItems(token)`): `["Espada longa (mão direita)", "Escudo (mão esquerda)"]`,
  ordered by socket, with the names of `SOCKET_LABEL`: 1 mão direita, 2 mão esquerda, 3 costas, 4 coldre direito,
  5 coldre esquerdo.

## Hub DTO

- `RequestInfo.ModelWeapons : List<string>?` holds at most 5 items of up to 120 characters each; more → `invalid`. It is
  kept on `EditorRequest.ModelWeapons` and passed to `AnimationPromptContext.Build`.
