# Data Model: Marcações no print do roll6anime (064)

Tudo em memória, no `Roll6Anime.Core.Markup` (sem WPF) e no `MainViewModel`.

## MarkKind

`Pencil` (traço livre), `Rectangle` (pontilhado), `Ellipse` ("circunferência", pontilhada, inscrita no retângulo),
`Arrow` (linha + ponta no último ponto).

## MarkPoint

`record struct MarkPoint(double X, double Y)` — pixels do print (origem no canto superior esquerdo).

## Mark

| Campo | Tipo | Regra |
|---|---|---|
| `Kind` | `MarkKind` | |
| `Points` | `IReadOnlyList<MarkPoint>` | Lápis: todos os pontos do traço. Retângulo/circunferência/seta: exatamente 2 (início e fim do arrasto). Todos dentro da imagem (`MarkGeometry.Clamp`). |

Válida só se `MarkGeometry.IsMeaningful(mark)` (R4).

## MarkGeometry (puro)

- `StrokeWidth(width, height)` → px (R3).
- `Clamp(point, width, height)`.
- `IsMeaningful(mark)`.
- `ArrowHead(from, to, stroke)` → (ponta, esquerda, direita).
- `Bounds(a, b)` → retângulo normalizado (x, y, largura, altura) de dois cantos.

## PrintAttachment

| Campo | Tipo | Regra |
|---|---|---|
| `OriginalPng` | `byte[]` | o print capturado; nunca muda |
| `BaseCaption` | `string` | a legenda da 062 (animação, instante, câmera) |
| `Marks` | `IReadOnlyList<Mark>` | vazia = sem marcações |
| `Png` | `byte[]` | o original + as marcações (= `OriginalPng` sem marcações) |
| `Caption` | `string` | `BaseCaption` + `PromptImage.MarkupNote(Marks)` |

- `PrintAttachment.Plain(png, caption)` — recém-capturado, sem marcações.
- `WithMarks(marks, renderedPng)` — novo anexo com as marcações e o PNG final (o original e a legenda base ficam).
- `ToPromptImage()` → `PromptImage(Png, Caption)`.

## Fluxo de estados do editor

```text
Anexar print → [editor: original, sem marcações] → Concluir → anexo novo
                                                  → Cancelar → nada
Miniatura    → [editor: original + marcações]    → Concluir → anexo substituído
                                                  → Cancelar → anexo igual
```
