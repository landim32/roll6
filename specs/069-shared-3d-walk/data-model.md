# Data Model: 069

No schema change. The stored position is the existing `map_tokens.x`, `map_tokens.y` and `map_tokens.look`.

## MapTokenPositionInfo (DTO, changed)

| Field | Type | Rules |
|---|---|---|
| `x`, `y` | int | Column and row (odd-q), as today |
| `look` | int? | 0–5; null keeps the current one |
| **`walk`** | bool? | **New.** `true` = a free-mode walk position. Allowed only in free mode, on the campaign's current map, for the caller's own approved and standing character piece, with the whole shape inside the grid. Other pieces are ignored (overlap allowed); no Deslocamento cost and no turn entry. Null/false = the "Mover" of today (occupied hex refused). |

Errors when `walk` is true:

| Case | Response |
|---|---|
| not in free mode | 409 "Só é possível andar no modo livre." |
| not the current map | 409 "Só é possível andar no mapa atual da campanha." |
| not the caller's approved character piece (the master included) | 403 "Você só pode andar com os seus personagens." |
| lying piece | 409 "Um personagem caído não anda." |
| outside the grid | 400 `x` |
| campaign not playable or not editable | 409, as today |

## WalkInfo (hub payload, new; not stored)

| Field | Type | Rules |
|---|---|---|
| `mapTokenId` | long | The walked piece |
| `x`, `z` | double | Exact position in map px (z = map y). Must be finite and inside the map's pixel rectangle ± 1 hex, else dropped |
| `yaw` | double | Radians, 0 = north, clockwise. Finite |
| `moving` | bool | true while walking or turning; false on the final message |

The server adds `userId` (the sender) to the relayed message. The relay is dropped silently, with no error to the
sender, when the connection is not in a campaign, or when `CanWalkAsync` is false: not free mode, not the current
map, not the sender's approved standing character piece, or a piece of another campaign.

## Walk permission cache (`TableConnections`, in memory)

Per connection: `(mapTokenId) → allowedUntil` (UTC). It is set after a successful `CanWalkAsync` and lasts **10 s**.
It is cleared when the connection leaves or switches campaign. A negative answer is not cached, so turning free mode
on takes effect at once.

## Overlap (computed)

`Occupancy.Overlaps()` returns the groups of piece ids that share at least one hex, considering every piece's whole
footprint (space by posture, facing). It is transitive per hex: three pieces on one hex form one group. Two distinct
hexes form separate groups, unless they share a piece, in which case the groups are merged.

`MapTokenService.ListOverlapsAsync(campaignId)` runs it on each non-deleted map of the campaign. It returns
`IReadOnlyList<IReadOnlyList<string>>`, the display names per group, ordered by map, then by the first hex.

## Remote walk track (frontend, `lib/remoteWalk`)

Per `mapTokenId`, the last samples (≤ 2 used for interpolation): `{ x, z, yaw, moving, at }`, where `at` is the local
receive time in ms.

- `remotePose(track, now)` returns the interpolated `{ x, z, yaw, moving }` at `now − RENDER_DELAY` (100 ms), or null
  when the newest sample is older than `STALE_AFTER` (1500 ms). Yaw is interpolated along the shortest arc.

## Walk sync state (frontend, `lib/walkSync` + `hooks/useWalkSync`)

- `lastSent`: the `{ x, y, look }` of the last REST walk target this tab sent. An incoming piece equal to it is the
  tab's own echo and does not restart the walk.
- `pending`: the latest target not yet written (latest wins), with one request in flight at most.
- `lastHubAt`: the time of the last hub send; the next one is sent no earlier than 100 ms later, except the final
  `moving: false`.
