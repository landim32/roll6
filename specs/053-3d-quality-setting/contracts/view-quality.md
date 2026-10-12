# Contracts — Qualidade da vista 3D (053)

Sem API HTTP, sem MCP, sem banco. Os contratos são os módulos do frontend.

## `lib/viewQuality.ts` (puro)

```ts
export const VIEW_QUALITY = { standard: 'standard', high: 'high', ultra: 'ultra' } as const;
export type ViewQuality = (typeof VIEW_QUALITY)[keyof typeof VIEW_QUALITY];
export const QUALITY_ORDER: readonly ViewQuality[];            // standard, high, ultra

export type SpriteSampling = 'nearest' | 'smooth';
export interface QualityProfile {
  columns: number;          // largura máxima do quadro do mundo
  spriteMaxSide: number;    // lado maior das imagens das figuras
  spriteSampling: SpriteSampling;
  figureLayer: boolean;     // figuras na camada do tamanho da tela
}
export const QUALITY_PROFILES: Record<ViewQuality, QualityProfile>;
// standard = { 480, 256, 'nearest', false } — os valores atuais, sem exceção

export const VIEW_QUALITY_STORAGE_KEY = 'roll6:3d-quality';
export const isViewQuality = (value: unknown): value is ViewQuality;
export const readViewQuality = (): ViewQuality;   // inválido/ausente/erro → 'standard'
export const writeViewQuality = (level: ViewQuality): void;  // nunca lança
export const clearViewQuality = (): void;         // nunca lança
```

Testes (`viewQuality.test.ts`): `standard` igual aos valores atuais; ordem crescente de `columns`; `figureLayer` ⇒ `smooth`; `readViewQuality` com valor válido, inválido, ausente e com `localStorage` lançando; `write`/`clear` sem lançar.

## `lib/mipmap.ts` (puro)

```ts
export interface MipLevel { data: Float32Array | Uint8ClampedArray; width: number; height: number; } // RGBA premultiplicado
export interface MipChain { levels: MipLevel[]; }                       // [0] = original premultiplicado … 1×1

export const buildMipChain = (pixels: PixelBuffer): MipChain;          // caixa 2×2, premultiplicado, até 1×1
export const mipChainOf = (pixels: PixelBuffer): MipChain;             // WeakMap: constrói uma vez por PixelBuffer
export const mipLevelFor = (chain: MipChain, texelsPerPixel: number): number; // 0 quando ≤ 1; log2 arredondado; limitado ao último
export const sampleBilinear = (level: MipLevel, u: number, v: number, out: Float32Array): void; // u,v em [0,1]; out = RGBA premultiplicado 0–255
```

Testes: tamanhos da cadeia (ex.: 5×3 → 2×1 → 1×1); média premultiplicada de um 2×2 (pixel opaco + 3 transparentes → alpha 63,75 e cor premultiplicada, sem sangrar a cor do transparente); `sampleBilinear` no centro de um texel devolve o texel; `mipLevelFor(1) = 0`, `(2) = 1`, `(1000)` = último.

## `lib/raycastFrame.ts` — opções novas (compatível)

```ts
export interface FrameOptions {
  spriteSampling?: SpriteSampling;   // padrão 'nearest' → caminho atual, byte a byte
  figures?: 'frame' | 'layer';       // padrão 'frame'
}
export interface LayerSprite {
  id: number; pixels: PixelBuffer; mirrored: boolean; where: SpriteProjection; fade: number;
}
export interface FrameLayer { walls: ColumnWalls; sprites: LayerSprite[]; } // só quando figures === 'layer'
export interface FrameResult { frameWidth; frameHeight; sprites: FrameSprite[]; layer?: FrameLayer; }

export const drawRaycastFrame = (frame, scene, pose, fov, sky?, options?: FrameOptions): FrameResult;
```

Regras: com `options` omitido o resultado é idêntico ao de hoje (teste de referência intacto). Com `figures: 'layer'` a sombra é pintada no quadro, os pixels das figuras não, e `result.sprites` (balões) é calculado pela projeção e pela oclusão (uma figura inteiramente oculta não entra). Com `spriteSampling: 'smooth'` e `figures: 'frame'`, as figuras são amostradas por `lib/mipmap` e compostas `src over` com `fade`.

## `lib/figureLayer.ts` (puro)

```ts
export interface LayerTarget { data: Uint8ClampedArray; width: number; height: number; } // RGBA direto (não premultiplicado), transparente
export const clearLayer = (target: LayerTarget): void;
export const drawFigureLayer = (target: LayerTarget, layer: FrameLayer, frameWidth: number, frameHeight: number): void;
```

Regras: escala `where` do quadro para `target`; coluna do quadro = `floor(x × frameWidth / target.width)`; linha oculta = `hiddenFrom(...) × target.height / frameHeight`; amostragem bilinear + mip por `texelsPerPixel = pixels.width / spanTela`; escreve cor desfeita da premultiplicação e alpha = cobertura, `fade` aplicado à cor.

Testes: uma figura opaca no meio do quadro cobre a área esperada da camada e nada fora dela; uma parede mais próxima em metade das colunas apaga a figura dessas colunas abaixo da linha do topo; figura mais distante que a parede inteira → camada vazia; bordas da figura têm alpha intermediário (suavidade).

## `components/story/raycastRenderer.ts`

```ts
export interface RaycastRenderer {
  …métodos atuais…
  setQuality: (profile: QualityProfile) => void;  // refaz o quadro com `columns`, guarda a amostragem, liga/desliga a camada
}
export const createRaycastRenderer = (canvas, onFrame?, profile: QualityProfile = QUALITY_PROFILES.standard): RaycastRenderer;
```

Regras: `resize` usa `profile.columns` no lugar de `MAX_COLUMNS`; `setQuality` reaplica a última medida. Com `figureLayer`, `draw()` = quadro → `drawImage(buffer)` sem suavização → `drawFigureLayer` no `ImageData` da camada → `putImageData` no `figureCanvas` → `drawImage(figureCanvas, 0, 0)`. A camada só é alocada na primeira vez que o perfil a pede e é redimensionada em `resize`. Sem a camada, `draw()` é o de hoje.

## `components/story/StoryView.tsx`

- Lê `viewQuality` de `useMapEditor()`; `profile = QUALITY_PROFILES[viewQuality]`.
- Efeito: `renderer.setQuality(profile)` quando o perfil muda.
- Efeito das figuras depende também de `profile.spriteMaxSide`; chaves de cache `${maxSide}|${url}` e `${maxSide}|${urls}`.

## `Contexts/MapEditorContext.tsx`

```ts
viewQuality: ViewQuality;
setViewQuality: (level: ViewQuality) => void;   // estado + writeViewQuality
```

`Contexts/AuthContext.tsx` — logout chama `clearViewQuality()`.

## UI

- `components/menu/UserMenu.tsx`: prop `onViewQuality: () => void`; item `t('userMenu.viewQuality')` após "Notificações", antes de "Instalar o Roll6".
- `components/menu/TopMenu.tsx`: `const [qualityOpen, setQualityOpen] = useState(false)`; `<ViewQualityModal open onOpenChange />`.
- `components/story/ViewQualityModal.tsx`: `Modal` com título `viewQuality.title`; texto `viewQuality.intro`; um `form-check` radio por nível em `QUALITY_ORDER` (rótulo `viewQuality.level.<nível>`, descrição `viewQuality.levelHint.<nível>`); frase `viewQuality.costHint` e, em celular (`useMediaQuery(PHONE_QUERY)`), `viewQuality.batteryHint`; escolher um radio chama `setViewQuality` na hora (sem botão Salvar); rodapé "Fechar". `aria-describedby` nos radios.

## i18n (`pt-BR.json`)

| Chave | Texto |
|---|---|
| `userMenu.viewQuality` | Qualidade do 3D |
| `viewQuality.title` | Qualidade do 3D |
| `viewQuality.intro` | Escolha quanto o aparelho deve trabalhar para desenhar a vista 3D. Vale para este aparelho e muda na hora. |
| `viewQuality.level.standard` | Padrão |
| `viewQuality.level.high` | Alta |
| `viewQuality.level.ultra` | Ultra |
| `viewQuality.levelHint.standard` | A vista de sempre, leve em qualquer aparelho. |
| `viewQuality.levelHint.high` | Quadro mais fino e figuras mais nítidas. Custo moderado. |
| `viewQuality.levelHint.ultra` | Figuras no tamanho da tela, com bordas suaves. Só para aparelhos fortes. |
| `viewQuality.costHint` | Níveis mais altos exigem mais do processador. |
| `viewQuality.batteryHint` | No celular, gastam mais bateria. |
| `common.close` | (já existe — verificar) |
