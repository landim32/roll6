# Contract: weapon sockets API (083)

Every route needs `[Authorize]` (JWT or `X-Api-Key`). Errors follow `ApiControllerBase.HandleException`: 400
`ValidationProblemDetails`, 403, 404, 409 `ProblemDetails`. **No new endpoint**: the 082 routes change shape.

## `WeaponController` (changed payloads)

| Verb | Route | Body | Who | Result |
|---|---|---|---|---|
| GET | `/api/weapon?mine=&page=&pageSize=&search=` | — | any logged user | `200 PagedList<WeaponInfo>` |
| GET | `/api/weapon/{id}` | — | any logged user | `200 WeaponInfo` |
| POST | `/api/weapon` | `WeaponInsertInfo { name, modelFile, gripPoint?, pose? }` | any logged user | `201 WeaponInfo`; 400 `name` / `modelFile` / `gripPoint.{x,y,z}` / `pose.{rx,ry,rz}` |
| PUT | `/api/weapon/{id}` | `WeaponUpdateInfo { name?, modelFile?, gripPoint?, pose? }` | owner | `200 WeaponInfo`; 403; 404; 400. A new file, grip point or pose publishes `mapTokens.changed` to the campaigns that use it |
| DELETE | `/api/weapon/{id}` | — | owner | `204`; 403; 404; 409 "Esta arma está em uso por um ou mais tokens." |

```jsonc
// WeaponInfo
{ "weaponId": 7, "userId": 3, "ownerName": "Rodrigo", "name": "Espada longa",
  "modelFile": "0f3c…e1.glb", "modelFileUrl": "https://…/roll6/0f3c…e1.glb?X-Amz-…",
  "gripPoint": { "x": 0.5, "y": 0.12, "z": 0.5 },      // normalised in the file's bounding box, 0…1
  "pose": { "rx": 0, "ry": 0, "rz": 270 },              // Euler XYZ, multiples of 90, 0…270; tip = +Y, edge = +X after it
  "createdAt": "2026-10-18T12:00:00", "updatedAt": "2026-10-18T12:00:00" }
```

- `pose` input accepts any multiple of 90 in −360…360 (normalised modulo 360); 400 `pose.rx` "O giro da arma é em passos
  de 90°." otherwise.
- `gripPoint` input: 0…1 per axis; 400 `gripPoint.y` "A pega fica dentro do modelo (0 a 1)." otherwise.

## Token (changed)

`POST /api/token` and `PUT /api/token/{id}`. `TokenInsertInfo` **replaces** `rightWeapon`/`leftWeapon` by:

```jsonc
"weapons": [
  { "socket": 1, "weaponId": 7, "grip": { "scale": 110 } },
  { "socket": 2, "weaponId": 9 },
  { "socket": 3, "weaponId": 7, "grip": { "x": 0, "y": 0.02, "z": 0, "rx": 0, "ry": 0, "rz": 0, "scale": 100 } }
]
```

- `socket`: 1 right hand, 2 left hand, 3 back, 4 right holster, 5 left holster.
- Omitted / empty = no weapon; the PUT replaces the whole set. Ignored (emptied) without `modelFile`.
- `grip` omitted or partial = default for the missing fields (all 0, scale 100). Position/rotation are the **fine
  adjustment** in the socket's frame; `scale` is the size.
- The same `weaponId` may appear in several sockets; the same `socket` twice is refused.
- Errors (index = position in the array):
  - 400 `weapons[i].socket` "Encaixe desconhecido." / "Cada encaixe recebe uma arma só.";
  - 400 `weapons[i].weaponId` "Arma não encontrada.";
  - 400 `weapons[i].grip.scale` etc. out of range (082 messages).

`TokenInfo` and `MapTokenInfo` carry `weapons` (always a list, ordered by socket):

```jsonc
"weapons": [
  { "socket": 1, "weaponId": 7, "name": "Espada longa", "modelFile": "0f3c…e1.glb", "modelFileUrl": "https://…?X-Amz-…",
    "gripPoint": { "x": 0.5, "y": 0.12, "z": 0.5 }, "pose": { "rx": 0, "ry": 0, "rz": 270 },
    "grip": { "x": 0, "y": 0, "z": 0, "rx": 0, "ry": 0, "rz": 0, "scale": 110 } }
]
```

`gripPoint`, `pose` and `grip` are always filled on reads. A binding whose weapon no longer exists is left out.

## MCP

| Tool | Change |
|---|---|
| `create_weapon`, `update_weapon` | parameters `gripPoint` (`McpDocs.WEAPON_GRIP_POINT`) and `pose` (`McpDocs.WEAPON_POSE`) |
| `create_token`, `update_token` | `weapons` (array of `{ socket, weaponId, grip? }`, `McpDocs.TOKEN_WEAPON` rewritten) replaces `rightWeapon`/`leftWeapon` |
| `list_weapons`, `get_weapon`, `delete_weapon` | text only |
| guide `roll6://guide` | section "Weapons" rewritten: sockets, standard pose ("tip +Y, edge +X" in 90° steps), grip point, size, fine adjustment |

Counts unchanged: **120 operations / 121 tools** (`McpCoverageTests`).
