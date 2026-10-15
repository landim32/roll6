# Data Model: Esqueleto na vista 3D do roll6anime (065)

Tudo em memória na vista, mais uma chave no `localStorage` e um campo no print.

## Preferência

| Chave | Valores | Padrão |
|---|---|---|
| `localStorage['roll6anime:skeleton']` | `"on"` / `"off"` | `"off"` (também sem storage) |

## BoneSegment (puro, `viewer/src/skeleton.ts`)

| Campo | Tipo | Regra |
|---|---|---|
| `index` | number | posição do osso na lista do modelo |
| `name` | string | `normalizeBoneName(bone.name)` |
| `parent` | number \| null | índice do osso pai (null para a raiz: vira um ponto) |

- `boneSegments(names, parents)` → lista acima.
- `movedBones(file | null)` → `Set<string>` (trilhas + "Hips" com `hipsLift`).
- `segmentColor(name, moved, hovered)` → cor (`SKELETON_COLORS`).
- `nearestSegment(pointer, projected, maxDistance)` → índice ou null; `projected[i] = { a, b }` em pixels (b = a para a raiz).

## SkeletonView (vista)

Por modelo aberto: a lista de ossos (`Bone`), os segmentos, a geometria das linhas e pontos, os materiais guardados
(`Map<Material, { transparent, opacity, depthWrite }>`), `enabled`, `moved`, `hovered`.

## Print

- `captured.skeleton: boolean` (bridge) → `ViewCapture.Skeleton` → `Caption(...)` com a nota do esqueleto.
