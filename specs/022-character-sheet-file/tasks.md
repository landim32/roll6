# Tasks: Ficha do personagem em imagem ou PDF

**Input**: Design documents from `specs/022-character-sheet-file/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: incluídos — o projeto cobre regras de domínio em `Roll6.Tests` e regras de formulário com Vitest; os
testes do MCP exigem uma ferramenta por rota nova.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 = anexar a ficha; US2 = consultar a ficha no jogo

---

## Phase 1: Setup

Nada a configurar: sem pacote ou projeto novo.

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T001 [P] Adicionar `Guard.SheetFileName(string? value, string field)` em `backend/Roll6.Domain/Validation/Guard.cs` (regex `^[0-9a-f]{32}\.(png|jpg|webp|pdf)$`, `OptionalText` ≤ 260, mensagem "Arquivo inválido. Use o fileName retornado pelo upload.")
- [X] T002 [P] Criar `backend/Roll6.Domain/SheetFiles.cs` com `SheetFiles.TypeOf(string? fileName)` → `"pdf"` para `.pdf`, `"image"` para png/jpg/webp, `null` sem arquivo; constantes `IMAGE = "image"`, `PDF = "pdf"`
- [X] T003 Adicionar `public string? SheetFile { get; set; }` em `backend/Roll6.Domain/Models/Character.cs` e o parâmetro `string? sheetFile` ao fim de `Update(...)`, validado com `Guard.SheetFileName(sheetFile, "sheetFile")`; ajustar todas as chamadas de `Update` (`CharacterService.CreateAsync/UpdateAsync` e testes) (depende de T001)
- [X] T004 Mapear `SheetFile` → `sheet_file` (`HasMaxLength(260)`) em `backend/Roll6.Infra/Context/Roll6Context.cs` e gerar a migração `dotnet ef migrations add AddCharacterSheetFile --project Roll6.Infra --startup-project Roll6.API` (depende de T003)
- [X] T005 [P] DTOs: `sheetFile` em `backend/Roll6.DTO/Character/CharacterInsertInfo.cs`; `sheetFile`, `sheetFileUrl`, `sheetFileType` em `backend/Roll6.DTO/Character/CharacterInfo.cs`; `sheetFileUrl`, `sheetFileType` em `backend/Roll6.DTO/CampaignCharacter/CampaignCharacterDetailInfo.cs`; novo `backend/Roll6.DTO/Image/DocumentUploadInfo.cs` (`fileName`, `url`, `type`) — todos com `JsonPropertyName` camelCase

**Checkpoint**: `dotnet build backend/Roll6.sln` compila.

---

## Phase 3: User Story 1 - Anexar a ficha ao personagem (Priority: P1) 🎯 MVP

**Goal**: o dono envia uma imagem ou PDF (sem recorte), salva no personagem, troca ou remove.

**Independent Test**: quickstart passos 1–5 e 7.

### Tests for User Story 1

- [X] T006 [P] [US1] Em `backend/Roll6.Tests/Domain/Services/ImageServiceTests.cs`: `UploadDocumentAsync` aceita PDF (`%PDF-1.7…`) com extensão `pdf`/tipo `"pdf"` e PNG/JPG/WebP com tipo `"image"`, repassando ao storage o **mesmo buffer** (bytes idênticos) e o `Content-Type` original; recusa vazio, > 10 MB, `application/msword` e PDF declarado com conteúdo que não começa por `%PDF-` (todos `DomainValidationException` em `file`, storage não chamado)
- [X] T007 [P] [US1] Em `backend/Roll6.Tests/Domain/Models/CharacterTests.cs`: `Update` aceita `sheetFile` válido (`{32hex}.pdf`/`.png`), aceita null e recusa nomes inválidos (`ficha.pdf`, `{32hex}.docx`) com erro em `sheetFile`
- [X] T008 [P] [US1] Em `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`: create/update gravam `SheetFile`; o `CharacterInfo` devolve `sheetFileUrl` (storage `GetUrl`) e `sheetFileType` (`"pdf"`/`"image"`/null)
- [X] T009 [P] [US1] Criar `frontend/src/lib/sheetFile.test.ts` para `validateSheetFile` (tipos aceitos por MIME **ou** extensão quando o MIME vem vazio; `.docx` → `type`; > 10 MB → `tooLarge`) e `sheetFileTypeOf(fileName)`

### Implementation for User Story 1

- [X] T010 [US1] `Task<DocumentUploadInfo> UploadDocumentAsync(Stream content, long length, string? contentType)` em `backend/Roll6.Domain/Interfaces/IImageService.cs` e `backend/Roll6.Domain/Services/ImageService.cs`: mesma validação de tamanho/assinatura do upload de imagem com a tabela estendida (`application/pdf` → `pdf`, assinatura `%PDF-`), mensagem de formato "Formato não suportado. Use PNG, JPEG, WebP ou PDF."; retorna `{ FileName, Url, Type = SheetFiles.TypeOf(fileName) }` (depende de T002, T005)
- [X] T011 [US1] Criar `backend/Roll6.API/Controllers/DocumentController.cs` (`[Authorize]`, `[HttpPost]`, `[RequestSizeLimit(11_000_000)]`, `IFormFile? file`, mesmo padrão do `ImageController`) → `POST /api/document` (depende de T010)
- [X] T012 [US1] Em `backend/Roll6.Domain/Services/CharacterService.cs`: passar `info.SheetFile` para `Update` em create/update e preencher `SheetFile`, `SheetFileUrl = _imageStorage.GetUrl(SheetFile)`, `SheetFileType = SheetFiles.TypeOf(SheetFile)` em `MapToDto` (depende de T003, T005)
- [X] T013 [US1] MCP em `backend/Roll6.Mcp/Tools/ImageTools.cs`: ferramenta `upload_document` (`[ApiOperation("POST", "/api/document")]`, mesmo formato de `upload_image`: base64 → `PostFileAsync("/api/document", …)`, descrição com as seções padrão, tipos e limite); em `backend/Roll6.Mcp/Tools/CharacterTools.cs`: parâmetro opcional `sheetFile` em `create_character` e `update_character` (descrição: "fileName from upload_document; omitting it on update removes the file"); atualizar as contagens em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (74 → 75 operações, 75 → 76 ferramentas)
- [X] T014 [P] [US1] Frontend tipos: `DocumentUploadInfo` e `SHEET_FILE_TYPE = { image: 'image', pdf: 'pdf' } as const` em `frontend/src/types/image.ts`; `sheetFile`, `sheetFileUrl`, `sheetFileType` em `CharacterInfo` e `sheetFile` em `CharacterInsertInfo` (`frontend/src/types/character.ts`)
- [X] T015 [P] [US1] Criar `frontend/src/lib/sheetFile.ts`: `ACCEPTED_SHEET_TYPES` (png, jpeg, webp, pdf), `SHEET_FILE_ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf'`, `MAX_SHEET_FILE_BYTES = 10 MB`, `validateSheetFile(file): 'type' | 'tooLarge' | null`, `sheetFileTypeOf(fileName)`
- [X] T016 [US1] `uploadDocument(file: File): Promise<DocumentUploadInfo>` em `frontend/src/Services/imageService.ts` (multipart para `${API_URL}/api/document`, sem transformar o `File`) (depende de T014)
- [X] T017 [US1] `toCharacterInsert` em `frontend/src/lib/characterForm.ts` recebe `sheetFile: string | null` e o inclui no `CharacterInsertInfo`; ajustar chamadas e `frontend/src/lib/characterForm.test.ts` (depende de T014)
- [X] T018 [US1] Criar `frontend/src/components/characters/SheetFileView.tsx` (props `url`, `type`): imagem `img-fluid` + link "Abrir em tamanho real"; PDF → botão-link "Abrir ficha (PDF)" (`target="_blank" rel="noopener noreferrer"`), conforme `contracts/ui.md` (depende de T014)
- [X] T019 [US1] Criar `frontend/src/components/characters/SheetFileField.tsx` (props `value: { fileName, url, type, originalName } | null`, `onChange`, `disabled`): input de arquivo oculto com `SHEET_FILE_ACCEPT`, valida com `validateSheetFile` (toast), sobe na hora com `imageService.uploadDocument` (spinner), mostra nome/selo Imagem-PDF, "Trocar"/"Remover" e o `SheetFileView` (depende de T015, T016, T018)
- [X] T020 [US1] Em `frontend/src/components/modals/CharacterFormModal.tsx`: estado `sheetFile` carregado de `character.sheetFile/sheetFileUrl/sheetFileType` (dono) e vazio ao criar; aba "Ficha em arquivo" com `SheetFileField` quando `characterEditable`; enviar `sheetFile` em create e em update do dono (depende de T017, T019)
- [X] T021 [P] [US1] Textos em `frontend/src/i18n/locales/pt-BR.json`: aba, dica de formatos/limite, escolher/trocar/remover, "Ficha atual", selos Imagem/PDF, "Abrir em tamanho real", "Abrir ficha (PDF)", erros `type`/`tooLarge`, "Enviando…"

**Checkpoint**: o dono anexa, troca e remove a ficha; o arquivo baixado é idêntico ao enviado.

---

## Phase 4: User Story 2 - Consultar a ficha durante o jogo (Priority: P2)

**Goal**: mestre e participantes aprovados veem a ficha pelo card do personagem.

**Independent Test**: quickstart passo 6.

### Tests for User Story 2

- [X] T022 [US2] Em `backend/Roll6.Tests/Domain/Services/CampaignCharacterServiceTests.cs`: o detalhe (`GetByIdAsync` da participação) devolve `sheetFileUrl`/`sheetFileType` do personagem para mestre e participante aprovado; null quando o personagem não tem arquivo

### Implementation for User Story 2

- [X] T023 [US2] Em `backend/Roll6.Domain/Services/CampaignCharacterService.cs` (`MapToDetailAsync`): preencher `SheetFileUrl`/`SheetFileType` a partir do `Character` da participação (carregar o personagem se o mapeamento ainda não o tiver) (depende de T005, T012)
- [X] T024 [US2] `sheetFileUrl`/`sheetFileType` em `CampaignCharacterDetailInfo` (`frontend/src/types/campaignCharacter.ts`); em `CharacterFormModal.tsx`, para mestre/visualizador mostrar a aba "Ficha em arquivo" só com `SheetFileView` quando `detail.sheetFileUrl` existir (depende de T018, T020)

**Checkpoint**: mestre e outro participante veem a ficha; usuário de fora continua recebendo 403 no detalhe.

---

## Phase 5: Polish & Cross-Cutting

- [X] T025 Regenerar `database/roll6.sql` (`dotnet ef migrations script --idempotent … -o ../database/roll6.sql`, mantendo o cabeçalho) e aplicar a migração no banco de desenvolvimento
- [X] T026 [P] Atualizar `CLAUDE.md` (personagem: `sheet_file`, `POST /api/document`, leitura no detalhe; frontend: aba "Ficha em arquivo", `components/characters/`; MCP 76 ferramentas) e `## Recent Changes`; mencionar a ficha em arquivo em `backend/Roll6.Mcp/Roll6Guide.cs`
- [X] T027 Rodar `dotnet build`, `dotnet test`, `npm run lint`, `npm test`, `npm run build`
- [X] T028 Validar o `quickstart.md` na API local (upload de PDF/JPG, bytes idênticos, recusas) e no frontend

---

## Dependencies & Execution Order

- Phase 2: T001 ∥ T002 ∥ T005 → T003 → T004.
- US1 backend: T006–T008 → T010 → T011; T012; T013. US1 frontend: T014/T015 → T016/T017/T018 → T019 → T020; T021 livre.
- US2: T022 → T023 (depende de T012); T024 depois de T020.
- Polish por último.

### Parallel Opportunities

- T001 ∥ T002 ∥ T005; T006 ∥ T007 ∥ T008 ∥ T009; T014 ∥ T015 ∥ T021; T026 ∥ T025.
- Backend e frontend avançam juntos após a Phase 2.

### Parallel Example: User Story 1

```text
T006 ImageService tests | T007 Character tests | T008 CharacterService tests | T009 sheetFile.test.ts
T014 tipos | T015 lib/sheetFile.ts | T021 textos
```

## Implementation Strategy

1. **MVP**: Phase 2 + US1 — anexar, trocar e remover a ficha (UI, API e MCP).
2. **Incremento**: US2 — ficha visível para o mestre e os participantes aprovados.
3. Polish: SQL completo, documentação e validação.
