# Tasks: Editar a pose girando os ossos no roll6anime (066)

**Input**: Design documents from `/specs/066-roll6anime-pose-editing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pose-editing.md, quickstart.md

**Tests**: regras puras com testes (Vitest na vista e no site, xUnit no core); a janela é conferida à mão numa cópia da
animação.

**Organization**: US1 = selecionar e girar; US2 = gravar no arquivo; US3 = histórico Ctrl+Z/Ctrl+Y.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Conferir a branch `066-roll6anime-pose-editing` e as bases: `npx vitest run` em `frontend/` (841), `npm test` em `roll6anime/viewer` (18), `dotnet test Roll6Anime.Tests` em `roll6anime/` (88); fechar o `roll6anime.exe`

---

## Phase 2: Foundational

- [X] T002 Extrair `restFrame(root, boneName)` em `frontend/src/components/story/threeClips.ts` (devolve `{ bone, parent: Quaternion, rest: Quaternion, correction: Quaternion }` com a raiz atualizada; null sem o osso) e fazer `buildRoll6Clip` usá-lo, sem mudar o resultado
- [X] T003 Rodar os testes do site que cobrem `threeClips`/`buildRoll6Clip` em `frontend/` (resultado idêntico) e `npm run lint`
- [X] T004 Criar `roll6anime/viewer/src/poseEdit.ts` (puro + three): `degreesFromLocal(frame, local)` = Euler XYZ (graus, 1 casa) de `P·Q·L⁻¹·P⁻¹·C⁻¹`; `setKey(file, bone, time, degrees, tolerance)` (substitui/insere chave; trilha nova com 0° nas outras poses, Q1 = A; pontas do loop; cópia profunda preservando campos extras); `sameDegrees(a, b)` (< 0,05°); `isEditableBone(name)` via `ANIMATION_BONES`
- [X] T005 [P] Testes em `roll6anime/viewer/src/poseEdit.test.ts`: ida e volta graus → `buildRoll6Clip` → quatérnion → `degreesFromLocal` com um esqueleto de teste (eixos locais tortos, um `LeftArm` com ajuste de braço) erro < 0,1°; `setKey` substitui na pose, insere entre poses, cria trilha nova com 0° nas poses, mantém as pontas do loop, preserva `hipsLift`/`name`/campos extras, arredonda a 0,1
- [X] T006 [P] Criar `roll6anime/Roll6Anime.Core/Animations/AnimationHistory.cs` (`AnimationHistory`: `Observe`, `Undo`, `Redo`, `CanUndo`, `CanRedo`, `UndoCount`, `RedoCount`, limite 100; `AnimationHistoryBook`: por nome sem diferenciar maiúsculas, `For`, `Rename`, `Remove`) e `AnimationWriter.cs` (`Write(path, JsonElement)` → valida com `AnimationFormat.Parse`, grava indentado UTF-8 sem BOM via `.tmp` + `File.Move` overwrite; devolve o erro `AnimationFormatError`-like `(Key, Message)` ou null)
- [X] T007 [P] Testes em `roll6anime/Roll6Anime.Tests/AnimationHistoryTests.cs` e `AnimationWriterTests.cs` (observar igual não duplica; undo/redo devolvem o texto exato; nova versão após undo corta o refazer; limite 100; renomear; gravar válido; inválido não grava e devolve a chave do Roll6; temporário não sobra)

---

## Phase 3: User Story 1 - Selecionar e girar (P1) 🎯 MVP

**Goal**: clicar numa junta seleciona o osso, a animação pausa, anéis de rotação giram o osso, ângulo visível.

**Independent Test**: pausar o `aceno-duplo` na pose 3, clicar no cotovelo, girar → antebraço e mão giram, rótulo "LeftForeArm: 30°".

- [X] T008 [US1] `Player.freeze()`/`thaw()` e `source` público (o mixer não atualiza nem faz seek enquanto congelado; `setAnimation`/`clear` descongelam) em `roll6anime/viewer/src/player.ts`
- [X] T009 [US1] Criar `roll6anime/viewer/src/boneGizmo.ts`: `createBoneGizmo(scene, camera, canvas, orbit)` com `TransformControls` (rotate, space world, size 0,7), `attach(bone)`/`detach()`, `enabled`, eventos `onStart(bone)`, `onChange(angleDegrees)`, `onEnd(bone, startQuaternion)`; desliga o `OrbitControls` durante o arrasto (`dragging-changed`)
- [X] T010 [US1] `main.ts`: clique (pointerdown + pointerup < 4 px) com o esqueleto ligado → `skeleton.pick` → se `isEditableBone`: pausar, `player.freeze()`, `gizmo.attach`, rótulo fixo com o nome; senão rótulo "X não pode ser animado"; clique no vazio ou Esc → `detach` + `thaw`; retomar a reprodução → detach; durante o arrasto rótulo "Nome: N°"; modelo não Mixamo → sem seleção; em `roll6anime/viewer/src/main.ts`
- [X] T011 [P] [US1] Estilos do rótulo fixo/ângulo em `roll6anime/viewer/src/style.css`

**Checkpoint**: girar funciona (ainda não grava).

---

## Phase 4: User Story 2 - Cada rotação vai para o arquivo (P1)

**Goal**: soltar o anel grava o arquivo aberto, validado; a vista volta com a versão nova no mesmo instante.

**Independent Test**: girar e soltar na pose 3 de uma cópia → o arquivo muda só na chave da pose 3 do osso.

- [X] T012 [US2] Mensagens `saveAnimation`, `saveError`, `editing` em `roll6anime/viewer/src/bridge.ts`; em `main.ts`, `onEnd` → `degreesFromLocal(restFrame(player.source, bone), bone.quaternion)` → se mudou, `setKey(animation.file, bone, time, degrees)` → `send(saveAnimation)`; `saveError` → mostra a mensagem, `thaw` e remonta a versão do arquivo no mesmo instante; `editing.enabled=false` → `gizmo.enabled=false` + aviso com `reason`; a versão nova (`animation` com `keepTime`) mantém o osso selecionado
- [X] T013 [US2] `ViewerBridge`: eventos `SaveRequested(fileName, JsonElement)`, `UndoRequested`, `RedoRequested`; `SendSaveError(message)`, `SendEditing(enabled, reason)`, `SendHistory(undo, redo)` em `roll6anime/Roll6Anime/ViewerBridge.cs`
- [X] T014 [US2] `MainViewModel.SaveFromView(fileName, file)`: só o arquivo aberto, recusado com o Claude trabalhando; `AnimationWriter.Write`; erro → `SendSaveError("chave: mensagem")` e `Status`; `editing` reenviado ao mudar `IsRunning`, a animação aberta ou a validade dela; em `roll6anime/Roll6Anime/MainViewModel.cs`

---

## Phase 5: User Story 3 - Histórico com Ctrl+Z (P1)

**Goal**: cada versão do arquivo entra no histórico; Ctrl+Z/Ctrl+Y voltam/refazem gravando o texto exato.

**Independent Test**: duas rotações → Ctrl+Z ×2 = conteúdo original byte a byte; Ctrl+Y refaz; uma mudança do Claude também desfaz.

- [X] T015 [US3] `MainViewModel`: `AnimationHistoryBook`; ao listar e a cada `OnFileSettled` (texto lido do disco) → `Observe`; renomear/apagar → `Rename`/`Remove`; `Undo()`/`Redo()` gravam o texto (`File.WriteAllText` UTF-8 sem BOM, exato) do arquivo aberto quando permitido; `SendHistory` ao mudar de animação e após cada mudança; em `roll6anime/Roll6Anime/MainViewModel.cs`
- [X] T016 [US3] Vista: botões `#undo` `↶ N` e `#redo` `↷ N` na barra (`index.html`, `style.css`), Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z no `keydown` da página → `undo`/`redo`; `history` atualiza as contagens; em `roll6anime/viewer/src/main.ts` e `bridge.ts`
- [X] T017 [US3] Janela WPF: Ctrl+Z/Ctrl+Y fora de uma `TextBox` → `Undo`/`Redo` em `roll6anime/Roll6Anime/MainWindow.xaml.cs`

---

## Phase 6: Polish

- [X] T018 [P] Atualizar a regra da 062 e a ponte: `specs/062-roll6anime-editor/contracts/viewer-bridge.md` (mensagens novas), `roll6anime/README.md` (girar ossos, histórico, a ferramenta passa a gravar o arquivo aberto), `CLAUDE.md` (seção roll6anime: "never writes" → só o arquivo aberto, validado; Recent Changes) e `PromptContext` não muda
- [X] T019 Rodar `npx vitest run` + `npm run lint` em `frontend/`; `npm test`, `npx tsc --noEmit`, `npm run build` em `roll6anime/viewer`; `dotnet build Roll6Anime.sln` (sem avisos) e `dotnet test Roll6Anime.Tests`
- [X] T020 Validar o quickstart na janela real com uma cópia `zz-teste-aceno.json` (girar na pose, entre poses, osso sem trilha, arquivo inválido, Ctrl+Z/Ctrl+Y byte a byte, bloqueio com o Claude, desfazer uma mudança do Claude) e apagar a cópia no fim

---

## Dependencies & Execution Order

- T001 → T002 → T003; T004/T005 dependem de T002; T006/T007 independentes (paralelos ao frontend).
- US1 (T008–T011) depende de T004; US2 (T012–T014) de US1 + T006; US3 (T015–T017) de T006 + T013.
- Polish no fim.

## Implementation Strategy

1. MVP: Foundational + US1 + US2 (girar e gravar).
2. US3: o histórico que torna seguro gravar a cada rotação.
3. Polish com o teste real numa cópia do arquivo.
