# Research: Ajustes do 2,5D (036)

Nenhum item ficou como NEEDS CLARIFICATION. Cada decisão abaixo foi tomada lendo o código atual
(`ImageCropper`, `TokenFormFields`, `lib/raycaster`, `lib/raycastFrame`, `StoryView`, `SpeechBubbleLayer`, `lib/turnStatus`).

## D1 — Causa do desalinhamento do formulário e solução (palco fixo)

- **Causa**: `.stm-cropper` tem `height: 280px` e a moldura 3:4 do `react-easy-crop` se ajusta à menor dimensão disponível; a
  imagem já gravada usa `.stm-token-preview` (`height: 120px`); e o campo vazio mostra só um `<input type=file>` (~38 px). Cada
  campo muda de altura e de tamanho de moldura conforme o estado, e a largura da coluna também interfere. Além disso, o texto de
  ajuda de cada lado tem comprimento diferente e empurra o conteúdo.
- **Decisão**: cada campo ganha um **palco quadrado** (`aspect-ratio: 1`, largura 100%, máx. 280 px). A moldura 3:4 fica **centralizada**
  dentro dele (75% da largura, 100% da altura). O mesmo palco é usado pelo recorte, pela imagem gravada (`object-fit: contain` na
  moldura) e pelo estado vazio (moldura tracejada com a silhueta e o botão de escolher arquivo). Geometria em `lib/frontImage`
  (`STAGE`, `frameInStage`) para testar.
- **Alinhamento**: grade de duas colunas com `grid-template-rows: subgrid` e cada campo ocupando 4 linhas (título · descrição ·
  palco · controles); em tela estreita, uma coluna sem subgrid.
- **Alternativas**: (a) só fixar `min-height` em título/descrição — não resolve a variação por estado; (b) palco com o aspecto 3:4
  exato — esconderia a margem fora da moldura, que o usuário precisa ver ao afastar a imagem (zoom < 1); (c) JavaScript medindo e
  igualando alturas — frágil e desnecessário com subgrid (suporte amplo desde 2023).

## D2 — Altura da parede pelo tom (Story 4)

- **Decisão**: altura (0–1) = 1 − luminância/255; células com altura < `MASK_MIN_HEIGHT` (0,05) são vazias; ≥ 0,95 valem 1 (encaixe).
  Transparente (alpha < 128) = vazio. A grade guarda a altura em `Uint8Array` (0–255).
- **Por que viável/simples**: a altura só muda o tamanho vertical da coluna desenhada; `wallColumn` já recebe a altura da parede.
- **Cálculo por célula**: **mediana** da luminância dos pixels de origem, e não a média — a média criaria uma "borda" de meia
  altura nas bordas suavizadas de máscaras só preto/branco (regressão de FR-008). A mediana reproduz a regra de maioria de antes
  (empate = vazio, como `wallCount * 2 > total`). Implementação: histograma de 256 faixas por **faixa de linhas de células**
  (≤ 512 × 256 contadores, ~0,5 MB), finalizado ao mudar de linha de célula.
- **Compatibilidade**: pixel puro/ruído de JPEG nos extremos (±5%) cai no encaixe, então máscaras limpas dão exatamente 0 ou 255;
  testado contra o resultado antigo com máscaras 5 × 5 e com bordas suavizadas.
- **Alternativas**: média por célula (rejeitada, acima); quantizar em poucos níveis (perde o "50% = 50%" do pedido, SC-004).

## D3 — Vários raios por coluna (paredes baixas não bloqueiam a vista)

- **Decisão**: `castRay` passa a devolver uma **lista de faces** (do mais perto ao mais longe), registrando só as células cuja altura
  é **maior que a máxima já vista** no raio e parando na primeira de altura total. Limite de 8 faces. Máscara só com 0/255 dá no
  máximo 1 face — o mesmo resultado de hoje.
- **Pintura**: céu em todas as linhas acima do horizonte e chão nas abaixo como base; depois as faces **da mais longe para a mais
  perto**, cada uma de `top` a `bottom` com a cor/sombra de sua face. Com altura menor que os olhos (< ~50%), o topo da parede fica
  abaixo do horizonte: entre o topo e o horizonte vê-se o chão **atrás** da mureta (a base já pintada), como na realidade.
- **Chão**: só é calculado nas linhas não cobertas por parede da coluna (`covered` por coluna), para não custar mais que hoje quando
  há parede alta à frente.
- **Oclusão das figuras**: o z-buffer de uma distância por coluna deixa de bastar. O quadro passa a guardar, por coluna, as faces
  (profundidade + linha do topo); uma figura em `depth` fica escondida na linha `y` se existir face mais perto com `top ≤ y`.
  Função pura `hiddenAt(column, y, depth)`; `columnVisible` continua para o caso sem mureta.
- **Câmera**: `isWallAt` passa a ser `altura > 0` — qualquer parede, mesmo baixa, bloqueia a câmera (ela só observa; a máscara nunca
  afeta peças). Mantém o comportamento da 034.

## D4 — Chão fora da imagem: "preso" à borda

- **Decisão**: `mapIndex` com **clamp** de (u, v) em [0, 1) para o chão e para a cor das paredes que tocam a borda; o pixel da
  borda mais próxima prolonga o chão (cantos = pixel do canto). Pixel de alpha < 128 → cor neutra atual.
- **Por que não o céu**: o pedido aceitava os dois; a borda do mapa mantém o chão coerente com o cenário; a imagem de fundo é
  panorama e seu pixel central não corresponde a nenhum ponto do chão. O sombreamento por distância (`shade`) continua valendo.
- **Alternativas**: média da borda (apaga variações — "areia de um lado, grama do outro" fica uniforme, contra FR-013/AS2);
  espelhar a imagem (cria emendas visíveis).

## D5 — Balões no 3D: camada HTML por cima do canvas

- **Decisão**: `BubbleLayer` (HTML absoluto sobre o canvas) com um balão por peça que tem fala (`lastActions` + `pieceKey`, mesma
  regra do 2D). O texto nítido não passa pelo quadro de ≤ 480 colunas (que é ampliado sem suavização e borraria o texto).
- **Posição**: `drawRaycastFrame` devolve `FrameResult` com, para cada figura projetada, `id`, `screenX` (centro), `top`, `depth` e
  `headVisible` (o pixel do topo da cabeça não está atrás de parede, usando `hiddenAt`). `lib/storyBubbles.bubblePlacement`
  converte para pixels do canvas (`displayWidth / frameWidth`), aplica escala por distância e limita à tela.
- **Atualização**: o renderizador chama `onFrame(result)` depois de cada desenho; `BubbleLayer` aplica `transform`/`opacity` por
  `ref` (sem `setState` por quadro). Mudança de fala chega pelo `TurnContext` já em tempo real (017/016) e só troca o texto.
- **Escala**: `scale = clamp(REFERENCE_DEPTH / depth, 0.7, 1.2)` com `REFERENCE_DEPTH = 6 × HEX_SIZE`; texto 12–14 px (mesma
  aparência do balão do 2D: caixa branca com cauda).
- **Sobreposição**: ordem por profundidade (`z-index` = ordem de proximidade); balões nunca saem da tela (limites com margem de 8 px
  e, no topo, o balão desce para baixo da cabeça se não couber acima).
- **Quem tem balão**: só peças desenhadas (em pé, visíveis, dentro do campo, com cabeça à vista) — FR-018.
- **Alternativas**: desenhar o texto no canvas do quadro (borrado); `foreignObject` (não há SVG no 3D).

## D6 — Prévia da máscara em tons de cinza

- **Decisão**: `MaskPreview` mostra a luminância como está (escala de cinza, transparente = branco) em vez do limiar a 50%;
  `thresholdPixels` dá lugar a `grayscalePixels`. Texto de ajuda: "Preto = parede alta, branco = vazio, cinza = parede mais baixa".

## D7 — Documentação (MCP e ajuda)

- **Decisão**: o texto de `maskImage` em `MapModelTools`, a seção "3D view" do `Roll6Guide` e `raycast.maskHint`/`raycast.maskFile`
  informam os tons de cinza e a regra da altura. Não há parâmetro nem endpoint novo (`McpCoverageTests` em 86/87).

## D8 — Teste de compatibilidade da renderização (FR-008)

- **Decisão**: um teste reconstrói o quadro de uma cena só com 0/255 e compara byte a byte com os valores de referência fixados do
  quadro anterior (gerados antes da mudança de `castRay`/pintura); outro cobre máscara com bordas suavizadas (mediana).

## D9 — Pedido "imagens parecem maiores que outras" no 3D

- **Decisão**: tratado como consequência do formulário (cada campo com moldura de tamanho diferente leva a enquadramentos
  diferentes). Nenhuma mudança de escala no 3D: a altura da figura continua `largura da peça × (altura ÷ largura da imagem)`. O
  critério SC-002 verifica que quatro imagens recortadas do mesmo modo aparecem na mesma escala.
