---
description: "Task list for 103-isometric-lit-view"
---

# Tasks: Vista isométrica iluminada

**Input**: Design documents from `C:\repos\Roll6\specs\103-isometric-lit-view\`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/iso-view.md, quickstart.md

**Tests**: a spec não pede TDD; seguindo o padrão do repositório, os módulos puros novos (`lib/isoLight`, `lib/isoCamera`,
`lib/isoFocus`) e as extensões (`lib/viewMode`, `modelSet` `still`) ganham testes Vitest. O render three.js é verificado
pelo `quickstart.md`.

**Organization**: tarefas agrupadas por user story (spec.md). Tudo em `frontend/src/` (só frontend).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1…US5 da spec

---

## Phase 1: Setup

**Purpose**: textos, ícone e estilos que várias histórias usam.

- [X] T001 [P] Adicionar `IsoViewIcon` em `frontend/src/components/ui/icons.tsx` com o path oficial do Bootstrap Icon `box` (mesmo padrão dos outros ícones: `currentColor`, prop `size`)
- [X] T002 [P] Adicionar os textos `story.viewChoose` "Escolher vista", `story.view2dItem` "Mapa 2D", `story.viewIso` "Isométrica", `story.view3dItem` "3D", `iso.focus` "Foco: {{name}}", `iso.focusMine` "Voltar ao meu personagem", `iso.noFocus` "Sem personagem no mapa", `iso.loading` "Carregando a vista isométrica…" em `frontend/src/i18n/locales/pt-BR.json`
- [X] T003 [P] Adicionar as classes `.stm-iso` (ocupa a região do mapa como `.stm-story`, fundo `#000`, `touch-action: none`, cursor `grab`/`grabbing`), `.stm-iso canvas` e `.stm-iso-focus` (canto superior esquerdo, abaixo de `--stm-menu-height`, sem cobrir os controles do mapa) em `frontend/src/styles/app.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o tipo de vista, os módulos puros e o esqueleto do renderizador que todas as histórias usam.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

- [X] T004 Estender `ViewMode` para `'2d' | '3d' | 'iso'` em `frontend/src/lib/viewMode.ts`: `readViewMode` devolve `'3d'` ou `'iso'` quando gravados e `'2d'` para qualquer outro valor; atualizar o comentário do topo (103)
- [X] T005 [P] Testes de `readViewMode`/`writeViewMode` com `'iso'`, valores antigos e valor inválido em `frontend/src/lib/viewMode.test.ts`
- [X] T006 [P] Criar `frontend/src/lib/isoLight.ts`: `LIGHT_RADIUS_HEXES = 5`, `lightRadiusPx(size = HEX_SIZE)` = `LIGHT_RADIUS_HEXES × √3 × size` (distância entre centros vizinhos flat-top, importar `HEX_SIZE` de `lib/hexGrid`), `LIGHT_FEATHER_PX` (0,4 hex), `lightFactor(dist)` = `1 − smoothstep(radius − feather, radius, dist)` e `isLit(dist)` = `dist ≤ radius`; comentário dizendo que o shader de `components/iso/isoLightMaterial.ts` usa a mesma fórmula
- [X] T007 [P] Testes de `lightFactor`/`isLit` (centro = 1, raio + 1 = 0, borda entre 0 e 1, monotônica; peça a 3/5/8 hexes) em `frontend/src/lib/isoLight.test.ts`
- [X] T008 [P] Criar `frontend/src/lib/isoFocus.ts`: `focusCandidates(party, tokens, mapId)` (participações aprovadas na ordem de `party` com peça `tokenType` Character no mapa aberto, devolvendo `{ campaignCharacterId, characterId, name, center }` com `center` = `hexCenter` da peça), `initialFocus(candidates, chosenCharacterId)` (o escolhido se estiver na lista, senão o primeiro, senão `null`) e `resolveFocus(current, candidates, chosenCharacterId)` (mantém `current` se ainda for candidato, senão `initialFocus`); `focusCenter(focus, candidates, gridSize)` = centro da peça ou o meio do mapa
- [X] T009 [P] Testes de `isoFocus` (jogador com peça, jogador sem peça, mestre = primeiro do grupo, nenhum candidato = meio do mapa, foco que sai do mapa volta ao inicial, ordem do painel) em `frontend/src/lib/isoFocus.test.ts`
- [X] T010 Criar o esqueleto `frontend/src/components/iso/isoRenderer.ts` conforme `contracts/iso-view.md`: `createIsoRenderer(canvas, { msaa })` com `WebGLRenderer` (lança se não houver WebGL), `Scene` de fundo preto, `OrthographicCamera` olhando para o alvo, `resize`, `setQuality`, `dispose` (libera geometrias, materiais, texturas) e um laço de render sob demanda (`requestRender`, um `requestAnimationFrame` por mudança, contínuo só enquanto algo anima)
- [X] T011 Criar `frontend/src/components/iso/IsoView.tsx` (default export, lazy): `<div className="stm-iso">` com canvas, `ResizeObserver` → `renderer.resize`, cria o renderer uma vez (erro → `onUnsupported()`), lê o draft de `useMapEditor()` e chama `setMap`; mostra `iso.loading` até o primeiro quadro
- [X] T012 Em `frontend/src/pages/MainPage.tsx`, importar `IsoView` com `React.lazy` e renderizá-lo quando `viewMode === 'iso'` dentro do mesmo `Suspense` da `StoryView` (fallback com `iso.loading`), com `onUnsupported` = toast `story.noWebgl` + `setViewMode('2d')`; `'3d'` continua montando `StoryView`

**Checkpoint**: `setViewMode('iso')` mostra uma cena preta no lugar do mapa e volta ao 2D sem erros.

---

## Phase 3: User Story 1 — Escolher entre a vista isométrica e o 3D atual (Priority: P1) 🎯 MVP

**Goal**: do 2D o usuário escolhe "Isométrica" ou "3D"; a escolha é lembrada por mapa.

**Independent Test**: no 2D, menu de vista → "Isométrica" (2 cliques); recarregar reabre isométrica; "3D" abre a vista atual igual a antes; "Mapa 2D" volta.

- [X] T013 [US1] Em `frontend/src/components/map/MapControls.tsx`, trocar o botão 2D/3D por um `DropdownMenu` do Radix (`modal={false}`, classes `dropdown-menu`/`dropdown-item` como `components/menu/UserMenu.tsx`) com os itens "Mapa 2D" (`MapIcon`), "Isométrica" (`IsoViewIcon`) e "3D" (`View3dIcon`), cada um `DropdownMenu.CheckboxItem`/`RadioItem` com o atual marcado, chamando `setViewMode`; o botão mostra o ícone da vista atual, `btn-info` fora do 2D, `title`/`aria-label` = `story.viewChoose`
- [X] T014 [US1] Em `frontend/src/components/map/MapControls.tsx`, tratar `'iso'` como 3D para esconder os botões de imagem/redimensionar e fazer os +/− chamarem `storyZoom(-1)`/`storyZoom(1)` (handler registrado pela vista) sem usar `fov`; manter o comportamento de `'3d'` intacto
- [X] T015 [US1] Conferir em `frontend/src/Contexts/MapEditorContext.tsx` que `setViewMode`/a restauração por mapa aceitam `'iso'` (tipos de `lib/viewMode`) e que trocar de mapa reabre a vista gravada; ajustar onde houver comparação só com `'3d'` (ex.: `storyWalking`, `fov`) para não aplicar à isométrica
- [X] T016 [US1] Revisar outros usos de `viewMode === '3d'` (`grep -rn "viewMode" frontend/src`) — centralização de mapa, `GridSizeFooter`, compartilhamento — e decidir por `'iso'`: a isométrica se comporta como o 3D (sem compartilhar a imagem 2D enquanto aberta só se hoje o 3D também não compartilha)

**Checkpoint**: US1 completa — a escolha funciona e o 3D atual não mudou.

---

## Phase 4: User Story 2 — O círculo de luz em volta do personagem (Priority: P1)

**Goal**: mapa plano com imagem e grid; só o círculo de 5 hexes em volta do personagem é iluminado; fora, escuro com névoa; peças cortadas na borda.

**Independent Test**: personagem num ponto: imagem e grid claras no círculo de 5 hexes em volta dele e escuras com névoa fora; máscara/paredes/céu nunca aparecem; mover a peça no 2D (outra aba) move o círculo. O corte das peças na borda (peças a 3/5/8 hexes) é verificado em US4, quando as peças passam a ser desenhadas.

- [X] T017 [P] [US2] Criar `frontend/src/components/iso/isoLightMaterial.ts`: `createLightUniforms()` (`lightCenter: Vector2`, `lightRadius`, `lightFeather`, `fogTime`) com valores de `lib/isoLight`, e `applyLight(material, uniforms, kind: 'floor' | 'piece')` via `onBeforeCompile` (varying com a posição de mundo XZ; `floor`: `gl_FragColor.rgb *= max(factor, fog)` onde `fog` é um ruído de valor 2D animado por `fogTime`, baixo, que some perto do círculo; `piece`: mesmo escurecimento e `discard` quando `dist > lightRadius`); `customProgramCacheKey` por `kind`; comentário apontando a fórmula de `lib/isoLight`
- [X] T018 [US2] Em `frontend/src/components/iso/isoRenderer.ts`, implementar `setMap`: chão neutro escuro grande (`PlaneGeometry` além do mapa), plano com a textura da imagem do mapa na posição/escala do 2D (`imageLeft`/`imageTop`/tamanho exibido do draft; mapa em px, y = 0, Z = linhas como no `floorPlane` do 081), ambos com `applyLight(…, 'floor')`; trocar só a textura quando a imagem muda; sem imagem = só o chão neutro; nunca ler máscara, textura de parede ou fundo
- [X] T019 [US2] Em `frontend/src/components/iso/isoRenderer.ts`, desenhar a grid: `LineSegments` com as arestas de cada hex de `hexCorners(hexCenter(x, y, HEX_SIZE), HEX_SIZE)` para `columns × rows` (arestas compartilhadas uma vez, chave pelos dois cantos arredondados), y = 0,5, cor clara com opacidade baixa, `applyLight(…, 'floor')`; refazer só quando o tamanho da grid muda
- [X] T020 [US2] Em `frontend/src/components/iso/isoRenderer.ts`, implementar `setFocus(center, animate)` atualizando `lightCenter` (e o alvo da câmera); o relógio da névoa (`fogTime`) faz o laço render contínuo lento (≤ 30 fps) só enquanto a vista está visível (`document.visibilityState`)
- [X] T021 [US2] Em `frontend/src/components/iso/IsoView.tsx`, ligar o foco inicial: `focusCandidates(useCharacter().party, useMapToken().tokens, draft.mapId)` + `initialFocus(…, personagem escolhido de useCharacter())` + `focusCenter` → `renderer.setFocus(center, false)` na abertura; quando as peças mudarem, `resolveFocus` e `setFocus(center, true)` se o centro mudou (o círculo segue a peça)

**Checkpoint**: chão, grid e luz funcionam; a luz segue a peça do personagem.

---

## Phase 5: User Story 3 — Girar a câmera e dar zoom (Priority: P2)

**Goal**: girar, inclinar dentro de limites e dar zoom por roda, pinça e +/−.

**Independent Test**: arrastar gira/inclina sem passar do chão nem ficar vertical; roda, pinça e +/− aproximam e afastam; a página não rola no celular.

- [X] T022 [P] [US3] Criar `frontend/src/lib/isoCamera.ts`: `IsoPose { target, yaw, pitch, span }`, `DEFAULT_ISO_POSE` (pitch 35,26°, span 14), `PITCH_MIN = 30`, `PITCH_MAX = 70`, `SPAN_MIN = 4`, `SPAN_MAX = 30` (em hexes de altura), `clampIso(pose)` (yaw em (−π, π]), `orbitBy(pose, dx, dy)` (px de arrasto → yaw/pitch), `zoomBy(pose, steps)` (fator multiplicativo por passo), `isoCameraPosition(pose)` (posição na esfera em volta do alvo, distância fixa grande o bastante para não cortar), `frustumFor(pose, aspect)` (meia altura = `span × √3 × HEX_SIZE / 2`) e `easeTarget(from, to, t)` (ease-out, duração `FOCUS_EASE_SECONDS` 0,6)
- [X] T023 [P] [US3] Testes de `isoCamera` (limites de pitch e span, yaw normalizado, zoom de ida e volta, câmera sempre acima do chão, easing termina no destino) em `frontend/src/lib/isoCamera.test.ts`
- [X] T024 [US3] Em `frontend/src/components/iso/isoRenderer.ts`, implementar `setPose(pose)` aplicando `isoCameraPosition`/`frustumFor` à `OrthographicCamera` (e no `resize`), e a animação do alvo de `setFocus(…, true)` com `easeTarget` (luz e câmera andam juntas)
- [X] T025 [US3] Em `frontend/src/components/iso/IsoView.tsx`, entrada: um ponteiro arrastando → `orbitBy` (captura do ponteiro, cursor `grabbing`); dois ponteiros → pinça → `zoomBy` (sem girar); roda → `zoomBy` via listener nativo não passivo (`preventDefault`, a página nunca rola); registrar `registerStoryZoom(steps => zoomBy)` ao montar e `null` ao desmontar; pose em `useRef` + `renderer.setPose`, sem render React por quadro

**Checkpoint**: câmera completa.

---

## Phase 6: User Story 4 — As peças paradas, com os modelos dos tokens (Priority: P2)

**Goal**: cada peça com modelo parado em "Parado" (com armas), senão figura 2,5D, senão imagem no chão; virada pelo `look`, no tamanho da peça; segue o tempo real; cortada na borda.

**Independent Test**: três tokens (modelo + armas, só figura, só imagem) no círculo: modelo parado com armas, figura encarando a câmera, imagem deitada no chão; mover/trocar token em outra aba atualiza.

- [X] T026 [US4] Em `frontend/src/components/story/modelSet.ts`, adicionar o terceiro parâmetro opcional `options?: { still?: boolean; patchMaterial?: (material: Material) => void }`: com `still`, depois de montar as ações tocar só a de "Parado" e fazer `mixer.update(0)` uma vez (medindo encaixes como hoje), e `update(delta)` nunca avança esses mixers (devolve `false`); com `patchMaterial`, clonar o material de cada `Mesh` da instância (e das armas penduradas por `createWeaponSockets`) e chamar o patch no clone; sem `options` nada muda
- [X] T027 [P] [US4] Testes da opção `still` (o mixer não avança com `update`, o modelo fica no primeiro quadro, `update` devolve `false`) e de `patchMaterial` (recebe clones, o material do asset original fica intocado) em `frontend/src/components/story/modelSet.test.ts` (criar; usar um `Object3D`/`Mesh` mínimo e um asset falso como os testes de `weaponSockets.test.ts`)
- [X] T028 [US4] Criar `frontend/src/components/iso/isoPieces.ts`: `toIsoPiece(token: MapTokenInfo)` (`kind` model/figure/flat por `modelFileUrl`/`frontImageUrl`, `center` = `hexCenter`, `look`, `space`, `isCharacter` = `tokenType` Character, `model` = `ModelSpec` com `lying: false`, `ground: 0`, `clips`/`scale`/`weapons` como em `spriteSpec`/`socketWeaponsOf`) e `createPieceLayer(scene, uniforms, onChange)` com `setPieces` em diff por id: `figure` = plano vertical com a textura do lado visto (`lib/billboard.figureView` / `lib/spriteView`, mesmo tamanho de `spriteSpec`), girado em yaw para a câmera a cada `setPose`; `flat` = malha no formato de `footprintLocal(space, HEX_SIZE)` com a imagem de pé do token (`pieceImage`), girada `(look − 3) × 60°` como o 2D, y = 0,8; materiais com `applyLight(…, 'piece')`; texturas por URL em cache local da vista
- [X] T029 [US4] Em `frontend/src/components/iso/isoPieces.ts`, ligar os modelos: `createModelSet(scene, events, { still: true, patchMaterial: m => applyLight(m, uniforms, 'piece') })`; enquanto o modelo carrega ou se falhar, mostrar a figura (ou a imagem plana) da peça; `onReady` esconde o substituto
- [X] T030 [US4] Em `frontend/src/components/iso/isoRenderer.ts` e `IsoView.tsx`, implementar `setPieces` chamando a camada de peças e alimentá-la com `useMapToken().tokens` do mapa aberto mapeados por `toIsoPiece` (efeito por mudança de lista; nada recarrega o que não mudou); `setQuality` aplica pixel ratio, MSAA (remonta o renderer como a `StoryView`) e anisotropia de `lib/viewQuality`

**Checkpoint**: peças completas e em tempo real.

---

## Phase 7: User Story 5 — Mudar o foco para outro personagem (Priority: P2)

**Goal**: qualquer usuário troca o foco para outro PJ (clique na peça ou seletor) sem recarregar nada; o mestre começa no primeiro PJ.

**Independent Test**: dois PJs a 10 hexes: focar no segundo leva câmera e luz até ele em < 1 s sem piscar nem recarregar; "Voltar ao meu personagem" retorna; mestre começa no primeiro do painel.

- [X] T031 [US5] Em `frontend/src/components/iso/isoRenderer.ts`, implementar `pick(clientX, clientY)`: `Raycaster` nos objetos das peças com `isCharacter` (modelo, figura ou imagem), ignorando pontos fora da luz (`isLit` da distância ao centro), devolvendo o `mapTokenId` mais próximo ou `null`
- [X] T032 [US5] Em `frontend/src/components/iso/IsoView.tsx`, guardar o foco em estado local (`campaignCharacterId | null`, inicial por `initialFocus`, reavaliado com `resolveFocus` quando `party`/peças mudam); um clique (< 4 px e < 300 ms entre `pointerdown` e `pointerup`) chama `pick` e, se for uma peça de personagem candidata, troca o foco → `renderer.setFocus(center, true)`; nunca chamar `setMap`/`setPieces` por causa do foco
- [X] T033 [P] [US5] Criar `frontend/src/components/iso/IsoFocusSelect.tsx`: dropdown Radix (`modal={false}`) com classe `.stm-iso-focus`, gatilho "Foco: {nome}" (`iso.focus`, ou `iso.noFocus` sem candidato), itens = candidatos de `focusCandidates` na ordem do painel (o atual marcado) e, para quem tem personagem escolhido com peça, "Voltar ao meu personagem" (`iso.focusMine`); props `{ candidates, focus, ownFocus, onFocus }`
- [X] T034 [US5] Montar `IsoFocusSelect` em `frontend/src/components/iso/IsoView.tsx` ligado ao estado de foco de T032

**Checkpoint**: todas as histórias funcionam de forma independente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T035 [P] Conferir que `three` só entra em chunks lazy (`npm run build` e o relatório do Vite em `frontend/`: nenhum import estático de `components/iso/*` fora do `React.lazy` de `MainPage.tsx`)
- [X] T036 [P] Celular: em `frontend/src/components/iso/IsoView.tsx`, um dedo gira, dois dão zoom, sem rolar a página; `IsoFocusSelect` não cobre os controles nem o painel do grupo em < 768 px (`frontend/src/styles/app.css`)
- [X] T037 Liberar tudo ao sair da vista (renderer, texturas em cache, `modelSet.dispose`, listeners, `registerStoryZoom(null)`) e conferir que voltar ao 2D e reabrir não vaza contextos WebGL, em `frontend/src/components/iso/IsoView.tsx`
- [X] T038 Adicionar o parágrafo "Isometric lit view (103)" na seção "Frontend layout and commands" de `CLAUDE.md` (módulos, `'iso'` em `roll6:view-mode`, raio em `lib/isoLight`, `modelSet` `still`/`patchMaterial`, foco local) e trocar "(planned)" da entrada 103 em "Recent Changes"
- [ ] T039 (lint, testes e build OK; falta percorrer o quickstart no navegador) Rodar `npm run lint`, `npm test` e `npm run build` em `frontend/` e percorrer `specs/103-isometric-lit-view/quickstart.md`

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: sem dependências; T001–T003 em paralelo.
- **Foundational (Phase 2)**: depois do Setup; T004 antes de T005; T006–T009 em paralelo entre si; T010 → T011 → T012. Bloqueia todas as histórias.
- **US1 (Phase 3)**: depois da Fundação. Entrega o MVP de navegação.
- **US2 (Phase 4)**: depois da Fundação (usa `isoLight`, `isoFocus`); independente de US1 no código, mas US1 é o caminho para chegar à vista na UI.
- **US3 (Phase 5)**: depois da Fundação; T024 toca o mesmo arquivo de US2 (fazer depois de T018–T020).
- **US4 (Phase 6)**: depois de US2 (usa `isoLightMaterial`); T026 → T027/T029; T028 → T029 → T030.
- **US5 (Phase 7)**: depois de US3 (animação de `setFocus`) e US4 (`pick` nas peças).
- **Polish**: depois das histórias desejadas.

### Within each story

- Módulo puro e seu teste antes da integração; `isoRenderer.ts` e `IsoView.tsx` são compartilhados entre histórias, então tarefas neles são sequenciais.

## Parallel Example: Foundational

```bash
Task: "T006 Criar frontend/src/lib/isoLight.ts"
Task: "T008 Criar frontend/src/lib/isoFocus.ts"
Task: "T005 Testes de viewMode em frontend/src/lib/viewMode.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T022 Criar frontend/src/lib/isoCamera.ts"
Task: "T023 Testes em frontend/src/lib/isoCamera.test.ts"
```

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2 → Phase 3 (US1) + Phase 4 (US2): escolher a vista e ver o mapa plano com a grid e o círculo de luz.
2. Validar com os passos 1–3 do quickstart.

### Incremental Delivery

1. + US3 (câmera) → passo 4 do quickstart.
2. + US4 (peças) → passos 5 e 7.
3. + US5 (foco) → passo 6.
4. Polish → passo 8 e a checagem do bundle.
