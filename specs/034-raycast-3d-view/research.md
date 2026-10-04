# Research: Vista 3D por raycasting (estilo Wolfenstein 3D)

**Feature**: `034-raycast-3d-view` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

Esta feature parte da branch da 033 (PR #24, não mesclado) e substitui o tipo de mapa, as paredes por hex e a cena
`three` por uma Máscara 3D e um raycaster próprio. Formato: *Decision / Rationale / Alternatives considered*.
Nenhum `NEEDS CLARIFICATION` restou.

---

## D1 — Dados: o que sai e o que entra

**Decision**: uma migração nova, `ReplaceStoryMapWithRaycast`, sobre a `AddStoryMap` da 033:

- `map_models`: **remove** `kind` e `walls`; **renomeia** `sky_image` → `background_image` (FR-024: o céu da 033 vira o
  fundo, sem perda); **adiciona** `mask_image varchar(260) null`.
- `tokens`: **adiciona** `front_image varchar(260) null` ("2,5D frente").

Todos os novos campos são nomes armazenados `{guid}.{ext}` (`Guard.ImageFileName`), lidos com URL pré-assinada.

**Rationale**: a 033 pode já ter sido aplicada em algum banco de desenvolvimento ou homolog; uma migração por cima
(em vez de apagar a `AddStoryMap`) mantém qualquer banco coerente. `RenameColumn` preserva os dados do céu.

**Alternatives considered**: *apagar a migração da 033 e gerar uma única nova* — mais limpo no histórico, mas quebra
qualquer banco onde a 033 já rodou; *guardar a máscara como dado (bitmap/jsonb)* — duplicaria a imagem e exigiria
decodificá-la no servidor, sem uso: a máscara só é lida pelo navegador.

## D2 — Validação da Máscara 3D

**Decision**: a proporção (FR-003, tolerância de 1%) é verificada **no navegador**, no cadastro do mapa, comparando
`naturalWidth/naturalHeight` da máscara com a proporção de exibição da imagem do mapa (`imageWidth/imageHeight` do
rascunho, a mesma área que a máscara cobre — FR-005). O servidor valida só o nome do arquivo. Trocar a imagem do mapa
para outra proporção mostra o aviso da Edge Case e mantém a máscara até o mestre trocá-la ou removê-la.

**Rationale**: o servidor não decodifica imagens hoje (`ImageService` só confere a assinatura dos bytes); conhecer as
dimensões exigiria uma biblioteca de imagem nova no backend. A máscara não afeta o 2D nem as regras das peças
(Clarifications Q2), então uma máscara fora da proporção enviada por API/MCP só desenha um 3D distorcido — sem risco
de dados ou de regra de jogo.

**Alternatives considered**: *ler os cabeçalhos PNG/JPEG/WebP no backend* — possível sem biblioteca, mas três parsers
para um aviso que o frontend já dá; *recusar no backend sem conhecer a imagem do mapa natural* — a proporção que
importa é a de exibição, que o backend conhece, mas não a da máscara.

## D3 — Motor: raycaster próprio em Canvas 2D (sai o `three`)

**Decision**: remover `three`/`@types/three` e a cena `storyScene.ts`. A vista 3D passa a ser um raycaster no estilo
Wolfenstein 3D escrito em TypeScript, em duas camadas:

- `lib/raycaster.ts` — **puro** (sem DOM), testável no Vitest: grade da máscara, DDA, distância perpendicular
  (sem "olho de peixe"), altura de coluna, mapeamento de chão e de fundo, projeção de sprites e oclusão por z-buffer.
- `components/story/raycastRenderer.ts` — desenha num `ImageData` de **baixa resolução** (no máximo 480 colunas, altura
  pela proporção da tela, cada coluna = um raio) e o amplia para o canvas da tela com `imageSmoothingEnabled = false`,
  o visual "pixelado" do Wolfenstein.

**Rationale**: é exatamente o algoritmo do reel de referência (um raio por coluna da tela). Sem dependência, o chunk
da vista fica pequeno, roda em qualquer navegador com Canvas 2D (FR-017 vira "sem Canvas 2D", na prática nunca) e o
núcleo é testável. A 480 colunas, desenhar paredes, chão e fundo pixel a pixel custa ~ 480 × 270 ≈ 130 mil pixels por
quadro, dentro de SC-003 em JS.

**Alternatives considered**: *manter o `three` e imitar o visual* — o pedido explícito é o algoritmo do Wolfenstein;
*WebGL com shader de raycasting* — rápido, mas mais código especializado e sem ganho perceptível nessa resolução.

## D4 — Coordenadas e grade da máscara

**Decision**: o mundo do raycaster usa as **mesmas unidades do mapa 2D** (1 = 1 px do mapa, `x` → X, `y` → Y no
plano do chão). A máscara cobre o retângulo da imagem do mapa: origem `(−imageLeft, −imageTop)`, tamanho
`imageWidth × imageHeight` (FR-005). Ao carregar, a máscara é reduzida para uma grade de no máximo **512 células** no
lado maior (média dos pixels de cada célula) e limiarizada em 50% de luminosidade (FR-004): célula preta = parede.
Fora do retângulo da máscara não há parede. Peças continuam posicionadas por `hexCenter(x, y, HEX_SIZE)` — nenhuma
fórmula de hex nova (Princípio VII).

**Rationale**: a mesma unidade faz paredes, chão e peças concordarem ponto a ponto com o 2D (SC-002). Limitar a grade
mantém o DDA barato com máscaras grandes (SC-003 cita 2000 × 2000): o número de passos por raio cresce com a resolução
da grade, não da imagem.

**Alternatives considered**: *grade na resolução original* — 4 milhões de células e raios longos demais;
*converter a máscara em hexágonos* — rejeitado: a máscara não se prende à grade (o contorno exato vale no 3D).

## D5 — Cor das paredes (Clarifications Q3)

**Decision**: no ponto em que o raio atinge a célula preta, o renderer amostra a **imagem do mapa** naquele ponto do
mundo e usa essa cor para a coluna inteira da parede (o muro desenhado na planta "sobe"), escurecida pela distância
(`shade = 1 / (1 + d / FALLOFF)`) e multiplicada por 0,75 quando o raio bate num lado "norte/sul" da célula (como o
Wolfenstein faz). Sem imagem do mapa → cor padrão. A imagem do mapa é lida uma vez para um `ImageData` reduzido (no
máximo 2048 px no lado maior) por `mapSnapshot.loadImage` (o bucket não manda CORS; canvas precisa ler os pixels).

## D6 — Chão (Clarifications Q4)

**Decision**: *floor casting* clássico: para cada linha da tela abaixo do horizonte, a distância da linha ao chão é
`EYE_HEIGHT × projeção / (linha − horizonte)`; interpolando entre os raios da esquerda e da direita da tela obtém-se o
ponto do mundo de cada pixel, amostrado no mesmo `ImageData` da imagem do mapa. Fora da imagem → cor padrão. O chão é
desenhado na mesma baixa resolução (FR-014 permite resolução menor).

## D7 — Fundo em panorama (Clarifications Q5)

**Decision**: acima do horizonte, onde a coluna não tem parede, a coluna de ângulo `θ` (yaw + ângulo do raio) mostra a
coluna `u = frac(θ / 2π × repetições)` da imagem de fundo; a imagem ocupa a altura do topo da tela até o horizonte.
`repetições = max(1, round(larguraVirtual / larguraDaImagemNaAltura))`, onde `larguraVirtual = larguraDaTela × 360° /
FOV` — inteiro, para a volta fechar sem costura; a imagem não é esticada além do arredondamento. Andar não muda o
fundo; girar desliza. Sem fundo → cor padrão.

## D8 — Peças (figuras) e a imagem "2,5D frente"

**Decision**: cada peça é um *sprite* sempre de frente para a câmera, projetado pela distância perpendicular,
**desenhado do mais distante ao mais próximo** e cortado coluna a coluna pelo **z-buffer** das paredes (FR-020: meia
figura atrás de uma quina). Imagem: `frontImageUrl` do token ou, sem ela, a imagem atual (`pieceImage`, que já trata
a deitada). Altura da figura = largura do footprint × proporção da imagem; base no chão. Deitada/fora de combate:
figura a 35% da altura (imagem deitada ou a de pé girada 90°); fora de combate em preto e branco
(`mapSnapshot.toGrayscale`). As imagens das peças são lidas para `ImageData` por `loadImage`, com cache por URL.

`MapTokenInfo` ganha `frontImageUrl` (o token da peça), preenchido em `MapTokenService.MapToDtoAsync`.

## D9 — Câmera: só horizontal, observadora (Clarifications Q1)

**Decision**: `lib/storyCamera.ts` perde `pitch`, `tilt`, `PITCH_LIMIT`: a pose é `{ x, z, yaw, attached }` e a altura é
a constante `EYE_HEIGHT` (FR-010). O bloqueio da câmera (`cameraBlocker`) passa a usar a **grade da máscara** (D4)
mais os limites da grade do mapa, em vez das paredes por hex. Terceira pessoa, seguir/soltar/"Voltar ao personagem",
GM no centro e FOV 30–90° continuam como na 033. Nada no 3D chama API de peças (FR-011).

## D10 — Interface

**Decision**:
- `MapControls` volta ao que era antes da 033 **mais um único botão 3D/2D** (FR-008), para todos, em todo mapa; o
  menu de tipo/paredes/céu, `WallLayer`, o modo de pintura e `storyWalls.ts` são removidos.
- O **cadastro do mapa** é o `ImageModal` ("Imagem do cenário"): ganha a aba **"3D"** com dois campos — **Máscara 3D**
  (prévia já limiarizada em preto e branco e a checagem de proporção) e **Imagem de fundo** — cada um com enviar,
  trocar e remover; só para quem pode salvar o mapa (`canEdit`). Tudo vai para o rascunho e é salvo pelo fluxo atual.
- O cadastro de token (`TokenFormFields`) ganha o campo **"2,5D frente"**: envio do arquivo como está (sem recorte,
  preservando a transparência do PNG), com prévia e remover.
- O joystick de toque e "Voltar ao personagem" continuam.

## D11 — Reverter o bloqueio por parede da 033

**Decision**: `Occupancy.cs`/`lib/occupancy.ts`, `MapLayout`/`MapOccupancyLoader`, `TurnService.Processing`,
`mapTokens.ts`, `useTokenMovement` e `MapCanvas` voltam ao comportamento anterior à 033 (sem `walls`, sem
`FitResult.Wall`), com os testes de parede removidos. As descrições MCP de erro "a wall is on that hex" saem.

**Rationale**: Clarifications Q2 (revista): a máscara não afeta o 2D.

## D12 — MCP e contagens

**Decision**: `create_map_model`/`update_map_model` trocam `kind`/`walls`/`skyImage` por `maskImage` e
`backgroundImage`; `create_token`/`update_token` ganham `frontImage`; `get_map_model`/`list_map_models`,
`list_tokens`/`get_token` e `list_map_tokens` citam os campos novos; a seção do guia passa a "3D view (raycasting)".
Nenhum endpoint novo: `McpCoverageTests` segue 86 operações / 87 ferramentas.
