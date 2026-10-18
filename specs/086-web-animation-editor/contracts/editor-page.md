# Contract: the editor page (086)

## Route and entry

- `/animation/:id` → `pages/AnimationEditorPage` inside `ProtectedRoute` (login redirect with `state.from`), **not**
  inside `MainPage`: no `TopMenu`, no map, panels, combos, turn controls or chat. `useDocumentTitle` → "{animação} ·
  Editor | Roll6".
- `AnimationList` (mine only) gets the button "Editar no editor" (`PencilSquareIcon`? → `BoxArrowUpRightIcon`,
  `title`/`aria-label`), an `<a href="/animation/{id}" target="_blank" rel="noopener">`.
- Not the owner (403 / `forbidden`) → a card "Só o dono edita esta animação." with "Voltar ao Roll6" (`/`).

## Layout

```
┌ top bar: [BrandLogo horizontal] Nome da animação · [agente: conectado (DESKTOP-ABC) | ocupado | desconectado ⓘ] · [Modelo: select de tokens com 3D] ┐
├─────────────────────────────────────────┬───────────────────────────────────────────┤
│ AnimationStage (canvas, 3D)             │ Conversa                                  │
│  [zoom +/−] [Esqueleto] [↶ n] [↷ n]     │  mensagens (usuário / Claude / aviso)      │
│  status da edição (osso, gravando…)     │  ...                                      │
│ AnimationTimeline: [▶] ──●──── 1,2 s de 3,0 s · Pose 2 de 5 │  [miniaturas dos prints] [Anexar print]   │
│                                         │  [campo de texto………………] [Enviar] [Parar]   │
│                                         │  [Nova conversa]                          │
└─────────────────────────────────────────┴───────────────────────────────────────────┘
```

On `< md`: the stage, then the conversation, stacked; "Esqueleto", the gizmo, ↶ ↷ and "Anexar print" are hidden.

## Components (`components/animations/editor/`)

- `AnimationStage` (lazy, three): props `modelUrl`, `content: AnimationFile | null`, `keepTime`, `skeleton`,
  `editingAllowed`, `zoom`; events `onModelLoaded({ mixamo, bones })`, `onModelError`, `onPlayback(Playback,
  PoseInfo | null)`, `onSave(file)` (a bone released), `onCapture` through a ref handle `capture(): CapturedPrint`.
  Ports `main.ts`: renderer, `OrbitControls`, holder, `Player`, `createSkeletonView`, `createBoneGizmo`, `stampPrint`,
  `cameraAngles`.
- `AnimationTimeline`: play/pause, range, "1,2 s de 3,0 s", the pose label (port of `timeline.ts` + `poses.ts`).
- `EditorConversation`: the messages (user with thumbnails, Claude with the live text, notices), the queue position,
  the composer (textarea, Enter sends, Shift+Enter new line), attachments (≤ 5), "Anexar print", "Enviar", "Parar",
  "Nova conversa".
- `PrintMarkupModal`: the print on a canvas with the four red tools, Desfazer, Limpar, Concluir (attach), Cancelar;
  pure `lib/markup.ts` (`Mark`, `MarkKind`, `strokeFor`, `clamp`, `isMeaningful`, `arrowHead`, `drawMarks`).
- `lib/printCaption.ts`: `caption({ animationName, time, duration, azimuth, elevation, pose, skeleton, marks })` → the
  Portuguese caption of 062/064/065 (`ViewCapture.Caption` + `MarkupNote` + `SKELETON_NOTE`).
- `lib/animationHistory.ts`: `createHistory(limit = 100)` with `push(text)`, `undo()`, `redo()`, `counts`.
- `lib/editorState.ts`: pure reducers for the hub events (append delta, finish, version, agent status).
- `Services/animationEditorService.ts`: the SignalR connection (`/hubs/animation`, `accessTokenFactory` from the
  session), `openEditor`, `sendRequest`, `stopRequest`, `newConversation`, `on(event)`.
- `Contexts/AnimationEditorContext.tsx` + `hooks/useAnimationEditor.ts`: page-scoped provider.

## Prints

- `capture()` renders the frame, stamps "Pose 2 de 5 · 0,3 s" in the corner, returns `{ png (data URL), time,
  duration, paused, azimuth, elevation, skeleton, pose }`.
- Before sending, each marked PNG is downscaled to ≤ 1024 px (longest side) and sent as base64 with its caption.

## i18n

`editor.*` (title, agent states and hint, model select, skeleton, undo/redo, status lines, conversation, composer,
attachments, markup tools, errors) and `animations.openEditor`.
