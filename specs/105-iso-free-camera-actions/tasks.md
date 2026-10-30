# Tasks: Câmera livre e jogo completo na vista isométrica

**Input**: Design documents from `specs/105-iso-free-camera-actions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/iso-interaction.md, quickstart.md

**Tests**: o projeto testa toda lógica pura com Vitest (`lib/*.test.ts`); as tarefas de teste abaixo cobrem só os
módulos puros novos/alterados. Componentes e three.js são validados pelo `quickstart.md`.

**Organization**: por história do `spec.md` (US1 câmera, US2 menu, US3 movimento, US4 balões, US5 legado). Todos os
caminhos são relativos a `frontend/src/` salvo indicação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1…US5

---

## Phase 1: Setup

- [X] T001 Conferir a base: `cd frontend && npm test && npm run lint && npm run build` verdes antes de mexer (anotar falhas preexistentes no PR, não corrigir aqui)

---

## Phase 2: Foundational (extração compartilhada 2D ↔ isométrica — bloqueia US2 e US3)

**Purpose**: tirar do `components/map/MapCanvas.tsx` toda a lógica que não depende do SVG, para que a isométrica use
exatamente as mesmas regras (research R4, SC-002). O 2D NÃO pode mudar de comportamento.

- [X] T002 Criar `lib/mapInteraction.ts` (puro, sem React) com funções extraídas de `MapCanvas`: `isOwnCharacter(token, party, userId)`, `isOwnPiece(token, party, userId)` (usa `commandsNpc`), `canMove(token, ctx)`, `canTakeTurn(token, ctx)`, `canSetPosture(token, ctx)`, `menuAllowed(piece, ctx)` (a regra "players only get a menu on their own pieces" do `onPointerUp`), `shapeAt(hex, mapTokens)` e `movementOverlay(moveState)` → `{ preview, destination, status, trail }` (o cálculo de `movePreview`/`moveDestination`/`moveStatus` do fim do `MapCanvas`). `ctx` = `{ mapId, canPlace, canPlaceOwn, freeMode, turnNo, campaignStatus, turnEntries, party, userId }` (interface exportada). Comentários no estilo do arquivo de origem.
- [X] T003 [P] Criar `lib/mapInteraction.test.ts` cobrindo: mestre × jogador × aliado comandado em `canMove`/`canTakeTurn`/`canSetPosture`; objeto sem postura/turno; modo livre ignora `hasMoved`; campanha pausada bloqueia `canTakeTurn`; `menuAllowed` falso para peça alheia de jogador e hex vazio de jogador; `shapeAt` devolve a forma inteira (031)
- [X] T004 Criar `hooks/useMapInteraction.ts`: move do `MapCanvas` o estado `menu`, `pickedHex` (+ efeito do `picking`), `hoverHex`/`hover`, `targeting` (098, com Esc, peça que sai, troca de mapa), `useTokenMovement`, `closeMenu` na troca de mapa, e as ações independentes de SVG recebendo coordenadas já resolvidas: `clickAt(hex: Offset | null, mapPoint: Point | null, screen: { left, top })` (alvo → `pickTarget`/`onAct`; Mover → lógica de `clickWhileMoving` com `lookToward(centro do destino, mapPoint, look)`; senão abre o menu quando `menuAllowed`), `pointerAt(hex, mapPoint)` (hover ou `movement.hover`/`face`), `cancelSecondary()` (clique direito: cancela alvo/movimento; devolve se consumiu), `acceptsDrag(types)`, `dragOver(hex)`, `drop(dataTransfer, hex)` (lógica de `onDrop`/`dropNpc`). Recebe as props de `MapCanvasProps` (`onPickToken`, `onDeleteToken`, `onEditNpc`, `onAct`, `onRepeated`, `onResetTurn`, `picking`). Devolve também `selectedShape`, `hoverShape` (com a regra `sameShape`), `overlay` (de `movementOverlay`), `menuToken`, `targeting` e `movement` (os balões ficam fora do hook, em cada vista)
- [X] T005 Criar `components/map/MapHexMenu.tsx`: recebe o retorno de `useMapInteraction` e renderiza o `<HexMenu>` com todas as props exatamente como hoje no fim de `MapCanvas.tsx` (onMove, onAct, onActOn, onRepeated, repeatedActive, onResetTurn, posture/onPosture com toast de erro, onAdd/onChange/onDelete com `setPickedHex`, onEditNpc, deleteLabel) + o `<MovementCounter>` quando `moveState.piece.kind === MOVEMENT_KIND.limited`
- [X] T006 Reescrever `components/map/MapCanvas.tsx` sobre `useMapInteraction` + `MapHexMenu`: os handlers SVG passam a só converter coordenadas (`useMapPointer` → hex, `toMapPoint` → ponto) e chamar `clickAt`/`pointerAt`/`cancelSecondary`/`dragOver`/`drop`; pan, zoom, `centerOn` inicial, `ResizeHandles` e camadas SVG ficam. Exportar `MapCanvasProps` como interface reutilizável (`MapInteractionProps`) para a isométrica
- [ ] T007 Rodar `npm test` e `npm run lint` no frontend e validar no navegador o 2D (menu de mestre/jogador, Mover limitado e livre, Agir sobre…, soltar cartão do grupo e de NPC) — comportamento idêntico ao anterior

**Checkpoint**: 2D igual, lógica pronta para a isométrica.

---

## Phase 3: User Story 1 — Câmera livre (Priority: P1) 🎯 MVP

**Goal**: esquerdo desliza (chão grudado no ponteiro, luz junto), direito gira/inclina, câmera nunca segue peça sozinha.

**Independent Test**: quickstart passo 2.

- [X] T008 [P] [US1] Em `lib/isoCamera.ts`: adicionar `mapBounds(columns, rows): { minX, minY, maxX, maxY }` (retângulo da grid em px a partir de `hexCenter` dos cantos ± meio hex), `clampTarget(target, bounds)`, `panTo(pose, grabbed: Point, now: Point, bounds)` (alvo += grabbed − now, preso), `twistBy(pose, radians)` e `tiltBy(pose, dy)` (toque); atualizar o comentário do arquivo ("There is no pan" sai; o alvo é do usuário e é o centro da luz)
- [X] T009 [P] [US1] Em `lib/isoCamera.test.ts`: casos de `panTo` (desloca pelo delta, prende na borda), `clampTarget`, `mapBounds` de uma grid 10×8, `twistBy` embrulha o ângulo, `tiltBy` respeita 30–70°
- [X] T010 [US1] Em `components/iso/isoRenderer.ts`: adicionar `floorAt(clientX, clientY): Point | null` (raio da câmera contra o plano y = 0, em px do mapa; `hexAt` passa a usá-lo + `pixelToHex`), trocar `setFocus(center, animate)` por `setTarget(target: Point)` (imediato, sem planar) e `glideTo(target: Point)` (planar `FOCUS_EASE_SECONDS`), e `getTarget(): Point`; a luz, o sol e o chão das sombras continuam seguindo `pose.target` em `applyCamera`
- [X] T011 [US1] Em `components/iso/IsoView.tsx`: reescrever os gestos — botão esquerdo (ou 1 dedo) = `panTo` com `grabbed = floorAt(início)` mantido durante o arraste; botão direito = `orbitBy`; 2 dedos = pinça (zoom atual) + torção (`twistBy`) + ponto médio vertical (`tiltBy`); `moved` com `CLICK_TOLERANCE` = 4 px em qualquer botão (remover `CLICK_MS`); `onContextMenu` sempre `preventDefault`. Guardar `target` no `pose` ref (o `IsoPose` completo, não mais `Omit<…,'target'>`)
- [X] T012 [US1] Em `components/iso/IsoView.tsx`: foco não segue mais a peça — remover o efeito por `center.x/center.y`; na 1ª montagem de cada renderer `setTarget(centro do foco)`; ao escolher no `IsoFocusSelect` → `glideTo(centro da peça escolhida)`; remover o clique-troca-foco (`candidateAt`/`isLit` no `onPointerUp`); `bounds` vindo de `mapBounds(gridWidth, gridHeight)` e reaplicado quando a grid muda
- [X] T013 [US1] Atualizar os comentários de cabeçalho de `IsoView.tsx` e `isoRenderer.ts` (vista de jogo, câmera livre, luz = centro da vista)

**Checkpoint**: câmera livre usável sozinha.

---

## Phase 4: User Story 2 — Menu do hex e ações (Priority: P1)

**Goal**: clique sem arraste abre o mesmo menu do 2D; hover/seleção destacados; Agir sobre… funciona.

**Independent Test**: quickstart passos 3 e 5.

- [X] T014 [US2] Em `components/iso/isoPieces.ts`: expor `pickAt(raycaster): number | null` — raio contra os meshes desenhados de cada peça (figura/imagem, modelo montado, base), só peças visíveis (`isLit` pelo alvo atual), devolvendo o `id` (mapTokenId) do mais próximo
- [X] T015 [US2] Em `components/iso/isoRenderer.ts`: `pieceAt(clientX, clientY): number | null` usando `pieces.pickAt`; e `setOverlays({ hover, selected, path, destination, status })`: um grupo `overlays` acima da grade (lift > `GRID_LIFT`) com preenchimento + contorno por hex (reusar `stripGeometry` de `isoStrips` e o padrão `disc` de `isoPieces`), cores do 2D (`HexHighlight` hover azul-claro / selected cinza; `MovementLayer` ok/over/blocked — ler as cores de `components/map/HexHighlight.tsx` e `MovementLayer.tsx`/CSS e repetir como constantes), **sem** `applyLight` (visível no escuro); recriar só quando a chave dos hexes mudar
- [X] T016 [US2] Em `pages/MainPage.tsx`: passar ao `IsoView` as mesmas props do `MapCanvas` (`onPickToken`, `onDeleteToken`, `onEditNpc`, `onAct`, `onRepeated`, `onResetTurn`, `picking`); `IsoViewProps` estende `MapInteractionProps`
- [X] T017 [US2] Em `components/iso/IsoView.tsx`: usar `useMapInteraction(props)`; função `resolveHex(event)` = `pieceAt` → hex da peça (`x`,`y` do token), senão `hexAt`; clique esquerdo sem `moved` → `clickAt(resolveHex, floorAt, { left, top } relativos ao `.stm-iso`)`; `pointermove` sem botão → `pointerAt(hexAt, floorAt)`; `pointerleave` → `hover(null)`; clique direito sem `moved` → `cancelSecondary()`; renderizar `<MapHexMenu>` dentro de `.stm-iso`; classe `is-targeting` no canvas quando `targeting`; enviar `selectedShape`/`hoverShape` para `setOverlays`
- [X] T018 [US2] Em `styles/app.css`: cursor do `.stm-iso-canvas` (padrão `pointer` sobre hex com menu não é necessário; `grab`/`grabbing` ao deslizar, `crosshair` em `.is-targeting` como o 2D) e garantir que o `HexMenu` posicionado em `.stm-iso` fica acima do canvas e da barra de foco (z-index)

**Checkpoint**: menu e alvo funcionando na isométrica.

---

## Phase 5: User Story 3 — Mover peças (Priority: P1)

**Goal**: Mover, modo livre, soltar cartões e cancelamentos iguais ao 2D.

**Independent Test**: quickstart passo 4.

- [X] T019 [US3] Em `components/iso/IsoView.tsx`: durante o Mover, enviar `overlay.trail`/`destination`/`status` para `setOverlays` (caminho e destino) e não destacar a forma da peça (como o 2D: hover = hex único); esconder os balões enquanto `movement.active`
- [X] T020 [US3] Em `components/iso/IsoView.tsx`: prévia da peça — ao montar `pieces` para `setPieces`, substituir o token em movimento por `{ ...token, x, y, look }` de `overlay.preview` (mesmo dado que o `TokenLayer` recebe como `preview`), para a miniatura andar/girar na prévia sem salvar
- [X] T021 [US3] Em `components/iso/IsoView.tsx`: arrastar cartões — `onDragOver` (se `acceptsDrag(event.dataTransfer.types)`: `preventDefault`, `dropEffect` como o 2D, `dragOver(hexAt)`), `onDragLeave` → `hover(null)`, `onDrop` → `drop(event.dataTransfer, hexAt)`, no `.stm-iso` (o canvas)
- [X] T022 [US3] Em `components/iso/IsoView.tsx`: toque no Mover — o toque curto chama `clickAt` (o hook já faz prévia no 1º toque e confirma no 2º, `clickWhileMoving`); conferir que um arraste de 1 dedo durante o Mover só desliza
- [ ] T023 [US3] Validar com dois navegadores: outro usuário move a peça em movimento → cancela; campanha pausada → cancela; modo livre ligado/desligado → cancela (vem do `useTokenMovement`, só conferir); trocar para o 2D com Mover/menu/alvo abertos → nada salvo

**Checkpoint**: um turno inteiro jogável sem sair da isométrica (SC-001).

---

## Phase 6: User Story 4 — Balões sobre a cabeça e transparentes (Priority: P2)

**Goal**: balão logo acima da cabeça, acompanha a câmera, transparente sob o mouse, clique atravessa.

**Independent Test**: quickstart passo 6.

- [X] T024 [P] [US4] Em `lib/storyBubbles.ts`: `bubblePlacement(sprite, frame, canvas, size, options?: { ceiling?: number })` com `ceiling` padrão `BALLOON_CEILING` (3D legado inalterado); `ceiling: 0` ancora sempre em `headY − TAIL_GAP`
- [X] T025 [P] [US4] Em `lib/storyBubbles.test.ts` (criar se não existir): cabeça no topo da tela com `ceiling: 0` fica acima da cabeça; padrão mantém o comportamento antigo; sem espaço acima → `below`
- [X] T026 [US4] Em `components/story/BubbleLayer.tsx`: prop opcional `ceiling` repassada a `bubblePlacement`; comportamento `is-see-through` igual ao `components/map/SpeechBubbleLayer.tsx` (ouvinte `pointermove` na janela enquanto há balões, alterna a classe pela caixa de cada `.stm-story-bubble`)
- [X] T027 [US4] Em `styles/app.css`: `.stm-story-bubble.is-see-through { opacity: 0.3; }` junto da regra `.stm-bubble.is-see-through`; conferir que `.stm-story-bubbles` segue `pointer-events: none`
- [X] T028 [US4] Em `components/iso/IsoView.tsx`: `<BubbleLayer ceiling={0} …>`; conferir que `anchors()` de `isoPieces.ts` dá a cabeça + base em pé e o ponto mais alto deitada (já existe; ajustar só se o balão não encostar)

---

## Phase 7: User Story 5 — "3D (legado)" (Priority: P3)

**Goal**: rótulo e ordem do seletor.

**Independent Test**: quickstart passo 1.

- [X] T029 [P] [US5] Em `i18n/locales/pt-BR.json`: `story.view3dItem` = `"3D (legado)"`
- [X] T030 [P] [US5] Em `components/map/MapControls.tsx`: ordem das opções 2D, Isométrica, 3D (legado) (valor salvo `'3d'` inalterado)

---

## Phase 8: Polish & Cross-Cutting

- [X] T031 [P] Atualizar `CLAUDE.md` (raiz): na entrada "Isometric lit view (103)" trocar "drag turns/tilts…; no pan" pela câmera livre da 105 (esquerdo desliza agarrando o chão, direito gira/inclina, toque, `mapBounds`/`panTo`, luz = alvo), o foco só inicial/seletor (sem clique-foco), menu/Mover/alvo/drop via `useMapInteraction` + `MapHexMenu` (também na seção do 2D "Map pieces"/"Movement mode"), `pieceAt`/`floorAt`/`setOverlays`, balões `ceiling: 0` + `is-see-through`, e "3D (legado)"; adicionar a linha da 105 em "Recent Changes"
- [X] T032 Rodar `cd frontend && npm test && npm run lint && npm run build` e conferir que `three` não entrou no chunk principal (o build lista os chunks)
- [ ] T033 Executar o `quickstart.md` inteiro (incluindo a conferência de 10 situações do SC-002 e o celular)

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T007)** → bloqueia US2 e US3.
- **US1 (T008–T013)** depende só do Setup; pode correr em paralelo com a Foundational (arquivos diferentes, exceto que T011/T012 e T017 mexem no mesmo `IsoView.tsx` — fazer US1 antes de US2).
- **US2 (T014–T018)** depende da Foundational e da US1 (gestos/clique).
- **US3 (T019–T023)** depende da US2 (menu abre o Mover; overlays).
- **US4 (T024–T028)** independente das outras (só T028 toca `IsoView.tsx`, depois da US1).
- **US5 (T029–T030)** independente.
- **Polish** depois de tudo.

## Parallel Opportunities

- T003 ‖ T004 depois de T002.
- US1: T008 ‖ T009 ‖ (Foundational inteira).
- US4: T024 ‖ T025 ‖ US5 (T029 ‖ T030) a qualquer momento.
- T031 pode ser escrito enquanto T033 é executado.

## Implementation Strategy

1. **MVP** = Foundational + US1: o 2D refatorado sem regressão e a câmera livre — já dá para olhar o mapa todo.
2. + US2 + US3: a isométrica vira vista de jogo (o objetivo do pedido).
3. + US4 + US5: acabamento visual e o rótulo legado.
4. Cada fase termina com `npm test` verde e o passo correspondente do quickstart.
