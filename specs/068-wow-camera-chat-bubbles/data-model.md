# Data Model: 068

No server data changes. Everything below lives in the browser, in memory, except the layout, which already lives in
`roll6:layout`.

## OrbitState (`lib/orbitCamera`)

| Field | Type | Rules |
|---|---|---|
| `orbit` | number (rad) | Angle of the camera around the character, relative to its facing. 0 = straight behind, π = in front. Normalised to (−π, π]. |

- **Transitions**:
  - left drag: `orbit += dx × DRAG_TURN`;
  - start of a right drag: the character's yaw += orbit, then orbit = 0;
  - right drag: the character's yaw += dx × DRAG_TURN, and orbit stays 0;
  - walk input (forward ≠ 0 or turn ≠ 0, including both buttons): `orbit → 0` exponentially (τ = 0.12 s, snap below
    0.01 rad);
  - the piece moved by someone, the walk restarted, or "Voltar ao personagem": orbit = 0.
- **Derived**: `CameraPose = orbitPose(characterCenter, characterYaw, orbit, distance, blocked)`. `attached` stays true
  while orbiting.

## MouseCameraInput (`hooks/useStoryCamera`, refs)

| Field | Meaning |
|---|---|
| `mode` | `'orbit'` (left / one finger), `'steer'` (right), `'walk'` (left + right) or null, from `event.buttons` |
| `mouseWalk` | both buttons held, read by the tick as `forward += 1` |

## ChatBalloon (`lib/chatBubbles`)

| Field | Type | Source |
|---|---|---|
| `key` | `c:{characterId}` / `n:{mapNpcId}` | `turnStatus.pieceKey` of the chat item |
| `text` | string | `chatItems.copyableText(item)` (message/caption, action, roll) |
| `createdAt` | ms | `parseUtc(item.createdAt)` |
| `expiresAt` | ms | `createdAt + BALLOON_LIFETIME` (60 000) |
| `turnId` | number | the item, for stable ordering when two have the same time |

- **Eligible items**: not `deleted`. The kind is `text`, `image`/`audio` with a non-empty caption, `roll`, or `action`
  that is not `cancelled`. The item has a key (the master's own messages have none).
- **Per key**: only the newest eligible item (by `createdAt`, then `turnId`). If it has expired, the actor has no
  balloon: an older item never comes back.
- **Mapped to pieces** in `StoryView` like today: piece → `pieceKey(piece)` → balloon, only for `isShownIn3d` pieces.
  The `StoryBubble { id: mapTokenId, name, text }` is unchanged.

## Layout (unchanged storage)

`LAYOUT_MODE.split` keeps its value. Only its rendering depends on the width: ≥ 768 px = map left 70% / chat right
30%, < 768 px = map top 60% / chat bottom 40% (as today).
