# API Contract: Ficha do personagem em imagem ou PDF (022)

## POST /api/document

`[Authorize]`, `multipart/form-data` com `file`. Aceita `image/png`, `image/jpeg`, `image/webp`, `application/pdf`, ≤ 10 MB.

200:

```json
{ "fileName": "0123456789abcdef0123456789abcdef.pdf", "url": "https://…presigned…", "type": "pdf" }
```

400 `ValidationProblemDetails` (`errors.file`): nenhum arquivo, > 10 MB, formato não suportado, conteúdo inválido.

## POST /api/character e PUT /api/character/{id}

Corpo ganha `"sheetFile": "<fileName do /api/document>" | null`. No PUT, `null`/ausente remove a ficha em arquivo.
400 `errors.sheetFile` quando o nome não é um arquivo válido.

## Leituras

- `CharacterInfo` (`GET /api/character`, `GET /api/character/{id}`, respostas de POST/PUT): `sheetFile`, `sheetFileUrl`, `sheetFileType` (`"image"`/`"pdf"`/null).
- `CampaignCharacterDetailInfo` (`GET /api/campaigncharacter/{id}`, dono/mestre/aprovados): `sheetFileUrl`, `sheetFileType`.

## MCP

- `upload_document` — `[ApiOperation("POST", "/api/document")]`, parâmetros `fileBase64`, `contentType`, `fileName`; resultado = `DocumentUploadInfo`.
- `create_character` / `update_character` — parâmetro opcional `sheetFile`.
