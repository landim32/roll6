# Contracts: API, MCP and UI (059)

## REST API (`AnimationController`, `[Authorize]`)

| Verb | Route | Who | Body / query | Success |
|---|---|---|---|---|
| POST | `/api/animation` | any user | `AnimationInsertInfo { name, type, content }` | 201 `AnimationInfo` |
| GET | `/api/animation` | any user | `page`, `pageSize` (≤ 100), `search`, `mine` (bool), `type` (1–7) | 200 `PagedList<AnimationInfo>`; own first when not `mine`, then by name |
| GET | `/api/animation/{id}` | any user | — | 200 `AnimationInfo` |
| GET | `/api/animation/{id}/file` | any user | — | 200 `application/json` (the file), `Cache-Control: private, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff` |
| PUT | `/api/animation/{id}` | owner | `AnimationUpdateInfo { name, type }` | 200 `AnimationInfo` |
| DELETE | `/api/animation/{id}` | owner | — | 204 |

`AnimationInfo`:

```json
{
  "animationId": 12, "userId": 3, "ownerName": "Rodrigo",
  "name": "Ataque com machado", "type": 6,
  "duration": 1.2, "loop": false,
  "fileUrl": "/api/animation/12/file",
  "createdAt": "2026-10-14T18:00:00", "updatedAt": "2026-10-14T18:00:00"
}
```

Errors:

| Situation | Response |
|---|---|
| Invalid content | 400, key from [animation-format.md](animation-format.md) |
| `name` empty or longer than 100 | 400 `name` |
| `type` outside 1–7 | 400 `type` |
| Not the owner | 403 |
| Unknown id | 404 "Animação não encontrada." |
| Delete while in use | 409 "Esta animação está em uso por um ou mais tokens." |
| Retype while in use | 409, same message |

### Token (`POST`/`PUT /api/token`), changed rule only

`modelIdleClip`/`modelWalkClip`/`modelDownClip` accept `"animation:{id}"`.

| Case | Response |
|---|---|
| Unknown id | 400 on that field, "Animação não encontrada." |
| Wrong type | 400 on that field. Idle needs type 1, walk 2, down 5. |
| Valid | Stored as sent. |

## MCP (`Tools/AnimationTools.cs`): 108 operations / 109 tools

| Tool | Operation | Annotations | Parameters |
|---|---|---|---|
| `create_animation` | POST `/api/animation` | write | `name`, `type` (1–7), `content` (the animation as a JSON object, or its text) |
| `list_animations` | GET `/api/animation` | read-only, idempotent | `page`, `pageSize`, `search`, `mine`, `type` |
| `get_animation` | GET `/api/animation/{id}` | read-only, idempotent | `animationId` |
| `get_animation_content` | GET `/api/animation/{id}/file` | read-only, idempotent | `animationId` |
| `update_animation` | PUT `/api/animation/{id}` | write, idempotent | `animationId`, `name`, `type` |
| `delete_animation` | DELETE `/api/animation/{id}` | destructive | `animationId` |

Each description follows the house template: What it does, Who can use it, Returns, Common errors, Related tools.

- **`create_animation`**: summarizes the format and points to `get_roll6_guide` for the complete example. It says that only types idle, walk and defeated feed token states for now, and how to use the result on a token (`modelIdleClip: "animation:{id}"`).
- **`McpDocs.MODEL_CLIP`**: gains `"animation:{id}"`, a library animation (`list_animations`) whose type must match the state (idle ← 1, walk ← 2, down ← 5).
- **`roll6://guide`**: gains the section "Animations", covering the format, bones, axes and signs, limits, a full example, the type table and the in-use rules.

## UI

**User menu → "Animações"** (`AnimationsModal`, three tabs):

1. **Minhas**: the user's own animations.
   - Filter by type, search by name, paged 12 per page.
   - Each row shows name, type badge, "1,2 s · uma vez" or "· repete", and actions:
     - **pencil**: `AnimationEditModal`, name + type; a 409 is shown as a toast;
     - **Copiar JSON**: copies the file text;
     - **trash**: `ConfirmModal`; a 409 is shown as a toast.
2. **Buscar**: the same list over the whole library, with the owner name. Only "Copiar JSON".
3. **Enviar**: the upload form.
   - Fields: `.json` file, name, type select (the seven types, with a note that only Parado/Andando/Derrotado appear in tokens for now).
   - The client validates before sending; an error shows under the file field with the same text as the server.
   - On success: toast `animations.uploaded`, and the window switches to Minhas.

**Token form → "3D" tab → Animações**: each select (Parado / Caminhando / Caído) gets `<optgroup label="Biblioteca">` with the animations of that state's type, own first. Each option is labelled "{nome}", or "{nome} — {dono}" for other users' animations.

- Shown only for a Mixamo skeleton.
- Picking one previews it at once.
- "Tocando:" says "Biblioteca: {nome}".
- The deformation warning (`tokens.model.deforms`) applies.

### Texts (pt-BR, new keys)

| Key | Text |
|---|---|
| `animations.menu` | Animações |
| `animations.title` | Animações |
| `animations.tab.mine` / `.search` / `.upload` | Minhas / Buscar / Enviar |
| `animations.type.1` … `.7` | Parado / Andando / Correndo / Agachado / Derrotado / Atacando / Defendendo |
| `animations.loop` / `animations.once` | repete / uma vez |
| `animations.typeNote` | Por enquanto, só animações dos tipos Parado, Andando e Derrotado podem ser escolhidas nos tokens. |
| `animations.file` | Arquivo de animação (.json) |
| `animations.uploaded` | Animação enviada. |
| `animations.copied` | JSON copiado. |
| `animations.confirmDelete` | Apagar a animação "{{name}}"? |
| `animations.empty` | Nenhuma animação. |
| `tokens.model.libraryGroup` | Biblioteca |
| `tokens.model.source.library` | Biblioteca: {{name}} |
