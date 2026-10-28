# Research: Vista isométrica iluminada (103)

Nenhum `NEEDS CLARIFICATION` ficou no Technical Context; as decisões abaixo fecham as escolhas de desenho.

## R1. Onde a escolha de vista vive

- **Decision**: `lib/viewMode.ts` passa a `ViewMode = '2d' | '3d' | 'iso'`; `readViewMode` aceita os três valores (qualquer
  outro = `'2d'`), a mesma chave `roll6:view-mode` por modelo de mapa, limpa no logout. O botão 2D/3D de `MapControls`
  vira um **dropdown Radix** (`modal={false}`, classes `dropdown-*` como `UserMenu`) com "Mapa 2D", "Isométrica" e "3D";
  o item atual fica marcado. Do 2D à isométrica = 2 cliques (SC-001).
- **Rationale**: reaproveita a preferência por mapa que já existe; valores antigos (`'2d'`/`'3d'`) continuam válidos.
- **Alternatives**: dois botões separados (mais um botão na coluna de controles, ruim no celular); um modal de escolha
  (um clique a mais e sem o "atual" visível).

## R2. Um renderizador novo, separado da vista 3D atual

- **Decision**: componente lazy `components/iso/IsoView.tsx` + `components/iso/isoRenderer.ts` (three.js, só em chunk
  lazy), sem tocar `StoryView`/`sceneRenderer`. `MainPage` escolhe `StoryView` (`'3d'`) ou `IsoView` (`'iso'`) no mesmo
  `Suspense`; sem WebGL → toast `story.noWebgl` e volta ao 2D, como hoje.
- **Rationale**: o pedido é "um desenvolvimento novo" e FR-003 exige que o 3D atual não mude; câmera, terreno e caminhada
  do 081 não servem a um chão plano ortográfico.
- **Alternatives**: um "modo" dentro do `sceneRenderer` (acoplaria duas câmeras, terreno e luz numa classe de 23 kB e
  arriscaria regressões na vista atual).

## R3. Câmera isométrica

- **Decision**: `OrthographicCamera`, alvo = centro da peça em foco (no chão, y = 0). Estado puro em `lib/isoCamera.ts`:
  `IsoPose { target, yaw, pitch, span }` — `yaw` livre, `pitch` limitado a 30°–70° (padrão 35,26°, o isométrico clássico),
  `span` = altura visível em hexes, 4–30 (padrão 14, o círculo de raio 5 inteiro com folga); `isoCameraPosition(pose)`,
  `clampIso`, `zoomBy(pose, steps)`, `easeTarget(from, to, t)` (troca de foco suave em ≤ 0,6 s). Entrada: um ponteiro
  arrasta (horizontal = yaw, vertical = pitch), roda / pinça / +/− = `span`. Os +/− de `MapControls` em `'iso'` chamam o
  handler registrado com `registerStoryZoom` (mesmo mecanismo do 3D atual). Sem pan (spec, Assumptions).
- **Rationale**: projeção ortográfica = sensação isométrica; o alvo fixo no personagem dispensa pan.
- **Alternatives**: câmera em perspectiva com FOV baixo (as peças distantes encolhem; não é isométrico).

## R4. O círculo de luz, o escuro e a névoa

- **Decision**: um único conjunto de uniforms compartilhado (`lightCenter: vec2` no plano XZ, `lightRadius`,
  `lightFeather`, `time`) injetado por `onBeforeCompile` em **todo** material da cena (chão, grid, figuras, imagens de
  token e modelos) a partir da posição de mundo do fragmento:
  - `factor = 1 − smoothstep(radius − feather, radius, dist)` (`dist` = distância no chão ao centro).
  - **Chão e grid**: `color *= mix(dark, 1, factor)`; além do raio, uma névoa escura animada (ruído de valor 2D em
    `time`, baixa amplitude) clareia de leve o preto, para o fora não ser um vazio chapado. Fundo da cena e `clearColor`
    pretos.
  - **Peças e modelos**: o mesmo escurecimento na borda e `discard` onde `dist > radius` — a parte de fora some de verdade
    e não cobre o chão iluminado; uma peça cruzando a borda mostra só a metade de dentro (FR-008, SC-002).
  - `lib/isoLight.ts` (puro, testado) espelha a fórmula: `LIGHT_RADIUS_HEXES = 5`,
    `lightRadiusPx = LIGHT_RADIUS_HEXES × √3 × HEX_SIZE` (distância entre centros de hexes vizinhos, flat-top),
    `LIGHT_FEATHER_PX`, `lightFactor(dist)`, `isLit(dist)` — o mesmo número vai aos uniforms.
- **Rationale**: o escuro calculado por fragmento no próprio material dá a luz "vinda de cima" (o chão escurece de verdade,
  não por uma camada por cima), corta modelos na borda sem geometria extra e a troca de foco é só mudar `lightCenter`
  (FR-016). Uma luz spot do three.js não apaga pixels nem corta modelos e custaria sombras.
- **Alternatives**: máscara pós-processada em tela (precisaria de profundidade para cortar modelos, mais passes);
  `clippingPlanes` (só planos, não cilindro); spot light + sombra (escuro não é preto, sem corte).

## R5. Modelos, figuras e imagens das peças

- **Decision**: o que o token tem, em ordem (FR-010):
  1. **modelo** `.glb`: `createModelSet` reaproveitado com uma opção nova `still: true` — toca a ação de "Parado" e fixa o
     mixer no **primeiro quadro** (`mixer.update(0)`, nunca avança), mede os encaixes nessa pose e pendura as armas como
     hoje; `lying` sempre `false` nesta vista; sem pose de repouso → fica no bind pose. `ground = 0`.
  2. **figura 2,5D** em pé: um plano vertical que sempre encara a câmera em yaw, imagem do lado visto por
     `lib/billboard.figureView`/`spriteView` (mesmas regras do 3D atual), tamanho por `spriteSpec`.
  3. **imagem do token** deitada no chão, no formato da pegada (`footprintLocal`/`pieceGeometry`), girada por `look`.
  - Modelo que falha → cai para 2 ou 3 (como hoje).
  - Os **materiais de cada instância são clonados** antes de receber o patch de luz: `loadModel` guarda os assets por URL
    e a vista 3D atual usa os mesmos materiais.
- **Rationale**: "a estrutura dos modelos pode ser aproveitada"; o carregamento, ajuste de tamanho (`modelFit`, 063),
  escolha de animação e encaixe de armas (083/085) já estão testados.
- **Alternatives**: `ModelPreview`/carregador próprio (duplicaria ajuste e armas).

## R6. Grid hexagonal no chão

- **Decision**: `LineSegments` com os cantos de cada hex de `lib/hexGrid.hexCorners(hexCenter(x, y, HEX_SIZE))`
  (arestas compartilhadas desenhadas uma vez), y = 0,5 acima do chão, cor clara com opacidade baixa, mesmo patch de luz.
  O chão = um plano com a imagem do mapa na posição/escala do 2D (`imageLeft`/`imageTop`/tamanho do draft, como o
  `floorPlane` do 081) sobre um chão neutro escuro que vai além da imagem.
- **Rationale**: Princípio VII — nenhuma fórmula nova, só as funções do módulo de grid.

## R7. Foco

- **Decision**: puro `lib/isoFocus.ts`:
  - `focusCandidates(party, tokens, mapId)` = participações aprovadas com peça de personagem no mapa aberto, na ordem do
    painel do grupo.
  - `initialFocus(candidates, chosenCharacterId)` = o escolhido se estiver entre eles, senão o primeiro, senão `null`
    (círculo no meio do mapa).
  - `resolveFocus(current, candidates, chosen)` mantém o foco enquanto ele existir, senão volta ao inicial (spec, US5-5).
  - Troca: clique numa peça de personagem visível (raycast nos objetos das peças, só `tokenType` Character) ou o seletor
    `IsoFocusSelect` (dropdown Radix no canto da vista: "Foco: {nome}", a lista e "Voltar ao meu personagem" para quem
    tem um). O foco vive em estado local do `IsoView`; nada é salvo nem enviado (FR-018).
  - Trocar o foco só chama `renderer.setFocus(point)`: anima o alvo da câmera e o `lightCenter`; não recria cena,
    texturas nem modelos (FR-016, SC-005).
- **Rationale**: peças no escuro não são clicáveis, daí o seletor.

## R8. Tempo real e qualidade

- **Decision**: `IsoView` lê `useMapToken().tokens`, `useCharacter().party` e o draft; cada mudança refaz só as specs
  (`setPieces`), com diff por id (posição/direção/token) como o `modelSet` já faz; o foco segue a peça em foco. A
  qualidade (`viewQuality`) dá pixel ratio, MSAA e anisotropia como na vista atual; sombras ficam desligadas.
- **Rationale**: nenhum evento novo é necessário (FR-011); o diff evita recarregar.

## R9. Testes

- **Decision**: Vitest para os módulos puros (`isoLight`, `isoCamera`, `isoFocus`, `viewMode` com `'iso'`) e para a opção
  `still` do `modelSet` (mixer fixo em t = 0); o render three.js é verificado à mão (quickstart).
