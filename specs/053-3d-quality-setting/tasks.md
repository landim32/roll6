# Tasks: Qualidade da vista 3D

**Input**: Design documents from `/specs/053-3d-quality-setting/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/view-quality.md, quickstart.md

**Tests**: incluídos — a spec exige o teste de regressão do quadro (FR-002/SC-001) e a issue pede testes de funções puras por nível (escolha de nível, leitura da configuração, mip), sem DOM. Vitest, `cd frontend && npm test`.

**Organization**: fases por história de usuário. Tudo em `frontend/src/`; nada em `backend/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história a que a tarefa pertence (US1, US2)
- Caminhos exatos em cada tarefa

## Path Conventions

Web app, só frontend: `frontend/src/lib/`, `frontend/src/components/`, `frontend/src/Contexts/` (uppercase), `frontend/src/hooks/`, `frontend/src/i18n/locales/pt-BR.json`.

---

## Phase 1: Setup (níveis num só lugar + textos)

**Purpose**: o módulo puro que define os níveis (fonte única dos números) e as chaves i18n que o `keys.test.ts` cobra.

- [X] T001 Criar `frontend/src/lib/viewQuality.ts` com `VIEW_QUALITY` (`standard`/`high`/`ultra`, `as const`), `type ViewQuality`, `QUALITY_ORDER`, `type SpriteSampling = 'nearest' | 'smooth'`, `interface QualityProfile { columns; spriteMaxSide; spriteSampling; figureLayer }` e `QUALITY_PROFILES` com os valores de research R1 (standard 480/256/nearest/false — exatamente os valores atuais de `raycastRenderer.MAX_COLUMNS` e `StoryView.SPRITE_MAX_SIDE`; high 720/480/smooth/false; ultra 960/480/smooth/true). Comentário de cabeçalho explicando que o Padrão é a vista de hoje e que estes são os únicos números dos níveis. Sem `enum`.
- [X] T002 [P] Criar `frontend/src/lib/viewQuality.test.ts`: `standard` igual a `{ columns: 480, spriteMaxSide: 256, spriteSampling: 'nearest', figureLayer: false }`; `columns` estritamente crescente em `QUALITY_ORDER`; `spriteMaxSide ≤ 480` em todos; `figureLayer` ⇒ `spriteSampling === 'smooth'`.
- [X] T003 [P] Adicionar em `frontend/src/i18n/locales/pt-BR.json`: `userMenu.viewQuality` e a seção `viewQuality` (`title`, `intro`, `level.standard|high|ultra`, `levelHint.standard|high|ultra`, `costHint`, `batteryHint`) com os textos de contracts/view-quality.md; conferir que `common.close` existe (senão criar).

---

## Phase 2: Foundational (caminhos de desenho novos, Padrão intacto)

**Purpose**: amostragem suave, modo camada e o renderizador aceitando um perfil. Bloqueia a US1. O quadro de referência (`raycastFrame.test.ts`, hash `4240962842`) tem de continuar passando **em cada tarefa** desta fase.

- [X] T004 Criar `frontend/src/lib/mipmap.ts` (puro): `interface MipLevel { data: Float32Array; width; height }` (RGBA premultiplicado 0–255), `interface MipChain { levels: MipLevel[] }`, `buildMipChain(pixels: PixelBuffer)` (nível 0 = original premultiplicado; cada nível seguinte é a média 2×2 em premultiplicado, dimensões `ceil(n/2)`, até 1×1), `mipChainOf(pixels)` com `WeakMap<PixelBuffer, MipChain>`, `mipLevelFor(chain, texelsPerPixel)` (`0` quando ≤ 1, senão `round(log2)` limitado ao último nível) e `sampleBilinear(level, u, v, out: Float32Array)` (u, v em [0,1], centros de texel em `(i + 0.5)/n`, bordas fixadas). Importar `PixelBuffer` de `./raycastFrame`.
- [X] T005 [P] Criar `frontend/src/lib/mipmap.test.ts`: tamanhos da cadeia (5×3 → 3×2 → 2×1 → 1×1); média premultiplicada de um 2×2 com 1 pixel opaco vermelho e 3 transparentes com cor lixo → alpha 63,75 e R = 63,75, G = B = 0 (não sangra); `sampleBilinear` no centro de um texel devolve o texel; no meio entre dois texels devolve a média; `mipLevelFor` para 1, 2, 4 e 1000; `mipChainOf` devolve a mesma instância na segunda chamada.
- [X] T006 Em `frontend/src/lib/raycastFrame.ts`: adicionar `interface FrameOptions { spriteSampling?: SpriteSampling; figures?: 'frame' | 'layer' }` (importando `SpriteSampling` de `./viewQuality`) como 6º parâmetro opcional de `drawRaycastFrame` (padrão `{ spriteSampling: 'nearest', figures: 'frame' }`). **Não tocar** no laço atual das figuras (linhas ~382–404): ele vira o ramo `nearest`. Adicionar o ramo `smooth` dentro do quadro: por coluna/linha visível, `texelsPerPixel = pixels.width / span`, nível por `mipLevelFor`, `sampleBilinear` em (u, v) do centro do pixel (u espelhado quando `mirrored`), composição `src over` sobre `data` com `alpha = out[3]/255` e cor desfeita da premultiplicação × `fade`; `painted = true` quando `alpha > 0`.
- [X] T007 Em `frontend/src/lib/raycastFrame.ts`: modo `figures: 'layer'` — exportar `interface LayerSprite { id; pixels; mirrored; where: SpriteProjection; fade }` e `interface FrameLayer { walls: ColumnWalls; sprites: LayerSprite[] }`; `FrameResult` ganha `layer?: FrameLayer`. Nesse modo a sombra continua pintada no quadro, os pixels da figura **não** são pintados, `layer.sprites` recebe as figuras projetadas (ordem longe → perto) e `result.sprites` (balões) é preenchido quando ao menos uma coluna da figura tem `hiddenFrom > first` (mesma regra de `headVisible`). Garantir que `ColumnWalls` e `SpriteProjection` estão exportados.
- [X] T008 Em `frontend/src/lib/raycastFrame.test.ts`: (a) **nenhuma alteração** nos testes existentes, o bloco "reference frame" continua com soma e hash `4240962842`; (b) novo `describe('quality options (053)')`: sem `options` o quadro é idêntico byte a byte a `{ spriteSampling: 'nearest', figures: 'frame' }`; com `smooth` a figura ocupa a mesma caixa de pixels que com `nearest` (mesmos `top`/`bottom`/`screenX` em `result.sprites`) e pelo menos um pixel de borda tem cor intermediária entre o fundo e a figura; com `figures: 'layer'` nenhum pixel da figura é pintado (o pixel do centro da figura mantém a cor do chão/céu), o pixel da sombra continua escurecido, `result.layer.sprites.length === 1` com `where` igual à projeção e `result.sprites` ainda lista a figura; com uma parede inteira à frente da figura em `layer`, `result.sprites` fica vazio.
- [X] T009 Criar `frontend/src/lib/figureLayer.ts` (puro): `interface LayerTarget { data: Uint8ClampedArray; width; height }`, `clearLayer(target)` (zera), `drawFigureLayer(target, layer: FrameLayer, frameWidth, frameHeight)`: para cada `LayerSprite` (já longe → perto) escalar `where` por `target.width/frameWidth` e `target.height/frameHeight`; por coluna de tela `x`: `frameColumn = floor(x × frameWidth / target.width)`, `hiddenRow = hiddenFrom(walls, frameColumn, depth) × target.height / frameHeight`; amostrar com `mipChainOf`/`mipLevelFor`/`sampleBilinear` (`texelsPerPixel = pixels.width / spanTela`), escrever cor desfeita da premultiplicação × `fade` e alpha = cobertura, compondo `src over` sobre o que já há na camada.
- [X] T010 [P] Criar `frontend/src/lib/figureLayer.test.ts`: figura opaca 2×2 projetada no meio de um quadro 8×6 desenhada numa camada 80×60 cobre a área escalada (alpha 255 no centro) e nada fora (alpha 0 nos cantos); bordas com alpha intermediário; `walls` com uma parede mais próxima nas colunas da metade esquerda do quadro → a metade esquerda da figura na camada tem alpha 0 abaixo da linha do topo escalada; figura inteira atrás da parede → camada toda alpha 0; `clearLayer` zera uma camada pintada.
- [X] T011 Em `frontend/src/components/story/raycastRenderer.ts`: `createRaycastRenderer(canvas, onFrame?, profile: QualityProfile = QUALITY_PROFILES.standard)`; substituir `MAX_COLUMNS` por `profile.columns` em `resize` guardando a última medida (`lastSize`); novo método `setQuality(next)` na interface e na implementação (guarda o perfil, refaz `resize(lastSize)`, `dirty = true`); `draw()` passa `{ spriteSampling: profile.spriteSampling, figures: profile.figureLayer ? 'layer' : 'frame' }` a `drawRaycastFrame`; com `figureLayer`, alocar sob demanda um `figureCanvas` (`document.createElement('canvas')`) + `ImageData` do tamanho de `canvas.width × canvas.height` (realocado em `resize`), `clearLayer`, `drawFigureLayer(result.layer)`, `putImageData` no `figureCanvas` e `display.drawImage(figureCanvas, 0, 0)` **depois** do `drawImage(buffer, …)`; sem `figureLayer`, `draw()` fica exatamente como hoje. Atualizar o comentário de cabeçalho (053).

**Checkpoint**: `npm test -- raycastFrame mipmap figureLayer viewQuality` verde, referência intacta, `tsc` limpo.

---

## Phase 3: User Story 1 — Escolher a qualidade do 3D (Priority: P1) 🎯 MVP

**Goal**: item "Qualidade do 3D" no menu do usuário com três níveis; com o 3D aberto a vista muda na hora sem mover a câmera; Padrão idêntico ao atual.

**Independent Test**: quickstart passos 1–6 e 11 — abrir um mapa em 3D com peças em pé, trocar Padrão → Alta → Ultra pelo menu e comparar nitidez, oclusão e balões; em 2D nada muda.

- [X] T012 [US1] Em `frontend/src/Contexts/MapEditorContext.tsx`: adicionar `viewQuality: ViewQuality` e `setViewQuality: (level: ViewQuality) => void` à interface do contexto; estado `useState<ViewQuality>(VIEW_QUALITY.standard)` (a leitura do storage entra na US2) e `setViewQuality` com `useCallback`; incluir ambos no `useMemo` do value, ao lado de `viewMode`/`setViewMode`/`fov`.
- [X] T013 [US1] Em `frontend/src/components/story/StoryView.tsx`: ler `viewQuality` de `useMapEditor()`, `const profile = QUALITY_PROFILES[viewQuality]`; passar `profile` a `createRaycastRenderer`; efeito `rendererRef.current?.setQuality(profile)` em `[ready, profile]`; remover a constante `SPRITE_MAX_SIDE` em favor de `profile.spriteMaxSide`; chaves de cache `spriteImages` = `${maxSide}|${url}` e `fittedImages` = `${maxSide}|${urls}`; incluir `profile.spriteMaxSide` nas dependências do efeito das figuras (o `setSprites` só após `Promise.all` já garante FR-012). Atualizar comentários (053).
- [X] T014 [P] [US1] Criar `frontend/src/components/story/ViewQualityModal.tsx`: props `{ open; onOpenChange }`; `Modal` com `title={t('viewQuality.title')}`; `useMapEditor()` para `viewQuality`/`setViewQuality`; `useMediaQuery('(max-width: 767.98px)')` (mesmo `PHONE_QUERY` de `InstallHint`; importar o hook de `hooks/useMediaQuery`); parágrafo `viewQuality.intro`; um `form-check` por nível de `QUALITY_ORDER` (`input type="radio" name="view-quality"`, `id="view-quality-<nível>"`, `checked`, `onChange → setViewQuality`, `aria-describedby` apontando para a `<small id="view-quality-<nível>-hint">` com `levelHint`); abaixo `<p className="small text-body-secondary">{costHint}{phone && ' ' + batteryHint}</p>`; rodapé com botão `common.close`. Sem botão Salvar: a escolha aplica na hora.
- [X] T015 [US1] Em `frontend/src/components/menu/UserMenu.tsx`: nova prop `onViewQuality: () => void` (doc "Qualidade do 3D (053)") e `<DropdownMenu.Item className="dropdown-item" onSelect={onViewQuality}>{t('userMenu.viewQuality')}</DropdownMenu.Item>` logo após "Notificações", antes de "Instalar o Roll6"; atualizar o comentário de cabeçalho.
- [X] T016 [US1] Em `frontend/src/components/menu/TopMenu.tsx`: `const [qualityOpen, setQualityOpen] = useState(false)`, passar `onViewQuality={() => setQualityOpen(true)}` ao `UserMenu` e renderizar `<ViewQualityModal open={qualityOpen} onOpenChange={setQualityOpen} />` junto de `NotificationsModal` (import estático; o modal é leve).
- [ ] T017 [US1] Rodar `cd frontend && npm run lint && npx tsc --noEmit && npm test` (inclui `keys.test.ts`), depois `npm run dev` e executar os passos 1–6 e 11 do quickstart no Chrome; corrigir o que falhar.

**Checkpoint**: US1 demonstrável — trocar o nível muda a vista na hora; Padrão sem mudança.

---

## Phase 4: User Story 2 — Lembrar a escolha neste aparelho (Priority: P2)

**Goal**: a escolha sobrevive a recarga e troca de mapa, vale para todos os mapas, some no logout, e um valor inválido ou storage indisponível cai em Padrão.

**Independent Test**: quickstart passos 7–10 — escolher Alta, recarregar (continua Alta), outro mapa (Alta), sair/entrar (Padrão), storage com `"x"` (Padrão).

- [X] T018 [US2] Em `frontend/src/lib/viewQuality.ts`: `VIEW_QUALITY_STORAGE_KEY = 'roll6:3d-quality'`, `isViewQuality(value: unknown): value is ViewQuality`, `readViewQuality()` (try/catch; `localStorage.getItem`; inválido/ausente/erro → `standard`), `writeViewQuality(level)` e `clearViewQuality()` (try/catch silenciosos), no padrão de `lib/layoutMode.ts`.
- [X] T019 [P] [US2] Em `frontend/src/lib/viewQuality.test.ts`: `readViewQuality` com `"ultra"` → `ultra`, com `"x"`/ausente → `standard`, com `localStorage.getItem` lançando (`vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error() })`) → `standard`; `writeViewQuality('high')` grava a chave; `clearViewQuality` remove; nenhum deles lança com o storage quebrado.
- [X] T020 [US2] Em `frontend/src/Contexts/MapEditorContext.tsx`: estado inicial `useState<ViewQuality>(readViewQuality)` e `setViewQuality` chamando `writeViewQuality(level)` após o `setState`.
- [X] T021 [US2] Em `frontend/src/Contexts/AuthContext.tsx`: importar `clearViewQuality` de `../lib/viewQuality` e chamá-lo no logout junto de `clearViewModes()`/`clearLayoutMode()` (nos dois pontos em que essas limpezas acontecem, se houver dois).
- [ ] T022 [US2] Rodar `npm test -- viewQuality` e executar os passos 7–10 do quickstart (recarga, outro mapa, logout/login, valor `"x"` no storage).

**Checkpoint**: US1 + US2 completas — a feature está inteira do ponto de vista do usuário.

---

## Phase 5: Polish & Cross-Cutting

**Purpose**: medição exigida pela spec (FR-015), documentação e verificação final.

- [ ] T023 Medição em computador (research R9 / quickstart "Medição"): mapa com máscara e 50 peças em pé (criar NPCs via "Incluir NPC" se preciso), `performance.now()` temporário em volta de `draw()` em `frontend/src/components/story/raycastRenderer.ts` (média a cada 120 quadros no console; **remover antes do commit**), câmera livre girando ~20 s por nível; registrar colunas, ms/quadro e fps por nível em `specs/053-3d-quality-setting/performance.md` (tabela do quickstart, linhas "computador"). Se Alta passar de 2× o Padrão, ajustar `QUALITY_PROFILES.high.columns` e remedir.
- [ ] T024 Medição em celular — **tarefa do usuário** (não executável pelo agente): seguir o mesmo roteiro num celular médio e preencher as linhas "celular" de `specs/053-3d-quality-setting/performance.md`; o PR sai com essas linhas marcadas "pendente" se ainda não houver.
- [X] T025 [P] Em `CLAUDE.md`, na bullet "3D view (034)" da seção de frontend, acrescentar uma frase sobre 053: níveis em `lib/viewQuality` (único lugar dos números), `MapEditorContext.viewQuality` → `raycastRenderer.setQuality`, cache de figuras por tamanho, camada de figuras do Ultra (`lib/figureLayer` + `lib/mipmap`), `roll6:3d-quality` limpo no logout, item do menu do usuário; conferir que a linha de Recent Changes já adicionada no plano está coerente com o que foi implementado.
- [X] T026 Verificação final: `cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build`; confirmar no output do Vitest que o bloco "reference frame" passou sem alteração (hash `4240962842`); conferir `git diff` para garantir que nada de `backend/` mudou e que o `performance.now()` temporário foi removido; marcar os itens do checklist `specs/053-3d-quality-setting/checklists/requirements.md` que a implementação confirma.

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5.**
- Phase 2 depende de T001 (tipos `QualityProfile`/`SpriteSampling`). T006 e T007 tocam o mesmo arquivo (`raycastFrame.ts`): sequenciais; T008 depois de ambos. T009 depende de T007 (tipo `FrameLayer`) e T004. T011 depende de T004, T007 e T009.
- US1 (T012–T017) depende de toda a Phase 2 e de T003 (textos). T014 pode começar junto de T012/T013 (arquivo novo).
- US2 (T018–T022) depende só de T001 e T012 (estado existente): poderia ser feita antes da Phase 2 se quisermos, mas a ordem acima mantém o MVP demonstrável primeiro.
- Phase 5 depende de US1 e US2.

## Parallel Execution Examples

- Phase 1: T002 e T003 em paralelo após T001.
- Phase 2: T005 em paralelo com T006; T010 em paralelo com T011 (após T009).
- US1: T014 em paralelo com T012/T013; T015 e T016 sequenciais (mesma prop).
- US2: T019 em paralelo com T020/T021.
- Phase 5: T025 em paralelo com T023.

## Implementation Strategy

1. **MVP = Phase 1 + Phase 2 + US1**: três níveis funcionando na hora, Padrão intacto. Já entrega o valor da issue (quem quer nitidez a tem) mesmo sem lembrar a escolha.
2. **US2** acrescenta a persistência (4 tarefas pequenas, mesmos arquivos).
3. **Phase 5** fecha FR-015 (medições) e a documentação. A medição em celular é do usuário; o PR pode sair com ela pendente e a issue recebe os números depois.

Total: **26 tarefas** — Setup 3, Foundational 8, US1 6, US2 5, Polish 4. Backend, API, MCP e banco: zero tarefas.

## Status (2026-10-12)

- Automático: 22 testes novos, suíte com 674 testes verdes, `lint`, `tsc` e `build` limpos; o quadro de referência (hash `4240962842`) passou sem alteração. Os testes das opções do `drawRaycastFrame` ficaram em `frontend/src/lib/raycastFrame.quality.test.ts` (arquivo próprio, para não tocar o arquivo da referência).
- T017 e T022: a parte automática está feita; o roteiro manual no navegador (quickstart 1–11) ficou pendente — a extensão Claude in Chrome não estava conectada e o login é do usuário.
- T023: medição sintética feita (Node/V8, 50 figuras) em `performance.md`; as linhas "Chrome" e "celular" ficaram pendentes (T024 é do usuário).
