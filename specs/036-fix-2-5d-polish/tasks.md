---

description: "Task list for feature 036 — ajustes do 2,5D"
---

# Tasks: Ajustes do 2,5D — formulário de token, máscara em tons de cinza, chão e balões no 3D

**Input**: Design documents from `/specs/036-fix-2-5d-polish/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D9), data-model.md, contracts/ui-contracts.md, contracts/mcp-docs.md, quickstart.md

**Tests**: o plano define Vitest para as funções puras de `lib/` (já é o padrão do projeto) — as tarefas de teste abaixo fazem parte da entrega.

**Organization**: por história de usuário. US1 e US2 são independentes entre si; US3 e US4 mexem no mesmo desenhista de quadro
(`lib/raycastFrame.ts`), então vêm em sequência (US2 → US3 → US4). Todos os caminhos são relativos a `frontend/src/` salvo indicação.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: US1 formulário alinhado · US2 chão contínuo · US3 balões no 3D · US4 máscara em tons de cinza

---

## Phase 1: Setup

- [X] T001 Confirmar a linha de base: em `frontend/` rodar `npm run lint`, `npm test` e `npm run build` e anotar que estão verdes antes de qualquer mudança
- [X] T002 Congelar a referência de renderização **antes** de mexer no raycaster (FR-008, research D8): em `lib/raycastFrame.test.ts` adicionar o teste "quadro de referência (máscara só 0/255)" que desenha, com o código **atual**, uma cena fixa (máscara 5 × 5 preto/branco com bordas, mapa 4 × 4 colorido bem maior que o campo de visão, uma figura, câmera dentro do mapa, quadro 48 × 28, FOV 70) e compara um checksum (soma dos bytes e um hash FNV-1a 32 bits) mais 6 pixels de amostra com valores literais gravados no teste; rodar `npm test -- raycastFrame` e confirmar que passa

**Checkpoint**: baseline verde e referência gravada.

## Phase 2: Foundational

Nenhum pré-requisito bloqueante além do Setup: nenhuma entidade, endpoint ou provider novo.

---

## Phase 3: User Story 1 — Formulário de token com os quatro recortes alinhados (Priority: P1) 🎯 MVP

**Goal**: os quatro campos da aba "2,5D" têm palco quadrado de tamanho fixo (moldura 3:4 centralizada) e título, descrição, palco e controles alinhados linha a linha, em qualquer estado (vazio, imagem gravada, recortando).

**Independent Test**: quickstart §1 — abrir "Incluir token"/"Editar token", aba "2,5D", comparar os quatro campos nos três estados em tela larga e em celular; a diferença de tamanho/posição entre campos deve ser ≤ 1 px (SC-001).

- [X] T003 [P] [US1] Em `lib/frontImage.ts` exportar `STAGE` (`{ width: 1, height: 1 }`) e `frameInStage()` → `{ left: 0.125, top: 0, width: 0.75, height: 1 }` (a moldura `FRONT_IMAGE_ASPECT` centralizada no palco quadrado, derivada de `FRONT_IMAGE_ASPECT` e não digitada à mão); comentário dizendo que o CSS do palco segue estes números
- [X] T004 [P] [US1] Em `lib/frontImage.test.ts` testar `frameInStage`: largura ÷ altura da moldura no palco = `FRONT_IMAGE_ASPECT`, moldura centralizada (`left + width/2 = 0,5`) e dentro do palco (0 ≤ left, left + width ≤ 1)
- [X] T005 [US1] Em `components/ui/ImageCropper.tsx` adicionar a prop `stage?: boolean` (default false, nada muda sem ela): com `stage`, o recorte (`.stm-cropper`), a imagem já gravada (`showCurrent`) e o estado vazio (botão/seletor de arquivo sobre uma moldura tracejada com a silhueta de `cropAreaStyle`) são renderizados dentro de um único `<div className="stm-stage">`; os controles (zoom, rotação, remover/trocar, dica) passam para um `<div className="stm-stage-controls">`; o wrapper externo usa `display: contents` em modo `stage` para que os filhos entrem nas linhas do subgrid
- [X] T006 [US1] Em `styles/app.css` criar `.stm-stage` (`aspect-ratio: 1`, `width: 100%`, `max-width: 280px`, `margin-inline: auto`, fundo `#000`, `position: relative`, `overflow: hidden`), `.stm-stage-frame` (moldura 3:4: `left/width/height` em % vindos de `frameInStage`, borda tracejada), a imagem gravada com `object-fit: contain` na moldura, `.stm-stage-controls` (altura mínima para os controles de recorte) e `.stm-sprite-grid` (`display: grid`, `grid-template-columns: 1fr`; em `@media (min-width: 768px)` duas colunas e cada `.stm-sprite-field` com `grid-row: span 4; grid-template-rows: subgrid`); `.stm-cropper` dentro de `.stm-stage` com `height: 100%` (sem os 280 px fixos)
- [X] T007 [US1] Em `components/tokens/SpriteImageField.tsx` reorganizar o campo em quatro filhos diretos de `.stm-sprite-field` (título `label`, descrição `.form-text`, palco, controles) com `<ImageCropper stage … />`; manter `silhouetteCropStyle`, ids e props atuais; a descrição ganha `min-height` de 2 linhas só como reserva (o alinhamento vem do subgrid)
- [X] T008 [US1] Em `components/tokens/TokenFormFields.tsx` trocar o `row g-3` + `col-md-6` da aba "2,5D" por `<div className="stm-sprite-grid">` com um `SpriteImageField` por lado (painel continua `hidden` quando inativo; ids e `sprites.*` iguais); a aba "Token" fica como está
- [X] T009 [P] [US1] Em `i18n/locales/pt-BR.json` adicionar `tokens.stageEmpty` ("Escolha o arquivo") usado no estado vazio do palco (T005)
- [X] T010 [US1] Conferir que `components/modals/TokenModal.tsx` e `TokenEditModal.tsx` não precisam de mudança (mesmo `TokenFormFields`, FR-006) e rodar o quickstart §1 no navegador (tela larga e < 768 px, campo vazio / gravado / recortando, trocar de aba e voltar)

**Checkpoint**: US1 entregue e testável sozinha.

---

## Phase 4: User Story 2 — Chão contínuo depois da borda do mapa (Priority: P1)

**Goal**: fora da imagem do mapa o chão (e a cor de parede que toca a borda) continua com o pixel da borda mais próxima — sem preto e sem emenda.

**Independent Test**: quickstart §2 — olhar para além da borda do mapa em 3D: sem faixa preta; mapa sem imagem continua neutro.

- [X] T011 [US2] Em `lib/raycastFrame.ts` substituir `mapIndex` por duas funções: `mapIndex` (como hoje, −1 fora) e `clampedMapIndex` (u, v presos a `[0, 1)` → pixel da borda mais próxima; cantos = pixel do canto); o chão usa `clampedMapIndex`; a cor da parede usa `clampedMapIndex` quando o ponto lido cai fora da imagem; pixel com alpha < 128 → cor neutra (`DEFAULT_FLOOR`/`DEFAULT_WALL`); sem mapa → neutro como hoje; o `shade` por distância continua
- [X] T012 [US2] Em `lib/raycastFrame.test.ts` testar: ponto de chão à esquerda/direita/acima/abaixo da imagem recebe a cor da borda correspondente (não `DEFAULT_FLOOR`, não zero); borda com duas cores (esquerda areia, direita grama) estende cada trecho com a sua cor; canto = cor do canto; borda transparente → cor neutra; sem mapa → neutro; o teste de referência de T002 continua passando (dentro da imagem nada muda)

**Checkpoint**: US1 e US2 funcionam independentemente.

---

## Phase 5: User Story 3 — Balões de conversa no 3D (Priority: P2)

**Goal**: a fala ativa de cada peça em pé aparece sobre a cabeça da figura no 3D, acompanhando a câmera, legível, sem sair da tela e sumindo quando a figura some.

**Independent Test**: quickstart §3 — "Agir" com uma peça, abrir o 3D, ver o balão com o texto do 2D; mover a câmera; deitar a peça ou escondê-la atrás de parede alta; terminar o turno.

- [X] T013 [P] [US3] Criar `lib/storyBubbles.ts` conforme `contracts/ui-contracts.md`: constantes `REFERENCE_DEPTH` (`6 * HEX_SIZE`), `MIN_SCALE` 0,7, `MAX_SCALE` 1,2, `SCREEN_MARGIN` 8; `interface BubblePlacement { id; x; y; scale; visible; order }`; `bubblePlacement(sprite, frame, canvas, size)` (converte px do quadro → px do canvas, escala `clamp(REFERENCE_DEPTH / depth, MIN, MAX)`, limita `x` com a margem, se não couber acima passa o balão para baixo da cabeça, `null` quando `headVisible` é falso) e `orderByProximity` (mais perto = maior `order`)
- [X] T014 [P] [US3] Criar `lib/storyBubbles.test.ts`: escala por distância nos extremos e no meio; limite lateral esquerdo e direito; balão que não cabe acima vai para baixo; cabeça escondida → `null`; ordem por proximidade; dois balões na mesma região mantêm ordem estável
- [X] T015 [US3] Em `lib/raycastFrame.ts` exportar `FrameSprite` e `FrameResult` (`frameWidth`, `frameHeight`, `sprites[]` com `id`, `screenX`, `top`, `bottom`, `depth`, `headVisible`) e fazer `drawRaycastFrame` devolvê-lo: para cada figura projetada e desenhada, `screenX` = centro, `headVisible` = a coluna central na linha do topo não está atrás de parede (hoje `columnVisible(zBuffer, coluna, depth)`); figuras atrás da câmera ou fora do quadro não entram; assinatura mantida (o z-buffer ainda é parâmetro nesta fase)
- [X] T016 [US3] Em `lib/raycastFrame.test.ts` testar `FrameResult`: figura visível devolvida com `screenX` ≈ centro da tela quando está à frente; atrás de parede → `headVisible` falso; atrás da câmera → ausente; as figuras vêm com `id` da `RenderSprite`; os testes existentes continuam passando com o retorno novo
- [X] T017 [US3] Em `components/story/raycastRenderer.ts` aceitar `onFrame?: (result: FrameResult) => void` em `createRaycastRenderer(canvas, onFrame)` e chamá-lo após cada `draw()` (somente quando redesenhou); exportar o tipo `FrameResult`
- [X] T018 [P] [US3] Criar `components/story/BubbleLayer.tsx`: camada `position: absolute; inset: 0; pointer-events: none` com um `div.stm-story-bubble` por balão recebido em `bubbles: { id: number; name: string; text: string }[]`; expõe via `useImperativeHandle` (`forwardRef`) o método `update(result, canvasSize)` que chama `bubblePlacement`/`orderByProximity` e aplica `transform`, `opacity` e `zIndex` direto no DOM por `ref` (sem `setState` por quadro); cada balão tem `title`/`aria-label` `t('story.bubbleLabel', { name, text })` e o texto limitado a 3 linhas como no 2D
- [X] T019 [US3] Em `components/story/StoryView.tsx` ler `useTurn().entries`, calcular `lastActions` e `pieceKey` (de `lib/turnStatus`) para as peças **em pé** (`isShownIn3d`) da mesa, montar `bubbles` (id = `mapTokenId`, nome, texto) com `useMemo`, renderizar `<BubbleLayer ref=…>` sobre o canvas e ligar `onFrame` do renderizador a `bubbleLayer.update(result, { width: canvas.clientWidth, height: canvas.clientHeight })`; esconder todos os balões enquanto a câmera não estiver pronta; recalcular quando `entries`/`pieces` mudarem (tempo real já vem pelo `TurnContext`)
- [X] T020 [P] [US3] Em `styles/app.css` criar `.stm-story-bubbles` e `.stm-story-bubble` reaproveitando o visual de `.stm-bubble` do 2D (caixa branca, borda 2 px, cauda para baixo, 12–14 px, até 3 linhas, `max-width: 220px`, `transform-origin: 50% 100%`)
- [X] T021 [P] [US3] Em `i18n/locales/pt-BR.json` adicionar `story.bubbleLabel` ("{{name}} diz: {{text}}")

**Checkpoint**: US1–US3 funcionam; balões presentes com o z-buffer atual.

---

## Phase 6: User Story 4 — Máscara 3D com tons de cinza (Priority: P3, adiável)

**Goal**: o tom da máscara define a altura da parede (preto = inteira, branco = vazio, 50% cinza = metade); paredes baixas deixam ver o que há atrás acima do topo; máscaras só preto/branco ficam idênticas.

**Independent Test**: quickstart §4 — máscara com faixas preto / cinza 50% / branco: a parede cinza tem 50% ± 3% da altura da preta; máscara antiga renderiza igual (teste de referência de T002).

- [X] T022 [P] [US4] Em `lib/maskImage.ts` substituir o limiar por altura: constantes `MASK_MIN_HEIGHT` 0,05 e `MASK_FULL_HEIGHT` 0,95; `pixelHeight(r,g,b,a)` (1 − luminância/255, alpha < 128 = 0); `wallHeight(medianLuminance)` (< 0,05 → 0; ≥ 0,95 → 1; senão proporcional); `grayscalePixels` (luminância como cinza, transparente = branco) no lugar de `thresholdPixels`; remover `isMaskWall`/`MASK_THRESHOLD` se nada mais os usar (checar com Grep antes); `sameRatio`/`formatRatio`/`luminance` inalterados
- [X] T023 [P] [US4] Em `lib/maskImage.test.ts` trocar os testes de `isMaskWall`/`thresholdPixels` pelos casos de `contracts/ui-contracts.md`: `wallHeight(0)=1`, `(255)=0`, `(127,5)≈0,5`, `(10)=1`, `(245)=0`, `(200)≈0,216`; alpha baixo = vazio; `grayscalePixels` preserva tons, transparente vira branco e alpha 255
- [X] T024 [US4] Em `lib/raycaster.ts`: `MaskGrid.walls` → `heights: Uint8Array` (0–255); `buildMaskGrid` calcula a **mediana** da luminância por célula com histograma de 256 faixas por faixa de linhas de células (finalizar a linha de células quando a linha de origem muda; empate claro/escuro = vazio) e converte com `wallHeight`; `isWallAt` = altura > 0; `RayHit.height` (0–1); `castRay` devolve `RayHit[]` (perto → longe), registrando só células mais altas que a máxima já vista, parando na primeira de altura 1 ou na 8ª face; `wallColumn(perpendicular, frameHeight, projection, height = 1)` com `top = horizon − (height × WALL_HEIGHT − EYE_HEIGHT) × escala`; atualizar comentários e os tipos exportados
- [X] T025 [US4] Em `lib/raycaster.test.ts` migrar os testes de `walls` para `heights` e acrescentar: pixel cinza 50% → altura ≈ 0,5; cinza claro (≥ 95%) → 0; borda suavizada de máscara preto/branco → célula 0 ou 1 (nunca intermediária); empate → vazio; `castRay` com uma mureta à frente de uma parede alta devolve 2 faces com alturas crescentes; mureta atrás de parede alta não aparece; máximo de 8 faces; máscara só 0/255 → no máximo 1 face; `wallColumn` com altura 0,5 tem topo abaixo do horizonte (altura < olhos) e base igual à da parede inteira
- [X] T026 [US4] Em `lib/raycastFrame.ts`: substituir o z-buffer por `ColumnWalls` interno (até 8 pares `depth`/`top` por coluna) e exportar `hiddenAt(columnWalls, column, y, depth)`; pintar cada coluna com base de céu (acima do horizonte) e chão (abaixo, só nas linhas não cobertas por parede, com um `covered` por coluna) e depois as faces **da mais longe para a mais perto** (cor lida do mapa, `shade(perpendicular, side)`); a oclusão das figuras passa a ser por linha com `hiddenAt`; `headVisible` de `FrameResult` usa `hiddenAt` na linha do topo; remover o parâmetro `zBuffer` de `drawRaycastFrame` (nova assinatura `drawRaycastFrame(frame, scene, pose, fov, sky?)`) e atualizar `components/story/raycastRenderer.ts` (sem `zBuffer`)
- [X] T027 [US4] Em `lib/raycastFrame.test.ts`: o teste de referência de T002 passa **sem alterar os valores**; parede de cinza 50% ocupa 50% ± 3% da altura de uma parede preta à mesma distância (SC-004); atrás de uma mureta vê-se a parede alta e o céu acima do topo e o chão entre o topo e o horizonte; figura atrás de mureta aparece acima do topo e some abaixo dele; figura atrás de parede inteira continua totalmente escondida; célula quase branca não cria parede; adaptar os testes antigos à nova assinatura
- [X] T028 [P] [US4] Conferir `lib/storyCamera.ts` e `lib/storyCamera.test.ts`: `cameraBlocker` continua usando `isWallAt` (altura > 0); ajustar `maskWith` do teste se precisar (pixels pretos → altura 1) e adicionar um caso de parede baixa que também bloqueia a câmera
- [X] T029 [P] [US4] Em `components/modals/MaskPreview.tsx` usar `grayscalePixels` (prévia fiel aos tons) e em `i18n/locales/pt-BR.json` atualizar `raycast.maskFile`, `raycast.maskHint` ("Preto = parede alta, branco = vazio, cinza = parede mais baixa…") e `raycast.maskPreview` ("Prévia da máscara em tons de cinza"); revisar os outros usos de "preto e branco" da máscara (`MapEditModal`, `ThreeDImagesTab`, `ImageModal`) com Grep
- [X] T030 [P] [US4] Documentação do MCP conforme `contracts/mcp-docs.md`: `backend/Roll6.Mcp/Tools/MapModelTools.cs` (`MASK_IMAGE` e a descrição de `create_map_model`/`update_map_model`) e `backend/Roll6.Mcp/Roll6Guide.cs` (seção "3D view": tons de cinza, chão prolongado, balões); rodar `dotnet test --filter "FullyQualifiedName~Mcp"` em `backend/` e ajustar só o texto que algum teste fixe (contagem continua 86/87)

**Checkpoint**: todas as histórias entregues.

---

## Phase 7: Polish & Cross-Cutting

- [X] T031 Atualizar `CLAUDE.md`: no parágrafo "3D view (034)" registrar o palco do formulário 2,5D (`stm-stage`, subgrid), a máscara em tons de cinza (altura pela luminância, mediana por célula, várias faces por raio, `hiddenAt`), o chão preso à borda e os balões (`BubbleLayer`, `lib/storyBubbles`, `FrameResult`); em "Recent Changes" acrescentar a entrada `036-fix-2-5d-polish` (sem migração, sem endpoint, 86 operações / 87 tools)
- [X] T032 Em `frontend/` rodar `npm run lint`, `npm test` e `npm run build` e corrigir o que aparecer (inclusive o tamanho do chunk lazy do `StoryView`)
- [ ] T033 Executar o `quickstart.md` inteiro no navegador (§1–§4) e conferir SC-001 (≤ 1 px entre campos), SC-002 (mesma escala no 3D), SC-003 (sem preto em 3 mapas), SC-004 (50% ± 3%), SC-005 (balão em ≤ 2 s) e SC-006 (≥ 30 fps com ~50 peças, balões, paredes de alturas diferentes e chão prolongado, medido no Performance do navegador)

---

## Dependencies & Execution Order

- **Setup (T001–T002)** primeiro; T002 precisa rodar **antes** de T011, T015 e T024–T026.
- **US1 (T003–T010)** é independente de tudo: pode ser feita em paralelo com US2/US3.
- **US2 (T011–T012)** → **US3 (T015–T016, T017, T019)** → **US4 (T024–T027)**: as três editam `lib/raycastFrame.ts` (e seu teste), então em sequência. US3 não depende de US2 logicamente, mas compartilha o arquivo.
- US4 depende de US3 só pelo `FrameResult`/`headVisible` (T026 passa a usar `hiddenAt`).
- Dentro de cada história: lib pura e testes antes dos componentes (T013→T018/T019; T022/T024→T026→T029).
- **Polish (T031–T033)** por último.

### Parallel opportunities

- US1: T003 ∥ T004 ∥ T009 (depois T005 → T006/T007 → T008).
- US3: T013 ∥ T014 ∥ T018 ∥ T020 ∥ T021 (T015 → T016 → T017 → T019 em sequência).
- US4: T022 ∥ T023 ∥ T028 ∥ T029 ∥ T030 (T024 → T025 → T026 → T027 em sequência).
- US1 inteira pode ser feita por outra pessoa enquanto US2→US3→US4 avançam.

## Implementation Strategy

- **MVP**: Setup + US1 (formulário alinhado) — o problema que contamina o cadastro e a avaliação do 3D.
- **Entrega incremental**: US1 → US2 (chão, correção pequena) → US3 (balões) → US4. Cada fase termina com `npm test` verde e o item correspondente do `quickstart.md`.
- **US4 é adiável** (P3, pedido do usuário "se for muito complexo, pode deixar"): se for adiada, as demais não são afetadas; nesse caso T022–T030 ficam fora e T031 só documenta US1–US3. O ponto de decisão é depois de T025 (mediana e várias faces): se o desempenho (SC-006) ou a compatibilidade (T002/T027) não fecharem, parar e reportar.

## Summary

- Total: **33 tarefas** (T001–T033).
- Por fase: Setup 2 · US1 8 · US2 2 · US3 9 · US4 9 · Polish 3.
- Testes de referência: T002 (antes), T004, T012, T014, T016, T023, T025, T027, T028.

## Notas da execução (2026-10-05)

**Desvios menores, todos na direção de menos código:**

- **T005/T006**: em modo `stage` o `ImageCropper` devolve um *fragment* (`input` escondido + `.stm-stage` +
  `.stm-stage-controls`) em vez de um wrapper com `display: contents` — o resultado no DOM é o mesmo: os filhos caem
  direto nas linhas do `.stm-sprite-field`. E a caixa da moldura 3:4 é aplicada **inline** a partir do `aspect` do
  recorte (`min(1, aspect)` × altura do palco, centrada), que é exatamente o que `frameInStage()` mede — assim o CSS
  não repete percentuais. `STAGE`/`frameInStage` continuam em `lib/frontImage` e presos por teste (T004).
- **`BubblePlacement`** ganhou `below` e `depth` além dos campos do contrato: `below` diz ao CSS para que lado aponta a
  cauda (um balão pendurado abaixo da cabeça não pode apontar para baixo) e `depth` é o que `orderByProximity` ordena —
  sem ele a ordem precisaria de volta o `FrameResult`. `visible` passou a ter uso real: falso quando o balão não cabe na
  tela nem acima nem abaixo.
- **`raycastRenderer`**: adicionado `refresh()`. Sem ele uma fala nova não redesenha nada (o renderizador só desenha
  quando algo mudou) e o balão nasceria invisível — T019 pede recalcular quando `entries` mudam.
- **T016/T027**: com a oclusão por linha, `headVisible` falso só acontece quando a parede mais próxima cobre a própria
  linha do topo da figura (com as laterais ainda sendo desenhadas). O teste que afirmava "parede no meio esconde a
  cabeça" valia para o z-buffer antigo e inverteu com a regra nova — reescrito nos dois sentidos (cabeça por cima do
  topo da parede mantém o balão; parede que cobre o topo tira o balão mantendo o corpo desenhado nas colunas de fora).

**O que NÃO foi verificado aqui** (máquina de dev sem banco e sem navegador):

- Itens de navegador: T010 (§1) e T033 (§1–§4) e, com eles, **SC-001** (≤ 1 px entre campos), **SC-003** (sem preto em
  3 mapas), **SC-005** (balão em ≤ 2 s) e **SC-006** (≥ 30 fps). O alinhamento ≤ 1 px e o efeito do palco só existem no
  navegador; nada aqui mede isso. T033 ficou marcada como pendente.
- De SC-006 há só evidência indireta: medido **no node**, um quadro 480×270 com 50 peças (25 dentro do quadro), várias
  faces por raio e chão prolongado custa **5,06 ms** por quadro — folga para os 33 ms dos 30 fps, mas é CPU de script,
  não fps de navegador. `buildMaskGrid` de uma máscara 512×288 custou ~20–30 ms, uma vez por carga do mapa.
- Compatibilidade (FR-008) **verificada**: o quadro de referência de T002 (checksum 619251, FNV-1a 4240962842, seis
  pixels amostra) passou sem alterar nenhum número com o raio de várias faces, a pintura de trás para frente e a
  oclusão por linha.
- Rodaram: `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit`, `npm test` (**461** testes, eram 412),
  `npm run build` (chunk `StoryView` 12,60 → 15,73 kB, gzip 6,42), `dotnet build`, `dotnet test` (**1084**) e o filtro
  `~Mcp` (449; cobertura ainda **86 operações / 87 ferramentas** — nenhum endpoint novo).

**Fora do `tasks.md`, no mesmo branch (2026-10-05, depois das tarefas acima)** — mudanças sem tarefa correspondente
aqui, que não escrevi nesta sessão e que verifiquei rodando as suítes, não por revisão minha:

- **Textura das paredes**: `map_models.wall_texture_image` (migração `AddWallTextureImage` +
  `database/migrations/036-wall-texture.sql`, DTO/serviço/MCP/guia, `lib/wallTexture`, upload na aba "3D" e em "Editar
  mapa", `raycastRenderer.setWallTexture`, desenho em `raycastFrame`) — **é a única mudança de esquema deste PR**; sem
  textura as paredes continuam coloridas pela imagem do mapa.
- `lib/spriteFit.fitSprites`: os quatro lados desenhados com a **mesma altura** (cada recorte é manual, então a figura
  parecia crescer ao virar em volta).
- `isShownIn3d` passou a exigir também `frontImageUrl`: peça cujo token não tem "2,5D frente" sai do 3D **e do balão**
  (muda a cadeia de reserva da 035 para esse caso).
- `DiceRoller`: um clique no resultado esconde os dados na hora (`map.diceHide`).
- **Postura inicial do NPC na biblioteca**: `npcs.posture` (migração `AddNpcPosture` +
  `database/migrations/036-npc-posture.sql`, MCP `posture` em `create_npc`/`update_npc`, campo no formulário de NPC) — a
  postura com que cada nova ocorrência no mapa começa. É a **segunda mudança de esquema** deste PR.

Com isso incluído: `npm test` **515** testes (38 arquivos), `npm run build` com `StoryView` em 18,72 kB (gzip 7,64) e
`dotnet test` **1109**. Os números acima (461 / 15,73 kB / 1084) são do estado anterior a este acréscimo.
