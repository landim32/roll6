# Contract: janela "Marcar print" (064)

## Abertura

| Origem | Entrada | Concluir | Cancelar / Esc / fechar |
|---|---|---|---|
| "Anexar print" | `PrintAttachment.Plain(png, legenda)` | `AddAttachment(resultado)` | nada é anexado |
| clique na miniatura de um anexo | o anexo (original + marcações) | `ReplaceAttachment(antigo, resultado)` | o anexo fica igual |

A janela é modal (`ShowDialog`, dona = janela principal), abre maximizável com ~80% da área de trabalho e devolve
`Result: PrintAttachment?`.

## Layout

```text
┌ Marcar print ─────────────────────────────────────────────────────┐
│ [Lápis] [Retângulo] [Circunferência] [Seta]   [Desfazer] [Limpar] │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │                 print (Viewbox, proporção mantida)             │ │
│ └───────────────────────────────────────────────────────────────┘ │
│ "Marque em vermelho o que o Claude deve olhar."  [Cancelar] [Concluir] │
└───────────────────────────────────────────────────────────────────┘
```

- Ferramentas: grupo de seleção única (`AutomationProperties.Name` = "Lápis", "Retângulo", "Circunferência", "Seta");
  começa em **Lápis**; teclas 1–4.
- Desfazer (Ctrl+Z) e Limpar ficam desativados sem nada a desfazer/limpar.
- Concluir é o botão padrão (Enter); Cancelar o de cancelamento (Esc).

## Desenho

- Arrastar com o botão esquerdo (ou caneta/toque) cria a marcação da ferramenta escolhida, mostrada enquanto arrasta.
- Pontos fora da imagem são presos à borda.
- Soltar: entra na lista se `MarkGeometry.IsMeaningful`; senão é descartada.

## Saída

- PNG na resolução do print, original + marcações (`MarkupDrawing.Render`).
- Legenda: a base + `" Marcações em vermelho desenhadas pelo usuário para apontar partes da imagem (não fazem parte da
  cena): 1 circunferência, 1 seta."` (só com marcações).
