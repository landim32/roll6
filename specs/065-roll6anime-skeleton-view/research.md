# Research: Esqueleto na vista 3D do roll6anime (065)

## R1 — Onde fica o botão e o desenho

- **Decision**: na vista (`viewer/`), na barra de tempo; a casca WPF não muda de layout.
- **Rationale**: o three.js, a câmera, o ponteiro e o canvas estão na vista; o print lê esse canvas. A casca só precisa
  saber, no print, se o esqueleto estava ligado (para a legenda).
- **Alternatives considered**: botão WPF + mensagem `skeleton` pela ponte — mais uma mensagem e o estado em dois lugares.

## R2 — Como desenhar os ossos

- **Decision**: `LineSegments` próprio (não `SkeletonHelper`): um segmento por osso com pai osso, posições tiradas de
  `bone.getWorldPosition` a cada quadro num `Float32Array` reaproveitado, cores por vértice; `Points` nas juntas (tamanho
  fixo em pixels). `LineBasicMaterial`/`PointsMaterial` com `depthTest: false`, `depthWrite: false`, `transparent: true`,
  `renderOrder` alto. O grupo fica na raiz da cena (posições em mundo), não dentro do modelo.
- **Rationale**: o `SkeletonHelper` pinta todas as linhas com duas cores fixas (pai/filho) e não deixa colorir por osso
  nem realçar um; o resto é igual (uma linha osso→pai).

## R3 — Modelo semitransparente

- **Decision**: ao ligar, para cada material das malhas do modelo, guardar `{ transparent, opacity, depthWrite }` e
  aplicar `transparent = true`, `opacity = 0.35`, `depthWrite = false`; ao desligar (ou trocar de modelo), restaurar os
  valores guardados. Materiais compartilhados são tratados uma vez (`Set`).
- **Rationale**: FR-004 exige voltar exatamente ao de antes; não se clona material nenhum.

## R4 — Ossos movimentados

- **Decision**: `movedBones(file)` = nomes das trilhas (`tracks[].bone`) + "Hips" se houver `hipsLift`; comparação com
  `normalizeBoneName(bone.name)`. Sem animação aberta ou modelo fora do padrão Mixamo, nenhum osso fica destacado.
- **Rationale**: é exatamente o que o arquivo mexe; a animação nova do Claude chega pela mensagem `animation` e
  recalcula o destaque (US2-5).

## R5 — Nome ao passar o mouse

- **Decision**: no `pointermove` sobre o canvas (sem botão pressionado), projetar os dois extremos de cada segmento para
  pixels de tela (`Vector3.project` + tamanho do canvas) e pegar o de menor distância ponto–segmento
  (`nearestSegment`, puro), até 14 px; um osso raiz sem pai conta como ponto. O rótulo é uma `div` posicionada junto ao
  ponteiro; o osso escolhido é pintado de branco no próximo quadro. Com um botão pressionado (girando a câmera) ou fora
  do canvas, o rótulo some.
- **Rationale**: projetar ~65 segmentos por evento é barato; a distância a segmentos acerta ossos longos pelo meio.

## R6 — Cores

- **Decision**: `SKELETON_COLORS = { moved: #FFB020 (âmbar), still: #5CE1E6 (ciano), hover: #FFFFFF }`, distintas do
  vermelho `#FF2020` das marcações da 064 e legíveis no fundo `#0B1220`.

## R7 — Lembrar a escolha

- **Decision**: `localStorage['roll6anime:skeleton']` ("on"/"off") lido ao carregar a vista, em try/catch (sem storage =
  desligado). O WebView2 usa a pasta de dados persistente da 062, então vale entre aberturas.

## R8 — Modelo sem esqueleto

- **Decision**: sem nenhum `Bone` no modelo, ligar mostra o aviso "Este modelo não tem esqueleto." sobre a vista e não
  mexe nos materiais.

## R9 — Print e legenda

- **Decision**: a mensagem `captured` ganha `skeleton` (o esqueleto estava ligado e havia ossos). `ViewCapture` ganha
  `Skeleton` (padrão false) e `Caption` acrescenta: " Esqueleto visível: o modelo aparece semitransparente e as linhas
  são os ossos (âmbar = movimentados pela animação aberta, ciano = os demais)." Com a 064, a nota das marcações vem
  depois, como hoje.
- **Rationale**: o rótulo HTML nunca entra no canvas (US3-4); as cores ditas na legenda são as da tela.
