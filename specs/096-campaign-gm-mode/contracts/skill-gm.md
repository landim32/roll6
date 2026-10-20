# Contract: the `gm` skill of the table repository (096)

Created by this feature as files in `c:\repos\gurps-adventure\.claude\skills\gm\` (not committed there by the
feature). It is the autonomous `processar-turno`: the same rule book, no approval, no questions.

## `SKILL.md`

```yaml
name: gm
description: >
  Fecha um turno do roll6 sozinho, como Mestre: lê a mesa (get_turn_data/get_turn_state), confere os movimentos
  (validar-movimento) e devolve quem passou do Deslocamento ao ponto legal mais avançado da rota, resolve cada ação
  pelas regras (as skills de regra), decide os NPCs, registra no repositório e fecha com process_turn — sem pedir
  aprovação e sem perguntar nada. Use when the Roll6 GM mode asks to process a turn, or the user says "gm" /
  "feche o turno como GM" / "/gm".
```

Sections (by reference to `processar-turno/SKILL.md` where the text is the same):

1. **Antes de tudo**: read `campanha/roll6.json`; the `campaignId` given in the prompt must be the mapping's — else
   print `campanha diferente da do repositório` and stop. Call `get_roll6_guide` once per session (as `roll6` says).
2. **Contexto**: `python .claude/skills/gm/scripts/gm.py contexto` — one screen with `processar_turno.py contexto`
   (who acted, declarations, divergences, the verdict `PRONTO` / `FALTAM AÇÕES de: …`) **and** `validar_movimento.py
   turno` (every character that moved: allowed, used, `VOLTA PARA x,y look` when exceeded). `FALTAM` → print who is
   missing and stop (nothing closed). The Roll6 is the truth about who acted; the repository about the rules.
3. **Movimento**: a character that exceeded is placed at the point the sheet gives (the farthest legal point of the
   route, Q1 = B); his action is resolved **from there** (reach, targets, cover); the narration says "{nome} voltou de
   {x,y} para {x,y}: passou do Deslocamento ({motivo})". The corrected `x`, `y`, `look` go into `process_turn`.
4. **Resolver**: sections 2–3 of `processar-turno` as they are (rules checked in the book, dice rolled by `roll` /
   `teste-nh` / `disputa-nh` / `atacar` / `fintar` / `atacar-distancia` / `iniciativa` / `reacao`, critical failures
   decided first, NPCs decided and resolved).
5. **Decisões sem o mestre** (replaces 4a): never stop. When `processar-turno` would ask:
   - ambiguous manoeuvre → the reading that spends the least (Deslocamento over Attack, Defesa Total over Ataque Total);
   - target out of reach after the movement correction → the attack is not made; the character keeps his turn as a
     move; noted;
   - a rule not found in the book → no effect, noted;
   - an NPC without an action from the master → the defensive option (Defesa Total or hold position), noted;
   - a declaration that cannot be read as a GURPS action → treated as speech, no effect, noted;
   - the Roll6 refuses `process_turn` (validation) → fix the batch once from the error keys (`characters[i].field`),
     try again once, then stop and report the error text.
   Every note goes into the narration's last paragraph **"Dúvidas para o mestre"** and into the repository's
   session notes (`campanha` skill), so the master sees them in the chat and in the log.
6. **Registrar**: section 5 of `processar-turno` (log, notes, health, purse — through the `campanha` skill's scripts).
7. **Fechar**: `python .claude/skills/gm/scripts/gm.py fechar <arquivo.json>` — validates the batch shape locally and
   calls `roll6.py chamar process_turn '<json>'`. Never `mcp__roll6__*` tools directly (the GM run does not
   pre-approve them). The answer `{ finishedTurn, turnNo }` is printed; the narration is already in the chat.
8. **Resposta final**: three lines at most — the turn closed (or why not), who went back, the doubts count.
   `GM_NOT_CONFIGURED` is what the system prompt asks when the skill is absent — this file existing is the
   configuration.

Rules kept from `processar-turno`/`acao`: the sheet is never edited, nothing is pushed to the Roll6 before the
repository is written, the narration always ends archived in the chapter and `campanha/whatsapp/output/`.

## `scripts/gm.py`

```text
gm.py contexto [--json]           # processar_turno.py contexto + validar_movimento.py turno, one screen / one JSON
gm.py fechar <batch.json>         # checks the shape (characters[], npcs[], narration ≤ 10000) and calls
                                  # roll6.py chamar process_turn; prints the answer or the error keys
```

- Imports the existing scripts by path (as `validar_movimento.py` imports `calcular_alcance.py`), never copies their
  logic; UTF-8 output; exit code 0 on `PRONTO`, 2 on `FALTAM`, 3 on a different campaign.
- Reads nothing outside the repository; never prints the API key (the `roll6.py` client already hides it).

## Running by hand

```powershell
cd C:\repos\gurps-adventure
claude -p "Use a skill gm para processar o turno 7 da campanha 1." --permission-mode acceptEdits --allowedTools "Bash(python:*)"
```

(the console runs the same, with the system prompt of `contracts/console-gm-run.md`).
