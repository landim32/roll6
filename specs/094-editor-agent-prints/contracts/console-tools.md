# Contract: tools in a console run (generic)

## RunInfo

```json
{
  "requestId": 12,
  "...": "unchanged fields (086/093)",
  "tools": [
    { "name": "print_stage", "description": "…", "inputSchema": { "type": "object", "properties": { } } }
  ]
}
```

- `tools` absent/empty → no local tool server, the run is exactly as before.
- `readOnly: true` → `tools` is ignored (093 stays without MCP).

## Console behaviour

1. Before starting `claude`, start `LocalToolServer` on `http://127.0.0.1:0/mcp` (OS-chosen port) with a random
   32-byte token; every request without `Authorization: Bearer <token>` (or `?token=<token>`, R7 fallback) → 401.
2. Register one MCP tool per `ToolInfo` (name, description, input schema as given).
3. Run Claude with, in addition to the 086 arguments:
   - `--mcp-config {"mcpServers":{"roll6-editor":{"type":"http","url":"http://127.0.0.1:<port>/mcp","headers":{"Authorization":"Bearer <token>"}}}}`
   - each `mcp__roll6-editor__<name>` appended to the `--allowedTools` list.
4. On a tool call: `await watcher.FlushAsync()` (pending `FileChanged` sent first), then hub `ToolCall(requestId,
   { callId, name, arguments })`, then wait for `toolResult` with that `callId` (60 s → error result "O Roll6 não
   respondeu a tempo.").
5. Return the result as MCP content: one `text` block (`text`), then one `image` block per image; `isError` mapped.
6. Stop the server when the run ends (done, stopped, failed); late `toolResult`s are ignored.
7. Console line per call: "Pedido #12: ferramenta print_stage…".

## Hub (`/hubs/animation`)

| Direction | Name | Payload | Rule |
|---|---|---|---|
| console → server | `ToolCall(requestId, ToolCallInfo)` | `{ callId, name, arguments }` | only from the agent running `requestId` (else ignored) |
| server → console | `toolResult` | `ToolResultInfo { callId, isError, text, images[{ mediaType, data }] }` | exactly one per call |

The server always answers a `ToolCall` (unknown tool, request gone, errors → `isError: true`).
