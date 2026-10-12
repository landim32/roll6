# Research — Qualidade da vista 3D (053)

Contexto lido: `components/story/raycastRenderer.ts` (`MAX_COLUMNS = 480`, `imageSmoothingEnabled = false`, um `ImageData` por quadro), `components/story/StoryView.tsx` (`SPRITE_MAX_SIDE = 256`, cache `spriteImages` por URL, `fittedImages` por token), `lib/raycastFrame.ts` (figuras desenhadas no quadro por vizinho mais próximo, linhas 341–414; sombra separada; oclusão por `ColumnWalls`), `lib/raycastFrame.test.ts` (quadro de referência: soma + FNV-1a `4240962842`), `lib/viewMode.ts`/`lib/layoutMode.ts` (padrão das preferências), `components/menu/UserMenu.tsx` + `TopMenu.tsx` (itens → modais), `components/install/InstallHint.tsx` (`useMediaQuery(PHONE_QUERY)`).

## R1 — Valores dos níveis

**Decision**: tabela da issue, num só lugar (`QUALITY_PROFILES` em `lib/viewQuality.ts`):

| Nível | `columns` | `spriteMaxSide` | `spriteSampling` | `figureLayer` |
|---|---|---|---|---|
| `standard` | 480 | 256 | `nearest` | false |
| `high` | 720 | 480 | `smooth` | false |
| `ultra` | 960 | 480 | `smooth` | true |

**Rationale**: 480/256/nearest são os valores de hoje (FR-002). 480 px é o lado maior em que as imagens "2,5D" são salvas (`FRONT_IMAGE_SIZE` 360×480), logo é a resolução máxima útil — ler mais só custaria memória. 720 e 960 colunas são 1,5× e 2× o quadro atual; o custo do quadro cresce linear nas colunas e quadrático nos pixels do chão, então 960 fica em ~4× o custo do chão do Padrão — aceitável só como Ultra. Os números são constantes de um módulo puro: se as medições (R9) pedirem, mudam num lugar só.

**Alternatives considered**: quadro na resolução da tela em Ultra (custo imprevisível em telas 4K; rejeitado); ler as figuras a 512 (acima do tamanho salvo, só upscale; rejeitado); quatro níveis com um "Econômico" (a clarificação Q4 fixou o padrão do celular igual ao atual; rejeitado).

## R2 — Amostragem das figuras em Alta e Ultra

**Decision**: módulo puro `lib/mipmap.ts`: `buildMipChain(pixels)` gera a cadeia de cópias reduzidas pela metade (filtro de caixa 2×2) **com alpha premultiplicado**, até 1×1; `sampleBilinear(level, u, v)` lê quatro texels e interpola em premultiplicado; `mipLevelFor(texelsPerPixel)` escolhe o nível pelo `log2` da razão texels/pixel (nível 0 quando a figura é desenhada maior que a imagem). O quadro (Alta) ou a camada (Ultra) compõem `src over` com a cobertura resultante (nada de limiar de alpha 128 — é isso que suaviza as bordas).

**Rationale**: bilinear sem premultiplicação sangra a cor de fundo transparente das bordas (franja escura); mips evitam o aliasing/cintilação das figuras distantes (critério 4 da issue e SC-003). Filtro de caixa é suficiente e barato; o experimento desfeito usou exatamente isso.

**Alternatives considered**: `drawImage` com `imageSmoothingEnabled = true` numa canvas por figura (não respeita a oclusão linha a linha pelas paredes nem o `fade` por distância sem passes extras; rejeitado); filtro bicúbico (custo sem ganho visível no tamanho das figuras; rejeitado).

## R3 — Camada de figuras do Ultra

**Decision**: o renderizador ganha um **segundo canvas, transparente, do tamanho da tela** (`figureCanvas`, `ImageData` de `canvas.width × canvas.height`). Em Ultra, `drawRaycastFrame` roda com `figures: 'layer'`: desenha céu/paredes/chão/sombras no quadro pequeno como sempre e **não pinta os pixels das figuras**; devolve, no `FrameResult`, `layer: { walls: ColumnWalls, sprites: LayerSprite[] }` (imagem escolhida, espelhada ou não, projeção em coordenadas do quadro, `fade`). `lib/figureLayer.ts` (`drawFigureLayer(target, layer, frameSize)`) escala a projeção para a tela e amostra as figuras com R2 direto na resolução da tela. O renderizador compõe: `display.drawImage(buffer, …)` (quadro ampliado sem suavização, como hoje) e depois `display.drawImage(figureCanvas, 0, 0)` (composição com alpha).

**Rationale**: `putImageData` não compõe (substitui pixels), por isso a camada precisa do próprio canvas e de `drawImage` para cair por cima do quadro. Separar o desenho num módulo puro (`figureLayer.ts`) mantém o teste sem DOM. Manter a sombra no quadro pequeno segue a spec ("sombras não dependem do nível") e evita duplicar o código da sombra.

**Alternatives considered**: desenhar o quadro inteiro na resolução da tela (perde o visual retrô das paredes, FR-005, e custa demais; rejeitado); WebGL para a camada (dependência/complexidade nova, constituição II; rejeitado); figuras como `<img>` HTML absolutos (sem oclusão pelas paredes; rejeitado).

## R4 — Oclusão da camada pelas paredes

**Decision**: a camada usa as mesmas `ColumnWalls` do quadro: para a coluna de tela `x`, a coluna do quadro é `floor(x × frameWidth / screenWidth)`; `hiddenFrom(walls, coluna, depth)` dá a linha do quadro a partir da qual a figura some, convertida para a tela por `× screenHeight / frameHeight`. O `headVisible` dos balões continua calculado no quadro, como hoje.

**Rationale**: as paredes são desenhadas na resolução do quadro, então a borda de oclusão nessa resolução é exatamente a borda visível da parede — uma oclusão mais fina que a parede ficaria errada. Nenhum custo novo (as `ColumnWalls` já existem por quadro).

**Alternatives considered**: refazer os raios na resolução da tela só para a oclusão (duplica o custo dos raios; rejeitado).

## R5 — Onde fica o estado e como o 3D reage

**Decision**: `viewQuality: ViewQuality` + `setViewQuality` em `MapEditorContext` (ao lado de `viewMode`/`setViewMode`/`fov`), inicializado por `readViewQuality()`; `setViewQuality` grava com `writeViewQuality`. `StoryView` lê `useMapEditor().viewQuality`, chama `renderer.setQuality(QUALITY_PROFILES[viewQuality])` num efeito e inclui `spriteMaxSide` nas dependências do efeito das figuras. `AuthContext.logout` chama `clearViewQuality()` junto de `clearViewModes()`/`clearLayoutMode()`. O modal (`ViewQualityModal`) e o item do menu ficam em `TopMenu`/`UserMenu` como "Notificações".

**Rationale**: `MapEditorContext` já é o dono das preferências de visualização do 3D e está acima de `TopMenu` e `StoryView` na cadeia; um contexto só para um valor seria ruído. A troca "na hora" (FR-006) vem de graça pelo React: o `StoryView` montado recebe o novo valor; fechado, só lê ao abrir.

**Alternatives considered**: evento `window` (`roll6:3d-quality`) lido pelo `StoryView` (frágil, foge do padrão; rejeitado); novo `ViewQualityContext` (cadeia de providers mais longa sem ganho; rejeitado); estado só no `StoryView` (o modal fica no menu, fora dele; rejeitado).

## R6 — Cache de imagens por tamanho e troca sem buraco

**Decision**: a chave de `spriteImages` passa a `${maxSide}|${url}` e a de `fittedImages` a `${maxSide}|${urls}`; `fitSprites` roda sobre as imagens do tamanho do nível (a issue pede isso explicitamente). O efeito das figuras já só chama `setSprites` depois de `Promise.all` — então, numa troca, o renderizador segue com as figuras antigas até as novas chegarem (FR-012). Voltar ao Padrão reaproveita as de 256 px do cache (não há re-download; as de 480 ficam na memória até o `StoryView` desmontar — aceitável, pois foram pedidas pelo usuário). As cadeias de mips ficam num `WeakMap<PixelBuffer, MipChain>` dentro de `lib/mipmap.ts`, construídas na primeira amostragem `smooth`: no Padrão nunca são construídas (FR-011).

**Alternatives considered**: limpar o cache a cada troca (re-download e buraco visível; rejeitado); construir mips no `toPixels` (custo no Padrão; rejeitado).

## R7 — Quadro de referência byte a byte

**Decision**: `drawRaycastFrame(frame, scene, pose, fov, sky, options?)` com `options` opcional cujo padrão é `{ spriteSampling: 'nearest', figures: 'frame' }`; o laço atual das figuras fica **inalterado** nesse caminho (sem reorganizar aritmética de ponto flutuante). O renderizador nasce com `QUALITY_PROFILES.standard`. O teste de referência não muda uma linha e continua exigindo soma e hash `4240962842`.

**Rationale**: FR-002/SC-001 exigem identidade de bytes; qualquer refatoração "cosmética" do laço antigo poderia alterar arredondamentos. Os caminhos novos entram como ramos separados.

## R8 — Aviso de bateria em celular

**Decision**: o modal usa `useMediaQuery(PHONE_QUERY)` (o mesmo de `InstallHint`) para acrescentar a frase `viewQuality.batteryHint` à descrição; a lista de níveis é a mesma em todos os aparelhos (Q4).

## R9 — Medição de desempenho (FR-015)

**Decision**: medir o **tempo médio de `draw()`** por nível com 50 peças em pé num mapa com máscara: (a) desktop — por mim, nesta máquina, com o Chrome (DevTools › Performance, ou um `performance.now()` temporário em volta de `draw()` lido no console, removido antes do commit); (b) celular — pelo usuário, com o roteiro do `quickstart.md` (Chrome remoto ou `about:tracing`/Safari Web Inspector). Resultados vão para a descrição do PR e um comentário na issue #31. Nenhum código de medição fica no produto.

**Alternatives considered**: contador de FPS permanente escondido atrás de uma chave (código morto no produto; rejeitado); benchmark no Vitest (não representa um aparelho real; rejeitado).
