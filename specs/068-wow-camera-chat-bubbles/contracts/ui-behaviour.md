# UI contract: 068

## 1. "Mapa e Chat" layout

| Width | Map region | Chat region |
|---|---|---|
| ≥ 768 px | left, `0 … 70%` of the width, full height (under the translucent menu, as today) | right, `70% … 100%`, from below the menu to the bottom (minus the keyboard offset), left border |
| < 768 px | top 60% of the space under the menu (unchanged) | bottom 40% (unchanged) |

- The map region contains the panels, the controls, the footer, the 3D canvas, the joystick and the balloons. Nothing
  of the map is drawn under the chat column.
- Crossing 768 px changes only CSS: no remount, so the composer text, the scroll position and the 3D scene stay.
- The "Mapa" and "Chat" layouts are unchanged.

## 2. Camera input map (3D view)

Legend: **Walk** = free mode with the own character standing (055). **Attached** = own piece, camera following it,
not free mode. **Free** = GM, no piece, or the camera let go with the keys.

| Input | Walk | Attached | Free |
|---|---|---|---|
| Left drag / one finger | orbit around the character (it does not turn) | orbit around the piece | turn sideways (as today) |
| Right drag | character faces the camera, then camera + character turn | orbit (same as left) | turn sideways |
| Left + right held | character walks forward (direction = camera, after folding the orbit) | — | — |
| W/S, ↑/↓, joystick vertical | walk forward/back, orbit eases back | let go → free camera (as today) | walk the camera |
| A/D, Q/E, ←/→, joystick horizontal | turn the character, orbit eases back | let go → free camera (as today) | strafe / turn |
| Wheel, +/−, pinch | camera distance 0.75–6 hex (as today) | field of view (as today) | field of view |
| Release the mouse/finger | orbit stays | orbit stays | — |
| Piece moved/turned by anyone, walk restarted | orbit = 0 | orbit = 0 | — |
| "Voltar ao personagem" | (not shown while walking, as today) | re-attach with orbit = 0 | re-attach with orbit = 0 |

- The camera never tilts. It never stands in a mask wall nor off the map. A wall between the character and the camera
  pulls the camera in front of the wall.
- The context menu never opens over the 3D canvas.
- Orbit return: from 180° to behind in ≤ 1 s, smooth (exponential).

## 3. Speech balloons in the 3D view

| | Free mode on | Free mode off |
|---|---|---|
| What shows | the actor's newest chat entry: text, photo/audio caption, roll ("5 + 3 + 6 = 14 — motivo"), valid action | last action of the turn in progress (as today) |
| Lifetime | until `createdAt + 60 s`, a newer entry replaces it, a deletion removes it | until the turn ends (as today) |
| Who | characters (and NPC instances acting) with a standing piece shown in 3D; never the master without a character | as today |
| Whispers | only for readers who receive the message (the server never sends it to others); a whispered action reads "está sussurrando!" as today | as today |

- The balloon looks the same as today: up to 3 lines, scaled by distance, kept on screen, under the head when there is
  no room above, gone behind walls and with its figure. It follows the figure every frame, including the local walk.
- Switching free mode off removes the chat balloons at once (the turn's action balloons come back).
- The 2D map is unchanged.
