# Data Model: Token 3D improvements (057)

**No schema change.** No new table, column, index or migration. The only persisted change is one more accepted value in two existing columns.

## Token (existing, `tokens`)

| Column | Type | Change |
|---|---|---|
| `model_idle_clip` | `varchar(260) null` | accepts the new value `roll6-guard` |
| `model_walk_clip` | `varchar(260) null` | accepts the new value `roll6-guard` |

Values of an animation choice (validated by `Guard.ModelClip`, mirrored by `lib/modelAnimations.parseClipChoice`):

| Value | Meaning |
|---|---|
| `null` / empty | automatic (056 rule) |
| `roll6` | Roll6's own animation of that state (idle or walk) |
| **`roll6-guard`** | **Roll6's guard stance ("Posição defensiva"), new in 057** |
| `none` | no animation |
| `clip:{name}` | the file's clip with that exact name |

Rules:

- Case-sensitive, exact match (`Roll6-Guard`, `guard` → 400 `modelIdleClip`/`modelWalkClip`).
- Dropped when the token has no model (unchanged from 056).
- `roll6-guard` on a skeleton without the Mixamo names resolves to no animation, like `roll6` (FR-016).

The token's `up_image`/`down_image` are unchanged: a generated photo becomes an ordinary uploaded image when the token is saved.

## Front-end state (not persisted)

### Preview playback (`ModelPreview` handle)

| Field | Type | Notes |
|---|---|---|
| `time` | number (s) | position in the playing action, `0 ≤ time < duration` |
| `duration` | number (s) | duration of the playing clip; 0 without a clip |
| `paused` | boolean | true while paused or scrubbing |
| `hasAnimation` | boolean | false = static state (timeline disabled, photo allowed) |

Transitions: *playing* → pause / start scrubbing → *paused*; *paused* → play → *playing* from `time`; any new action (state switch, new choice, new file) → *playing* at 0.

### Generated images (`TokenFormFields`)

| Field | Type | Notes |
|---|---|---|
| `generated.up` | `{ url, key } \| undefined` | object URL of the PNG for "Imagem em Pé"; `key` increments per generation |
| `generated.down` | `{ url, key } \| undefined` | same for "Imagem Caído" |

Revoked when replaced and when the form closes. Saving uploads the cropped result through the existing image path.

### Photo framing (`lib/poseShot`)

| Input | Output |
|---|---|
| posed model bounds (X/Z), target size `tokenImageSize(space)`, margin 4% | orthographic half-width/half-height, center, so the longer side fits and the model is centered; front (+Z) at the image bottom |

### Figure depth map (`raycastFrame` → `modelLayer`)

| Field | Type | Notes |
|---|---|---|
| `data` | `Float32Array` | `width × height`, row 0 = top; `0` = no figure, else the nearest covering figure's perpendicular depth |
| `width`, `height` | number | frame size (Padrão/Alta) or screen size (Ultra) = the model layer's buffer |
