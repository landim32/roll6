# Quickstart: verify 068

Setup: `cd frontend && npm run dev` with the API on `VITE_API_PROXY`. Prepare two browsers (or one normal window and
one private window):

- **A** = a player with an approved character that has a standing piece with a 2,5D front image or a 3D model on the
  campaign's current map.
- **B** = the master, or a second player in the same campaign.

```bash
cd frontend
npm test -- orbitCamera chatBubbles storyCamera walker storyBubbles
npm run lint
npm run build
```

## 1. Layout (US1)

1. In a desktop window (≥ 1024 px wide), choose the layout "Mapa e Chat". The chat is a column on the right, about 30%
   of the width, and the map is on the left.
2. Open the party and NPC panels and the 3D view, and press "centralizar". Everything stays inside the left part.
3. Type something in the composer, then shrink the window under 768 px. The map goes on top and the chat below, and the
   text is still in the field. Widen it again and the columns come back.
4. In the phone emulator (DevTools, 390 × 844), "Mapa e Chat" looks exactly as before.

## 2. Camera (US2)

1. Free mode on (master's "Livre" switch). A opens the 3D view.
2. Left drag sideways: the camera circles A's character, which keeps facing the same way. Go round until the face shows
   (≤ 3 s). Release: the camera stays.
3. Press W: within 1 s the camera is back behind and follows the walk.
4. Right drag: the character turns with the camera. Then W walks where the camera looks.
5. Hold left + right: the character walks forward. Release one: it stops.
6. Orbit with a wall behind the character: the camera comes close instead of passing the wall.
7. Wheel: closer or farther. Right click never opens the browser menu.
8. Free mode off: left drag orbits around A's piece. W lets go (free camera). "Voltar ao personagem" puts it behind.
9. B as the master without a character: the 3D camera is the free camera, as before.
10. Phone emulator, free mode: one-finger drag orbits, the joystick walks and the camera returns behind.

## 3. Chat balloons (US3)

1. Free mode on, A and B in the 3D view.
2. A sends "Olá": B (and A) see a balloon "Olá" over A's character.
3. A walks (local): on A's screen the balloon stays over the head while walking.
4. A sends a roll with the reason "ataque". The balloon becomes "5 + 3 + 6 = 14 — ataque" (whatever was rolled).
5. Wait 60 s from the send: the balloon disappears on both screens (±1 s).
6. A sends a photo without a caption: no balloon. With the caption "olha": balloon "olha".
7. A whispers to the master only. The master sees the balloon and a third player does not.
8. A deletes a message whose balloon is showing: it disappears.
9. Free mode off: chat messages make no balloon, and actions show as before.
10. B opens the 3D 30 s after a message: the balloon shows for the remaining ~30 s.
