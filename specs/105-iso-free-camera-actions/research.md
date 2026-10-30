# Research: Câmera livre e jogo completo na vista isométrica (105)

Nenhum item do Technical Context ficou em aberto; as decisões abaixo saem da leitura do código atual
(`components/iso/IsoView.tsx`, `isoRenderer.ts`, `isoPieces.ts`, `lib/isoCamera.ts`, `components/map/MapCanvas.tsx`,
`hooks/useTokenMovement.ts`, `lib/storyBubbles.ts`, `components/story/BubbleLayer.tsx`).

## R1 — Deslizar a câmera (botão esquerdo) e a luz junto

- **Decision**: o `IsoPose.target` passa a ser do usuário (não mais do foco). Arrastar com o botão esquerdo calcula o
  ponto do chão sob o ponteiro antes e depois (`renderer.floorAt(clientX, clientY)`, raio contra o plano y = 0) e soma a
  diferença ao alvo — o chão "gruda" no ponteiro em qualquer giro/inclinação. Função pura `panTo(pose, grabbed, now,
  bounds)` em `lib/isoCamera` + `clampTarget` (centro dentro do retângulo do mapa, `mapBounds(columns, rows)`).
- O círculo de luz já usa `pose.target` como centro (`uniforms.lightCenter`, sol, chão das sombras e `frameResult.lit`):
  deslizar o alvo move a luz sem nada novo — exatamente a resposta da clarificação (B).
- **Rationale**: "grab the floor" é o pan esperado em vistas oblíquas; converter delta de tela por eixos da câmera
  distorce com a inclinação.
- **Alternatives**: delta de tela × eixos da câmera (desliza mais rápido que o mouse longe do centro); mover a câmera sem
  mover a luz (rejeitado pela clarificação).

## R2 — Girar/inclinar (botão direito) e o foco

- **Decision**: `orbitBy` atual passa para o botão direito (`event.button === 2` / `buttons & 2`); o menu de contexto é
  sempre suprimido no canvas. O foco deixa de seguir a peça: `setFocus(center, animate)` vira `glideTo(center)` e só é
  chamado (a) na primeira montagem do renderer (salto) e (b) quando o usuário escolhe no `IsoFocusSelect` (desliza
  `FOCUS_EASE_SECONDS`). O efeito atual que reagia a `center.x/center.y` (peça movida) é removido (FR-003).
- O clique numa peça iluminada deixa de trocar o foco (`candidateAt` sai do `IsoView`; continua no lib para o seletor).
- **Toque**: um dedo desliza; dois dedos: pinça = zoom (como hoje), torção = giro (ângulo entre os dedos), deslocamento
  vertical do ponto médio = inclinação. Toque curto = clique.

## R3 — Clique × arraste e qual hex vale

- **Decision**: mesmo limiar do 2D (`CLICK_TOLERANCE` 4 px, sem limite de tempo — o 2D não tem) para os dois botões.
  O hex do clique: primeiro um raio contra as peças desenhadas (`renderer.pieceAt(clientX, clientY)` → `mapTokenId`, a
  mais próxima da câmera, só peças visíveis/iluminadas); senão `hexAt` do chão. Uma peça escondida no escuro é
  alcançada pelo hex do chão (FR-012).
- Peça atingida → o hex usado é o `(x, y)` da peça (o menu é de quem foi clicado, FR-010).

## R4 — Reaproveitar menu, alvo, Mover e soltar cartões do 2D

- **Decision**: extrair de `MapCanvas` toda a lógica que não depende do SVG para um hook compartilhado
  `hooks/useMapInteraction` (estado do menu, hex selecionado/`pickedHex`, `targeting` 098, permissões `canMove`/
  `canTakeTurn`/`canSetPosture`/`isOwnPiece`, `clickWhileMoving`, `onDrop`/`dropNpc`/`acceptsDrag`, `shapeAt`,
  `hoverShape`/`selectedShape`, dados de `movePreview`/`moveDestination`/`moveStatus`) e um componente
  `components/map/MapHexMenu` (o `<HexMenu>` com todas as props + `MovementCounter`). As entradas da vista são só
  coordenadas: `hexAt` e o ponto do mapa (para a direção do Mover) são passados pelo chamador — SVG usa
  `useMapPointer`/`toMapPoint`, a isométrica usa `renderer.hexAt`/`floorAt`.
- `MapCanvas` passa a usar o hook (mesmo comportamento, coberto pelos testes existentes) e `IsoView` recebe as mesmas
  props de `MainPage` (`onPickToken`, `onDeleteToken`, `onEditNpc`, `onAct`, `onRepeated`, `onResetTurn`, `picking`).
- **Rationale**: SC-002 exige 0 diferenças de opções; uma única fonte de permissões garante isso.
- **Alternatives**: copiar a lógica para o `IsoView` (duas fontes divergiriam); renderizar o `MapCanvas` invisível por
  cima (eventos e transformações não batem com a projeção).

## R5 — Desenhar menu, destaques e Mover na cena

- Destaques (hover azul, selecionado cinza) e o caminho/destino do Mover (cores ok/over/blocked de `MovementLayer`)
  viram faixas no chão reaproveitando `isoStrips.stripGeometry` e o padrão de `disc` de `isoPieces`: um grupo
  `overlays` no renderer com `setOverlays({ hover, selected, path, destination, status })` (hexes → preenchimento +
  contorno, levemente acima da grade, com luz aplicada? **não** — destaques ignoram a luz para serem vistos no escuro).
- Prévia da peça no Mover: `IsoView` passa `pieces` já com a posição/direção da prévia (`previewOf`) aplicada à peça em
  movimento (`{ ...token, x, y, look }`), como o `TokenLayer` faz no 2D; `isoPieces` já reposiciona sem recarregar.
- `MovementCounter` e `HexMenu` são HTML posicionados na tela (menu no ponto do clique, como no 2D).
- Balões escondidos durante o Mover (como o 2D).

## R6 — Balões acima da cabeça e transparentes

- **Causa do problema**: `bubblePlacement` limita a âncora a `BALLOON_CEILING` (40 % da altura) — pensado para a câmera
  em 1ª pessoa do 3D (081). Na isométrica, qualquer cabeça na metade de cima da tela tem o balão empurrado para baixo,
  sobre o corpo ou longe dela.
- **Decision**: `bubblePlacement(…, { ceiling })` com `ceiling` opcional (padrão = `BALLOON_CEILING`, o 3D legado não
  muda); a isométrica passa `ceiling: 0` (sempre logo acima da cabeça; só vai para baixo quando não cabe acima). A
  altura da âncora continua de `anchors()` (modelo `sceneHeight` / figura + base; deitada = ponto mais alto).
- **Transparência**: `BubbleLayer` ganha o mesmo comportamento de `SpeechBubbleLayer` (2D): ouvinte `pointermove` na
  janela, `is-see-through` quando o ponteiro está dentro da caixa do balão; a camada já é `pointer-events: none`, então
  cliques atravessam. A regra CSS `.stm-bubble.is-see-through` passa a cobrir `.stm-story-bubble.is-see-through` (o 3D
  legado ganha de brinde, sem custo).

## R7 — "3D (legado)"

- **Decision**: só o texto `story.view3dItem` em `pt-BR.json` → `"3D (legado)"`, e a ordem do menu em `MapControls`
  vira 2D, Isométrica, 3D (legado). Valor salvo `'3d'` inalterado (`roll6:view-mode` continua válido).

## R8 — Troca de vista cancela tudo

- O hook vive dentro de cada vista (`MapCanvas`/`IsoView`); trocar de vista desmonta a vista, e com ela o menu, o alvo e
  o movimento — nada é salvo (FR-019). `useTokenMovement` já cancela em troca de mapa/modo livre/peça alterada.
