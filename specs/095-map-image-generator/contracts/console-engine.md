# Contract: a second engine in Roll6.Console (generic)

## RunInfo

```json
{ "requestId": 31, "engine": "codex", "resume": "01a1525c-287c-7241-82a1-6fca5b99a154",
  "systemPrompt": "", "prompt": "<instrucoes_do_roll6>…</instrucoes_do_roll6>\n<pedido_do_usuario>…</pedido_do_usuario>",
  "files": [ { "path": "mapas-gerados/k3f9a1/entrada/marcacao-1.png", "content": "<base64>", "encoding": "base64" } ],
  "watch": [ "mapas-gerados/k3f9a1/" ], "images": [] }
```

- `engine` absent = `"claude"` (086 unchanged). `readOnly` runs are Claude only (093).
- For Codex the console writes `files` (base64 decoded), then runs:
  - new: `codex exec --json --skip-git-repo-check -s workspace-write -C <workdir> [-i <each base64 file written>] -`
  - resume: `codex exec resume <resume> --json --skip-git-repo-check -s workspace-write -C <workdir> [-i …] -`
  - stdin = `prompt` (then closed); environment without `ROLL6_API_KEY`/`ROLL6_URL`.
  - `run.images` (PNG base64) are also written to `.roll6/anexos/{requestId}/` inside the working directory and
    passed with `-i`.
- Events (JSONL → `Progress`):

| Codex line | ClaudeEventInfo |
|---|---|
| `thread.started { thread_id }` | `started`, `text = thread_id` |
| `item.completed agent_message { text }` | `text` (the whole message, plus a blank line) |
| `item.started command_execution { command }` | `tool`, tool "Shell", target = command (cut to 200) |
| `item.completed file_change` / others | `notice` with a short description, or ignored |
| `turn.failed` / `error { message }` | outcome failed with the message |
| `turn.completed` | outcome done |
| process exit ≠ 0 without `turn.completed` | failed: "O Codex não foi encontrado…" / "O Codex não está logado…" / stderr tail |

- `FileChanged`: files with `.png/.jpg/.jpeg/.webp` are read as bytes and sent with `encoding: "base64"`; larger
  than 10 MB → a notice "Imagem grande demais (… MB)" instead.
- Settings: `Roll6Console:CodexExecutable` (default `codex`).
