# Research: Marcações no print do roll6anime (064)

## R1 — Onde desenhar

- **Decision**: uma janela WPF modal (`MarkupWindow`) com um `MarkupSurface` (FrameworkElement) do tamanho em pixels do
  print, por cima de um `Image` do mesmo tamanho, os dois num `Grid` dentro de um `Viewbox` (Stretch=Uniform).
- **Rationale**: o `Viewbox` escala a cena, então `e.GetPosition(surface)` já vem em pixels do print, em qualquer tamanho
  de janela (SC-004), e o desenho usa as mesmas coordenadas na tela e no PNG.
- **Alternatives considered**: desenhar dentro do WebView2 (canvas da vista) — misturaria o editor com a vista 3D e
  exigiria outra ponte de mensagens; o print já está na casca. `InkCanvas` — só faz traço livre, não formas pontilhadas
  nem seta, e exporta em coordenadas de tela.

## R2 — Uma rotina de desenho para tela e PNG

- **Decision**: `MarkupDrawing.Draw(DrawingContext, IReadOnlyList<Mark>, double stroke)` pinta todas as marcações;
  `MarkupSurface.OnRender` a chama (mais a marcação em andamento) e `MarkupDrawing.Render(original, marks)` desenha o
  original + as marcações num `DrawingVisual`, renderiza com `RenderTargetBitmap(pixelWidth, pixelHeight, 96, 96)` e
  codifica em PNG.
- **Rationale**: o que se vê é o que vai ao Claude; o original é decodificado com DPI 96 (`BitmapImage` + `DrawImage`
  num retângulo do tamanho em pixels), então nada é reamostrado.

## R3 — Aparência

- **Decision**: vermelho `#FF2020` opaco; espessura `MarkGeometry.StrokeWidth(w, h) = clamp(round(min(w, h) / 160), 3, 12)`
  pixels do print; retângulo e circunferência com `DashStyle` de traço 2 × espessura e intervalo 1,5 × espessura
  (`PenLineCap.Round`); lápis e seta contínuos, juntas e pontas arredondadas. Ponta da seta = triângulo cheio de
  comprimento `clamp(0,35 × L, 3 × espessura, 7 × espessura)` e meia-largura 0,6 × comprimento (sempre visível numa seta
  curta, Edge Case).
- **Rationale**: legível num print de ~700 a 2000 px sem cobrir o que aponta; pontilhado diferencia "área" de "traço".

## R4 — O que conta como marcação

- **Decision**: os pontos são limitados à imagem (`Clamp`). Uma marcação só entra na lista se `IsMeaningful`:
  lápis com ≥ 2 pontos e extensão ≥ 3 px; retângulo/circunferência com largura e altura ≥ 4 px; seta com comprimento
  ≥ 8 px. Um clique sem arrastar não cria nada.
- **Rationale**: Edge Cases da spec; evita marcações invisíveis que confundiriam a legenda.

## R5 — Desfazer e Limpar

- **Decision**: a lista de marcações tem histórico de estados (`List<IReadOnlyList<Mark>>`): cada marcação concluída ou
  Limpar empurra o estado anterior; Desfazer volta ao último. Assim Limpar é desfazível (US2-2).

## R6 — O anexo

- **Decision**: `PrintAttachment` (Core): `OriginalPng`, `BaseCaption` (a legenda da 062), `Marks`, `Png` (final; igual
  ao original sem marcações) e `Caption` = `BaseCaption` + a nota das marcações (`PromptImage.MarkupNote(marks)`). O
  `MainViewModel.Attachments` passa de `PromptImage` para `PrintAttachment`; no envio vira `PromptImage(Png, Caption)`.
- **Rationale**: reabrir o editor parte do original + marcações (FR-007), nunca de uma imagem já marcada.

## R7 — Legenda (FR-009)

- **Decision**: com marcações, a legenda ganha: " Marcações em vermelho desenhadas pelo usuário para apontar partes da
  imagem (não fazem parte da cena): 2 circunferências, 1 seta." — contagem por tipo, na ordem lápis, retângulo,
  circunferência, seta, no plural certo ("1 traço à mão", "2 traços à mão", "1 retângulo"…). A instrução do contexto
  (`PromptContext`) também diz que formas vermelhas nos prints são marcações do usuário.

## R8 — Fluxo (Q1 = B)

- **Decision**: `MainViewModel.CapturePrintAsync()` captura e devolve um `PrintAttachment` sem marcações (ou null com o
  erro no status); `MainWindow.OnCapture` abre `MarkupWindow` com ele: Concluir → `AddAttachment`, Cancelar → nada. Clique
  na miniatura → `MarkupWindow` com o anexo existente: Concluir → `ReplaceAttachment`, Cancelar → nada. Atalhos: Ctrl+Z,
  Esc (Cancelar), Enter (Concluir). Enquanto o Claude trabalha, as miniaturas não abrem o editor (como o X).
- **Rationale**: a janela não guarda estado da conversa; o VM continua sem abrir janelas.

## R9 — Entrada

- **Decision**: eventos de mouse do WPF (o toque e a caneta do Windows são promovidos a mouse), com `CaptureMouse` ao
  arrastar; a ferramenta escolhida por `RadioButton` com estilo de botão (teclas 1–4 também escolhem).
