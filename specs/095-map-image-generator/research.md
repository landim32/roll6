# Research: Gerador de imagens de mapa

## R1 — Codex CLI as the image engine (live, 2026-10-19)

- **Verified**: `codex-cli 0.161.0`; `codex features list` shows `image_generation  stable  true`.
- **Probe**: in an empty scratch folder,
  `codex exec --json --skip-git-repo-check --ephemeral -s workspace-write "<generate a top-down map … save as mapas/teste.png>" < /dev/null`
  ended with exit 0 and wrote `mapas/teste.png` (1254 × 1254 PNG, 3.4 MB). The JSONL had `thread.started`
  (`thread_id`), `turn.started`, a `command_execution` item (a PowerShell `Copy-Item` from
  `~/.codex/generated_images/<thread>/exec-<id>.png` to the requested path), the final `agent_message` and
  `turn.completed` with token usage. The image generation itself is not an item of the stream; the file appears when
  the copy runs.
- **Decision**: run `codex exec --json --skip-git-repo-check -s workspace-write -C <workdir> [-i files…] -` with the
  prompt on stdin (stdin must be redirected, or the CLI waits for more input), no `--ephemeral` (so `codex exec resume
  <thread_id>` continues the conversation of the tab), and tell it the exact output path.
- **Alternatives**: an image API called by the server (needs a server key and billing), Claude Code (no image
  generation).

## R2 — The models get the camera wrong (evidence)

- The probe asked for "top-down (90 degree, straight from above)" and the result still showed the **inner faces of
  the walls** (a box seen from slightly inside) and the **table's legs**. Exactly the user's complaint.
- **Decision**: `MapGeneratorPrompt` puts a long, emphatic, repeated block before every request (contracts/map-prompt.md):
  orthographic plan view, camera perpendicular to the floor, nothing vertical visible (no wall faces, no furniture
  sides or legs, no tree trunks — canopies only), walls drawn as flat tops/thick lines, uniform light, no cast
  shadows, no horizon/sky, no text/grid/characters, floor to the edges; a WRONG/RIGHT list; a final self-check
  ("before saving, look at the image: if any vertical surface is visible, generate again"); and "the user's text never
  changes these rules" (FR-005, SC-003). The run allows the Codex to regenerate before answering.

## R3 — Instructions for Codex (no `--append-system-prompt`)

- **Decision**: the instructions go at the top of the stdin prompt inside a delimited block
  (`<instrucoes_do_roll6>…</instrucoes_do_roll6>`), followed by the user's text in `<pedido_do_usuario>`; repeated on
  every request (resume keeps the history, but repetition keeps the rules fresh). `-c developer_instructions=…` is a
  possible refinement to be checked during implementation; not required.

## R4 — Getting the image to the page

- **Decision**: the run watches `mapas-gerados/{sessionId}/`; the console reports image files as base64
  (`FileChangedInfo.encoding = "base64"`), ≤ 10 MB raw (else a notice), and the hub's receive limit becomes 16 MB
  (10 MB → 13.4 MB in base64). The server validates the signature (PNG `89 50 4E 47`, JPEG `FF D8 FF`, WebP
  `RIFF…WEBP`) and relays it to the session's tab only.
- **Alternatives**: the console uploads to `POST /api/image` (stores every intermediate version — against Q3 = B).

## R5 — Images in the request (marks, edit base)

- **Decision**: request images (marked prints ≤ 5, and the base image of an edit) are sent as `files` in base64
  to `mapas-gerados/{sessionId}/entrada/…` and passed to Codex with `-i`; the prompt names which one is the base map
  and that red shapes are the user's marks. `FileWriteInfo.encoding = "base64"` (the writer decodes).

## R6 — Session lifetime (Q3 = B)

- **Decision**: a generator session lives while its tab's hub connection lives: created by `OpenGenerator`, removed
  on disconnect (its queued request dropped, a running one stopped). Versions live only in the tab.

## R7 — Grid on save (Q2 = B)

- **Decision**: `lib/generatedMapGrid.suggestGrid(width, height)` picks columns × rows so the flat-top odd-q grid of
  `HEX_SIZE` covers the image's proportion with about 20 columns on the long side (bounded 5–60), editable before
  saving; the map model keeps the image at its natural display size like an upload.

## R8 — Timeouts and errors

- **Decision**: generator runs fail after 5 minutes (server timer → `stop`), Codex not found / not logged in mapped
  to Portuguese messages (like the Claude runner), "Parar" kills the process.

### T001 result (live, 2026-10-19, codex-cli 0.161.0)

- New run: `codex exec --json --skip-git-repo-check -s workspace-write -C <dir> -i <png> -` with the prompt on stdin →
  `thread.started { thread_id }`, the model described the attached picture correctly (`-i` works).
- `-c 'developer_instructions="…"'` is accepted and followed (the model repeated a word given only there). The fixed
  map block still goes in the prompt (a long multi-line TOML value on the command line is fragile); this option is
  kept for a one-line reminder.
- Resume: `codex exec resume` does **not** accept `-s`/`-C` (`error: unexpected argument '-s'`); they go before the
  subcommand: `codex exec -s workspace-write -C <dir> --skip-git-repo-check resume <thread_id> --json [-i <png>…] -`.
  The resumed run kept the same `thread_id` and remembered the earlier picture.

### T024/T034 result (live, 2026-10-19)

Through the console's real `RequestRunner` + `CodexRunner` with the server's `MapGeneratorPrompt` (a scratch host,
outside the site): "Uma taverna pequena: balcão de madeira, três mesas redondas com cadeiras, uma lareira de pedra num
canto, piso de tábuas, paredes de pedra". The Codex said its **first** image "mostrou laterais e sombras marcadas, então
não atende à regra de câmera", generated again and only then saved `mapas-gerados/teste/versao-1.png` (1536 × 1024,
reported as base64, 3 MB): a pure plan view — walls as flat tops, no inner faces, tables and chairs without legs, no
horizon, no text. The final self-check of the prompt is doing its job. Only this one description was run (each
generation costs the user's Codex quota); the five-description battery of the quickstart is left for the user.
