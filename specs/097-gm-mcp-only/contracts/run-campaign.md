# Contract: the campaign of a request (097)

## Server → console: `RunInfo.campaign`

```json
{ "campaign": { "campaignId": 3, "name": "Tormento Vil II", "turnNo": 15 } }
```

- GM runs (096): `campaignId`, `name`, `turnNo` (the turn to close). Asks (093): `campaignId`, `name`, `turnNo` null.
  Editor and generator runs: no field.
- Built in `AgentDispatcher.GmRun` / `AskRun` from the job; the server also keeps the campaign in `GmPrompt`
  (defence in depth).

## Console: what it does with it

1. Logs, before anything else of the request:
   `Pedido #{id} (GM): campanha «{name}» (campaignId {campaignId}), turno {turnNo} · Claude, sessão nova`
   (asks: `(pergunta, somente leitura): campanha «…» (campaignId …)`).
2. Prepends to the prompt the line (then a blank line, then the server's prompt):
   `CAMPANHA DO PEDIDO: «{name}» (campaignId {campaignId}){, turno {turnNo}}. Trabalhe só nela; ignore campanha/roll6.json.`
3. Appends the same line to the system prompt (`--append-system-prompt`).
4. Without the field: nothing is added, nothing is logged about a campaign (an older server, an editor request).

## Model: what it must do

- `GmPrompt.SystemPrompt()` gains: "Se o pedido não identificar a campanha (campaignId), não processe nada e responda
  exatamente: campanha não informada." The user prompt keeps `Campanha: {name} (campaignId {id})` and `Turno a
  processar: {n}`; the line about `campanha/roll6.json` becomes "ignore-o: a campanha é a do pedido".
- The `gm` skill takes the campaign from the prompt and passes `--campanha N` to every script; `gm.py` refuses to run
  without it (exit 3, "campanha não informada").
