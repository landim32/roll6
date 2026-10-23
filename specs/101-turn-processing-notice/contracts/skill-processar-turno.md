# Contract: `processar-turno` skill (101, files only in `c:\repos\gurps-adventure`)

## Script subcommands (`processar-turno/scripts/processar_turno.py`)

```bash
python .claude/skills/processar-turno/scripts/processar_turno.py processando --campanha N
python .claude/skills/processar-turno/scripts/processar_turno.py parei --campanha N [--motivo "texto"]
```

- Both call `roll6.chamar("set_turn_processing", {campaignId, processing, reason?})` through the existing `roll6.py`
  client (API key from the environment, never printed).
- `--campanha` defaults to the campaign of `campanha/roll6.json` when omitted (local use), required with `--so-mcp`
  habits of the GM skill (not used there).
- Output: `Processando o turno N avisado ao roll6.` / `Aviso retirado.` / `Ignorado: o Modo GM está processando este
  turno.`; exit 0; a roll6 error prints the problem and exits 4 (never stops the turn processing itself).

## SKILL.md (`processar-turno/SKILL.md`)

- New step right after `VEREDITO: PRONTO` in "1. Contexto": run `processando` before resolving.
- "Se faltar alguém": do not announce (nothing to process).
- Any stop after announcing without `process_turn` (doubts for the master, error, master's order): run `parei
  --motivo "…"` with a short reason.
- `process_turn` closes the turn and ends the notice by itself.
