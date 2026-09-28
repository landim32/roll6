# Data Model: Ficha do personagem em imagem ou PDF (022)

## Character (`characters`) — coluna nova

| Campo | Coluna | Tipo | Regras |
|---|---|---|---|
| `SheetFile` | `sheet_file` | `varchar(260)` nulo | `{32 hex}.{png\|jpg\|webp\|pdf}` (`Guard.SheetFileName`); só o nome, a pasta vem do storage |

Migração: `AddCharacterSheetFile` (add column, nula, sem default). Não copiado para `campaign_characters`.

## DTOs

- `DocumentUploadInfo { fileName, url, type }` — resposta de `POST /api/document`; `type` = `"image"` | `"pdf"`.
- `CharacterInsertInfo` + `sheetFile: string?`.
- `CharacterInfo` + `sheetFile: string?`, `sheetFileUrl: string?`, `sheetFileType: string?`.
- `CampaignCharacterDetailInfo` + `sheetFileUrl: string?`, `sheetFileType: string?`.

## Upload (`ImageService.UploadDocumentAsync`)

| Content-Type | Extensão | Assinatura |
|---|---|---|
| `image/png` | `png` | `89 50 4E 47 0D 0A 1A 0A` |
| `image/jpeg` | `jpg` | `FF D8 FF` |
| `image/webp` | `webp` | `RIFF....WEBP` |
| `application/pdf` | `pdf` | `%PDF-` |

Erros (400, chave `file`): vazio, > 10 MB, tipo fora da lista, conteúdo que não bate com o tipo.
