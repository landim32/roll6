---

description: "Task list for 104 — miniaturas de mesa na vista isométrica"
---

# Tasks: Miniaturas de mesa na vista isométrica

**Input**: Design documents from `/specs/104-iso-tabletop-miniatures/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/iso-miniature.md, quickstart.md

**Tests**: incluídos — o plano (research R7) pede testes Vitest para o módulo puro `lib/isoMiniature` e para as opções novas
do `modelSet`, como os outros módulos puros do projeto.

**Organization**: por user story. Todos os caminhos são relativos a `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1, US2, US3 da spec

---

## Phase 1: Setup

Nada a configurar: sem dependência nova, sem mudança de backend, i18n ou rotas.

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: o módulo puro e as opções novas de `modelSet` e `isoLightMaterial`, que todas as histórias usam.

- [X] T001 [P] Criar `frontend/src/lib/isoMiniature.ts` conforme `contracts/iso-miniature.md` (sem importar `three`): constantes `BASE_SHARE = 0.85` e `BASE_HEIGHT = 4`; `miniatureState(token)` → `{ tipped, gray }` (`tipped` = postura `POSTURE.down` ou `POSTURE.outOfCombat` e `tokenType !== MAP_TOKEN_TYPE.object`; `gray` = `POSTURE.outOfCombat` e não objeto — importar de `types/mapToken`); `miniatureBase(space)` → `{ radius: BASE_SHARE × √(space × área do hex / π), height: BASE_HEIGHT }`; `tipPose(center, yaw, base)` com frente `f = (sin yaw, −cos yaw)`, `pivot = center − f × radius`, `axis = (cos yaw, sin yaw)` (x, z) e `angle` com o sinal que leva o topo (+Y) para `−f` (as costas). Comentário de cabeçalho em inglês no estilo de `lib/isoLight.ts`.
- [X] T002 [P] Criar `frontend/src/lib/isoMiniature.test.ts`: raio para `space` 1, 2, 3, 7, 10 (cresce com √space; 1 hex ≈ 30.9 e cabe no hex); `miniatureState` para standing/down/outOfCombat × personagem/NPC/objeto (objeto nunca tomba nem fica cinza); `tipPose` para os 6 `look` (yaw = look × π/3): o pivô fica do lado oposto à frente, `axis` é perpendicular a `f`, e girar o vetor (0, 1, 0) por `angle` em volta de `axis` (fórmula de Rodrigues no teste) dá aproximadamente `(−f.x, 0, −f.z)`.
- [X] T003 [P] Em `frontend/src/components/story/modelSet.ts`, acrescentar a `ModelSetOptions` a opção `mount?: (id: number) => Object3D | null` (em `setModels`, onde hoje faz `scene.add(object)`, usar `(options.mount?.(spec.id) ?? scene).add(object)`, e em `remove` fazer `entry.object.parent?.remove(entry.object)`) e mudar `patchMaterial` para `(material: Material, id: number) => void`, passando o `id` da entrada em `ownMaterials(object, id)` (as duas chamadas: o modelo e as armas de `newHands`, que precisa receber o id). Sem as opções, comportamento idêntico ao atual; documentar no comentário de `ModelSetOptions` (104).
- [X] T004 [P] Em `frontend/src/components/story/modelSet.test.ts`, acrescentar casos: com `mount` o objeto do modelo carregado tem como pai o `Object3D` devolvido e sai dele ao retirar o modelo; sem `mount` continua na `scene`; `patchMaterial` recebe o `id` da peça. Seguir os mocks já existentes no arquivo; os testes atuais devem continuar passando.
- [X] T005 [P] Em `frontend/src/components/iso/isoLightMaterial.ts`, mudar `applyLight` para `applyLight(material, uniforms, kind, options?: { gray?: { value: number } })`: declarar `uniform float isoGray;` em `FRAGMENT_HEADER`, ligar `shader.uniforms.isoGray = options?.gray ?? NO_GRAY` (constante `{ value: 0 }` do módulo) e, em `PIECE_END`, antes da luz, `gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114))), isoGray);`. `customProgramCacheKey` continua o mesmo. Atualizar o comentário do módulo (preto e branco de fora de combate, 104).

**Checkpoint**: `npm test -- isoMiniature modelSet` passa; a isométrica e a vista 3D se comportam como antes.

---

## Phase 3: User Story 1 — O modelo 3D como miniatura sobre base circular (Priority: P1) 🎯 MVP

**Goal**: peças com modelo 3D aparecem imóveis, de pé sobre a base circular com borda na cor da peça.

**Independent Test**: quickstart passos 1, 3 e 8 (personagem azul e NPC vermelho com modelo sobre bases; a base cresce com o tamanho em hexes, não com o "Tamanho" do modelo; base cortada pela luz).

- [X] T006 [US1] Em `frontend/src/components/iso/isoPieces.ts`, estender `IsoPiece` e `toIsoPiece` com `tipped`, `gray` (de `miniatureState`), `base` (`miniatureBase(token.space)` quando `kind` é `model` ou `figure`, senão `null`), `yaw` (= `sprite.yaw`) e `downImageUrl`; acrescentar `downImageUrl` à `signature` (a postura **não** entra nela).
- [X] T007 [US1] Em `frontend/src/components/iso/isoPieces.ts`, criar por peça com `base` um `Group` "miniatura" (posição `sprite.center` no chão, `rotation.y = rotationForYaw(yaw)` de `lib/modelFit`) com um filho `Group` "pivô" (deslocado para a borda de trás, com o conteúdo compensado de volta, para girar em volta de `tipPose`); guardar ambos em `Drawn` (`miniature`, `pivot`) e retirá-los/liberá-los em `remove` e `dispose`.
- [X] T008 [US1] Em `frontend/src/components/iso/isoPieces.ts`, desenhar a base dentro do pivô: uma `CylinderGeometry(1, 1, 1, 32)` e uma `RingGeometry(0.82, 1, 48)` (deitada, logo acima do topo) **compartilhadas** pela camada, escaladas por `base.radius`/`base.height`; materiais por peça: corpo na cor da peça escurecida (`new Color(baseColor).lerp(BLACK, 0.8)`) e anel em `baseColor`, ambos com `applyLight(…, 'piece')` (sem `gray`), `castShadow = true` e `customDepthMaterial = depthMaterial`. Recriar os materiais só quando `baseColor` mudar.
- [X] T009 [US1] Em `frontend/src/components/iso/isoPieces.ts`, passar ao `createModelSet` `mount: (id) => drawn.get(id)?.pivot ?? null` e, em `modelSpecs()`, para peças com `base`, `center: { x: 0, y: 0 }`, `yaw: 0` e `ground: BASE_HEIGHT` (o modelo no quadro do pivô, de pé sobre a base); manter `still: true` e `lying: false` sempre.
- [X] T010 [US1] Em `frontend/src/components/iso/isoPieces.ts`, em `place`, mover a miniatura (posição/rotação do `Group`) quando a peça muda de lugar ou direção, sem recriar base nem modelo; ajustar `anchors()` para somar `BASE_HEIGHT` à altura de uma miniatura de pé.
- [X] T011 [US1] Atualizar o comentário de cabeçalho de `frontend/src/components/iso/isoPieces.ts` (miniaturas de mesa com base, 104) e conferir com `npm run lint` e `npm run build` que `three` continua só no chunk lazy da isométrica.

**Checkpoint**: US1 verificável pelo quickstart; posturas ainda todas de pé.

---

## Phase 4: User Story 2 — Miniatura tombada quando caída ou fora de combate (Priority: P1)

**Goal**: caída ou fora de combate, a miniatura inteira tomba para as costas; fora de combate ainda em preto e branco; sem recarregar.

**Independent Test**: quickstart passos 4, 5, 6 e 9.

- [X] T012 [US2] Em `frontend/src/components/iso/isoPieces.ts`, em `place`, girar o pivô por `tipPose(...).angle` em volta do eixo local correspondente quando `piece.tipped` (e 0 quando de pé); como o grupo já está girado no `yaw`, o eixo no quadro do grupo é o X local — conferir o sinal com o teste de `tipPose` (o topo vai para as costas). Uma mudança só de postura passa por `setPieces` → ramo "only moved or turned" → `place`, sem recarregar.
- [X] T013 [US2] Em `frontend/src/components/iso/isoPieces.ts`, criar um uniform `gray: { value: number }` por peça em `Drawn`, passá-lo a `applyLight(…, 'piece', { gray })` dos materiais do modelo (via `patchMaterial(material, id)` → `drawn.get(id)?.gray`), da figura e da imagem do chão (não da base) e atualizar `gray.value = piece.gray ? 1 : 0` em `place`.
- [X] T014 [US2] Em `frontend/src/components/iso/isoPieces.ts`, em `anchors()`, para miniatura tombada usar altura `2 × base.radius`; conferir que as sombras do modelo tombado e da base continuam (mesmo `depthMaterial`) e que o corte pela luz vale (materiais `'piece'`).

**Checkpoint**: US1 + US2 entregam o MVP completo para tokens com modelo.

---

## Phase 5: User Story 3 — Figuras 2,5D sobre a base; imagens caídas (Priority: P3)

**Goal**: figura 2,5D vira miniatura com base (vira para a câmera em pé; tomba de frente para cima); imagem no chão troca para a de "Caído".

**Independent Test**: quickstart passos 2 e 7.

- [X] T015 [US3] Em `frontend/src/components/iso/isoPieces.ts`, pôr a malha da figura (e a mancha de sombra `spot`) de peças `figure` dentro do pivô, de pé sobre a base (`position.y = BASE_HEIGHT`, centro local (0, 0)); em pé, `rotation.y` local = `facingAngle(sprite.center, eye) − rotationForYaw(yaw)` e a vista de `figureView` como hoje; tombada, a vista de **frente** (`entry.images.front ?? fallback`) com rotação local que a deixa voltada para o `look`, tombando com o pivô (frente para cima). `faceCamera` continua chamando `place`.
- [X] T016 [US3] Em `frontend/src/components/iso/isoPieces.ts`, para `kind = 'flat'` (sem base): ler `upImageUrl` e `downImageUrl` uma vez (em `load`) e, em `place`, usar a imagem de "Caído" já lida (`Drawn.down`) quando tombada, senão a de "Em pé", para escolher a textura (sem girar 90°); manter o restante do desenho atual.

**Checkpoint**: todas as histórias funcionando.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T017 [P] Atualizar `CLAUDE.md` (bullet "Isometric lit view (103)" na seção do frontend): peças como miniaturas (base, tombo, cinza de fora de combate, figura 2,5D com base, imagem de caído), `lib/isoMiniature`, opções `mount` / `patchMaterial(material, id)` do `modelSet` e `applyLight(…, { gray })`; remover "every posture stands for now".
- [X] T018 Rodar `cd frontend && npm run lint && npm test && npm run build` e corrigir o que falhar.
- [ ] T019 Executar `specs/104-iso-tabletop-miniatures/quickstart.md` (passos 1–10) no `npm run dev`, incluindo a regressão da vista 3D e do 2D.

---

## Dependencies & Execution Order

- **Foundational (T001–T005)**: sem dependências entre si (arquivos diferentes) — todos [P]; bloqueiam as histórias.
- **US1 (T006–T011)**: depende de T001, T003, T005; tarefas sequenciais no mesmo arquivo (`isoPieces.ts`).
- **US2 (T012–T014)**: depende de US1 (usa o pivô e a base) e de T005.
- **US3 (T015–T016)**: depende de US1 (pivô/base) para T015; T016 depende só de T001 e T006.
- **Polish**: depois das histórias desejadas.

## Parallel Example: Foundational

```text
T001 lib/isoMiniature.ts        T002 lib/isoMiniature.test.ts
T003 story/modelSet.ts          T004 story/modelSet.test.ts
T005 iso/isoLightMaterial.ts
```

As histórias tocam todas o mesmo `isoPieces.ts`, então rodam em sequência.

## Implementation Strategy

1. **MVP**: Foundational → US1 → US2 (as duas P1: miniatura com base e tombo/cinza para tokens com modelo) → T018.
2. **Incremento**: US3 (figuras 2,5D com base, imagem de caído).
3. **Fechamento**: T017 e T019.
