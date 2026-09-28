# UI Contract: Ficha do personagem em imagem ou PDF (022)

## CharacterFormModal — aba "Ficha em arquivo"

Visível ao criar, para o dono, e para mestre/visualizador só quando o personagem tem ficha em arquivo.

### SheetFileField (criar / dono)

- Sem arquivo: botão "Escolher arquivo" (input oculto, `accept=".png,.jpg,.jpeg,.webp,.pdf"`) e o texto "Imagem (PNG, JPG, WebP) ou PDF, até 10 MB. O arquivo é guardado como está, sem recorte."
- Ao escolher: validação local (`lib/sheetFile.validateSheetFile`: tipo e tamanho → toast de erro); upload imediato com spinner; em caso de erro, toast e nada muda.
- Com arquivo: nome (original quando acabou de ser enviado, senão "Ficha atual"), selo "Imagem"/"PDF", botões "Trocar" e "Remover", e o `SheetFileView` abaixo.
- O nome do arquivo só é gravado no personagem ao clicar em "Salvar" do modal.

### SheetFileView (todos os modos)

- Imagem: `<img>` com largura máxima da janela (`img-fluid`, borda) e link "Abrir em tamanho real" (nova aba).
- PDF: ícone + botão "Abrir ficha (PDF)" (`target="_blank" rel="noopener noreferrer"`).
