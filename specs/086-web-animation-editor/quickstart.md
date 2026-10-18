# Quickstart: Editor de animações na web com o Claude local (086)

## Preparation

- A user with an API key (menu › Chaves de API), a token with a Mixamo `.glb` and one animation of their own in the
  library (059).
- The table project at `C:\repos\gurps-adventure` with the `criar-animacao` skill; Claude Code installed and logged in.
- `ROLL6_API_KEY` set; `dotnet run --project backend/Roll6.Console` (against the dev API: `Url` = the local API).

## Checks

1. **Page (US1)**: menu › Animações › Minhas › "Editar no editor" on an animation → a new tab with only the logo, the
   name, the agent badge and the editor; pick the token; the animation plays; pause, drag, "Pose 2 de 5". Reload: same
   animation. Another user's animation id in the URL → "Só o dono edita". Without the agent: badge "desconectado" with
   the hint, the composer disabled.
2. **Console (US5)**: run with a wrong key → exits with "Chave de API inválida"; run right → "Conectado ao … como …"; the
   page badge turns "conectado (MÁQUINA)" within 10 s; kill the agent → "desconectado"; cut the network → the console
   says "reconectando…" and comes back. The console prints only generic lines (pedido, arquivo alterado): nothing
   about animations.
3. **Conversation (US2)**: send "levante o braço direito no fim" → "Pedido #n" in the console, the answer streams in the
   page with "Editando animacoes/…", the model plays the new version within seconds at the same instant and angle; the
   library's animation has the new content (check in a token's "Animação" tab). Send a request that makes an invalid
   file → the notice shows the error, the model keeps the last valid version. "Parar" during a long request → "Pedido
   parado". Close the tab, reopen → the conversation is there; the next request continues it ("Nova conversa" starts
   over). Two tabs of the same animation → both show the same stream; a second request while one runs → "ocupado".
4. **Pose (US3)**: "Esqueleto" → bones over the see-through model, amber where moved, name on hover; click a joint →
   rings; turn and release → "gravando…", the new version plays and is in the library; Ctrl+Z/Ctrl+Y walk the versions;
   while a request runs the rings are blocked with the reason.
5. **Prints (US4)**: "Anexar print" → the markup window; draw a red arrow; Concluir → thumbnail in the composer; send
   with "o braço marcado deve ficar reto" → the Claude's answer mentions the marked arm; the thumbnail stays on the
   sent message in this tab.
6. **Phone**: the page stacks; skeleton/gizmo/print hidden; sending works.
7. **Removal**: `roll6anime/` is gone; `dotnet build backend/Roll6.sln` and `dotnet test` pass; `npm test` passes with
   the moved viewer tests; CLAUDE.md describes the console and the editor.
