# Quickstart: Editor de animação com salvar explícito

Requirements: the dev API, the SPA, a logged-in user with a token that has a Mixamo `.glb`, and optionally
`Roll6.Console` running for the Claude steps.

## 1. Saving only on "Salvar" (US1)

1. Open one of your animations in the editor (`/library/animations/{id}/editor`), with the skeleton on.
2. Turn a bone. The pose changes, the top bar shows "Alterações não salvas" and "Salvar" is enabled.
3. In another tab, open the animation's page or a token using it. It still plays the old version (the page's
   `updatedAt` did not change).
4. Use undo/redo (Ctrl+Z / Ctrl+Y). The stage changes and nothing is saved.
5. Click "Salvar". The badge goes away, the other tab now plays the new version, and the library card gets a new
   thumbnail.
6. Turn another bone and click "Descartar", then confirm. The stage goes back to the saved pose.
7. With unsaved changes, click "Animações" in the left menu. "Descartar as alterações?" appears. Reloading the tab
   warns too.
8. With the console running, ask the Claude for a change. The stage plays its version with "Alterações não salvas" and
   the library is untouched until "Salvar". An invalid file from the Claude still shows "Arquivo inválido: …".
9. With unsaved changes in tab A, save in tab B. Tab A keeps its edit and shows "A versão salva mudou".

## 2. Conversation scrolling (US2)

1. Send a request with a long answer. The text arriving, the tool lines and the notices stay visible at the bottom.
2. Scroll up in the middle. The list stays where you left it.
3. Send another message. The list jumps to the bottom.
4. Reload. The conversation opens at the bottom.

## 3. "Incluir animação" (US3)

1. In Animações, click "Incluir animação". Only the name and type are asked.
2. An empty name is refused. Fill both and click "Salvar": the editor of the new animation opens with the model
   standing in its rest pose, and its card is in "Minhas animações".
3. Type a name and leave. "Descartar as alterações?" appears.

## Checks

- `cd backend && dotnet test`
- `cd frontend && npm run lint && npm test && npm run build`
