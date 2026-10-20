# Contract: the console's full log (097)

Every line the console prints while a request runs. Format `HH:mm:ss #{requestId}  {text}`; lines that belong to no
request keep `HH:mm:ss {text}`. A multi-line text is printed with its first line after the prefix and the following
lines indented by the prefix's width.

| Moment | Line |
|---|---|
| run received | `Pedido #k (GM\|pergunta, somente leitura\|editor\|gerador): [campanha «…» (campaignId …), turno …] · Claude\|Codex, sessão nova\|retomada` |
| session started | `sessão {id} (conta\|chave)` |
| tool use | `→ {Tool} {input}` — `input` = the tool's input JSON compacted (`{"command":"python …"}`, `{"file_path":"…"}`, `{"skill":"gm"}`); each string value cut at 400 chars with `…`, the whole at 1500 |
| tool result | `← {first 600 chars of the result, one line}`; `← ERRO: …` when `is_error` |
| model text | `Claude: {text}` (the complete text block, multi-line) |
| file written by the server | `Arquivo gravado: {path}` (as today) |
| watched file changed | `Arquivo alterado: {path}` (as today) |
| tool call of 094 (`print_stage`) | `ferramenta {name}…` (as today) |
| refused tools | `Ferramentas recusadas: {names}` |
| end | `Pedido #k terminado.` / `Pedido #k parado.` / `Pedido #k falhou: {message}` |

Rules:

- The deltas (`ClaudeTextDelta`) keep going to the server and are **not** logged one by one; the log shows the complete
  text of each assistant message instead (`ClaudeText`).
- Tool results and texts are **not** relayed to the server (`ToInfo` → null): the tabs and the chat see exactly what
  they see today.
- Redaction on every line: `r6_[A-Za-z0-9_-]{16,}` → `r6_…`.
- Read-only runs (asks) log the same way (their tools are reads only).
- The Codex engine (095) logs its events the same way: `→ Shell …`, `Claude:` becomes `Codex:`.

## Events parsed from stream-json (`StreamJsonReader`)

| Line | Event |
|---|---|
| `assistant` message, `content[].type == "tool_use"` | `ClaudeToolUse(name, target, input)` — `input` as above |
| `assistant` message, `content[].type == "text"` | `ClaudeText(text)` |
| `user` message, `content[].type == "tool_result"` | `ClaudeToolResult(tool_use_id, text, is_error)` — `content` string, or the joined `text` items of an array; ≤ 600 chars |
| others | as today |
