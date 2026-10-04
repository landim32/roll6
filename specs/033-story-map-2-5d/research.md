# Research: Mapa de história 2,5D

**Feature**: `033-story-map-2-5d` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

Cada decisão segue o formato *Decision / Rationale / Alternatives considered*. Não restou nenhum
`NEEDS CLARIFICATION` no Technical Context.

---

## D1 — Onde ficam o tipo, as paredes e o céu

**Decision**: três colunas novas em `map_models`, a entidade que já é dona da imagem e da grade:

- `kind integer not null default 1` → `MapKind` (1 `Battle` = 2D, 2 `Story` = 2,5D);
- `walls jsonb null` → lista de células `[[x, y], …]` em coluna/linha odd-q (Princípio VII);
- `sky_image varchar(260) null` → nome armazenado `{guid}.{ext}` (`Guard.ImageFileName`), como `image`.

As paredes pertencem ao **modelo**, não ao `Map` da campanha: são parte do desenho do lugar, como a imagem, e
viajam com ele quando o mesmo modelo serve a várias campanhas (o `map.saved` já existente avisa todas).

**Rationale**: a spec (Key Entities) põe tipo, paredes e céu no modelo do mapa. `MapOccupancyLoader.LoadAsync`
já lê o `MapModel` para saber o tamanho da grade, então as paredes chegam à validação de posições sem nenhuma
consulta extra. `jsonb` com conversão para texto JSON é o padrão de `turns.changes` (024).

**Alternatives considered**:
- *Tabela `map_walls` (1 linha por célula)*: até 250.000 linhas por modelo (grade 500×500), um repositório e um
  diff de inserções/remoções a cada salvamento — muito mais peso para um dado que é sempre lido e salvo inteiro.
- *Bitmap em base64*: compacto, mas ilegível para a API/MCP e exige codificação espelhada em C# e TS.
- *Paredes no `Map` (por campanha)*: duas campanhas com o mesmo modelo veriam lugares diferentes; contraria a
  regra atual de que o desenho do mapa é do modelo.

## D2 — Semântica de `PUT /api/mapmodel/{id}` para os campos novos

**Decision**: o PUT continua **substituindo todos os campos** (`ApplyChanges`): `kind` omitido → `Battle`,
`walls` omitido → nenhuma parede, `skyImage` omitido → sem céu. A ferramenta MCP `update_map_model` repete o aviso
"read it with get_map_model and send unchanged values back" já presente. O frontend sempre envia o rascunho
inteiro.

**Rationale**: é o contrato que o endpoint já tem para `image` e para o layout da imagem; abrir exceção só para
os campos novos criaria duas regras no mesmo DTO.

**Alternatives considered**: *null = manter* (como `CampaignCharacterUpdateInfo.sheetFile`) — protege clientes
MCP desatentos, mas deixa o PUT meio parcial e meio total.

## D3 — Normalização das paredes

**Decision**: `MapModel.UpdateWalls(kind, walls)` remove duplicatas, **descarta células fora da grade** e ordena
por (y, x); `null`/vazio → `Walls = null`. Valores inválidos (par com ≠ 2 números) → 400 `walls`. Mudar o tipo para
`Battle` **mantém** as paredes guardadas (edge case da spec); elas só valem enquanto o tipo for `Story`.

**Rationale**: reduzir a grade no editor deixaria paredes órfãs; descartá-las no servidor evita um 400 confuso
para quem só mudou o tamanho (o frontend também apara o rascunho, D9). O limite de quantidade é natural: no máximo
`gridWidth × gridHeight` células.

**Alternatives considered**: *400 para células fora da grade* — mais estrito, mas obriga MCP/clientes a aparar à
mão sempre que mudam a grade.

## D4 — Paredes bloqueiam como hex ocupado (Q5 da clarificação)

**Decision**: `Occupancy.Build(pieces, walls)` (C#) e `buildOccupancy(pieces, walls)` (TS) recebem um conjunto de
células de parede. `IsBlocked`/`isBlocked` devolvem `true` para parede **independentemente** de `except` (nenhuma
peça "é dona" de uma parede). `MapLayout` ganha `Walls` e só os preenche quando `kind == Story`. Efeitos:

- `EnsureFits` (colocar personagem/objeto/NPC, mover, girar, reset de turno) → 409 com mensagem própria
  `"Há uma parede nessa posição."`;
- `MapLayout.MovementCost(..., ignorePieces: true)` (o mestre "pulando" peças) continua respeitando paredes: o
  predicado vira `wall || (!ignorePieces && piece)`;
- `TurnService.Processing` (027/031) monta seu `Occupancy` com as paredes;
- a busca de hex livre do `POST /api/mapnpc` usa o mesmo `MapLayout`, então pula paredes sem mudança própria;
- no frontend, `useTokenMovement`, `mapTokens.characterDropAction`/`npcDropAction` e `tokenAt` passam as paredes do
  rascunho; `movementField` já recebe um predicado `blocked`.

O estado inicial continua aceito (031): uma peça sob uma parede recém-marcada pode sair com "Mover". Mudar a
postura nunca chama `EnsureFits`, então segue sem recusa.

**Rationale**: concentrar a regra no `Occupancy` (já espelhado 1:1) cobre todos os pontos de escrita de posição de
uma vez e mantém frontend e backend iguais, como exige o Princípio VII.

**Alternatives considered**: *checagem de parede em cada serviço* — 6 lugares para manter em sincronia; *parede
como peça falsa no `PieceShape`* — vazaria para `PieceAt`/`tokenAt` e para o `MapTokenInfo`.

## D5 — Motor 3D: `three` (nova dependência, carregada sob demanda)

**Decision**: adicionar `three` (+ `@types/three` em dev) e usá-lo **diretamente**, sem `@react-three/fiber`. A cena
fica em `components/story/StoryView.tsx` carregado com `React.lazy` (chunk próprio, como o `MarkdownEditor`), de
modo que o bundle principal e os mapas 2D não pagam nada.

**Rationale**: um raycaster clássico estilo Wolfenstein pressupõe grade quadrada; com paredes **hexagonais**
(Q1), prismas hexagonais em um renderizador de verdade são mais simples e corretos (oclusão de sprites por
profundidade, perspectiva, zoom por FOV). `three` é a biblioteca WebGL de referência, sem dependências
transitivas, tree-shakeable. Usá-la sem `react-three-fiber` evita mais duas dependências e um reconciliador
paralelo; a cena é um objeto imperativo criado num `useEffect` e alimentado por props.

**Alternatives considered**:
- *Raycaster próprio em `<canvas>` 2D*: zero dependências, mas a interseção raio×hexágono, os sprites com oclusão
  por coluna e o chão texturizado ("floor casting") são muito código novo e lento em JS para 60×40 células.
- *`@react-three/fiber` + `drei`*: ergonomia React, mas 2 dependências a mais e versão 8 presa ao React 18.
- *Babylon.js*: bundle bem maior para o mesmo uso.

## D6 — Geometria da cena

**Decision**: 1 unidade 3D = 1 px do mapa; eixo X = x do mapa, eixo Z = y do mapa, Y para cima.

- **Chão**: um plano com a imagem do mapa posicionado em (−imageLeft, −imageTop) com `imageWidth × imageHeight`
  (as mesmas regras do `ImageLayer`), sobre um plano de cor padrão do tamanho da grade (`gridPixelSize`).
- **Paredes**: **um** `InstancedMesh` com a geometria de um prisma hexagonal flat-top de raio `HEX_SIZE` e altura
  `WALL_HEIGHT = 3 × HEX_SIZE`, uma instância por célula em `hexCenter(x, y, HEX_SIZE)`; material padrão simples
  (cor + leve variação por face para dar leitura de volume). Uma única draw call mesmo para 250.000 células.
- **Céu/horizonte**: cilindro aberto grande, centrado na grade, com a imagem do céu na face interna (repetida 2× na
  volta); sem imagem → cor de fundo padrão e névoa leve.
- **Peças**: `THREE.Sprite` (sempre de frente para a câmera) com a imagem de pé do token, largura = diâmetro do
  footprint (`footprintLocal`), base apoiada no chão no centro da posição; um disco plano no chão com a cor do tipo
  (azul personagem, vermelho NPC, cinza objeto) mantém a leitura do 2D. Caído/fora de combate → a imagem deitada
  (`lib/pieceDrawing`) num plano horizontal no chão; fora de combate em preto e branco (mesma conversão de pixels
  do `mapSnapshot`, que funciona no Safari).
- **Texturas**: carregadas por `loadImage` (`lib/mapSnapshot`), que lê imagens armazenadas por
  `GET /api/image/file/{fileName}` — WebGL exige CORS e o bucket não envia cabeçalhos (mesmo motivo do Share).

**Rationale**: reaproveita `hexCenter`/`footprintLocal`/`gridPixelSize` do módulo puro de hexágonos, de modo que o
3D e o 2D concordam célula a célula (FR-003a, FR-014). Instancing garante SC-003.

**Alternatives considered**: *mesclar só as faces externas das paredes* — menos triângulos, mas código de
geometria próprio; desnecessário com instancing. *Skybox cúbico* — exige 6 imagens.

## D7 — Câmera em terceira pessoa, livre, com colisão (Q2/Q3)

**Decision**: lógica pura em `lib/storyCamera.ts` (testável, sem `three`):

- `lookToYaw(look)`: look 0 = norte (−Z), passos de 60° no sentido horário.
- **Presa** (`attached`): alvo = centro da peça do personagem escolhido; câmera a `FOLLOW_DISTANCE = 4 × HEX_SIZE`
  atrás dele na direção do look e a `EYE_HEIGHT = 1,6 × HEX_SIZE` de altura, olhando para a altura do peito da peça.
  Se há parede no segmento peça→câmera (amostrado a cada `HEX_SIZE / 4` com `pixelToHex`), a câmera para antes da
  primeira parede (FR-011).
- **Solta** (`free`): andar (W/S, setas ↑/↓), passo lateral (A/D), girar (Q/E, setas ←/→, arrastar com o mouse ou
  o dedo; pitch limitado a ±35°). Qualquer deslocamento solta a câmera; o botão "Voltar ao personagem" prende de
  novo. Colisão: o movimento é aplicado por eixo (desliza ao longo da parede) e recusado se o raio da câmera
  (`HEX_SIZE / 3`) tocar uma parede ou sair da grade.
- **Zoom**: roda do mouse / pinça / botões +/− existentes mudam o FOV entre 30° e 90° (padrão 70°).
- **Início** (FR-010a–d): personagem escolhido com peça no mapa → presa a ela; GM ou sem peça → solta no centro da
  grade, olhando para o norte. Trocar o "Personagem atual" → presa à peça do novo. A peça presa sumiu → solta onde
  está. A câmera é local e **não** é sincronizada (Assumptions).
- **Celular**: joystick virtual no canto inferior esquerdo (deslocamento), arrastar no resto da tela (girar), pinça
  (FOV).

**Rationale**: separar a matemática da câmera do motor gráfico permite testar as regras da spec em Vitest
(`environment: 'node'`, sem WebGL), como o projeto já faz com `movement.ts` e `occupancy.ts`.

**Alternatives considered**: *`OrbitControls`/`PointerLockControls` do three* — não fazem colisão com hexágonos
nem o modo "preso ao personagem"; acabariam reescritos.

## D8 — Onde a vista 3D entra na tela e como alterna

**Decision**: em `MainPage`, quando o mapa aberto é `Story` e o modo é `3d`, `StoryView` ocupa o mesmo espaço do
`MapCanvas` (o fundo da tela, sob o `TopMenu`, os painéis laterais, o `MapControls` e o rodapé), e o `MapCanvas`
sai de cena (a vista 2D não fica desenhando por baixo). O botão "2D/3D" fica no `MapControls`, visível só em mapas
`Story`. O modo é lembrado em localStorage `roll6:view-mode` = `{ [mapModelId]: '2d' | '3d' }` (try/catch, apagado
no logout como `roll6:map`). Sem WebGL (`canvas.getContext('webgl2' | 'webgl')` falha) → toast
`story.noWebgl` e o modo volta a `2d` (FR-018).

Na vista 3D, ficam fora: edição de paredes, menu de hex, "Mover", arrastar cartões para o mapa e redimensionar
imagem (tudo isso é do 2D, FR-017). Ficam: painéis, turno, console, Share (gera o JPEG do 2D, que é a representação
fiel das posições) e zoom (vira FOV).

**Rationale**: um único slot de "superfície do mapa" evita duas cenas competindo por eventos de ponteiro e mantém
a cadeia de providers intacta (a vista 3D só **lê** `MapEditorContext`, `MapTokenContext`, `CharacterContext`).

**Alternatives considered**: *3D sobreposto ao 2D com transparência* — conflito de eventos e custo de desenhar as
duas cenas.

## D9 — Edição de paredes no 2D

**Decision**: no `MapControls`, para quem pode salvar o mapa (`canEdit` atual) e só em mapas `Story`, um modo
"Paredes" com duas ferramentas: **pintar** e **apagar**. Clique ou arrasto passa por hexágonos (`pixelToHex` +
`useMapPointer.toMapPoint`) e aplica a ferramenta a cada hex dentro da grade. Enquanto o modo está ativo, o clique
não abre o `HexMenu`. As paredes são desenhadas por `WallLayer` (um único `<path>` com os hexágonos, preenchimento
escuro semitransparente + contorno) entre a grade e o `HexHighlight`; fora do modo, ficam visíveis sem interação.
Os dados vivem no **rascunho** (`MapDraft.kind`, `walls`, `skyImage`, `skyImageUrl`) e entram em `isDirty`; o
salvamento é o fluxo existente (PUT do próprio modelo ou cópia). Mudar a grade apara `walls` no rascunho
(`lib/storyWalls.trimWalls`).

O tipo é escolhido num seletor "Tipo de mapa" (2D / História 2,5D) no `MapControls`, que muda o rascunho; o céu é
um botão "Céu" (só `Story`) que envia a imagem por `POST /api/image` sem recorte e grava `skyImage` no rascunho,
com opção de remover.

**Rationale**: reaproveita o modelo rascunho/salvo, o guard de alterações não salvas e o evento `map.saved`
(017) — jogadores com o mapa aberto recebem as paredes novas sem nada novo no tempo real.

**Alternatives considered**: *endpoint próprio de paredes salvo a cada clique* — fura o modelo rascunho/salvo do
editor e geraria um `map.saved` por hex pintado.

## D10 — Tempo real, MCP e contagens

**Decision**: nenhum endpoint e nenhum tipo de evento novo. Peças continuam chegando por `mapToken.upserted` /
`deleted` / `mapTokens.changed` ao `MapTokenContext`, que a vista 3D lê (FR-013, SC-004); paredes, tipo e céu chegam
por `map.saved` → `loadMapModel(..., { keepView: true })`. MCP: `create_map_model` e `update_map_model` ganham
`kind`, `walls` e `skyImage` (todos com default, exigência de `McpRouteParityTests`); `get_map_model` devolve os
campos; o `roll6://guide` ganha a seção "Story maps (2.5D)". `McpCoverageTests` continua em 86 operações / 87
ferramentas.

**Rationale**: os campos novos são do modelo do mapa, que já tem CRUD completo.
