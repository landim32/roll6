# Quickstart: Ficha do personagem em imagem ou PDF (022)

Pré-requisitos: migração aplicada (`dotnet ef database update …`), API com credenciais S3 e frontend rodando.

1. Como dono, abra "Incluir personagem" → aba "Ficha em arquivo" → escolha um PDF; o nome aparece com o selo "PDF". Salve.
2. Reabra o personagem: a aba mostra "Abrir ficha (PDF)", que abre o PDF numa nova aba. Baixe e compare com o original (mesmo tamanho/hash).
3. Troque por uma foto JPG grande (ex.: 4000 × 3000) e salve: a imagem aparece reduzida na janela; "Abrir em tamanho real" mostra a original, sem recorte.
4. "Remover" + salvar: a aba fica sem arquivo.
5. Tente um `.docx` ou um arquivo > 10 MB: toast de erro, nada muda. Renomeie um `.txt` para `.pdf`: a API recusa (conteúdo inválido).
6. Com o personagem aprovado numa campanha, o mestre e outro participante aprovado abrem o card: a aba "Ficha em arquivo" mostra a ficha; um usuário de fora recebe 403 em `GET /api/campaigncharacter/{id}`.
7. API: `curl -F "file=@ficha.pdf;type=application/pdf" -H "X-Api-Key: r6_…" …/api/document` → `{ fileName, url, type: "pdf" }`.
