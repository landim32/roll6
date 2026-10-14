---
description: "Tasks for 059-token-animation-library"
---

# Tasks: Biblioteca de animações dos tokens 3D

**Input**: design documents from `/specs/059-token-animation-library/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/animation-format.md, contracts/api-mcp-ui.md, quickstart.md

**Tests**: included. The plan (Technical Context › Testing, research R12) asks for:
- unit tests of the three mirrored validators, which share fixtures;
- unit tests of the service rules, the state ↔ type rule and the client resolution;
- the MCP reflection tests with the new counts.

These follow the project's practice: `backend/Roll6.Tests` and `frontend/src/**/*.test.ts`.

**Organization**: one phase per user story, in priority order:
- US1 (P1): upload to the library;
- US2 (P1): use it on a token;
- US3 (P2): MCP;
- US4 (P2): the `criar-animacao` skill in `C:\repos\gurps-adventure`.

Paths are relative to the Roll6 repository root, except the US4 paths, which are absolute.

**Architecture skills** (constitution I):
- backend entity work (T006–T011, T014–T016) follows the `dotnet-architecture` skill;
- frontend entity scaffolding (T017–T018) follows the `react-architecture` skill, adapted by `CLAUDE.md` (Fetch services with `handleApiResponse`, DTO without envelope, `Contexts/`/`Services/` casing).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create the shared validator fixtures in `specs/059-token-animation-library/fixtures/`:
  - **Valid files**: `roll6-parado.json`, `roll6-caminhada.json`, `roll6-guarda.json`, `roll6-morte.json`. These are the four clips of `frontend/src/lib/roll6Clips.ts` written in the format of `contracts/animation-format.md`, with `format`, `version`, `type` (`idle`, `walk`, `idle`, `defeated`), `duration`, `loop`, `tracks` (same bone, times and degrees) and `hipsLift` with `of` only when it is `"hips"`. Also `aceno.json`, the example of the contract.
  - **Invalid cases**: `invalid-*.json`, about 14 files, one per rule of research R2. Each one carries its expected key in a sibling `expected.json` map (`{ "invalid-bone.json": "content.tracks[2].bone", … }`). Cover:
    - not an object (`[]`);
    - wrong format;
    - version 2;
    - duration 0 and duration 31;
    - loop missing;
    - tracks empty;
    - 65 tracks;
    - unknown bone and repeated bone;
    - times not starting at 0, descending, or past the duration;
    - degrees with a length mismatch, a non-triple, or 400;
    - `hipsLift` values with a length mismatch;
    - `hipsLift.of` = "feet".
  - Keep the files small and readable. The 65-track case may repeat a valid bone name pattern, since the count is checked first.
- [X] T002 [P] Add the pt-BR texts of `contracts/api-mcp-ui.md` › Texts to `frontend/src/i18n/locales/pt-BR.json`:
  - `animations.*`: menu, title, tabs, `type.1`–`type.7`, loop/once, typeNote, file, name, uploaded, updated, deleted, copied, confirmDelete, empty, owner, duration format;
  - `tokens.model.libraryGroup`;
  - `tokens.model.source.library`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the format, its validators and the `AnimationType` constants, used by every story.

**⚠️ CRITICAL**: complete before Phases 3–6.

- [X] T003 [P] Create `backend/Roll6.Domain/Enums/AnimationType.cs`: `Idle = 1, Walk = 2, Run = 3, Crouch = 4, Defeated = 5, Attack = 6, Defend = 7`, with XML docs giving the pt-BR label.
- [X] T004 Create the pure validator `backend/Roll6.Domain/Animations/AnimationFormat.cs`, following research R2/R3 and `contracts/animation-format.md`:
  - **Constants**: `FORMAT = "roll6-animation"`, `VERSION = 1`, `MAX_BYTES = 1_048_576`, `MAX_DURATION = 30`, `MAX_TRACKS = 64`, `MAX_KEYS = 600`, `MAX_DEGREES = 360`, `MAX_LIFT = 2`, and `BONES`, an `IReadOnlySet<string>` of the 52 names.
  - **`AnimationFile Parse(JsonElement content)`**: throws `DomainValidationException(key, message)` with pt-BR messages; the first error wins, in the documented order. It returns a record `AnimationFile(double Duration, bool Loop, string? Name, AnimationType? Type)`, where `Type` is a suggestion parsed from the English names.
  - **`byte[] Serialize(JsonElement content)`**: compact UTF-8. It is called after `Parse`, and the size check runs on its output.
  - **Time tolerance**: 1e-6 on "last ≤ duration".
  - **Unknown fields**: ignored.
- [X] T005 [P] Create the TypeScript mirror `frontend/src/lib/animationFormat.ts`:
  - `ANIMATION_FORMAT`, `ANIMATION_VERSION`, the limits and `ANIMATION_BONES`;
  - `interface AnimationFile` (the format) and `interface AnimationFormatError { key: string; message: string }`;
  - `validateAnimation(value: unknown, byteLength?: number): AnimationFormatError | null`, with the same rules, order, keys and pt-BR messages as T004;
  - `parseAnimationText(text: string)`: returns `{ file } | { error }`; invalid JSON gives key `content`;
  - `toRoll6Clip(file: AnimationFile, name: string): Roll6Clip`: `protect: false`, `hipsLift` defaulting to zeros at `[0, duration]` when absent;
  - `fromRoll6Clip(clip: Roll6Clip, type?: string): AnimationFile`.
- [X] T006 Widen `Roll6Clip.name` to `string` in `frontend/src/lib/roll6Clips.ts`. Keep `Roll6ClipName` for the four built-ins and `ROLL6_CLIPS_BY_NAME` unchanged, and fix any type errors in `components/story/threeClips.ts` caused by the widening (the `own` map stays keyed by `Roll6ClipName`).
- [X] T007 [P] Add `backend/Roll6.Tests/Domain/Animations/AnimationFormatTests.cs`:
  - load every file of `specs/059-token-animation-library/fixtures/` (link the folder into the test project as content, `CopyToOutputDirectory`);
  - valid files parse, with the duration and loop read back;
  - every `invalid-*.json` throws with the key from `expected.json`;
  - an oversized body (> 1 MB) gives `content`.
- [X] T008 [P] Add `frontend/src/lib/animationFormat.test.ts`:
  - the same fixtures, imported through `import.meta.glob` from `../../../specs/059-token-animation-library/fixtures/*.json` (eager), and the same expectations;
  - round trip: `toRoll6Clip(fromRoll6Clip(ROLL6_X), ROLL6_X.name)` deep-equals each built-in clip with `protect: false`;
  - each `fixtures/roll6-*.json` deep-equals `fromRoll6Clip` of its clip, which pins the fixtures to the code.

**Checkpoint**: the format is defined in one place per language, and its tests pass on both sides.

---

## Phase 3: User Story 1 — Enviar uma animação para a biblioteca (Priority: P1) 🎯 MVP

**Goal**: a logged user uploads a `.json` with a name and a type; it is validated, stored in the bucket and listed. The owner renames, retypes and deletes it.

**Independent Test**: quickstart US1 steps 1–4.

### Backend

- [X] T009 [US1] Create the model `backend/Roll6.Domain/Models/Animation.cs`:
  - properties from data-model.md;
  - `Create(userId, name, type, fileName, duration, loop)`, `Rename`, `ChangeType`, `IsOwnedBy`;
  - `Guard.RequiredText(name, "name", 100)` for the name and an `AnimationType` range check, which throws key `type`.

  In `backend/Roll6.Domain/Validation/Guard.cs` add `AnimationFileName(value, field)`, matching `^[0-9a-f]{32}\.json$`, next to `ModelFileName`.
- [X] T010 [US1] Add the table to `backend/Roll6.Infra/Context/Roll6Context.cs`:
  - `animations`, snake_case columns, `animation_type` int, `duration` double;
  - FK `fk_animation_user` → users with `ClientSetNull`;
  - indexes `ix_animations_user` and `ix_animations_type`.

  Then:
  - generate the migration `dotnet ef migrations add AddAnimations --project Roll6.Infra --startup-project Roll6.API`;
  - write `database/migrations/059-animations.sql`, idempotent, in the style of `058-token-model-down-clip.sql`, with the `__EFMigrationsHistory` row;
  - regenerate `database/roll6.sql`, keeping its header.
- [X] T011 [US1] Create the repository:
  - `backend/Roll6.Infra.Interfaces/Repository/IAnimationRepository.cs` and `backend/Roll6.Infra/Repository/AnimationRepository.cs`;
  - methods: `GetByIdAsync`, `ListByIdsAsync(ids)`, `ListAsync(PageQuery, ownerUserId?, type?, viewerUserId)` (own first when not `mine`, then by name; joined owner name), `InsertAsync`, `UpdateAsync`, `DeleteAsync`;
  - follow `TokenRepository`'s generic shape.

  In `ITokenRepository`/`TokenRepository` add `AnyUsesClipAsync(string choice, bool idle, bool walk, bool down)`, an exists query over the selected clip columns.
- [X] T012 [US1] Extend storage in `backend/Roll6.Domain/Interfaces/IImageService.cs` and `backend/Roll6.Domain/Services/ImageService.cs`:
  - `StoreAnimationAsync(byte[] content)` → `{guid:N}.json`, `application/json`;
  - `OpenAnimationAsync(fileName)` → stream or null;
  - `DeleteAnimationAsync(fileName)`, best effort, logged.

  All three go through the existing `IImageStorageAppService` with the folder, like `UploadModelAsync`/`OpenModelAsync`.
- [X] T013 [US1] Create the DTOs in `backend/Roll6.DTO/Animation/`:
  - `AnimationInfo` (fields of `contracts/api-mcp-ui.md`, `fileUrl` = `/api/animation/{id}/file`);
  - `AnimationInsertInfo { name, type, content: JsonElement }`;
  - `AnimationUpdateInfo { name, type }`;
  - `AnimationQuery : PageQuery { mine, type }`.

  Use `[JsonPropertyName]` camelCase throughout.
- [X] T014 [US1] Create `backend/Roll6.Domain/Interfaces/IAnimationService.cs` and `backend/Roll6.Domain/Services/AnimationService.cs`:
  - **`CreateAsync(userId, info)`**: `AnimationFormat.Parse`, then `Serialize`, then the size check, `Store`, `Animation.Create` and `Insert`. If the insert fails, delete the stored file and rethrow.
  - **`ListAsync`**, **`GetAsync`**: 404 "Animação não encontrada.".
  - **`OpenFileAsync(id)`**.
  - **`UpdateAsync(userId, id, info)`**:
    - owner, else `UnauthorizedAccessException`;
    - on a type change, if the old type feeds a state (`AnimationStates`, T024), call `AnyUsesClipAsync` on that state's column; in use → `ConflictException` "Esta animação está em uso por um ou mais tokens.".
  - **`DeleteAsync(userId, id)`**: owner; `AnyUsesClipAsync` on all three columns → 409; delete the row, then `DeleteAnimationAsync` the file (best effort).
  - Register it in `backend/Roll6.Application/Startup.cs`.
- [X] T015 [US1] Create `backend/Roll6.API/Controllers/AnimationController.cs` (`[Authorize]`, `ApiControllerBase`, the `try/catch HandleException` pattern), with the six routes of `contracts/api-mcp-ui.md`:
  - `POST`: `[RequestSizeLimit(1_100_000)]`, returns 201 with `CreatedAtAction`;
  - `GET` list and `GET {id}`;
  - `GET {id}/file`: `File(stream, "application/json")` plus `Cache-Control: private, max-age=31536000, immutable` and `X-Content-Type-Options: nosniff`;
  - `PUT {id}`;
  - `DELETE {id}`: 204.
- [X] T016 [P] [US1] Add `backend/Roll6.Tests/Domain/Services/AnimationServiceTests.cs` (Moq for repositories and storage):
  - create stores and inserts; an invalid content stores nothing;
  - a failed insert deletes the stored file;
  - list passes the filters;
  - get of an unknown id → `KeyNotFoundException`;
  - rename and retype by the owner;
  - a non-owner → `UnauthorizedAccessException`;
  - retype from Idle while used in idle → `ConflictException`;
  - retype Attack → Run → allowed without a check;
  - delete while in use → `ConflictException`;
  - delete removes the row and the file.

  Also add `backend/Roll6.Tests/Domain/Models/AnimationTests.cs`: name limits, type range.

### Frontend

- [X] T017 [P] [US1] Create the entity scaffolding (`react-architecture`):
  - `frontend/src/types/animation.ts`: `AnimationInfo`, `AnimationInsertInfo`, `AnimationUpdateInfo`, `AnimationQuery`, and the `ANIMATION_TYPE` constants plus `AnimationType`;
  - `frontend/src/Services/animationService.ts`: a class with `handleResponse` → `handleApiResponse`; methods `list`, `get`, `getContent(id)` (text), `create`, `update`, `remove`.
- [X] T018 [US1] Create `frontend/src/Contexts/AnimationContext.tsx` and `frontend/src/hooks/useAnimation.ts`:
  - **State**: `mine`/`search` paged lists with filters, and `byType: Partial<Record<AnimationType, AnimationInfo[]>>` (up to 100 per type, own first), filled by `listForType(type)` on first use.
  - **Actions**: `upload` (refreshes Minhas and that type), `update` and `remove` (toast on 409 with the server message), `refreshType`.
  - **Logout**: everything is cleared.
  - Add `AnimationProvider` in `frontend/src/main.tsx` right after `TokenProvider`.
- [X] T019 [US1] Create `frontend/src/components/animations/`, using Bootstrap classes and `components/ui/Modal`, with icons only from `components/ui/icons.tsx` (add any missing Bootstrap Icon there):
  - **`AnimationList.tsx`**:
    - rows with name, type badge, duration as "1,2 s" and "repete"/"uma vez", plus the owner when `showOwner`;
    - actions: Copiar JSON (`getContent` → `lib/clipboard.copyToClipboard`, toast `animations.copied`), and pencil and trash when `own`;
    - type filter, search, pagination with 12 per page.
  - **`AnimationUploadForm.tsx`**:
    - fields: a file input (`.json,application/json`), name, and a type select over the seven types with the `animations.typeNote` hint;
    - on file choose: `parseAnimationText` with the byte length; the error is shown under the field; the name and type are pre-filled from `name`/`type` or the file name;
    - submit sends `{ name, type, content: file }`; server errors are shown on their field.
  - **`AnimationEditModal.tsx`**: name and type, calling `update`.
  - **`AnimationsModal.tsx`**: tabs Minhas, Buscar and Enviar; after a successful upload it switches to Minhas. Delete goes through `ConfirmModal` with `animations.confirmDelete`.
- [X] T020 [US1] Wire the entry point:
  - in `frontend/src/components/menu/UserMenu.tsx`, the item "Animações", via an `onAnimations` prop;
  - in `frontend/src/components/menu/TopMenu.tsx`, the state that opens `AnimationsModal`, like `ApiKeysModal`.

**Checkpoint**: US1 works on its own, with upload, list, edit and delete through the site.

---

## Phase 4: User Story 2 — Usar uma animação da biblioteca no token (Priority: P1)

**Goal**: the token's three selects offer the library animations of the state's type, the server enforces the type, and the preview and the 3D view play them.

**Independent Test**: quickstart US2.

### Backend

- [X] T021 [US2] Create the pure `backend/Roll6.Domain/Animations/AnimationStates.cs`:
  - `const string CHOICE_PREFIX = "animation:"`;
  - `long? ParseChoice(string? choice)`: a positive integer after the prefix, else null;
  - `AnimationType TypeFor(string field)`: `modelIdleClip` → Idle, `modelWalkClip` → Walk, `modelDownClip` → Defeated;
  - `AnimationType? StateTypeOf(...)` helpers for retype: which clip column a type feeds (Idle → idle, Walk → walk, Defeated → down, others → none);
  - `string StateLabel(field)` / `TypeLabel(type)` with the pt-BR labels for messages.

  T014 uses these helpers. If T014 runs first, it creates this file and T021 completes it.
- [X] T022 [US2] In `backend/Roll6.Domain/Validation/Guard.cs`, `ModelClip` also accepts `animation:{digits}` (via `AnimationStates.ParseChoice`). Update the error message to list `"animation:{id}"`.
- [X] T023 [US2] In `backend/Roll6.Domain/Services/TokenLibraryService.cs`, after `UpdateModel` on create and update:
  - collect the three choices that parse as `animation:{id}`;
  - load them with `IAnimationRepository.ListByIdsAsync` (add the repository to the constructor and to every test setup);
  - for each one, a missing id → `DomainValidationException(field, "Animação não encontrada.")`;
  - a type ≠ `TypeFor(field)` → `DomainValidationException(field, "Esta animação é do tipo {X}; o estado {S} aceita só animações do tipo {T}.")`.
- [X] T024 [P] [US2] Add tests:
  - `backend/Roll6.Tests/Domain/Animations/AnimationStatesTests.cs`: parse cases (`animation:12` → 12; `animation:0`, `animation:x` and `animation:` → null), `TypeFor`, the columns a type feeds;
  - `GuardTests`: `animation:5` accepted, `animation:abc` → 400;
  - in the existing `TokenLibraryService` tests:
    - the right type is stored;
    - the wrong type → 400 on that field;
    - an unknown id → 400;
    - no model → the choices are dropped without loading.

### Frontend

- [X] T025 [US2] Extend `frontend/src/lib/modelAnimations.ts`:
  - `CLIP_CHOICE_ANIMATION_PREFIX = 'animation:'` and `animationChoice(id)`;
  - `parseClipChoice` → `{ kind: 'animation', id }`;
  - `AnimationSource` gains `'library'`; `ResolvedAnimation` gains `{ source: 'library'; id }`;
  - `resolveAnimation(choice, names, bones, state, library?: ReadonlyMap<number, Roll6Clip | null>)`:
    - for a Mixamo skeleton with `library.get(id)` a clip → library;
    - for a `null` entry or an absent id → resolve as automatic;
    - for a non-Mixamo skeleton → static;
  - `resolvedSources` passes `library` through;
  - `STATE_ANIMATION_TYPE: Record<AnimationState, AnimationType>` (idle 1, walk 2, down 5);
  - `clipChoiceIds(choices): number[]`.
- [X] T026 [P] [US2] Create `frontend/src/lib/animationCache.ts`:
  - `loadAnimation(id, fetchText = animationService.getContent)`: `Promise<Roll6Clip | null>`, memoized per id; parse → validate → `toRoll6Clip(file, 'animation:' + id)`; any failure → null;
  - `loadAnimations(ids)` → `Map`;
  - `clearAnimationCache()`, called on logout from `AuthContext`'s logout path, the same place other per-session caches are cleared.

  Add `animationCache.test.ts` with an injected fetch: memoized, a failure gives null, invalid content gives null.
- [X] T027 [US2] Extend `frontend/src/components/story/threeClips.ts`:
  - `ModelClipBuilder = (choices, library?: ReadonlyMap<number, Roll6Clip | null>) => ModelClips`;
  - library clips are built like guard/death (`buildRoll6Clip` at full amplitude, plus `deformsAtFull`), cached per id in a second map;
  - the results cache key = `clipChoicesKey(choices)` + the ids that resolved;
  - `sources` may be `'library'`.

  Add cases to `threeClips.test.ts` with the existing synthetic rigs:
  - a library clip is built unfitted and only once;
  - an absent library entry falls back to automatic.
- [X] T028 [US2] Wire `frontend/src/components/story/modelLayer.ts`:
  - for each spec, the `clipChoiceIds(spec.clips)` not yet loaded are requested via `loadAnimations`;
  - entries keep `library: Map` and call the builder with it;
  - when the loads resolve and the entry is still present with the same choices, re-run `animate(entry)` with the 058 rules (lying → last frame without replay, else the current state).
- [X] T029 [US2] Wire `frontend/src/components/tokens/ModelPreview.tsx`: same loading as T028 for `clips`; rebuild the actions when the ids arrive, keeping the shown state, and report `onClips(sources, reduced, deforms)` as before.
- [X] T030 [US2] Extend `frontend/src/components/tokens/ModelField.tsx`. For each state select, when the skeleton is Mixamo:
  - add `<optgroup label={t('tokens.model.libraryGroup')}>` with `useAnimation().byType[STATE_ANIMATION_TYPE[state]]` (call `listForType` on mount): own animations first, others labelled "{nome} — {dono}", value `animationChoice(id)`;
  - if the current value is an `animation:{id}` that is not listed, add it with the name from `animationService.get(id)` ("Animação #id" while loading or on failure);
  - "Tocando:" for `library` reads `tokens.model.source.library` with the name.
  - In `frontend/src/lib/tokenForm.ts` and `frontend/src/hooks/useModelFile.ts` nothing changes beyond the type: the choices are already strings. Confirm this.
- [X] T031 [P] [US2] Add cases to `frontend/src/lib/modelAnimations.test.ts`:
  - parse `animation:7`;
  - resolve to library with a loaded map, to automatic with a null or missing entry, and to static on a non-Mixamo skeleton;
  - `clipChoiceIds`;
  - `STATE_ANIMATION_TYPE`.

**Checkpoint**: US1 + US2 make up the MVP. An uploaded animation plays on a token in the preview and at the table.

---

## Phase 5: User Story 3 — Assistente de IA envia animações pelo MCP (Priority: P2)

**Goal**: six MCP tools mirror the endpoints, the token tools explain `animation:{id}`, and the guide documents the format.

**Independent Test**: quickstart US3.

- [X] T032 [US3] Create `backend/Roll6.Mcp/Tools/AnimationTools.cs` (`[McpServerToolType]`) with the six tools of `contracts/api-mcp-ui.md`:
  - each with `[ApiOperation]`, annotations, the house `[Description]` template and described parameters;
  - `create_animation` accepts `content` as a `JsonElement`: an object is forwarded; a string is parsed first, and if it is invalid JSON it returns `isError` without calling the API;
  - `type` is the number 1–7 (the parity test passes sample integers; `enviar.py` maps names to it);
  - `get_animation_content` returns the JSON as text plus `structuredContent`.

  If needed, add `JsonElement`/string bodies to `Roll6ApiClient`, following the existing `PostJsonAsync`.
- [X] T033 [US3] Update the MCP texts:
  - `backend/Roll6.Mcp/McpDocs.cs` `MODEL_CLIP`: add `"animation:{id}"` (a library animation from `list_animations` whose type matches the state: idle ← 1 idle, walk ← 2 walk, down ← 5 defeated);
  - `backend/Roll6.Mcp/Tools/TokenTools.cs`: the shared token text mentions library animations;
  - `backend/Roll6.Mcp/Roll6Guide.cs`: new section "Animations" with the format, bones, axes and signs, limits, the full example of `contracts/animation-format.md`, the type table and the in-use rules.
- [X] T034 [US3] Update `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` counts to 108 operations and 109 tools. Run the parity and description tests and fix what they report, adding `FakeApi` routes if parity needs them.

**Checkpoint**: an assistant can create an animation, read it back and put it on a token.

---

## Phase 6: User Story 4 — Skill `criar-animacao` (Priority: P2)

**Goal**: the table project writes, validates and sends animations in exactly this format.

**Independent Test**: quickstart US4.

**Note**: work only inside `C:\repos\gurps-adventure\.claude\skills\criar-animacao\` and `C:\repos\gurps-adventure\animacoes\`. That repository has unrelated pending changes (`criar-personagem`, `roll6.py`, `campanha/CONTEXTO.md`); never edit, stage or commit them.

- [X] T035 [P] [US4] Create `C:\repos\gurps-adventure\.claude\skills\criar-animacao\scripts\validar.py`:
  - Python 3, standard library only, the same rules, limits, order, keys and pt-BR messages as T004/T005;
  - usage `python validar.py <arquivo.json> [...]`; prints `OK <arquivo> (1,4 s, uma vez, 13 ossos)` or `ERRO <arquivo> <chave>: <mensagem>`; exit code 1 on any error.

  Check it against the Roll6 fixtures: valid ones pass and every invalid one reports its expected key.
- [X] T036 [P] [US4] Create `C:\repos\gurps-adventure\.claude\skills\criar-animacao\scripts\enviar.py`:
  - imports the MCP client of `..\..\roll6\scripts\roll6.py` (`sys.path` insert; `cliente()`), without modifying that file;
  - validates with `validar.py`'s function, then calls `create_animation` with `name` (`--nome`, default the file's `name` or stem), `type` (`--tipo`, pt-BR names Parado/Andando/Correndo/Agachado/Derrotado/Atacando/Defendendo or English; default the file's `type`) and `content` (the object);
  - prints `animationId`, the name and the value to use on a token (`animation:{id}`), plus the reminder that only Parado/Andando/Derrotado appear on tokens for now.
- [X] T037 [US4] Create the examples in `C:\repos\gurps-adventure\.claude\skills\criar-animacao\exemplos\`:
  - copy the four `roll6-*.json` plus `aceno.json` from the Roll6 fixtures;
  - one hand-made example per remaining type: `correndo.json` (loop 0.7 s), `agachado.json` (lowering then holding with breath, loop), `atacando-machado.json` (overhead two-hand chop, once, 1.1 s), `defendendo-escudo.json` (left forearm raised across, loop).
  - All must pass `validar.py`.
- [X] T038 [US4] Write `C:\repos\gurps-adventure\.claude\skills\criar-animacao\SKILL.md` in the style of `criar-mascara/SKILL.md`:
  - **Frontmatter**: `name: criar-animacao`; a pt-BR description with triggers ("/criar-animacao", "criar animação para o token", "animação 3D do personagem", "animação no formato do Roll6").
  - **Body**:
    - what the format is, and that it is only for Mixamo skeletons;
    - the field table, axes and signs, the bones and the limits (from `contracts/animation-format.md`);
    - the type ↔ token state table and the Q2 note;
    - the method from a **description**: phases → times → degrees per bone, starting from the closest example; close the loop seam for repeating types;
    - the method from a **pose image**: read trunk/head/arm/forearm/thigh/shin directions → target angles → rest to pose in 0.4–0.8 s then hold, with a breath for loop types;
    - default `loop` per type;
    - always save to `animacoes/<slug>.json` and run `validar.py` until OK;
    - explain the motion; send with `enviar.py` only when asked;
    - a checklist of common mistakes (signs of knees/elbows, the arms start relaxed, degrees ≤ 360, times from 0).
- [X] T039 [US4] Create `C:\repos\gurps-adventure\animacoes\.gitkeep`. Exercise the skill once by description, generating `animacoes/aceno-duplo.json` with the method of T038, and run `validar.py` on it. Keep the file as a sample.

**Checkpoint**: the skill produces valid files, and they pass the Roll6 validators (the same fixtures).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T040 Update `CLAUDE.md`:
  - a bullet "Animation library (059)" in the backend layout: entity, routes, file route, `animation:{id}`, state ↔ type, in-use rules, MCP 108/109;
  - a frontend bullet: `AnimationsModal`, `AnimationContext`, `lib/animationFormat` mirror of `Domain/Animations/AnimationFormat` (change both, shared fixtures), `lib/animationCache`, the library optgroup;
  - an entry in "Recent Changes";
  - update the "102 operations / 103 tools" mentions where the text states the current count.
- [X] T041 Run `cd backend && dotnet build Roll6.sln && dotnet test` and `cd frontend && npm run lint && npm test && npm run build`. Fix any failure, including `src/i18n/keys.test.ts`.
- [X] T042 Check in the browser with a temporary test page, as in 057/058, removed afterwards, since there is no local database:
  - the upload form with a valid and an invalid fixture (validation messages);
  - `ModelPreview` playing `aceno.json` and `roll6-morte.json` as library clips on `orc-gordo.glb`, through an injected `library` map.
- [X] T043 Run the quickstart's automated block (both test suites, plus `validar.py` over the examples and the invalid fixtures). The manual table pass of the quickstart stays pending: there is no local database.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T008)** → user stories.
- **US1 (T009–T020)**: needs Foundational. T021 (`AnimationStates`) is used by T014 for retype; create it at T014 time if T021 hasn't run yet.
- **US2 (T021–T031)**: needs US1's entity, repository and frontend context (T009–T018). It is otherwise independent of the US1 UI (T019–T020).
- **US3 (T032–T034)**: needs the US1 controller (T015) and the US2 token rule (T022–T023) for the texts to be true.
- **US4 (T035–T039)**: needs only the format and fixtures (T001, T004/T005 for parity). It can run in parallel with US1–US3; the sending part (T036) is checked against the MCP of US3.
- **Polish (T040–T043)**: last.

### Within stories

- Model → repository → storage → service → controller (backend).
- types/service → context → components (frontend).
- Tests marked [P] next to the code they cover.

## Parallel Opportunities

- T002 ∥ T001; T003 ∥ T005; T007 ∥ T008.
- US1: T016 ∥ T017 once T014 exists; T019 after T018.
- US2: T024 ∥ T026 ∥ T031.
- US4 (T035–T039) ∥ US1–US3, in another repository.

## Implementation Strategy

1. **MVP** = Phases 1–4 (format, library, use on the token): this delivers the user-facing value.
2. Add US3 (MCP), then US4 (skill), which depends on the MCP to send.
3. Polish and the automated checks; the manual table pass stays pending as in the previous features.
