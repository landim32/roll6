# Data Model: Prints pedidos pelo Claude no editor de animação

No database change. Everything below lives in memory or travels on the hubs.

## RunInfo.tools[] — `ToolInfo` (DTO, console contract)

| Field | Type | Rule |
|---|---|---|
| name | string | `^[a-z][a-z0-9_]{0,40}$` |
| description | string | ≤ 4000 chars, shown to the Claude |
| inputSchema | JSON object | JSON Schema of the arguments |

Empty or absent = no tool server. Ignored when `readOnly`.

## ToolCallInfo (hub method `ToolCall`, console → server)

| Field | Type | Rule |
|---|---|---|
| callId | string | console-generated, unique per run |
| name | string | one of the run's tools |
| arguments | JSON object | as sent by the Claude |

## ToolResultInfo (client method `toolResult`, server → console)

| Field | Type | Rule |
|---|---|---|
| callId | string | the call answered |
| isError | bool | error results carry only `text` |
| text | string | Portuguese; captions of the shots or the error |
| images[] | `{ mediaType: "image/png", data: base64 }` | ≤ 6 |

## PrintRequest (pure domain, parsed from `arguments`)

| Field | Type | Default | Rule |
|---|---|---|---|
| shots[] | 1–6 items | one default shot | more than 6 → error |
| shots[].time | number ≥ 0 or `"key"` | `"key"` | clamped to the duration on the tab |
| shots[].view | front · back · right · left · top · three-quarter | three-quarter | unknown → error |
| shots[].skeleton | bool | false | |

## EditorRequest additions (Application, in memory)

| Field | Meaning |
|---|---|
| EditorConnectionId | the editor tab that sent the request (prints go only there) |
| LatestContent | latest valid working content (request content → each valid `FileChanged`) |
| LatestError | validation message of the last invalid working file, cleared by the next valid one |
| PrintCount | shots served in this request (≤ 30) |
| PendingPrints | callId → completion, failed on finish / stop / editor disconnect / 20 s |

## PrintRequestInfo (client method `printRequested`, server → editor tab)

`{ requestId, callId, content (JSON), shots[{ time, view, skeleton }] }`

## PrintResultInfo (hub method `PrintResult`, editor tab → server)

`{ callId, error?: string, shots?: [{ png (base64, no prefix), caption }] }` — accepted only from the editor
connection of that request, only for a pending callId.

## Local conversation line (frontend, not stored)

`{ kind: 'agentPrint', requestId, shots: [{ png, caption }], error? }` in `lib/editorState`, rendered by
`EditorConversation` under the running Claude line.
