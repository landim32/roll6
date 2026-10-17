# Contract: Weapon API (082)

Every route needs `[Authorize]` (JWT or `X-Api-Key`). Errors follow the existing `ApiControllerBase.HandleException`
mapping: 400 `ValidationProblemDetails`, 403, 404, 409 `ProblemDetails`.

## Upload the file (existing, 055)

`POST /api/model`, multipart `file` (`.glb`, glTF 2.0, ≤ 20 MB) → `200 { fileName, url }`.

Read back: `GET /api/model/file/{fileName}` (immutable cache; excluded from MCP).

## `WeaponController` (new)

| Verb | Route | Body | Who | Result |
|---|---|---|---|---|
| GET | `/api/weapon?mine=&page=&pageSize=&search=` | — | any logged user | `200 PagedList<WeaponInfo>`; own weapons first, then by name |
| GET | `/api/weapon/{id}` | — | any logged user | `200 WeaponInfo`; 404 "Arma não encontrada." |
| POST | `/api/weapon` | `WeaponInsertInfo { name, modelFile }` | any logged user (becomes the owner) | `201 WeaponInfo`; 400 `name` / `modelFile` |
| PUT | `/api/weapon/{id}` | `WeaponUpdateInfo { name?, modelFile? }` | owner | `200 WeaponInfo`; 403; 404; 400. A new `modelFile` publishes `mapTokens.changed` to the campaigns that use it |
| DELETE | `/api/weapon/{id}` | — | owner | `204`; 403; 404; 409 "Esta arma está em uso por um ou mais tokens." |

```jsonc
// WeaponInfo
{ "weaponId": 7, "userId": 3, "ownerName": "Rodrigo", "name": "Espada longa",
  "modelFile": "0f3c…e1.glb", "modelFileUrl": "https://…/roll6/0f3c…e1.glb?X-Amz-…",
  "createdAt": "2026-10-17T12:00:00", "updatedAt": "2026-10-17T12:00:00" }
```

## Token (extended)

`POST /api/token` and `PUT /api/token/{id}`. `TokenInsertInfo` gains:

```jsonc
"rightWeapon": { "weaponId": 7, "grip": { "x": 0, "y": 0.02, "z": 0, "rx": 0, "ry": 0, "rz": 90, "scale": 100 } },
"leftWeapon": null
```

- Omitted or null = that hand is empty. The PUT replaces everything.
- `grip` omitted = default.
- Ignored (cleared) without `modelFile`.
- Errors:
  - 400 `rightWeapon.weaponId` / `leftWeapon.weaponId` "Arma não encontrada.";
  - 400 `rightWeapon.grip.scale` etc. out of range.

`TokenInfo` and `MapTokenInfo` gain `rightWeapon` / `leftWeapon`:

```jsonc
{ "weaponId": 7, "name": "Espada longa", "modelFile": "0f3c…e1.glb", "modelFileUrl": "https://…?X-Amz-…",
  "grip": { "x": 0, "y": 0.02, "z": 0, "rx": 0, "ry": 0, "rz": 90, "scale": 100 } }
```

On reads, `grip` is always filled (the default when stored null). `modelFileUrl` is a presigned URL, like the token's
`modelFileUrl`: the browser reads the bytes through `GET /api/model/file/{modelFile}` (`modelService.fetchStored`).

## MCP (`Roll6.Mcp/Tools/WeaponTools.cs`)

| Tool | Operation | Annotations |
|---|---|---|
| `list_weapons` | GET `/api/weapon` | ReadOnly |
| `get_weapon` | GET `/api/weapon/{id}` | ReadOnly |
| `create_weapon` | POST `/api/weapon` | — |
| `update_weapon` | PUT `/api/weapon/{id}` | Idempotent |
| `delete_weapon` | DELETE `/api/weapon/{id}` | Destructive |

Other changes:
- `create_token`/`update_token` take `rightWeapon`/`leftWeapon`.
- `upload_token_model` also says it uploads weapon files.
- Guide section "Weapons".
- `McpCoverageTests`: 120 operations / 121 tools.
