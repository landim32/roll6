# Research: Ficha do personagem em imagem ou PDF (022)

## R1 — Endpoint de upload

- **Decision**: novo `POST /api/document` (multipart `file`), tipos PNG/JPEG/WebP/PDF, ≤ 10 MB, resposta
  `DocumentUploadInfo { fileName, url, type }`; implementado como `IImageService.UploadDocumentAsync` reaproveitando a
  validação de tamanho e de assinatura do `ImageService` (+ PDF: bytes iniciais `%PDF-`).
- **Rationale**: `POST /api/image` continua só com imagens (o recorte e o tamanho fixo dos tokens dependem disso, e
  `Guard.ImageFileName` barra `.pdf` em avatares/tokens/mapas). Um endpoint separado deixa a regra de cada campo clara.
- **Alternatives**: aceitar PDF em `/api/image` (abriria PDF como avatar/mapa); endpoint dedicado ao personagem
  (`PUT /api/character/{id}/sheet-file`) — duplicaria o fluxo "sobe o arquivo → salva o nome" que todo o app usa.

## R2 — Guardar sem transformação

- **Decision**: o frontend envia o `File` original (sem `cropToFile`) e o backend repassa o buffer ao
  `IImageStorageAppService.UploadAsync(stream, contentType, extension)`, que já grava os bytes como vieram com o
  `Content-Type` do envio. Extensão pelo tipo: `png`, `jpg`, `webp`, `pdf`.
- **Rationale**: atende FR-003/SC-002 sem código novo de armazenamento.

## R3 — Onde fica o nome do arquivo

- **Decision**: `characters.sheet_file varchar(260) null`, validado por `Guard.SheetFileName` (`^[0-9a-f]{32}\.(png|jpg|webp|pdf)$`).
  `Character.Update` recebe `sheetFile` como mais um campo; `PUT` sem `sheetFile` remove (mesma semântica de `image`/`tokenId`).
- **Rationale**: igual às imagens (só o nome; a pasta é aplicada no storage; URL pré-assinada nas leituras). Um arquivo
  por personagem (spec); não é copiado para a participação (spec, Edge Cases).

## R4 — Leitura e tipo

- **Decision**: `sheetFileUrl` (pré-assinada, mesma expiração das imagens) e `sheetFileType` (`"image"` | `"pdf"`, pela
  extensão, helper `SheetFiles.TypeOf`) em `CharacterInfo` e `CampaignCharacterDetailInfo`. Listas (party, mine) não
  mudam.
- **Rationale**: o detalhe da participação já é lido por dono, mestre e participantes aprovados (010) — exatamente os
  leitores da FR-007 — e não é consultado em polling. O S3 devolve o `Content-Type` gravado, então o PDF abre no leitor
  do navegador e a imagem aparece no `<img>`.

## R5 — Interface

- **Decision**: aba "Ficha em arquivo" no `CharacterFormModal`: para criar/dono, `SheetFileField` (input
  `accept=".png,.jpg,.jpeg,.webp,.pdf"`, validação local de tipo/tamanho, upload imediato via `imageService.uploadDocument`,
  mostra nome original + tipo, "Trocar"/"Remover"; o nome é salvo com o personagem); para mestre/visualizador (e também
  para o dono, abaixo do campo), `SheetFileView` (imagem com link "Abrir em tamanho real", PDF com botão "Abrir ficha (PDF)"
  em nova aba). A aba não aparece para mestre/visualizador quando o personagem não tem arquivo.
- **Alternatives**: campo na aba "Dados" (poluiria a aba principal); visualizador embutido de PDF (fora do escopo).

## R6 — MCP

- **Decision**: ferramenta nova `upload_document` (base64, igual a `upload_image`, chama `POST /api/document`) e parâmetro
  opcional `sheetFile` em `create_character`/`update_character` (descrição avisa que omitir no update remove o arquivo).
  Os testes de cobertura passam a exigir a ferramenta (74 → 75 operações).
