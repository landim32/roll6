# Quickstart: Marcações no print do roll6anime (064)

## Automático

```bash
cd roll6anime
dotnet build Roll6Anime.sln
dotnet test Roll6Anime.Tests     # MarkGeometry, PrintAttachment, legenda
```

## Manual (janela real, modelo aberto)

1. "Anexar print" → abre "Marcar print" com o print grande, Lápis selecionado.
2. Lápis: arrastar desenha um traço vermelho. Retângulo e Circunferência: contorno vermelho pontilhado acompanhando o
   arrasto. Seta: linha com ponta no ponto onde soltou.
3. Um clique sem arrastar não cria nada. Arrastar até fora da imagem prende a marcação na borda.
4. Desfazer (e Ctrl+Z) tira a última; Limpar tira todas; Desfazer depois de Limpar traz de volta.
5. Redimensionar a janela: as marcações continuam no mesmo lugar do print.
6. Concluir: a miniatura sobre o campo do pedido mostra as marcações. Enter sem marcar: anexa o print limpo.
7. "Anexar print" e Cancelar (ou Esc): nada é anexado.
8. Clicar na miniatura: o editor reabre com as marcações, editáveis; Cancelar deixa o anexo igual; Limpar + Concluir
   volta ao print limpo.
9. Enviar ao Claude real "NÃO altere arquivos. O que está marcado na imagem?" com uma circunferência em volta de uma
   parte do modelo: ele responde nomeando a parte, sem tratar as formas como objetos da cena.
