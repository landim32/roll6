# Quickstart: verify 069

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd ../frontend && npm test -- remoteWalk walkSync walker && npm run lint && npm run build
```

Manual check with three sessions on the same campaign. The campaign's current map has pieces for A and B. The 2D map
runs in a third window:

- **M**: the master.
- **A**, **B**: players with approved characters, standing, with a 2,5D front image or a 3D model.

1. M turns free mode on. A and B open the 3D.
2. A walks with W/the joystick:
   - B sees A's figure move smoothly, with the walk animation;
   - it stops when A stops, at the same spot;
   - B's balloon of A (068) follows.
3. M watches the 2D: A's piece changes hex and facing as A walks (≤ 1 s behind). After reloading, the piece is where A
   stopped.
4. A walks into B's figure, passes through and stops on B's hex. A still cannot cross a mask wall or leave the map.
5. M turns free mode off. The toast reads "Não é possível sair do modo livre: <A> e <B> estão no mesmo hex." and the
   switch stays on.
6. M uses "Mover" in the 2D to put B on a free hex. Moving onto an occupied hex is refused, as before. M turns free
   mode off, and it switches off.
7. With free mode off, A's 3D walk is gone (as before, 055). No turn entry was written by the walks (check the chat).
8. Two tabs of A: both follow the piece, and the newest walk wins.
9. Disconnect A's network mid-walk: on B's screen A stops about 1.5 s later at A's last stored hex.
10. API: `PUT /api/maptoken/{id}/position` with `walk: true` returns 409 outside free mode, 403 for the master or
    another player's piece, and 409 for a lying piece.
