# Implementation Plan: Biblioteca de animações dos tokens 3D

**Branch**: `059-token-animation-library` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/059-token-animation-library/spec.md`

## Summary

Roll6's own animations (055–058) are keyframe data in `lib/roll6Clips.ts`. This feature turns that data into a **documented JSON file format** (`roll6-animation`, version 1) and adds a **shared library of animations** that users upload, choose for their tokens and create through the MCP or the new `criar-animacao` skill of the table project.

1. **Format** ([contracts/animation-format.md](contracts/animation-format.md)): `{ format, version, duration, loop, tracks[{ bone, times, degrees }], hipsLift? }`.
   - It has exactly the fields of `Roll6Clip`, minus `name` and `protect`.
   - Uploaded clips always play in full (`protect: false`, like the guard and the death).
   - Validation is mirrored in three places, all following the same rules and limits:
     - C#: `Domain/Animations/AnimationFormat`;
     - TypeScript: `lib/animationFormat`;
     - Python: the skill's `validar.py`.
   - The four Roll6 clips, exported to the format, are the shared reference cases.
2. **Entity `Animation`** (`animations` table): name ≤ 100, owner `user_id`, `animation_type` 1–7, `file_name` `{guid}.json`, `duration`, `loop`, timestamps.
   - The file goes to the bucket like images and models (`{S3:Folder}/{guid}.json`), stored byte for byte as validated.
   - The "Url do arquivo" is the API route `GET /api/animation/{id}/file`, not a stored URL. Presigned URLs expire and the bucket sends no CORS headers (same as models).
   - CRUD lives at `/api/animation`, shared like tokens (Q1 = A):
     - Any logged user lists and reads, with `mine=true`, `type` and `search` filters.
     - Only the owner renames, retypes or deletes.
     - Delete is refused (409) while a token uses the animation.
     - Retype is refused (409) while a token uses it in the state the old type feeds.
   - **Upload is one JSON request** (`POST /api/animation { name, type, content }`), not multipart. The site reads the chosen `.json` file and sends its text, and the MCP sends the same body, so there is a single path and a single validator.
3. **Token choice**: the existing clip columns (`model_idle_clip`/`model_walk_clip`/`model_down_clip`) accept a new value `animation:{id}`. No schema change on `tokens`.
   - `Guard.ModelClip` accepts the syntax.
   - `TokenLibraryService` loads the referenced animations and checks the **state ↔ type** rule (Q2). The field key is `modelIdleClip`/`modelWalkClip`/`modelDownClip` and the message names the expected type:

     | State | Type |
     |---|---|
     | idle | Parado (1) |
     | walk | Andando (2) |
     | down | Derrotado (5) |

   - `MapTokenInfo`/`TokenInfo` keep carrying the choice string. The client resolves `animation:{id}` by fetching the file.
4. **Frontend**:
   - Entity scaffolding through `react-architecture`: `types/animation.ts`, `Services/animationService.ts`, `Contexts/AnimationContext.tsx`, `hooks/useAnimation.ts`.
   - `lib/animationFormat` (parse + validate + `toRoll6Clip`) and `lib/animationCache` (fetch once per id, shared by the preview and the 3D view).
   - `modelAnimations`: `parseClipChoice` gains `{ kind: 'animation', id }` and `resolveAnimation` returns `{ source: 'library', id }` for a Mixamo skeleton, or static otherwise. An unknown or failed id falls back to automatic.
   - `threeClips.createClipBuilder` takes the loaded library clips (`Map<id, Roll6Clip>`) and builds them like the guard: full amplitude, deformation tested once per id.
   - `modelLayer` and `ModelPreview` load the referenced ids before building and rebuild when they arrive.
   - UI:
     - "Animações" in `UserMenu` opens `components/animations/AnimationsModal`, with three tabs: Minhas, Buscar and Enviar (file + name + type, client validation with the server's messages).
     - The three selects of `ModelField` get an optgroup "Biblioteca" with the animations of the state's type, own first.
5. **MCP**: `AnimationTools` with six tools, one per endpoint (102 → 108 operations, 103 → 109 tools). `modelIdleClip`/`modelWalkClip`/`modelDownClip` text mentions `animation:{id}`, and the guide gets an "Animations" section with a full example.
   - `create_animation` (`content` is the JSON object or its text);
   - `list_animations`;
   - `get_animation`;
   - `get_animation_content`;
   - `update_animation`;
   - `delete_animation`.
6. **Skill `criar-animacao`** in `C:\repos\gurps-adventure\.claude\skills\criar-animacao\`:
   - `SKILL.md`: format, bones, axes and signs, limits, method for a description or a pose image, and the type ↔ state table;
   - `scripts/validar.py`: same rules as the server;
   - `scripts/enviar.py`: reuses `roll6.py`'s MCP client, calls `create_animation`, and touches nothing pending in that repo;
   - `exemplos/`: one per type, plus the four Roll6 clips.
   - Generated files go to `animacoes/` in that repo.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend); Python 3 (skill scripts in the other repo)
**Primary Dependencies**: existing only.
- Backend: ASP.NET Core 8, EF Core 9 + Npgsql, AWSSDK.S3, `System.Text.Json`, `ModelContextProtocol.AspNetCore` 2.x.
- Frontend: React 18, Vite 6, Bootstrap 5.3, i18next, sonner, Radix Dialog/Dropdown, `three` 0.186.1.
- Skill: Python standard library only (`json`, `argparse`).
- **No new dependency.**

**Storage**:
- PostgreSQL: new table `animations` (FK `fk_animation_user` → `users`, `ClientSetNull`; index `ix_animations_user`, `ix_animations_type`). Migration `AddAnimations` + `database/migrations/059-animations.sql`; `database/roll6.sql` regenerated.
- Files: the existing bucket, `{S3:Folder}/{guid}.json`, content type `application/json`.
- The `tokens` clip columns keep their type and only accept a new value.

**Testing**:
- xUnit:
  - `AnimationFormatTests`: every rule, plus the four Roll6 clips as fixtures.
  - `AnimationServiceTests`: create, list filters, owner checks, delete/retype refused while in use.
  - `TokenLibraryService`: state ↔ type rule, unknown id → 400.
  - `GuardTests`: `animation:{id}`.
  - MCP coverage, parity and description tests with the new counts.
- Vitest:
  - `animationFormat`: same cases as C#, plus a round trip of the four Roll6 clips (`toRoll6Clip(export(clip))` deep-equals the clip minus `protect`).
  - `modelAnimations`: library choice parse/resolve/options by type.
  - `threeClips`: library clips built at full amplitude, once per id.
  - i18n keys.
- Python: `validar.py` run on every file of `exemplos/` (all pass) and on broken samples (all fail with the same field names).

**Target Platform**: browsers/PWA with WebGL; MCP clients; Claude Code in `gurps-adventure`.
**Project Type**: web application, plus a skill in a sibling repository.

**Performance Goals**:
- SC-006: a library clip is built once per model and id, like the guard.
- The file (≤ 1 MB, typically < 20 KB) is fetched once per id per session (`animationCache`) and cached by the browser, since the route is immutable.

**Constraints**:
- The raycaster is untouched.
- Tokens without library choices behave exactly as today (SC-005).
- Animations of the four non-state types are stored but not offered (Q2).
- No grid, posture or turn rule changes.

**Scale/Scope**:
- Backend: ~20 files (entity, enum, repository, service, controller, DTOs, format validator, token rule, MCP tools/docs, tests) plus the migration.
- Frontend: ~15 files (scaffold, format, cache, modal, `ModelField`, `ModelPreview`, `modelLayer`, `threeClips`, `modelAnimations`, `UserMenu`/`TopMenu`, texts).
- Skill: 1 `SKILL.md`, 2 scripts, ~11 examples.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Architecture skills | New entity `Animation` → backend built with `dotnet-architecture` (entity, repository, service, DTOs, controller, DI in `Startup.cs`), frontend with `react-architecture` (types/service/context/hook/provider). | ✅ |
| II. Fixed stack | No new dependency. Bootstrap modal/tabs, Context API, Fetch service, no Docker. The skill uses only the Python standard library. | ✅ |
| III. Directory casing | `Contexts/AnimationContext.tsx`, `Services/animationService.ts`, `hooks/useAnimation.ts`, `types/animation.ts`. | ✅ |
| IV. Code conventions | `interface` types, constants not enums (`ANIMATION_TYPE`), `[JsonPropertyName]` camelCase, `ProblemDetails` errors, texts in `pt-BR.json`. | ✅ |
| V. Database | EF Core migration, snake_case `animations`, FK to `users` with `ClientSetNull`. The token → animation link is a choice string (like `clip:{name}`), not an FK; integrity is kept by the service (in-use checks), in the same way as the existing file-name columns. | ✅ |
| VI. Auth & security | `[Authorize]` on the controller, owner checks in the service. The file route is `[Authorize]` (as for models). Content is validated JSON served as `application/json` with `X-Content-Type-Options: nosniff`, so it is never executed or rendered as HTML. | ✅ |
| VII. Hex grid | Not involved. | ✅ |

**Post-design re-check (after Phase 1)**: unchanged ✅

## Project Structure

### Documentation (this feature)

```text
specs/059-token-animation-library/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── animation-format.md
│   └── api-mcp-ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code

```text
backend/
├── Roll6.Domain/Enums/AnimationType.cs                      # 1 Idle … 7 Defend
├── Roll6.Domain/Models/Animation.cs                         # Create/Rename/Retype, rules
├── Roll6.Domain/Animations/AnimationFormat.cs               # parse + validate (pure), bone list, limits
├── Roll6.Domain/Animations/AnimationStates.cs               # state ↔ type, "animation:{id}" parsing
├── Roll6.Domain/Interfaces/IAnimationService.cs
├── Roll6.Domain/Services/AnimationService.cs
├── Roll6.Domain/Services/TokenLibraryService.cs             # state ↔ type check on create/update
├── Roll6.Domain/Validation/Guard.cs                         # ModelClip accepts animation:{id}; AnimationFileName
├── Roll6.Domain/Interfaces/IImageService.cs + ImageService  # Store/Open animation file (json)
├── Roll6.Infra.Interfaces/Repository/IAnimationRepository.cs
├── Roll6.Infra.Interfaces/Repository/ITokenRepository.cs    # AnyUsesClipAsync(choice, columns)
├── Roll6.Infra/Repository/AnimationRepository.cs, TokenRepository.cs
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/*_AddAnimations.cs
├── Roll6.DTO/Animation/{AnimationInfo,AnimationInsertInfo,AnimationUpdateInfo,AnimationQuery}.cs
├── Roll6.API/Controllers/AnimationController.cs
├── Roll6.Application/Startup.cs                             # DI
├── Roll6.Mcp/Tools/AnimationTools.cs, McpDocs.cs, Roll6Guide.cs, Tools/TokenTools.cs
└── Roll6.Tests/…                                            # see Testing
database/migrations/059-animations.sql, database/roll6.sql

frontend/src/
├── types/animation.ts
├── Services/animationService.ts
├── Contexts/AnimationContext.tsx  (+ provider in main.tsx after TokenProvider)
├── hooks/useAnimation.ts
├── lib/animationFormat.ts (+ test)      # mirror of AnimationFormat, toRoll6Clip, fromRoll6Clip
├── lib/animationCache.ts (+ test)       # id → Promise<Roll6Clip | null>
├── lib/modelAnimations.ts (+ test)      # 'animation' choice, 'library' source, options by type
├── lib/roll6Clips.ts                    # Roll6Clip.name widened (string) for library clips
├── components/story/threeClips.ts (+ test)  # library clips in the builder
├── components/story/modelLayer.ts       # load ids, rebuild
├── components/tokens/ModelPreview.tsx, ModelField.tsx
├── components/animations/AnimationsModal.tsx, AnimationList.tsx, AnimationUploadForm.tsx, AnimationEditModal.tsx
├── components/menu/UserMenu.tsx, TopMenu.tsx
└── i18n/locales/pt-BR.json

C:\repos\gurps-adventure\
├── .claude/skills/criar-animacao/SKILL.md
├── .claude/skills/criar-animacao/scripts/validar.py, enviar.py
├── .claude/skills/criar-animacao/exemplos/*.json
└── animacoes/                           # where generated files are saved
```

**Structure Decision**: the existing web-application layout. The format validator lives in `Domain/Animations` (pure, like `Domain/Turns/TurnSummary`) and is mirrored in `lib/`, as the hex math is.

## Phase notes

- **Phase 0** → [research.md](research.md):
  - R1: format and its relation to `Roll6Clip`;
  - R2: validation rules and limits;
  - R3: bone list;
  - R4: JSON upload instead of multipart;
  - R5: storage and the file route;
  - R6: token choice as `animation:{id}`;
  - R7: state ↔ type and the in-use rules;
  - R8: client loading and building;
  - R9: UI placement;
  - R10: MCP;
  - R11: the skill (description vs image, sending);
  - R12: tests.
- **Phase 1** → [data-model.md](data-model.md), [contracts/animation-format.md](contracts/animation-format.md), [contracts/api-mcp-ui.md](contracts/api-mcp-ui.md), [quickstart.md](quickstart.md).

## Complexity Tracking

No constitution violations.
