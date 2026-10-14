# Contract: the `roll6-animation` file format, version 1

A UTF-8 JSON object of at most 1 MB. It moves the bones of a **Mixamo-named skeleton** on top of the model's rest pose. This is the format of Roll6's own animations (respiração, caminhada, posição defensiva, morte).

## Example (a 1 s loop: the right arm waves)

```json
{
  "format": "roll6-animation",
  "version": 1,
  "name": "Aceno",
  "type": "idle",
  "description": "Acena com a mão direita acima da cabeça.",
  "duration": 1,
  "loop": true,
  "tracks": [
    { "bone": "RightArm",     "times": [0, 0.5, 1], "degrees": [[0, 0, -150], [0, 0, -150], [0, 0, -150]] },
    { "bone": "RightForeArm", "times": [0, 0.25, 0.5, 0.75, 1], "degrees": [[0, 0, 0], [0, 0, 30], [0, 0, 0], [0, 0, -30], [0, 0, 0]] },
    { "bone": "Spine",        "times": [0, 0.5, 1], "degrees": [[0, 0, -3], [0, 0, -5], [0, 0, -3]] }
  ],
  "hipsLift": { "times": [0, 0.5, 1], "values": [0, 0.003, 0], "of": "height" }
}
```

## Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `format` | string | yes | exactly `"roll6-animation"` |
| `version` | number | yes | exactly `1` |
| `name` | string | no | suggestion for the upload form (≤ 100 characters, longer values are cut) |
| `type` | string | no | suggestion: `idle`, `walk`, `run`, `crouch`, `defeated`, `attack` or `defend` (unknown values are ignored) |
| `description` | string | no | free text, ignored by the server |
| `duration` | number | yes | 0 < d ≤ 30 seconds |
| `loop` | boolean | yes | `true` = cycle (recommended: first key = last key); `false` = played once, resting on the last frame |
| `tracks` | array | yes | 1–64 tracks, each bone at most once |
| `tracks[i].bone` | string | yes | one of the accepted bones (below), without the `mixamorig:` prefix |
| `tracks[i].times` | number[] | yes | 1–600 values, first `0`, strictly ascending, last ≤ `duration` |
| `tracks[i].degrees` | [x, y, z][] | yes | one triple per time, each \|value\| ≤ 360 |
| `hipsLift` | object | no | vertical motion of the hips |
| `hipsLift.times` | number[] | with `hipsLift` | same rules as a track's `times` |
| `hipsLift.values` | number[] | with `hipsLift` | one per time, \|value\| ≤ 2 |
| `hipsLift.of` | string | no | `"height"` (default: share of the model's height) or `"hips"` (share of the hips' rest height above the lowest point, for motions that end on the floor) |

Any other field is ignored.

## Axes and signs (the character's frame)

The axes are those of the character: +X its **left**, +Y **up**, +Z **forward**. Degrees are applied about X, then Y, then Z, at the bone, on top of its rest pose.

| Turn | Effect |
|---|---|
| +X | a hanging limb goes **back** (its end goes to −Z); a negative X raises an arm forward, bends a thigh forward |
| +Y | the front turns to the character's **left** |
| +Z | the left side (+X) goes **up**: +Z on `LeftArm` raises the left arm to the side, −Z on `RightArm` raises the right arm |
| Hips X −90 | lies on the back (with `hipsLift.of = "hips"` going to ≈ −0.8) |

Knees (`LeftLeg`/`RightLeg`) bend with **positive** X. Elbows (`*ForeArm`) bend with **negative** X.

The arms first hang relaxed, a little away from the body, whatever T or A pose the rig rests in. Degrees on `LeftArm`/`RightArm` start from that relaxed arm.

## Accepted bones (52)

- **Body**: `Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`, then for `Left` and `Right`: `Shoulder`, `Arm`, `ForeArm`, `Hand`, `UpLeg`, `Leg`, `Foot`, `ToeBase`.
- **Fingers**: for `Left` and `Right`: `HandThumb1–3`, `HandIndex1–3`, `HandMiddle1–3`, `HandRing1–3`, `HandPinky1–3`.

A bone the model does not have is skipped.

## Errors (same keys on the server, the site, the MCP and the skill's `validar.py`)

| Problem | Key |
|---|---|
| not JSON / not an object / larger than 1 MB | `content` |
| wrong `format` / `version` | `content.format` / `content.version` |
| bad `duration` | `content.duration` |
| `loop` missing or not boolean | `content.loop` |
| `tracks` missing, empty, more than 64 | `content.tracks` |
| unknown or repeated bone | `content.tracks[i].bone` |
| bad `times` | `content.tracks[i].times` |
| bad `degrees` | `content.tracks[i].degrees` |
| bad `hipsLift` | `content.hipsLift.times` / `.values` / `.of` |

The first error found is reported. Order: top-level fields, tracks in order, then `hipsLift`.
