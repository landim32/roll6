# Data Model: Token 3D — posição defensiva visível e animação de morte (058)

## Token (existing, `tokens`)

| Column | Type | Change |
|---|---|---|
| `model_down_clip` | `varchar(260) null` | **new** — the animation played when the piece is down or out of combat |
| `model_idle_clip`, `model_walk_clip` | `varchar(260) null` | unchanged |

Migration `AddTokenModelDownClip` + `database/migrations/058-token-model-down-clip.sql` (idempotent `ALTER TABLE tokens ADD COLUMN IF NOT EXISTS model_down_clip varchar(260) NULL` + `__EFMigrationsHistory` row), `database/roll6.sql` regenerated. No backfill: null = automatic.

**Values** (`Guard.ModelClip(value, "modelDownClip")`, same as the siblings):

| Value | In the down state |
|---|---|
| `null` / empty | automatic: file clip named like death → Roll6's death (Mixamo) → none (tipped model) |
| `roll6` | Roll6's death ("Morte (Roll6)") |
| `roll6-guard` | accepted by the validator, not offered by the form; resolves to the guard stance |
| `none` | no animation → the tipped model |
| `clip:{name}` | that clip of the file, played once; a missing name falls back to automatic |

**Rules**:
- `Token.UpdateModel(modelFile, idleClip, walkClip, downClip)` drops all three choices when there is no model.
- `PUT` without `modelDownClip` = automatic. The PUT replaces every field, as for the siblings.

**DTOs**: `TokenInsertInfo.modelDownClip`, `TokenInfo.modelDownClip`, `MapTokenInfo.modelDownClip` (`[JsonPropertyName("modelDownClip")]`).

## Map piece (unchanged)

`posture` (031) now also decides how a piece with a model is drawn in 3D:

| Posture | Figure / balloon / proxy (`isShownIn3d`) | Model (`isModelShownIn3d`) |
|---|---|---|
| Em pé | as today | standing: idle, or walk for the walker |
| Caído | none (as today) | **lying**: last frame of the death, or the tipped model |
| Fora de combate | none (as today) | **lying**, same as Caído, in color |

## Front-end state (not persisted)

### Animation states (`lib/modelAnimations`)

`AnimationState = 'idle' | 'walk' | 'down'`; `ModelClipChoices = { idle, walk, down }`; `AUTO_CLIPS` has all three null; `clipChoicesKey`/`sameClipChoices` include `down`.

`ResolvedAnimation` roll6 clip: `'idle' | 'walk' | 'guard' | 'death'`; the state `down` with `roll6` (or automatic on a Mixamo skeleton without a death clip) → `'death'`.

### Roll6 clip (`lib/roll6Clips`)

| Field | Type | Notes |
|---|---|---|
| `name` | `'idle' \| 'walk' \| 'guard' \| 'death'` | |
| `loop` | boolean | false only for `death`; looping clips keep "first key = last key" |
| `protect` | boolean | true = fitted to the rig (`fitToRig`); false = full amplitude (guard, death) |
| `hipsLift.of` | `'height' \| 'hips'` (default `'height'`) | `'hips'` = share of the hips' rest height above the lowest point |

### Model layer entry (`modelLayer`)

| Field | Notes |
|---|---|
| `spec.lying` | from the piece's posture |
| `down` | the death action (`LoopOnce`, clamped) or null |
| state transitions | see research R5: load lying → last frame; standing → lying → play once; lying ↔ lying → nothing; lying → standing → idle |

### `ModelClips` (`threeClips`)

`{ idle, walk, down, sources: Record<AnimationState, AnimationSource>, reduced, deforms }`.

### Preview (`ModelPreview`)

The `shown: AnimationState` prop replaces `walking`. `playback()` is unchanged in shape; a finished death reports `paused: true` at `time = duration`.
