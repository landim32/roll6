# Quickstart: Painel de NPCs só com os NPCs do mapa (076)

Pre-requisites:
- A campaign that is Ativa.
- Map A with 13 NPC pieces (enemies/neutrals).
- Map B with 7 NPC pieces.
- One ally with no piece on either map.
- A player with an approved character.

1. **Scene filter.** Make A the current map. Master and player see 13 cards in the NPC panel, and the title says 13.
   The ally shows on the party side.
2. **Switching.** "Tornar atual" on B. The player's screen goes to B and the panel shows 7, without reloading. Back to
   A: 13. The ally is there the whole time.
3. **Master preparing.** As the master, open map B without making it current. The master's panel shows B's 7, and the
   player's still shows A's 13.
4. **Pieces.**
   - On A, put a piece of an NPC that only had a piece on B ("Incluir NPC" → "Meus NPCs" → that NPC): its card
     appears for everyone.
   - "Retirar do mapa" on that piece: the card disappears, and the NPC is still in Configurações › NPCs.
5. **Instances.** An NPC with "Guarda" and "Guarda 2" on A shows one card with two rows. Removing one keeps the card.
6. **New NPC.** "Incluir NPC" → "Novo NPC" with A open. The NPC joins the campaign with a piece near the middle of A,
   and its card appears. Fill every hex of a small test map and repeat: it joins the campaign with the "não houve lugar
   no mapa" warning.
7. **Allies.**
   - Change the ally's category to Neutro: it leaves the party side, and appears in the panel only on maps where it
     has a piece.
   - Back to Aliado: it shows on every map.
   - "Retirar da campanha": it disappears on every map.
