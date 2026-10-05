# Data Model: Ajustes do 2,5D (036)

**Nenhuma mudança de banco, DTO ou API.** Esta feature só altera o significado de um campo existente e estruturas em memória do
frontend.

## Campos persistidos (inalterados)

| Entidade | Campo | Mudança |
|---|---|---|
| `map_models` | `mask_image` (`varchar(260) null`) | **Significado**: antes preto = parede, branco = vazio (limiar a 50%); agora a **luminância define a altura da parede** (preto = altura total, branco = vazio). Arquivos antigos só preto/branco continuam iguais. O servidor continua só validando o nome do arquivo. |
| `tokens` | `front_image`, `right_image`, `left_image`, `back_image` | Nenhuma. |

## Estruturas em memória (frontend)

### `MaskGrid` (lib/raycaster)

| Campo | Antes | Depois |
|---|---|---|
| `walls: Uint8Array` (0/1) | 1 = parede | **removido** |
| `heights: Uint8Array` (0–255) | — | **novo**: altura da parede da célula (0 = vazio, 255 = altura total), row-major |
| `cols`, `rows`, `originX`, `originY`, `cellWidth`, `cellHeight` | iguais | iguais |

Regras: altura da célula = mediana da luminância dos pixels de origem → `1 − lum/255`; `< 0,05` → 0; `≥ 0,95` → 1; empate entre
claro e escuro → vazio; alpha < 128 = vazio.

### `RayHit` (lib/raycaster)

Ganha `height` (0–1). `castRay` devolve `RayHit[]` ordenado do mais perto ao mais longe, com alturas estritamente crescentes, até a
primeira de altura 1 ou 8 faces. Lista vazia = nenhuma parede.

### `FrameResult` (lib/raycastFrame, novo)

| Campo | Descrição |
|---|---|
| `sprites[]` | por figura projetada: `id`, `screenX` (centro, px do quadro), `top`, `bottom`, `depth`, `headVisible` |
| `frameWidth`, `frameHeight` | tamanho do quadro, para converter para pixels do canvas |

### `ColumnWalls` (interno do quadro)

Por coluna: até 8 pares (`depth`, `top` em linhas). Substitui o z-buffer de um valor; `hiddenAt(column, y, depth)` diz se um pixel de
figura está atrás de alguma face mais próxima cujo topo está em ou acima da linha `y`.

### `BubblePlacement` (lib/storyBubbles, novo)

`{ id, x, y, scale, visible, order }` em pixels do canvas — `x`/`y` é o ponto de ancoragem (centro, base do balão), `order` cresce
com a proximidade (z-index).

### Palco do campo 2,5D (lib/frontImage)

`STAGE = { width: 1, height: 1 }` (quadrado) e `frameInStage()` → `{ left: 12.5%, width: 75%, top: 0, height: 100% }`
(a moldura 3:4 dentro do palco quadrado). É a única origem da geometria usada pelo CSS e pelos testes.

## Validações e transições

- Nenhuma validação nova no servidor.
- Máscara com proporção diferente da imagem do mapa: regra da 034 mantida (`sameRatio`, 1%).
- Fala do balão: mesma regra do 2D (`lastActions`: última ação do turno em andamento por ator, texto não vazio).
