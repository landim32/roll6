# Hub contract: 069 (`/hubs/table`)

## Client → server: `Walk(info)`

```ts
connection.send('Walk', { mapTokenId: 812, x: 431.5, z: 288.2, yaw: 1.31, moving: true });
```

- Fire and forget (`send`, not `invoke`): no answer, and a refused walk is silently dropped.
- **Rate:** at most one every 100 ms while moving or turning, plus one with `moving: false` when the walker stops. The
  server does not enforce the rate in this version; the client does.
- **Server checks** (every one must pass, else the message is dropped):
  - the connection has joined a campaign (`TableConnections`);
  - the values are finite; `x`/`z` lie inside the map's pixel rectangle ± one hex;
  - `CanWalkAsync(userId, mapTokenId, campaignId)` is true, cached 10 s per connection and piece. It requires all of
    these:
    - the piece is on the campaign's current map;
    - the campaign is in free mode;
    - the piece is a Character piece of the caller's own approved character;
    - the piece is standing.

## Server → clients: `walk(message)`

Sent to **every other connection** of the campaign group (not the sender):

```ts
interface WalkMessage {
  campaignId: number;
  mapTokenId: number;
  userId: number;      // the walker
  x: number;           // map px
  z: number;           // map px (map y)
  yaw: number;         // radians, 0 = north, clockwise
  moving: boolean;
}
```

The client handles it as follows:

- It feeds `lib/remoteWalk` and draws the piece's figure or model at the interpolated pose, 100 ms behind.
- With `moving` it plays the walk animation; without it, it plays idle.
- It drops the track 1.5 s after the last message, and the piece falls back to its stored hex and facing.
- It ignores messages for pieces that are not on the open map.

The existing `tableEvent`, `notice` and `inbox` methods are unchanged.
