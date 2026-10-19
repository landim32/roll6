# Quickstart: Prints pedidos pelo Claude no editor de animação

## Prerequisites

- API running (`dotnet run --project Roll6.API`) against a reachable database, frontend `npm run dev`.
- `Roll6.Console` built from this branch, `ROLL6_API_KEY` set, `ROLL6_URL=http://localhost:5119`, Claude Code logged in.
- A token with a Mixamo `.glb` and one animation of your own.

## Scenarios

1. **Check after a change** — open `/animation/{id}`, pick the token, send "levante o braço direito acima da cabeça".
   Expect: the conversation shows "Print para o Claude" lines with thumbnails after the Claude edits the file; the
   final answer mentions what the prints showed; your stage keeps its instant and camera.
2. **Several views** — "mostre de frente e de lado no começo e no fim, com o esqueleto". Expect one call with up to 6
   shots, captions naming instant/side/skeleton.
3. **Latest version** — ask for two successive changes in one request; the second batch of prints shows the second
   change (compare the thumbnails).
4. **Editor closed** — close the tab while a request runs and the Claude asks a print: the console log shows the tool
   call and the Claude gets "O editor não está aberto…", the run still finishes.
5. **Limit** — ask for "40 prints"; the 31st shot answers "Limite de 30 prints por pedido atingido.".
6. **Read-only** — a table question (093) still runs with no MCP server (`--strict-mcp-config`, no `--mcp-config`
   with tools).
7. **Security** — while a run is going, `curl http://127.0.0.1:<port>/mcp` without the token → 401; after the run the
   port is closed.

## Commands

```bash
cd backend && dotnet test --filter "FullyQualifiedName~Print|FullyQualifiedName~ToolServer|FullyQualifiedName~ClaudeRunner"
cd frontend && npm test -- shotCamera editorState
```
