# Data Model — Qualidade da vista 3D (053)

Nada no servidor. Tudo abaixo vive no navegador (módulo puro + `localStorage`).

## ViewQuality (nível)

Valor fechado, em ordem crescente de nitidez e de custo:

| Valor | Rótulo (pt-BR) | Significado |
|---|---|---|
| `standard` | Padrão | A vista de hoje. Valor na ausência de preferência válida. |
| `high` | Alta | Quadro mais fino, figuras no tamanho salvo com amostragem suave. |
| `ultra` | Ultra | Alta + figuras numa camada do tamanho da tela. |

Definido como constante (`VIEW_QUALITY`) + tipo derivado, sem `enum` (`erasableSyntaxOnly`). `QUALITY_ORDER = ['standard', 'high', 'ultra']` dá a ordem para o seletor.

## QualityProfile (perfil de um nível)

| Campo | Tipo | Padrão | Alta | Ultra | Uso |
|---|---|---|---|---|---|
| `columns` | number | 480 | 720 | 960 | Largura máxima do quadro do mundo (raios); o quadro nunca é mais largo que a tela |
| `spriteMaxSide` | number | 256 | 480 | 480 | Lado maior em que as imagens das figuras são lidas (`toPixels`) |
| `spriteSampling` | `'nearest' \| 'smooth'` | nearest | smooth | smooth | Como as figuras são amostradas (vizinho mais próximo, ou bilinear + mips com alpha premultiplicado) |
| `figureLayer` | boolean | false | false | true | Figuras na camada do tamanho da tela em vez do quadro |

Invariantes: o perfil `standard` é **exatamente** os valores do código atual; `spriteMaxSide ≤ 480` (tamanho salvo das imagens); `figureLayer` implica `spriteSampling: 'smooth'`.

## Preferência (localStorage)

| Chave | Valor | Leitura | Escrita | Limpeza |
|---|---|---|---|---|
| `roll6:3d-quality` | a string do nível | `readViewQuality()` → nível válido ou `standard` (ausente, inválido, storage indisponível) | `writeViewQuality(level)` (falha silenciosa) | `clearViewQuality()` no logout |

Por usuário **neste aparelho** (como `roll6:view-mode` e `roll6:layout`): não é por mapa, não vai à API, não é compartilhada.

## Estado em memória

- `MapEditorContext.viewQuality: ViewQuality` (inicial `readViewQuality()`), `setViewQuality(level)` (estado + gravação).
- `StoryView`: deriva `QUALITY_PROFILES[viewQuality]`; cache de imagens das figuras por `${spriteMaxSide}|${url}`.
- Renderizador: perfil corrente; `figureCanvas` só é criado/alocado quando `figureLayer` é verdadeiro pela primeira vez.

## Transições

- Escolha no modal → `setViewQuality` → gravação → `StoryView` (se aberto) refaz colunas e figuras; a câmera não muda.
- Logout → `clearViewQuality()` → próximo login abre em Padrão.
- Valor desconhecido no storage → lido como `standard` (nunca gravado de volta até o usuário escolher).
