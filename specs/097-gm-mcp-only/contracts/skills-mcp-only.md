# Contract: the table skills só pelo MCP (097, `c:\repos\gurps-adventure`)

Files only; the repository is not committed by the feature. Local use (no flag) is unchanged everywhere.

## `processar_turno.py contexto [--so-mcp --campanha N]`

- `--so-mcp` requires `--campanha N` (else exit 3 "campanha não informada").
- Só-MCP: `campanha/roll6.json` is not read; `fora_do_repositorio = true` whatever the mapping says; no
  `ficha_local`, `saude_local`, `reacoes_*`, `acao.estado`, `arquivos_de_contexto`; the screen's first line says
  `SÓ MCP`; per character the line `ficha: get_participation {campaignCharacterId} (sheet)`; per NPC
  `ficha: get_npc {npcId} (sheet)`; the JSON gains `"so_mcp": true`.
- Verdict and everything else unchanged.

## `validar_movimento.py turno [--so-mcp --campanha N] [--turno T] [--manobra …]`

- Só-MCP: the campaign from `--campanha`; no `campanha/terreno.json`; no local sheet — `deslocamento_atual` starts
  from the Roll6 `move` of the piece (the campaign's Deslocamento) with the PV/Fatigue rules applied, and `desl_conta`
  says `Deslocamento do roll6 (campanha): N`; everything else (manoeuvre, cost, legal point, `recuar`) unchanged.

## `gm.py`

```text
gm.py contexto --campanha N [--turno T] [--json]     # always só-MCP
gm.py fechar turno.json --campanha N
```

- `--campanha` required (exit 3 `campanha não informada`); `campanha/roll6.json` never read.
- `contexto` prints, in order: the table (`processar_turno.py contexto --so-mcp --campanha N`), the moves
  (`validar_movimento.py turno --so-mcp --campanha N`, skipped in free mode), then **`=== SITUAÇÃO ===`**: the previous
  turn's narration (`get_turn_narration`, cut at 1500 chars), the last 3 narrations' first lines
  (`list_chat_messages kind=narration limit=3`), and per character/NPC: status, PV/Fadiga, position, and where the
  full sheet is; then **`=== GM ===`** with the verdict and who goes back (as 096).
- `fechar`: the batch's `campaignId` is set to `N`; shape check as 096; `roll6.py chamar process_turn`.
- Exit codes as 096 (0 / 2 / 3 / 4 / 5).

## `gm/SKILL.md`

- A "Nunca" list up front: never read or write `campanha/`, `personagens/`, `historico/`, `campanha/roll6.json`;
  never `campanha.py`; never `mcp__roll6__*` directly; never ask.
- §1 the campaign of the request (from the prompt; `campanha não informada` when missing).
- §2 `gm.py contexto --campanha N`; the "Situação" block is the memory.
- §4 rules: the books (`livros/gurps-mb-3ed/*.md`, grepped as `acao` says) + the rules skills (`roll`, `teste-nh`,
  `disputa-nh`, `atacar`, `fintar`, `atacar-distancia`, `iniciativa`, `reacao`); the sheets from the Roll6.
- §5 doubts into the narration only.
- §6 "Registrar = o Roll6": the status (what holds until the next turn, ≤ 260), PV/Fadiga, positions and the narration
  are the whole record; `campanha.py` is not used.
- §7 `gm.py fechar turno.json --campanha N`.

## `processar-turno/SKILL.md`, `validar-movimento/SKILL.md`

- One paragraph each on the só-MCP form (flags, what is not read/written, where the sheet and the situation come
  from). Local text untouched.
