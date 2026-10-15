# Tasks: Esqueleto na vista 3D do roll6anime (065)

**Input**: Design documents from `/specs/065-roll6anime-skeleton-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/viewer-skeleton.md, quickstart.md

**Tests**: regras puras testadas (Vitest na vista, xUnit na legenda); a janela é conferida à mão.

**Organization**: US1 = botão + ossos + transparência; US2 = nome no hover + destaque dos ossos movidos; US3 = print e legenda.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Conferir a branch `065-roll6anime-skeleton-view` e a base: `npm test` em `roll6anime/viewer` (8) e `dotnet test Roll6Anime.Tests` em `roll6anime/` (86); fechar o `roll6anime.exe`

---

## Phase 2: Foundational

- [X] T002 Criar `roll6anime/viewer/src/skeleton.ts` (puro): `SKELETON_COLORS = { moved: 0xffb020, still: 0x5ce1e6, hover: 0xffffff }`, `MODEL_OPACITY = 0.35`, `HOVER_DISTANCE = 14`, `SKELETON_STORAGE_KEY = 'roll6anime:skeleton'`; `boneSegments(names, parents)` (nome via `normalizeBoneName` de `@roll6/lib/modelAnimations`); `movedBones(file)` (trilhas + "Hips" com `hipsLift`; null → vazio); `segmentColor(name, moved, hovered)`; `distanceToSegment(p, a, b)` e `nearestSegment(pointer, projected, maxDistance)`; `readSkeletonPreference(storage)`/`writeSkeletonPreference(storage, on)` com try/catch
- [X] T003 [P] Testes de `skeleton.ts` em `roll6anime/viewer/src/skeleton.test.ts` (nomes sem prefixo e pais; movidos com/sem `hipsLift`; cores de movido, parado e hover; distância a um segmento no meio, nas pontas e num ponto; mais próximo e limite de 14 px; preferência com storage que lança erro)

---

## Phase 3: User Story 1 - Ver os ossos animados (P1) 🎯 MVP

**Goal**: botão Esqueleto liga/desliga ossos sobre o modelo semitransparente, acompanhando a animação.

**Independent Test**: ligar com o ogro tocando uma animação; pausar e arrastar a barra; desligar → igual a antes.

- [X] T004 [US1] Criar `roll6anime/viewer/src/skeletonView.ts`: `createSkeletonView(scene, model)` encontra os `Bone` do modelo (ordem do `traverse`), monta `LineSegments` (cores por vértice, `depthTest: false`, `depthWrite: false`, `transparent`, `renderOrder: 999`) e `Points` nas juntas (tamanho em pixels); `setEnabled(on)` mostra/esconde e aplica/restaura a transparência dos materiais (guardando `transparent`, `opacity`, `depthWrite` por material, uma vez cada); `update()` copia `getWorldPosition` de cada osso para os buffers a cada quadro (só quando ligado); `hasBones`; `dispose()` restaura os materiais e libera geometrias/materiais
- [X] T005 [US1] Botão `#skeleton` na barra e aviso `#skeleton-note` em `roll6anime/viewer/index.html`; estilo (botão alternável com `aria-pressed`, aviso sobre a vista) em `roll6anime/viewer/src/style.css`
- [X] T006 [US1] `main.ts`: estado inicial de `readSkeletonPreference(localStorage)`; ao abrir um modelo, descartar a `SkeletonView` anterior e criar a nova com o estado atual; botão desativado sem modelo; clique alterna, grava a preferência, atualiza `aria-pressed`/título e o aviso "Este modelo não tem esqueleto." quando `!hasBones`; `skeleton.update()` no laço depois do `player.update`, em `roll6anime/viewer/src/main.ts`

**Checkpoint**: US1 funciona sozinha.

---

## Phase 4: User Story 2 - Nome do osso e destaque (P2)

**Goal**: ossos movidos em âmbar; nome do osso mais próximo do ponteiro.

**Independent Test**: `aceno-duplo.json` → só os ossos com trilha em âmbar; mouse no antebraço esquerdo → "LeftForeArm".

- [X] T007 [US2] `SkeletonView.setMoved(names: Set<string>)` e `setHovered(index | null)`: recalculam as cores dos vértices (`segmentColor`), em `roll6anime/viewer/src/skeletonView.ts`
- [X] T008 [US2] `SkeletonView.pick(pointerX, pointerY, camera, width, height)` projeta os extremos de cada segmento para pixels e devolve `{ index, name } | null` com `nearestSegment`, em `roll6anime/viewer/src/skeletonView.ts`
- [X] T009 [US2] `main.ts`: a cada `animation`/`clear` e ao criar a vista, `setMoved(movedBones(animation?.file ?? null))`; `pointermove` no canvas sem botão pressionado → `pick` → rótulo `#bone-label` junto ao ponteiro + `setHovered`; `pointerdown`/`pointerleave`/esqueleto desligado escondem o rótulo e limpam o realce; rótulo em `roll6anime/viewer/index.html` e `style.css`

---

## Phase 5: User Story 3 - Print com os ossos (P2)

**Goal**: o print sai com os ossos e a legenda explica.

**Independent Test**: com o esqueleto ligado, anexar print → miniatura com ossos; legenda com a nota do esqueleto; o Claude diz quais ossos estão em âmbar.

- [X] T010 [US3] `captured` ganha `skeleton: boolean` (`skeletonView?.enabled && hasBones`), e o realce do hover é limpo antes do render do print, em `roll6anime/viewer/src/bridge.ts` e `roll6anime/viewer/src/main.ts`
- [X] T011 [US3] `ViewCapture` ganha `bool Skeleton = false` e `Caption` acrescenta " Esqueleto visível: o modelo aparece semitransparente e as linhas são os ossos (âmbar = movimentados pela animação aberta, ciano = os demais)." em `roll6anime/Roll6Anime.Core/Claude/PromptImage.cs`; `ViewerBridge` lê `skeleton` em `roll6anime/Roll6Anime/ViewerBridge.cs`
- [X] T012 [P] [US3] Testes da legenda com e sem esqueleto em `roll6anime/Roll6Anime.Tests/PromptImageTests.cs`

---

## Phase 6: Polish

- [X] T013 [P] Atualizar `specs/062-roll6anime-editor/contracts/viewer-bridge.md` (`captured.skeleton`), `roll6anime/README.md` (botão Esqueleto) e a seção roll6anime + "Recent Changes" do `CLAUDE.md`
- [X] T014 `npm test`, `npx tsc --noEmit` e `npm run build` em `roll6anime/viewer`; `dotnet build Roll6Anime.sln` (sem avisos) e `dotnet test Roll6Anime.Tests`
- [X] T015 Validar o quickstart na janela real com o ogro (botão, ossos, pausa/barra, hover, troca de animação, desligar, reabrir a ferramenta) e um print com esqueleto enviado ao Claude real sem alterar arquivos

---

## Dependencies & Execution Order

- T001 → T002/T003 → US1 (T004 → T005 → T006) → US2 (T007, T008 → T009) → US3 (T010, T011 → T012) → Polish.
- US3 (T011/T012, lado C#) pode andar em paralelo com US1/US2.

## Implementation Strategy

1. MVP: Foundational + US1 (ver os ossos).
2. US2 torna os ossos úteis para pedir ajustes; US3 leva o esqueleto ao Claude.
3. Polish com o teste na janela e no Claude reais.
