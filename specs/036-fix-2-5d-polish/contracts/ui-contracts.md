# UI Contracts: Ajustes do 2,5D (036)

Sem endpoint, DTO ou evento novo. Os contratos abaixo são funções puras e componentes que a implementação e os testes devem respeitar.

## `lib/maskImage`

```ts
export const MASK_MIN_HEIGHT = 0.05;      // abaixo disso a célula é vazia
export const MASK_FULL_HEIGHT = 0.95;     // a partir daqui vale 1 (parede inteira)
/** Altura (0–1) de um pixel: 1 − luminância/255; alpha < 128 = 0. Sem encaixe (o encaixe é por célula). */
export const pixelHeight = (r: number, g: number, b: number, a?: number): number;
/** Altura final de uma célula a partir da luminância mediana (0–255): 0, 1 ou proporcional. */
export const wallHeight = (medianLuminance: number): number;
/** Prévia: RGBA para escala de cinza (luminância, transparente = branco), no lugar do limiar a 50%. */
export const grayscalePixels = (pixels: Uint8ClampedArray): Uint8ClampedArray;
```

Casos de referência (testes): `wallHeight(0) = 1`, `wallHeight(255) = 0`, `wallHeight(127.5) ≈ 0,5`, `wallHeight(10) = 1`,
`wallHeight(245) = 0`, `wallHeight(200) ≈ 0,216`.

## `lib/raycaster`

```ts
export interface MaskGrid { cols; rows; originX; originY; cellWidth; cellHeight; heights: Uint8Array }
export interface RayHit { distance; x; y; side: 'ew' | 'ns'; height: number /* 0–1 */ }
export const buildMaskGrid(pixels, width, height, area, maxCells?): MaskGrid;      // mediana por célula
export const castRay(grid, ox, oy, angle, maxDistance): RayHit[];                  // perto → longe, alturas crescentes, ≤ 8
export const wallColumn(perpendicular, frameHeight, projection, height = 1): { top; bottom };
export const isWallAt(grid, x, y): boolean;                                        // altura > 0
```

Garantias: máscara só 0/255 → `castRay` devolve 0 ou 1 face e `wallColumn(..., 1)` é igual ao de antes; `top` de uma parede de altura
`h` = `horizon − (h × WALL_HEIGHT − EYE_HEIGHT) × escala` (abaixo do horizonte quando `h × WALL_HEIGHT < EYE_HEIGHT`).

## `lib/raycastFrame`

```ts
export interface FrameSprite { id: number; screenX: number; top: number; bottom: number; depth: number; headVisible: boolean }
export interface FrameResult { frameWidth: number; frameHeight: number; sprites: FrameSprite[] }
export const drawRaycastFrame(frame, scene, pose, fov, sky?): FrameResult;        // o z-buffer passa a ser interno
export const hiddenAt(columnWalls, column, y, depth): boolean;
```

Chão: pixel fora da imagem do mapa usa o pixel da borda mais próxima (clamp); alpha < 128 → cor neutra. O resto (sombreamento,
ordem das figuras, escolha da face 035) não muda.

## `lib/storyBubbles`

```ts
export const REFERENCE_DEPTH = 6 * HEX_SIZE;
export const MIN_SCALE = 0.7, MAX_SCALE = 1.2, SCREEN_MARGIN = 8;
export const bubblePlacement(
  sprite: FrameSprite, frame: { frameWidth; frameHeight }, canvas: { width; height }, size: { width; height },
): BubblePlacement | null;       // null quando a cabeça não está visível
export const orderByProximity(placements: BubblePlacement[]): BubblePlacement[];
```

Regras testadas: escala = `clamp(REFERENCE_DEPTH / depth, MIN, MAX)`; `x` limitado a `[margem + largura/2, canvas.width − margem − largura/2]`;
se não cabe acima (`y − altura < margem`), o balão passa a ficar abaixo da cabeça; cabeça escondida → `null`.

## Componentes

| Componente | Contrato |
|---|---|
| `ImageCropper` (`stage?: boolean`) | Com `stage`, o recorte, a imagem gravada e o estado vazio ocupam o mesmo palco quadrado; sem a prop o comportamento atual (outros formulários) não muda. |
| `SpriteImageField` | Renderiza 4 linhas de subgrid: título · descrição · palco · controles (zoom/rotação/remover). |
| `TokenFormFields` (aba 2,5D) | `.stm-sprite-grid`: duas colunas com `subgrid` em telas ≥ md, uma coluna abaixo; o painel continua `hidden` quando inativo. |
| `BubbleLayer` | Props: `bubbles: { id, text, name }[]`; expõe `update(result)` por ref, chamado pelo `onFrame`. `pointer-events: none`. Texto via `title`/`aria-label` com "nome: texto". |
| `StoryView` | Lê `useTurn().entries`, calcula `lastActions` e `pieceKey` dos pontos em pé e entrega ao `BubbleLayer`. |
| `MaskPreview` | Mostra tons de cinza; mesmo aria-label (`raycast.maskPreview` atualizado). |

## i18n (pt-BR)

Novas/alteradas: `tokens.stageEmpty` ("Escolha o arquivo"), `raycast.maskHint` e `maskFile` (tons de cinza), `raycast.maskPreview`
("Prévia da máscara em tons de cinza"), `story.bubbleLabel` ("{{name}} diz: {{text}}").
