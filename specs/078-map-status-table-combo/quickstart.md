# Quickstart: Status do mapa na campanha e o combo de mesas (078)

Pre-requisites:
- User M masters campaign X (Ativa), which has maps A (current), B (active) and C (archived).
- M also masters campaign Y (Pausada).
- User M also plays in campaign Z (Ativa, current map Z1), mastered by someone else.
- User P plays in X.

1. **Migration.** After the deploy, Configurações › Mapas of X shows A "Atual", B "Ativo" and C "Arquivado". Players are
   still on A.
2. **Master's combo.**
   - M opens the combo and sees X with A (marked Atual) and B under it, and Z with only Z1.
   - Y and C are not shown.
   - Choosing B opens B for M only. P stays on A, and A is still Atual.
3. **Tornar atual.** M uses "Tornar atual" on B.
   - B becomes Atual and A becomes Ativo.
   - P is taken to B within seconds.
   - P's combo now shows X with B.
4. **Player's combo.** P sees X with only its current map and cannot pick another map. M pauses X: X leaves P's combo.
   M reactivates it: X comes back.
5. **Archiving.**
   - Archiving B (current) is refused with "Torne outro mapa atual antes de arquivar este.".
   - Archiving A (active) works, and A leaves the master's combo.
6. **MCP.**
   - `list_campaign_maps` shows status 4 on the current map.
   - `update_map` with status 4 gets 400.
   - `set_current_map` swaps the statuses.
   - `list_my_table_campaigns` brings `maps` only for X and Y.
