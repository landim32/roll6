# Data Model: Biblioteca de animações dos tokens 3D (059)

## Animation (new, `animations`)

| Column | Type | Notes |
|---|---|---|
| `animation_id` | `bigint` identity PK | |
| `user_id` | `bigint not null` | owner; FK `fk_animation_user` → `users`, `ClientSetNull`; index `ix_animations_user` |
| `name` | `varchar(100) not null` | `Guard.RequiredText(name, "name", 100)`; not unique |
| `animation_type` | `integer not null` | `AnimationType` 1–7; index `ix_animations_type` |
| `file_name` | `varchar(260) not null` | `{guid:N}.json` in the bucket folder (`Guard.AnimationFileName`) |
| `duration` | `double precision not null` | seconds, read from the file (0 < d ≤ 30) |
| `loop` | `boolean not null` | read from the file |
| `created_at`, `updated_at` | `timestamp without time zone not null` | UTC |

Migration `AddAnimations` + `database/migrations/059-animations.sql` (idempotent `CREATE TABLE IF NOT EXISTS …` + indexes + FK + the `__EFMigrationsHistory` row); `database/roll6.sql` regenerated.

### `AnimationType` (C# enum `Roll6.Domain.Enums.AnimationType`; TS constant `ANIMATION_TYPE`)

| Value | Name | Label (pt-BR) | Feeds the token state |
|---|---|---|---|
| 1 | Idle | Parado | `modelIdleClip` (Parado) |
| 2 | Walk | Andando | `modelWalkClip` (Caminhando) |
| 3 | Run | Correndo | — (stored only) |
| 4 | Crouch | Agachado | — |
| 5 | Defeated | Derrotado | `modelDownClip` (Caído) |
| 6 | Attack | Atacando | — |
| 7 | Defend | Defendendo | — |

### Model methods (`Animation`)

| Method | What it does |
|---|---|
| `Create(userId, name, type, fileName, duration, loop)` | validates every field |
| `Rename(name)` | |
| `ChangeType(type)` | validates 1–7; the in-use rule is checked by the service before calling it |
| `IsOwnedBy(userId)` | |

### Rules

| Operation | Rule |
|---|---|
| Create | Any authenticated user. The content passes `AnimationFormat.Parse`; the file is stored, then the row is inserted. If the insert fails, the stored object is deleted (best effort). |
| Read, list, file | Any authenticated user (shared library, Q1 = A). |
| Rename | Owner only (403 otherwise). |
| Retype | Owner only. 409 while a token uses `animation:{id}` in the column the **old** type feeds. |
| Delete | Owner only. 409 while any token uses it in any of the three columns. Deletes the row, then the bucket object (best effort). |

## Token (existing, `tokens`), no schema change

`model_idle_clip`, `model_walk_clip` and `model_down_clip` accept one more value:

| Value | Meaning |
|---|---|
| `animation:{id}` | the library animation `id`; positive integer, no leading zeros required |

Rules, added to `TokenLibraryService.CreateAsync`/`UpdateAsync` after `Token.UpdateModel`:
- the id must exist → else 400 on that field: "Animação não encontrada.";
- its type must be the type of the state (table above) → else 400 on that field: "Esta animação é do tipo {X}; o estado {Parado|Caminhando|Caído} aceita só animações do tipo {Parado|Andando|Derrotado}.";
- without a model the choices are dropped (unchanged).

`TokenInfo`/`MapTokenInfo` are unchanged: they carry the strings.

## Animation file (bucket, `{S3:Folder}/{guid}.json`)

This is the validated document re-serialized compactly (UTF-8, `application/json`, at most 1 MB). The schema is in [contracts/animation-format.md](contracts/animation-format.md). The file is never replaced: a new file means a new animation.

## Frontend state (not persisted)

- **`types/animation.ts`**:
  - `AnimationInfo { animationId, userId, ownerName, name, type, duration, loop, fileUrl, createdAt, updatedAt }`;
  - `AnimationInsertInfo { name, type, content }`;
  - `AnimationUpdateInfo { name, type }`;
  - `AnimationFile`, the format's interface.
- **`AnimationContext`**:
  - `mine` and `search` pages, plus `byType` (state ↔ type lists for the token selects, ≤ 100 each, own first);
  - `upload`, `update`, `remove`;
  - `refreshType(type)`.
- **`lib/animationCache`**: `Map<number, Promise<Roll6Clip | null>>`, cleared on logout.
- **`lib/modelAnimations`**:
  - `ParsedClipChoice` adds `{ kind: 'animation'; id: number }`;
  - `AnimationSource` adds `'library'`;
  - `ResolvedAnimation` adds `{ source: 'library'; id: number }`.
- **`components/story/threeClips`**: `ModelClipBuilder = (choices, library) => ModelClips`, where `library: ReadonlyMap<number, Roll6Clip | null>`.
- **`lib/roll6Clips`**: `Roll6Clip.name: string`. The built-ins keep their names; library clips are named `animation:{id}`.
