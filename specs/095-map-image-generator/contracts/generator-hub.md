# Contract: map generator on `/hubs/animation`

Browser (JWT) methods:

| Method | Payload → result | Errors (`HubException`) |
|---|---|---|
| `OpenGenerator(mapModelId?)` | → `GeneratorOpenedInfo { sessionId, agent }` | `forbidden` (another user's map), `not-found` |
| `SendGeneratorRequest(GeneratorRequestInfo)` | → `requestId` | `invalid` (text > 4000, > 5 images, image > 10 MB / not an image), `no-agent`, `busy` (the session has a request), `not-found` (session gone/other tab) |
| `StopRequest(requestId)` (the animation editor's, reused) | — | `not-found` |
| `NewGeneratorConversation(sessionId)` | — (forgets the Codex thread) | `busy` |

Server → browser (only the session's connection):

| Method | Payload |
|---|---|
| `agentStatus` | unchanged |
| `generatorQueued` | `{ sessionId, requestId, position }` |
| `generatorStarted` | `{ sessionId, requestId, machine }` |
| `generatorProgress` | `{ sessionId, requestId, event: ClaudeEventInfo }` (the thread-id `started` text is not forwarded) |
| `generatorImage` | `{ sessionId, requestId, version, mediaType, data }` |
| `generatorFinished` | `{ sessionId, requestId, outcome: RequestOutcomeInfo, text }` |

Rules:

- The session belongs to the tab that opened it; disconnecting removes it (queued request dropped, running one stopped).
- `GeneratorRequestInfo.baseImage` is accepted on the first request of an edit session (the tab fetched the map
  image); it is written as `entrada/base.png` and named in the prompt. Later requests start from the last version the
  tab has selected (`baseImage` again = the selected version, so the user can branch from any version).
- A watched image under `mapas-gerados/{sessionId}/` → validated (PNG/JPEG/WebP signature, ≤ 10 MB) → `generatorImage`
  with the next version number; anything else → notice "Arquivo ignorado: …".
- Generator requests time out after 5 minutes (`stop` to the console; outcome failed "O Codex demorou demais.").
- Nothing is stored: no conversation rows, no images in the bucket until the user saves (REST).
