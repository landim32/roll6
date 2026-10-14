# Research: Biblioteca de animações dos tokens 3D (059)

## R1 — The format is `Roll6Clip` as a file

**Decision**: the JSON format `roll6-animation` version 1 holds exactly the motion fields of `lib/roll6Clips.Roll6Clip`:

- `duration` (s);
- `loop`;
- `tracks[{ bone, times[], degrees[[x, y, z]] }]` in the **character's frame** (glTF: +X the character's left, +Y up, +Z forward), degrees about X, then Y, then Z, applied on top of the bone's rest pose;
- `hipsLift? { times[], values[], of?: 'height' | 'hips' }`.

Plus a header: `format: "roll6-animation"`, `version: 1`, and optional `name`/`type`/`description`. The header fields are only suggestions for the upload form and are never trusted over what the user chooses.

What it leaves out:
- `name`, which is an internal enum.
- `protect`. Uploaded clips are always played in full and tested for deformation, like the guard and the death (058, Q1 = A).

**Rationale**:
- The converter in `threeClips` (rest-pose relative, per-skeleton `P⁻¹·D·C·P·L`, `RELAXED_ARMS`) already turns this data into a working `AnimationClip` for any Mixamo rig. A file in the same shape reuses it unchanged.
- The four built-in clips prove the format is enough (FR-002, SC-001): `fromRoll6Clip` exports them and `toRoll6Clip` reads them back identical.

**Alternatives considered**:
- glTF/`.glb` animation-only files: binary, need a 3D tool, can't be written or validated by an LLM. Rejected.
- Quaternions per bone in the bone's local frame: depends on each rig's axes, the very problem the character-frame degrees solve. Rejected.
- BVH: different skeleton conventions and needs retargeting. Rejected.

## R2 — Validation rules and limits

**Decision**: one pure validator per language, with the same rules, the same order and the same error keys. The first error wins, keyed for `ValidationProblemDetails`.

| Rule | Key |
|---|---|
| Body is a JSON object, ≤ 1 MB (UTF-8 bytes) | `content` |
| `format == "roll6-animation"`, `version == 1` | `content.format` / `content.version` |
| `duration` a finite number, 0 < d ≤ 30 | `content.duration` |
| `loop` a boolean | `content.loop` |
| `tracks`: an array, 1–64 items | `content.tracks` |
| `bone`: in the accepted list (R3), not repeated | `content.tracks[i].bone` |
| `times`: 1–600 finite numbers, strictly ascending, first = 0, last ≤ duration (+1e-6) | `content.tracks[i].times` |
| `degrees`: same length as `times`, each a triple of finite numbers with \|v\| ≤ 360 | `content.tracks[i].degrees` |
| `hipsLift` (optional): `times` as above; `values` same length, finite, \|v\| ≤ 2; `of` ∈ {height, hips} | `content.hipsLift…` |
| Unknown top-level or track fields | ignored (forward compatible) |

`loop: true` does not require the first key to equal the last key. The skill writes it that way and the docs recommend it, but a jump at the loop seam is a matter of taste, not an error.

Messages are in pt-BR, as for every other `DomainValidationException`. Example: "Osso \"LeftElbow\" não existe no esqueleto Mixamo (trilha 3)."

**Rationale**:
- The limits are generous for hand-written or generated files: 64 tracks covers every body and finger bone, and 600 keys is 30 s at 20 fps.
- The limits keep the build cheap: one `AnimationClip` with at most 64 × 600 keys.
- With identical keys, the site, the MCP and the skill report the same thing.

## R3 — Accepted bones

**Decision**: the Mixamo names without prefix (52 in total):

- **Body (22)**: Hips, Spine, Spine1, Spine2, Neck, Head, Left/Right × Shoulder, Arm, ForeArm, Hand, UpLeg, Leg, Foot, ToeBase.
- **Fingers (30)**: Left/Right × Hand{Thumb, Index, Middle, Ring, Pinky}{1, 2, 3}.

The list lives in `AnimationFormat.BONES` (C#), `animationFormat.BONES` (TS) and `validar.py`. Bones the model lacks are skipped by the converter, which already ignores missing bones.

**Rationale**: these are the bones the converter can map by name (`normalizeBoneName`). End bones (`HeadTop_End`, `*_End`) carry no mesh weight and are left out.

## R4 — Upload as JSON, not multipart

**Decision**: `POST /api/animation` with `AnimationInsertInfo { name, type, content }`, where `content` is a `JsonElement` holding the object.

- The service serializes the validated element back as compact UTF-8 and stores it. What is stored is the validated document, not arbitrary bytes.
- The site reads the `.json` with `File.text()` and `JSON.parse`. Invalid JSON is reported client-side, then the object is sent.
- The MCP `create_animation` takes `content` as an object, or a string that it parses before forwarding.
- `[RequestSizeLimit(1_100_000)]`.

**Rationale**:
- One request creates the entity and stores the file. No orphan uploads (the image/model flow uploads first and links later; here the file belongs to exactly one animation).
- One body for the site and the MCP.
- No base64.

**Alternatives considered**: multipart `file` like `POST /api/model`. Rejected: two shapes for the MCP, and the file would be untyped bytes.

## R5 — Storage and the file route

**Decision**:
- **Write**: `IImageService.StoreAnimationAsync(byte[])` → `{guid:N}.json` in the bucket folder (`application/json`).
- **Read**: `OpenAnimationAsync(name)`, validated by `Guard.AnimationFileName` (`^[0-9a-f]{32}\.json$`).
- **File route**: `GET /api/animation/{id}/file` (`[Authorize]`, any logged user) streams it with `Cache-Control: private, max-age=31536000, immutable` and `X-Content-Type-Options: nosniff`. The file of an animation never changes; there is no "replace file", so a new file means a new animation.
- **`AnimationInfo.fileUrl`**: the relative route `/api/animation/{id}/file`. This is the spec's "Url do arquivo".

**Rationale**: the bucket sends no CORS headers (040, 055). Presigned URLs expire. The stored name is write-once, so the route is cacheable forever.

**Deletion**: deleting an animation removes the row, then the object (best effort, logged on failure, like the chat media of 041). This is the first entity whose file is deleted along with it. That is safe, because no other row ever points to its `{guid}.json`.

## R6 — The token's choice: `animation:{id}`

**Decision**: the three existing clip columns accept `animation:{id}`, where `id` is a positive integer.

- `Guard.ModelClip` accepts the syntax; the error message lists it.
- `parseClipChoice` returns `{ kind: 'animation', id }`.
- No new column, DTO field or MCP parameter: `modelIdleClip`/`modelWalkClip`/`modelDownClip` already carry choices.

**Rationale**:
- One choice per state, already modelled as a string grammar (`roll6`, `roll6-guard`, `none`, `clip:{name}`).
- An FK per state would add three columns that mean the same as the string. The in-use checks (R7) give the integrity the user sees.
- `MapTokenInfo` already carries the strings to every viewer.

**Alternatives considered**: `model_idle_animation_id` etc. as FKs. Rejected: they duplicate the choice and need precedence rules against the string.

## R7 — State ↔ type and the in-use rules (Q2)

**Decision**: `Domain/Animations/AnimationStates.TypeFor(field)`:

| Field | Type |
|---|---|
| `modelIdleClip` | Idle (1, "Parado") |
| `modelWalkClip` | Walk (2, "Andando") |
| `modelDownClip` | Defeated (5, "Derrotado") |

Run (3), Crouch (4), Attack (6) and Defend (7) feed no state yet.

**Token create/update** (`TokenLibraryService`): after `UpdateModel`, for each choice that is `animation:{id}`:
- load the animations in one query;
- a missing id → 400 on that field ("Animação não encontrada.");
- the wrong type → 400 ("Esta animação é do tipo X; o estado Parado aceita só animações do tipo Parado.").
- Choices are dropped without a model, as before.

**Delete** (`AnimationService.DeleteAsync`, owner): `ITokenRepository.AnyUsesClipAsync("animation:{id}")` checks the three columns. If any token uses the animation → 409 "Esta animação está em uso por um ou mais tokens."

**Retype** (owner): when the type changes and the old type feeds a state, the check runs on that state's column only → 409 with the same message. Changing between types that feed no state is always allowed.

**Rename**: always allowed.

**Rationale**: a token can never end up holding an animation of the wrong type, and the server is the one rule keeper for the site and the MCP alike.

## R8 — Loading and building on the client

**Decision**:
- **`lib/animationCache`**: `loadAnimation(id): Promise<Roll6Clip | null>`. It fetches `GET /api/animation/{id}/file` through `animationService.getContent` (with auth), parses and validates with `lib/animationFormat`, and converts with `toRoll6Clip`. The result is memoized per id for the session, and a failure resolves to `null`, never a reject. The cache is cleared on logout.
- **`modelAnimations`**:
  - `resolveAnimation(choice, names, bones, state, library?)` returns `{ source: 'library', id }` for a Mixamo skeleton.
  - When `library` (the loaded ids) says the id failed (`null`), it resolves as automatic (spec edge case).
  - While an id is still loading, it resolves as automatic too, so the model never waits on it.
  - `AnimationSource` gains `'library'`.
- **`threeClips.createClipBuilder(root, fileClips, boneNames, height)`**: the builder becomes `(choices, library: ReadonlyMap<number, Roll6Clip | null>) => ModelClips`.
  - Library clips are built like guard/death: `buildRoll6Clip(clip, root, height)` at full amplitude, plus `deformsAtFull` once per id. Entries are cached by id.
  - The results cache key includes the loaded ids, so it is rebuilt when they arrive.
- **`modelLayer`**: when a spec's choices name ids, `loadAnimation` each one. On resolve, `animate(entry)` runs again with the same state rules as 058 (a lying piece goes to the last frame without replay).
- **`ModelPreview`**: same as `modelLayer`. `ModelField` passes choices as before.
- **`Roll6Clip.name`** widens to `string` (library clips use `animation:{id}`). `ROLL6_CLIPS_BY_NAME` keeps its four keys.

**Rationale**:
- Reuses the 055–058 pipeline with no new math.
- The automatic fallback means a missing or slow file never blanks a model.

## R9 — UI

**Decision**:

**Library window.** "Animações" in `UserMenu` (state in `TopMenu`, like API keys) opens `components/animations/AnimationsModal`, with tabs:
- **Minhas**: the user's animations; edit (name/type) and delete with confirmation, plus a "Copiar JSON" action.
- **Buscar**: the whole library, read-only, with a "Copiar JSON" action.
- **Enviar**: `.json` file picker (accept `.json,application/json`), name (pre-filled from `content.name` or the file name), type select (pre-filled from `content.type` when valid). The client validates with `lib/animationFormat` before sending and shows the error under the field. On success the window switches to Minhas.

Both lists:
- show name, type badge, duration and "repete"/"uma vez", plus the owner name in Buscar;
- have a type filter and a name search, paged like `TokenGrid` (12 per page).

**Token "3D" tab.** Each select of `ModelField` gets an `<optgroup label="Biblioteca">` with the animations of that state's type: own first, then others, labelled "Nome — dono".
- The list comes from `AnimationContext.listForType(type)`, which loads up to 100 per type on first use and refreshes after uploads.
- Shown only when the skeleton is Mixamo, like the Roll6 options.
- A saved choice whose animation is not in the list (another user's beyond the first page, for example) is still shown as an option, labelled with its name loaded through `GET /api/animation/{id}`.
- "Tocando: …" says "Biblioteca: {nome}".

**Rationale**:
- One window for the library keeps the token form small.
- The selects stay the single place where a state's animation is picked.

## R10 — MCP

**Decision**: `Tools/AnimationTools.cs`, one tool per endpoint.

| Tool | Endpoint |
|---|---|
| `create_animation` | `POST /api/animation`, `{ name, type, content }`. `content` is an object, or a string that is parsed (invalid → `isError` before calling the API). `type` is the number 1–7 (the description lists the names; the skill's `enviar.py` maps pt-BR/English names to the number). |
| `list_animations` | `GET /api/animation?mine&type&search&page&pageSize` |
| `get_animation` | `GET /api/animation/{id}` |
| `get_animation_content` | `GET /api/animation/{id}/file`. Returns the JSON, so an assistant can read and adapt an existing animation. |
| `update_animation` | `PUT /api/animation/{id}` |
| `delete_animation` | `DELETE /api/animation/{id}` |

Counts: 102 → **108 operations**, 103 → **109 tools**.

Text changes:
- `McpDocs.MODEL_CLIP` adds `"animation:{id}"` with the state ↔ type rule.
- The guide gets an "Animations" section: format, bones, axes and signs, limits, a complete example, and the type ↔ state table.
- `upload_token_model` and `create_token`/`update_token` texts link to `create_animation`.

**Rationale**: the coverage tests require one tool per controller action; reading the content is genuinely useful for an assistant.

## R11 — The `criar-animacao` skill

**Decision**: a skill in the style of `criar-mascara` (pt-BR frontmatter description with triggers, then a method, the format table, scripts and examples).

**Inputs**:
- **Description**: the skill breaks the motion into phases, picks times (≈ 4–8 keys, loop seam closed for repeating types) and writes the degrees per bone using the sign table.
- **Image of a pose**: the skill reads the pose (trunk lean, each upper arm/forearm/thigh/shin direction, head) and converts it into the angles of the target pose. It writes a clip that goes from rest to that pose in 0.4–0.8 s and holds it, with a small breath for the repeating types (Parado, Defendendo, Agachado) or a single hold for one-shot types.

**Types**:
- The skill asks which type, or infers it from the request and confirms.
- It warns that only Parado, Andando and Derrotado are usable on tokens for now (Q2).
- `loop` defaults to `false` for Derrotado and Atacando, `true` otherwise.

**Output**: `animacoes/<slug>.json` in the table repo. Then:
- `python .claude/skills/criar-animacao/scripts/validar.py <file>` must pass;
- the skill explains the motion in one paragraph.

**Sending** (only when asked): `scripts/enviar.py <file> --nome … --tipo …` imports `roll6.py`'s client (`cliente().chamar("create_animation", {...})`) and prints the id and the name. The skill states the `animation:{id}` value to use in a token.
- `roll6.py` itself is not edited; it has pending changes in that repo.

**Examples**: one per type, plus the four Roll6 clips exported (`roll6-parado.json`, `roll6-caminhada.json`, `roll6-guarda.json`, `roll6-morte.json`), which are the references for angles and signs.

**Rationale**: matches how that repo already works (skills plus scripts plus `roll6.py` over MCP), and keeps the format rules in one documented place for the model.

## R12 — Tests

- **Shared fixtures**:
  - `specs/059-token-animation-library/fixtures/*.json`: the four Roll6 clips plus ~12 invalid cases, each with its expected key.
  - The C# tests load the fixture files (as content files) and the TS tests import them; the Python validator is run over them in the quickstart. One set of cases pins all three validators.
- **Manual pass** (quickstart): upload, choose, see on the table, MCP and skill. It stays pending at the table, since there is no local database, as in earlier features. The skill and the validators can be checked locally.
