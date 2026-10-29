# Contract: módulos da miniatura (104)

Sem API REST, hub ou MCP novos. Os contratos são entre módulos do frontend.

## `frontend/src/lib/isoMiniature.ts` (puro, sem `three`)

```ts
export const BASE_SHARE = 0.85;
export const BASE_HEIGHT = 4;

export interface MiniatureState { tipped: boolean; gray: boolean; }
export interface MiniatureBase { radius: number; height: number; }
export interface TipPose {
  /** Ponto do chão em volta do qual a miniatura tomba (borda de trás da base). */
  pivot: Point;
  /** Eixo horizontal (x, z da cena) do tombo. */
  axis: { x: number; z: number };
  /** Ângulo, em radianos, que leva o topo para as costas da peça. */
  angle: number;
}

/** De pé, tombada e/ou em preto e branco pela postura; objetos nunca tombam. */
export const miniatureState: (token: Pick<MapTokenInfo, 'posture' | 'tokenType'>) => MiniatureState;
/** Base pelo tamanho da peça em hexes (nunca pelo "Tamanho" do modelo). */
export const miniatureBase: (space: number) => MiniatureBase;
/** Pivô e eixo do tombo para a peça no centro `center` olhando `yaw` (look × 60°). */
export const tipPose: (center: Point, yaw: number, base: MiniatureBase) => TipPose;
```

A imagem do chão de um token tombado sem modelo nem figura (a de "Caído" quando houver) é escolhida em
`isoPieces` com a textura já lida (`Drawn.down`); uma função pura `floorImageUrl` foi descartada na implementação por
não ter quem a usasse.

## `components/story/modelSet.ts` — opções novas

```ts
export interface ModelSetOptions {
  still?: boolean;
  patchMaterial?: (material: Material, id: number) => void; // id novo
  patchMesh?: (mesh: Mesh) => void;
  /** Pai do objeto do modelo da peça `id`; null/ausente = a cena. */
  mount?: (id: number) => Object3D | null;
}
```

Garantias: sem `mount`, o objeto vai para a `scene`; com `mount`, o `fitModel` usa as coordenadas do `ModelSpec` no
quadro do pai (a isométrica passa `center` (0, 0), `yaw` 0 e `ground = BASE_HEIGHT`). A vista 3D (`StoryView`) não passa
nenhuma das duas.

## `components/iso/isoLightMaterial.ts`

```ts
export const applyLight: (material: Material, uniforms: LightUniforms, kind: LightKind,
  options?: { gray?: { value: number } }) => void;
```

`gray.value` 0 = cores, 1 = preto e branco; só para `kind = 'piece'`. O programa é o mesmo com ou sem `gray`.
