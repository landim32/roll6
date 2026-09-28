# Implementation Plan: Ficha do personagem em imagem ou PDF

**Branch**: `022-character-sheet-file` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/022-character-sheet-file/spec.md`

## Summary

O personagem ganha a coluna opcional `characters.sheet_file` (só o nome do arquivo guardado, `{guid}.{ext}`, como
`image`). O arquivo sobe por um endpoint novo, `POST /api/document`, que aceita PNG, JPG, WebP **e PDF** até 10 MB,
confere a assinatura do conteúdo e grava os bytes **sem nenhuma transformação** no mesmo bucket/pasta das imagens
(o `IImageStorageAppService` já grava o stream como veio, com o `Content-Type` original). O dono informa o arquivo
em `POST`/`PUT /api/character` (`sheetFile`); leituras devolvem `sheetFileUrl` (URL pré-assinada) e `sheetFileType`
(`image`/`pdf`) no `CharacterInfo` (dono) e no `CampaignCharacterDetailInfo` (dono, mestre e participantes
aprovados — os mesmos leitores de hoje). No frontend, o `CharacterFormModal` ganha a aba "Ficha em arquivo":
seletor de arquivo sem recorte (upload imediato, mostra nome/tipo, trocar/remover) para quem edita e visualizador
(imagem na janela, PDF em nova aba) para mestre/visualizador. MCP: `upload_document` e o parâmetro `sheetFile` em
`create_character`/`update_character`.

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, AWSSDK.S3 (DigitalOcean Spaces), ModelContextProtocol.AspNetCore (020); React, Bootstrap 5, i18next, sonner
**Storage**: PostgreSQL — coluna nova `characters.sheet_file varchar(260) null` (1 migração); arquivos no bucket existente (`{S3:Folder}/{guid}.{ext}`)
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`, incluindo cobertura/paridade/descrições do MCP); Vitest
**Target Platform**: API Linux container + SPA no navegador
**Project Type**: web application (backend + frontend + gateway MCP)
**Performance Goals**: upload de 10 MB em uma requisição; leitura sem custo extra (URL pré-assinada gerada junto com as outras)
**Constraints**: bytes idênticos ao envio (sem recorte/conversão, SC-002); limite de 10 MB (nginx já permite 11 MB em `/api` e 16 MB em `/mcp`)
**Scale/Scope**: 1 coluna, 1 endpoint, 2 DTOs alterados, 1 aba no modal, 1 ferramenta MCP nova + 2 alteradas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Sem entidade nova: `Character` ganha um campo pelas camadas DTO → Domain → Infra (migração) → API, no padrão gerado pelo `dotnet-architecture`; o upload reaproveita `IImageService`/`IImageStorageAppService`. Frontend: métodos novos no serviço existente. ✅ |
| II. Stack fixa | .NET 8/EF Core/PostgreSQL; React + Bootstrap 5 + Context API + Fetch. ✅ |
| III. Case de diretórios | Inalterado. ✅ |
| IV. Convenções | `interface`, constantes em vez de `enum` (`SHEET_FILE_TYPE`), i18next, toasts. ✅ |
| V. Banco | snake_case (`sheet_file`), coluna nula, uma migração, sem FK/cascata. ✅ |
| VI. Autenticação | `[Authorize]` no upload; escrita só do dono; leitura pelas regras já existentes. ✅ |
| VII. Grid | Não se aplica. ✅ |

Pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/022-character-sheet-file/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/
│   ├── Image/DocumentUploadInfo.cs (fileName, url, type)          # novo
│   ├── Character/CharacterInsertInfo.cs, CharacterInfo.cs          # + sheetFile / sheetFileUrl / sheetFileType
│   └── CampaignCharacter/CampaignCharacterDetailInfo.cs            # + sheetFileUrl / sheetFileType
├── Roll6.Domain/
│   ├── Validation/Guard.cs                                         # + SheetFileName (png|jpg|webp|pdf)
│   ├── Models/Character.cs                                         # + SheetFile, Update(..., sheetFile)
│   ├── Interfaces/IImageService.cs, Services/ImageService.cs       # + UploadDocumentAsync (PDF "%PDF-")
│   ├── Services/CharacterService.cs, CampaignCharacterService.cs   # mapeamento + URL
│   └── SheetFiles.cs (TypeOf: "image"/"pdf")                       # helper puro
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/*AddCharacterSheetFile*
├── Roll6.API/Controllers/DocumentController.cs                     # POST /api/document
├── Roll6.Mcp/Tools/ImageTools.cs (upload_document), CharacterTools.cs (sheetFile)
└── Roll6.Tests/…                                                   # ImageService, Character, CharacterService, MCP counts
database/roll6.sql                                                  # regenerado

frontend/src/
├── types/image.ts, types/character.ts, types/campaignCharacter.ts
├── Services/imageService.ts                                        # + uploadDocument, ACCEPTED_DOCUMENT_TYPES
├── lib/sheetFile.ts (+ .test.ts)                                   # validação local, tipo pelo nome
├── lib/characterForm.ts                                            # sheetFile no insert
├── components/characters/SheetFileField.tsx, SheetFileView.tsx     # novos
├── components/modals/CharacterFormModal.tsx                        # aba "Ficha em arquivo"
└── i18n/locales/pt-BR.json
```

**Structure Decision**: web application existente; pasta nova `components/characters/` para os dois componentes da ficha.

## Complexity Tracking

Sem violações.
