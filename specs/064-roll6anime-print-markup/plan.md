# Implementation Plan: Marcações no print do roll6anime

**Branch**: `064-roll6anime-print-markup` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/064-roll6anime-print-markup/spec.md`

## Summary

"Anexar print" passa a abrir uma janela **Marcar print** (WPF, modal) com o print capturado. A janela tem quatro
ferramentas (Lápis, Retângulo pontilhado, Circunferência pontilhada e Seta), todas em vermelho, mais Desfazer, Limpar,
Cancelar e Concluir.

- **Anexar:** Concluir anexa o print, com ou sem marcações; Cancelar desiste dele (Q1 = B).
- **Reabrir:** clicar na miniatura reabre o editor com o original e as marcações, que continuam editáveis.

O desenho trabalha em **pixels do print**. A janela mostra uma superfície do tamanho exato do print dentro de um
`Viewbox`, então o ponteiro já chega em coordenadas do print, em qualquer tamanho de janela. A mesma rotina de desenho
(`MarkupDrawing`) pinta na tela e no PNG final (`RenderTargetBitmap` na resolução do print), o que garante que o PNG
enviado é igual ao que se vê na tela.

A parte pura vai para o `Roll6Anime.Core`, testada:
- as marcações e o que conta como marcação;
- a espessura;
- a ponta da seta e o limite à imagem;
- o texto que a legenda ganha.

O anexo passa a ser um `PrintAttachment`, com o original, a legenda base, as marcações, o PNG final e a legenda final.
No envio, cada anexo vira `PromptImage(png, legenda)`.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (`net8.0` core, `net8.0-windows` WPF)
**Primary Dependencies**: existentes — WPF (`DrawingContext`, `RenderTargetBitmap`, `PngBitmapEncoder`, `Viewbox`),
`Microsoft.Web.WebView2`. **Nenhuma dependência nova.**
**Storage**: nenhum — o anexo vive em memória até ser enviado ou removido (FR-011)
**Testing**: xUnit + FluentAssertions em `Roll6Anime.Tests` (geometria, regras, legenda, anexo); a janela é conferida à
mão (UI Automation + print da janela, como na 062)
**Target Platform**: Windows 10/11 desktop
**Project Type**: desktop app (ferramenta `roll6anime/`)
**Performance Goals**: o traço acompanha o ponteiro sem atraso perceptível (redesenho só da superfície, ≤ alguns
milhares de pontos); Concluir gera o PNG em < 300 ms para um print de até ~2000 px
**Constraints**: o PNG final tem a resolução do print original; o original nunca é alterado; só vermelho e espessura fixa
**Scale/Scope**: 1 janela nova, ~4 tipos no core, ~3 arquivos alterados na janela principal

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| II. Stack fixa | O roll6anime já é a exceção justificada da 062 (ferramenta Windows fora do site). Esta feature usa só o WPF que ele já tem, sem dependência nova. ✅ |
| I. Skills de arquitetura | Não há entidade de backend nem de frontend web. ✅ (não se aplica) |
| III/IV. Convenções | Código C# no padrão do projeto (records, textos em português na tela, comentários em inglês). ✅ |
| V/VI/VII | Sem banco, sem autenticação, sem grid. ✅ (não se aplica) |
| Site/API/MCP | Nada muda. ✅ |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/064-roll6anime-print-markup/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── markup-editor.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
roll6anime/
├── Roll6Anime.Core/Markup/
│   ├── Mark.cs                 # MarkKind, MarkPoint, Mark (kind + points in print pixels)
│   ├── MarkGeometry.cs         # StrokeWidth, Clamp, IsMeaningful, ArrowHead, Bounds
│   └── PrintAttachment.cs      # original png, base caption, marks, final png, caption with the marks note
├── Roll6Anime.Core/Claude/PromptImage.cs   # MarkupCaption (the note appended to the caption)
├── Roll6Anime.Tests/MarkGeometryTests.cs, PrintAttachmentTests.cs
├── Roll6Anime/
│   ├── MarkupDrawing.cs        # draws marks on a DrawingContext (screen and export) + Render(original, marks) → PNG
│   ├── MarkupSurface.cs        # FrameworkElement of the print's pixel size: draws, takes pointer input
│   ├── MarkupWindow.xaml(.cs)  # tools, Desfazer/Limpar/Cancelar/Concluir, shortcuts
│   ├── MainViewModel.cs        # Attachments: PrintAttachment; CapturePrintAsync / AddAttachment / ReplaceAttachment
│   └── MainWindow.xaml(.cs)    # opens the editor after "Anexar print" and on a thumbnail click
└── README.md                   # "Anexar print" now opens the editor
```

**Structure Decision**: dentro do `roll6anime/` existente; a regra pura no `Roll6Anime.Core` (testável sem WPF), o
desenho e a janela no projeto WPF.

## Complexity Tracking

Sem violações.
