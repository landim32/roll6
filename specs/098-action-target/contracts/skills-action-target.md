# Contract: the target in the table skills (098, `c:\repos\gurps-adventure`, files only)

## `processar-turno/scripts/processar_turno.py`

`montar(...)` reads `entry.get("target")` of each `turnType == 2` entry (from `get_turn_state.entries` or
`list_turn_entries`) and keeps, per character and NPC:

```python
"acoes": [{"texto": "Ataco com a espada", "alvo": {
    "xy": [9, 7], "hex": "J8",            # hex = roll6.xy_para_rotulo(x, y, desloc) — the table's own label
    "distancia": 3, "mapTokenId": 133, "tipo": "npc", "lado": "inimigo", "nome": "Goblin guerreiro",
    "characterId": None, "mapNpcId": 41, "frente": "Sudeste", "postura": "Caído", "status": "atordoado",
    "pv": [5, 12], "fadiga": [3, 10]}}]
```

`alvo` is `None` for an action without target; an empty hex has `mapTokenId: None` and only `xy`/`hex`/`distancia`.
`imprimir` writes:

```text
    AÇÃO: Ataco com a espada
      → sobre Goblin guerreiro (inimigo, NPC) em J8 (9,7), a 3 hexes, olhando Sudeste, Caído, PV 5/12, Fadiga 3/10, status: atordoado
    AÇÃO: Corro até a porta
      → sobre o hex M5 (12,4), a 5 hexes
```

`--json` carries the objects above. Readers of `acoes` (`gm.py`, the SKILL texts) are updated with it. Nothing else
of the script changes; `--so-mcp` behaves the same (the target comes from the Roll6 either way).

## `processar-turno/SKILL.md` — "## Alvo da ação (098)"

- The pointed piece **is** the adversary/beneficiary of the declaration — by `mapTokenId`/`mapNpcId`/`characterId`,
  never by name (two "Goblin" on the map: the pointed one).
- `distancia` is the range: reach, ranged-attack penalties (`calcular-alcance` from the actor's valid position after
  `validar-movimento`; the distance recorded is from where the player stood when declaring — recompute if the
  movement validation moved the piece back).
- An empty hex is the destination or the aimed point of the maneuver (a move, a shot at a spot, an observation).
- A target that is no longer where the snapshot says (moved, removed, down) is narrated as such; the snapshot tells
  what the player saw.
- Without `alvo` the declaration is read as before (the text alone).

## `gm/SKILL.md`

The resolution section (§5) references the rule above: resolve against the pointed piece, use the distance, treat an
empty hex as the destination; a doubt about an ambiguous target goes to "Dúvidas para o mestre" — never a question
back. `gm.py contexto` prints the same lines (it reuses `pt.montar`/`imprimir`).
