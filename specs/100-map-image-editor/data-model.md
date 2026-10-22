# Data Model: Editor de imagem no gerador (100)

All in the browser tab; nothing persisted.

## `GeneratorVersion` (existing, `lib/mapGeneratorState.ts`)

| Field | Change |
|---|---|
| `editedFrom` | **new** `number \| null` — the version this one was edited from (null for Codex/base versions). |

Reducer `edited(state, { url, base64, mediaType, from })` → appends `version = max + 1`, `requestId: null`,
`editedFrom: from`, selects it. `imageArrived`: a server number already used locally becomes `max + 1`.

## `EditOp` (`lib/imageEdit.ts`)

```ts
type EditOp =
  | { kind: 'brush'; color: string; size: number; opacity: number; points: Point[] }
  | { kind: 'clone'; size: number; opacity: number; points: Point[]; offset: Point }
  | { kind: 'crop'; rect: Rect }
  | { kind: 'rotate'; dir: 'cw' | 'ccw' }
  | { kind: 'flip'; axis: 'h' | 'v' };
```

Rules: `size` 1–200, `opacity` 0.05–1, crop rect inside the image and ≥ 64 × 64, points in image pixels of the canvas
at the time of the op (after previous crops/rotations).

## `EditHistory`

`{ ops: EditOp[]; cursor: number }` — `push(op)` drops ops past the cursor; `undo`/`redo` move the cursor; `MAX_UNDO`
= 50; `isEmpty` = cursor 0.
