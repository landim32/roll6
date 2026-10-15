# Tasks: Marcações no print do roll6anime (064)

**Input**: Design documents from `/specs/064-roll6anime-print-markup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/markup-editor.md, quickstart.md

**Tests**: as regras puras (`Roll6Anime.Core`) têm testes xUnit, como no resto da ferramenta; a janela é conferida à mão.

**Organization**: US1 = editor com as quatro ferramentas e o fluxo de anexar; US2 = Desfazer/Limpar/reabrir; US3 = legenda.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Conferir a branch `064-roll6anime-print-markup`, rodar `dotnet test Roll6Anime.Tests` em `roll6anime/` (anotar a contagem, 68) e fechar qualquer `roll6anime.exe` aberto

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T002 [P] Criar `roll6anime/Roll6Anime.Core/Markup/Mark.cs`: `enum MarkKind { Pencil, Rectangle, Ellipse, Arrow }`, `readonly record struct MarkPoint(double X, double Y)`, `sealed record Mark(MarkKind Kind, IReadOnlyList<MarkPoint> Points)`
- [X] T003 [P] Criar `roll6anime/Roll6Anime.Core/Markup/MarkGeometry.cs` (puro): `StrokeWidth(int width, int height)` = clamp(round(min/160), 3, 12); `Clamp(MarkPoint, width, height)`; `IsMeaningful(Mark)` (lápis ≥ 2 pontos e extensão ≥ 3 px; retângulo/elipse com largura e altura ≥ 4 px; seta ≥ 8 px); `Bounds(a, b)` → (X, Y, Width, Height) normalizado; `ArrowHead(from, to, stroke)` → (Tip, Left, Right) com comprimento clamp(0,35 × L, 3 × stroke, 7 × stroke) e meia-largura 0,6 × comprimento; constantes `DASH = 2.0`, `GAP = 1.5` (múltiplos da espessura)
- [X] T004 [P] Testes de `MarkGeometry` em `roll6anime/Roll6Anime.Tests/MarkGeometryTests.cs` (espessura em 700/2000/100 px, clamp nas quatro bordas, clique sem arrasto não é marcação, bounds normaliza cantos invertidos, ponta da seta no ponto final e simétrica, seta curta com ponta mínima)
- [X] T005 Criar `roll6anime/Roll6Anime.Core/Markup/PrintAttachment.cs`: `OriginalPng`, `BaseCaption`, `Marks`, `Png`, `Caption` (= `BaseCaption` + `PromptImage.MarkupNote(Marks)`), `Plain(png, caption)`, `WithMarks(marks, renderedPng)` (sem marcações → volta ao original), `ToPromptImage()`
- [X] T006 Criar `roll6anime/Roll6Anime/MarkupDrawing.cs`: pincéis/canetas congelados (vermelho `#FF2020`, juntas e pontas redondas, `DashStyle` de `DASH`/`GAP` para retângulo e elipse), `Draw(DrawingContext, IEnumerable<Mark>, double stroke)` (lápis = `StreamGeometry` polilinha; retângulo; elipse inscrita em `Bounds`; seta = linha até a base da ponta + triângulo cheio) e `Render(byte[] originalPng, IReadOnlyList<Mark>)` → PNG na resolução do original (`BitmapImage` OnLoad, `DrawingVisual`, `RenderTargetBitmap(w, h, 96, 96)`, `PngBitmapEncoder`); `Decode(png)` devolve o bitmap e o tamanho em pixels

**Checkpoint**: core compila e testa; o desenho existe.

---

## Phase 3: User Story 1 - Marcar o print antes de enviar (P1) 🎯 MVP

**Goal**: "Anexar print" abre o editor; as quatro ferramentas desenham em vermelho; Concluir anexa o print marcado; Cancelar desiste.

**Independent Test**: anexar um print, fazer uma marcação de cada ferramenta, Concluir → a miniatura mostra as marcações; "Anexar print" + Cancelar → nada anexado.

- [X] T007 [US1] Criar `roll6anime/Roll6Anime/MarkupSurface.cs`: `FrameworkElement` com `Width`/`Height` = pixels do print; propriedades `Marks` (lista confirmada), `Tool` (`MarkKind`), `Stroke`; `OnRender` chama `MarkupDrawing.Draw` com as marcações + a em andamento; mouse esquerdo: `CaptureMouse`, pontos via `e.GetPosition(this)` + `MarkGeometry.Clamp`, lápis acumula pontos (ignora < 1 px do anterior), formas mantêm início/fim; ao soltar, `IsMeaningful` → evento `MarkAdded(Mark)`; `Background = Transparent` para receber o mouse
- [X] T008 [US1] Criar `roll6anime/Roll6Anime/MarkupWindow.xaml` e `.xaml.cs`: janela modal (Title "Marcar print", ~80% da área de trabalho, fundo `Bg`), barra com quatro `RadioButton` de estilo botão (Lápis, Retângulo, Circunferência, Seta; `AutomationProperties.Name`), área central `Viewbox` com `Grid` (Image do original + `MarkupSurface`), rodapé com o texto de ajuda, Cancelar (`IsCancel`) e Concluir (`IsDefault`, `Primary`); construtor recebe o `PrintAttachment`; teclas 1–4 escolhem a ferramenta; Concluir → `Result = attachment.WithMarks(marks, MarkupDrawing.Render(...))`, `DialogResult = true`
- [X] T009 [US1] `MainViewModel`: `Attachments` passa a `ObservableCollection<PrintAttachment>`; `CaptureAsync` vira `CapturePrintAsync()` → `PrintAttachment?` (null + `Status` no erro), `AddAttachment(PrintAttachment)` e `ReplaceAttachment(old, new)`; `RemoveAttachment(PrintAttachment)`; `SendAsync` envia `Attachments.Select(a => a.ToPromptImage())` e a bolha do usuário recebe os `Png` finais, em `roll6anime/Roll6Anime/MainViewModel.cs`
- [X] T010 [US1] `MainWindow`: `OnCapture` → `CapturePrintAsync`, abre `MarkupWindow` (Owner = this) e, com `true`, `AddAttachment`; miniaturas e o X passam a usar `PrintAttachment` (`DataType`, `Png`, `Caption` no ToolTip), em `roll6anime/Roll6Anime/MainWindow.xaml` e `MainWindow.xaml.cs`

**Checkpoint**: US1 funciona sozinha.

---

## Phase 4: User Story 2 - Corrigir marcações (P2)

**Goal**: Desfazer, Limpar (desfazível) e reabrir pela miniatura com as marcações editáveis.

**Independent Test**: três marcações → Desfazer ×2 → uma; Limpar → nenhuma; Desfazer → volta; Concluir; clicar na miniatura → as marcações voltam, editáveis; Cancelar → anexo igual.

- [X] T011 [US2] Histórico no `MarkupWindow`: pilha de estados (`List<IReadOnlyList<Mark>>`), cada marcação e Limpar empilham o estado anterior; botões Desfazer (Ctrl+Z) e Limpar ativados só quando fazem algo, em `roll6anime/Roll6Anime/MarkupWindow.xaml(.cs)`
- [X] T012 [US2] Reabrir: clicar na miniatura (fora do X) abre `MarkupWindow` com o anexo (marcações iniciais = `attachment.Marks`) e, com `true`, `ReplaceAttachment`; desativado enquanto o Claude trabalha, em `roll6anime/Roll6Anime/MainWindow.xaml(.cs)`
- [X] T013 [P] [US2] Testes de `PrintAttachment` em `roll6anime/Roll6Anime.Tests/PrintAttachmentTests.cs`: `Plain` = original sem marcações; `WithMarks` mantém original e legenda base; `WithMarks` vazio volta ao PNG original; `ToPromptImage` leva o PNG final e a legenda final

---

## Phase 5: User Story 3 - O Claude entende que são marcações (P2)

**Goal**: legenda e contexto dizem que as formas vermelhas são do usuário.

**Independent Test**: print com uma circunferência e uma seta → legenda termina com "…(não fazem parte da cena): 1 circunferência, 1 seta."; sem marcações → legenda de antes.

- [X] T014 [US3] `PromptImage.MarkupNote(IReadOnlyList<Mark>)` em `roll6anime/Roll6Anime.Core/Claude/PromptImage.cs`: vazio → ""; senão " Marcações em vermelho desenhadas pelo usuário para apontar partes da imagem (não fazem parte da cena): " + contagens na ordem lápis ("traço à mão"/"traços à mão"), retângulo(s), circunferência(s), seta(s), separadas por vírgula, com ponto final
- [X] T015 [US3] Linha no contexto em `roll6anime/Roll6Anime.Core/Claude/PromptContext.cs`: "Formas vermelhas nos prints são marcações do usuário apontando o que ele quer mostrar; não fazem parte do modelo nem da cena."
- [X] T016 [P] [US3] Testes da nota e do contexto em `roll6anime/Roll6Anime.Tests/PromptImageTests.cs` e `PromptContextTests.cs`

---

## Phase 6: Polish

- [X] T017 [P] README do roll6anime (passo "Anexar print" com o editor) e `CLAUDE.md` (seção roll6anime) em `roll6anime/README.md` e `CLAUDE.md`
- [X] T018 `dotnet build Roll6Anime.sln` sem avisos e `dotnet test Roll6Anime.Tests`
- [X] T019 Validar o quickstart na janela real (UI Automation + print da janela + arrasto com o mouse): as quatro ferramentas, clique sem arrasto, borda, Desfazer/Limpar, redimensionar, Concluir/Cancelar/Enter, reabrir; e um pedido real ao Claude "o que está marcado?" sem alterar arquivos

---

## Dependencies & Execution Order

- T001 → T002–T006 (T002, T003, T004 em paralelo; T005 depende de T002 e T014 para a legenda — implementar `MarkupNote` vazio primeiro ou fazer T014 junto; T006 depende de T002/T003).
- US1 (T007–T010) depende da fase 2.
- US2 (T011–T013) depende de T008/T010.
- US3 (T014–T016) depende de T002; pode andar em paralelo com US1.
- Polish no fim.

## Implementation Strategy

1. MVP: fase 2 + US1 (marcar e anexar).
2. US2 (corrigir) e US3 (legenda) — pequenas, completam o uso real.
3. Polish com o teste na janela e no Claude reais.
