# Implementation Plan: Ficha do personagem por campanha (texto e arquivo)

**Branch**: `032-campaign-sheet-copy` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/032-campaign-sheet-copy/spec.md`

## Summary

Cada participação (`CampaignCharacter`) passa a guardar a **própria ficha** do personagem naquela campanha — o
texto markdown (campo `sheet`, que hoje holds "Anotações da Campanha" e é zerado na entrada) e uma referência a
um arquivo de ficha (nova coluna `campaign_characters.sheet_file`). `CampaignCharacter.ResetFrom(character)` já é
o funil único de "entrada na campanha" (criação + toda transição para Aprovado) e recebe as duas cópias; a
feature 023 é revertida. O mestre ganha escrita sobre a cópia da campanha (`PUT /api/campaigncharacter/{id}`
com novo campo opcional `sheetFile`) e continua sem poder tocar em nada do personagem.

A decisão técnica central (pesquisa **D1**) é que a "cópia" do arquivo é uma **referência compartilhada a um
objeto imutável**, não uma duplicação física de bytes: os uploads já gravam em `{guid}.{ext}` e nada no sistema
sobrescreve ou apaga objetos, então apontar a participação para o mesmo nome satisfaz integralmente FR-004,
FR-005 e FR-007 sem precisar de cópia no S3. Isso elimina o único bloqueio real encontrado — não existe como ler
de volta um PDF armazenado (`ImageService.OpenAsync` recusa `.pdf`) e `IImageStorageAppService` não tem
`CopyAsync`/`DeleteAsync` — e reduz a migração a SQL puro.

No frontend, o `CharacterFormModal` de 432 linhas é dividido em dois modais: o do **personagem** (dados
permanentes + ficha original, criação e nova edição a partir de um lápis na lista "Selecionar personagem") e o da
**campanha** (novo `CampaignCharacterModal`, só o que pertence à participação, exibindo a ficha da campanha).
Nenhum endpoint novo, nenhuma dependência nova.

## Technical Context

**Language/Version**: C# 12 / .NET 8.0 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8 Web API, EF Core 9 + Npgsql, JwtBearer, AWSSDK.S3, Swashbuckle 8, `ModelContextProtocol.AspNetCore` 2.x (`Roll6.Mcp`) · React 18, Vite 6, React Router 6, Bootstrap 5.3 (dark only), i18next, sonner, `@radix-ui/react-dialog` + `@radix-ui/react-dropdown-menu`, `@uiw/react-md-editor` + `rehype-sanitize`, `react-easy-crop`. **Nenhuma dependência nova.**
**Storage**: PostgreSQL — `campaign_characters` (1 coluna nova) e `characters` (inalterada); arquivos de ficha no bucket S3-compatível (DigitalOcean Spaces), objetos imutáveis `{guid}.{ext}` sob `{S3:Folder}`
**Testing**: xUnit + Moq + FluentAssertions em `backend/Roll6.Tests` (só serviços de domínio e modelos); Vitest em `frontend` com `environment: 'node'` coletando apenas `src/**/*.test.ts` — **não há teste de componente**, então a cobertura nova fica em `lib/*.test.ts`
**Target Platform**: contêineres Linux em homolog/produção (`docker-compose*.yml`); dev local em Windows com `dotnet run` + `npm run dev`. Docker não pode ser executado na máquina de dev (constituição, Princípio II)
**Project Type**: aplicação web — dois projetos no mesmo repositório (`backend/` Clean Architecture em 6 camadas + `Roll6.Mcp` + `Roll6.Tests`; `frontend/` SPA)
**Performance Goals**: nenhum novo. O detalhe da participação continua sendo 1 linha + 1 lookup de token + URLs pré-assinadas; o painel já faz poll de 15 s e o payload de `CampaignCharacterInfo` (lista) **não** cresce — só o do detalhe
**Constraints**: limite de 20.000 caracteres por ficha (original e da campanha) e 10 MB por arquivo; objetos de ficha nunca são apagados (limpeza de órfãos fora de escopo, como na 022); `McpCoverageTests` fixa 86 operações / 87 ferramentas — **não pode mudar**, então nenhum endpoint novo; `McpRouteParityTests` injeta `"sample"` em parâmetros `string` sem default, logo todo parâmetro novo de ferramenta MCP precisa ter default
**Scale/Scope**: 1 coluna nova · 1 migration EF + 1 SQL idempotente em `database/migrations/` + `database/roll6.sql` regenerado · 0 endpoints novos · 2 campos novos em DTOs · 1 modal dividido em 2 (1 arquivo novo, 5 alterados) · ~10 chaves i18n · 2 parâmetros/ descrições MCP · ~12 testes alterados ou novos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura Obrigatórias** | Novas entidades/funcionalidades devem usar `dotnet-architecture` e `react-architecture` | **PASS (com observação)** | As duas skills existem em `.claude/skills/dotnet-architecture/SKILL.md` e `.claude/skills/react-architecture/SKILL.md`, mas **não estão registradas como skills nesta sessão Qwen** — foram lidas direto do disco e o plano segue a estrutura de camadas delas (`DTO → Infra.Interfaces → Domain → Infra → Application → API`). Nenhuma entidade nova é criada: é 1 coluna numa entidade existente + 1 componente novo que reusa os padrões já aplicados. A skill `react-architecture` ainda tipa respostas com `sucesso`/`mensagem`/`erros`; isso é **sobrescrito** pela constituição v3.0.0 (DTO direto + `ProblemDetails`), como `CLAUDE.md` já registra — o plano usa DTO + `ProblemDetails`. |
| **II. Stack Tecnológica Fixa** | Sem biblioteca fora da tabela; sem Docker local; Fetch API em serviços novos; `VITE_` | **PASS** | Nenhuma dependência nova em nenhum dos dois lados. A decisão **D1** (referência compartilhada em vez de cópia física) existe justamente para **não** precisar de nada novo no armazenamento. Nenhum serviço HTTP novo no frontend — `Services/campaignCharacterService.ts` e `Services/imageService.uploadDocument` já cobrem tudo e são reutilizados sem alteração. Nenhuma variável de ambiente nova. |
| **III. Case Sensitivity de Diretórios** | `Contexts/`, `Services/` maiúsculos; `hooks/`, `types/` minúsculos | **PASS** | O único arquivo novo é `frontend/src/components/modals/CampaignCharacterModal.tsx` (diretório minúsculo, já existente). Nenhum arquivo novo em `Contexts/`, `Services/`, `hooks/` ou `types/` — os imports continuam apontando para `../../Services/...` e `../../types/...` com o casing do disco. |
| **IV. Convenções de Código** | PascalCase/camelCase/`_camelCase`; `[JsonPropertyName("camelCase")]` em todo DTO; DTO direto no sucesso, `ProblemDetails` no erro; `interface` (não `type`); arrow functions; `const` | **PASS** | Novos membros: `CampaignCharacter.SheetFile` e `CampaignCharacter.ChangeSheetFile` (PascalCase), campos privados inexistentes. Novos campos de DTO com `[JsonPropertyName("sheetFile")]`. Erros continuam saindo como `DomainValidationException`/`UnauthorizedAccessException`/`ConflictException` → `ApiControllerBase.HandleException` → `ProblemDetails`; nenhum `try/catch` novo em controller. Frontend: `interface` para props, arrow functions, `const`, sem `enum` (`tsconfig` tem `erasableSyntaxOnly`). |
| **V. Convenções de Banco (PostgreSQL)** | Tabelas/colunas snake_case; `varchar` com MaxLength; `timestamp without time zone`; FK `ClientSetNull`, nunca Cascade; enums como `integer` | **PASS** | `campaign_characters.sheet_file character varying(260) NULL` — mesmo tipo, mesmo tamanho e mesma ausência de FK/índice de `characters.sheet_file`, porque é um **nome de arquivo armazenado**, não uma referência a linha. Nenhuma FK nova ou alterada; `fk_campaign_campaign_character` e `fk_character_campaign_character` continuam `ClientSetNull`. Nenhum timestamp ou enum novo. Backfill via `migrationBuilder.Sql(...)` com raw string literal, padrão já usado em `AddSlugs` e `AddPostureAndTokenSpaces`. |
| **VI. Autenticação e Segurança** | `[Authorize]` em controllers com dados sensíveis; token só em localStorage; sem secret no frontend | **PASS** | Nenhum endpoint novo. `CampaignCharacterController` e `CharacterController` já são `[Authorize]` em nível de classe. A permissão nova (mestre escreve a ficha da campanha, nunca a original) é aplicada no serviço de domínio, onde já estão `EnsureMaster`/`EnsureCharacterOwner` e as verificações inline de `UpdateAsync`. Arquivos continuam acessíveis só por URL pré-assinada de curta duração. Nenhuma mudança em storage de sessão ou em variável de ambiente. |
| **VII. Grid Hexagonal (Red Blob Games)** | Matemática de grid no módulo puro, posições como `x`/`y` odd-q | **N/A** | Esta feature não toca em grid, posições, movimento, postura nem footprint. `HexGrid.cs` / `lib/hexGrid.ts` / `lib/occupancy.ts` permanecem intocados. |

**Resultado do gate**: sem violações → `Complexity Tracking` fica vazio e a Fase 0 está liberada.

**Reavaliação pós-Fase 1 (design)**: os artefatos (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`)
não introduziram camada, projeto, dependência, coluna fora de convenção nem endpoint novo além do que está na
tabela acima. O contrato de `PUT /api/campaigncharacter/{id}` ganha um campo opcional com default, o que mantém
`McpCoverageTests` (86/87) e `McpRouteParityTests` válidos. **Gate: PASS, sem violações.**

## Project Structure

### Documentation (this feature)

```text
specs/032-campaign-sheet-copy/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output — 8 decisões (D1..D8) com rationale e alternativas
├── data-model.md        # Phase 1 output — entidades, campos, validações, transições e migração
├── quickstart.md        # Phase 1 output — como rodar, verificar e testar a feature
├── contracts/           # Phase 1 output
│   ├── campaign-character-api.md    # REST: PUT/GET /api/campaigncharacter, PUT/GET /api/character
│   ├── mcp-tools.md                 # update_participation / get_participation / update_character + guide
│   └── ui-contracts.md              # os dois modais, a lista de personagens e as chaves i18n
├── checklists/
│   └── requirements.md  # criado pelo /speckit.specify
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/
│   ├── Models/CampaignCharacter.cs            # + SheetFile; ResetFrom copia sheet+sheetFile; + ChangeSheetFile
│   ├── Services/CampaignCharacterService.cs   # UpdateAsync chama ChangeSheetFile + diff; MapToDetailAsync troca a origem do arquivo
│   └── Turns/TurnSummary.cs                   # rótulo de "notes" (e do novo "sheetFile")
├── Roll6.DTO/CampaignCharacter/
│   ├── CampaignCharacterDetailInfo.cs         # + sheetFile; sheetFileUrl/sheetFileType passam a ser os da campanha
│   └── CampaignCharacterUpdateInfo.cs         # + sheetFile (ausente/null = mantém, "" = remove)
├── Roll6.Infra/
│   ├── Context/Roll6Context.cs                # entity.Property(e => e.SheetFile).HasColumnName("sheet_file").HasMaxLength(260)
│   └── Migrations/<timestamp>_AddCampaignSheetFile.cs (+ .Designer.cs, + Roll6ContextModelSnapshot.cs)
├── Roll6.Mcp/
│   ├── Tools/ParticipationTools.cs            # update_participation + sheetFile; descrições de get/update/accept/approve
│   └── Roll6Guide.cs                          # parágrafos "Characters" e "Campaigns and participation"
└── Roll6.Tests/
    ├── Domain/Models/CampaignCharacterTests.cs        # 3 asserções de reset + ChangeSheetFile
    ├── Domain/Services/CampaignCharacterServiceTests.cs  # seção nova "---- 032 ----"
    └── Domain/Turns/TurnSummaryTests.cs               # rótulo

database/
├── migrations/032-campaign-sheet.sql          # NOVO — idempotente, padrão dos vizinhos
└── roll6.sql                                  # regenerado (mantendo o cabeçalho)

frontend/src/
├── components/
│   ├── modals/CharacterFormModal.tsx          # vira o Modal A (só personagem): cria e edita
│   ├── modals/CampaignCharacterModal.tsx      # NOVO — Modal B (só campanha); exporta CharacterEditTarget
│   ├── modals/SelectCharacterModal.tsx        # + onEdit + lápis por personagem
│   ├── menu/TopMenu.tsx                       # includeOpen → editingCharacter (CharacterInfo | null)
│   ├── characters/SheetFileField.tsx          # reutilizado sem alteração nos dois modais
│   └── characters/SheetFileView.tsx           # reutilizado sem alteração
├── pages/MainPage.tsx                         # monta o Modal B; import de CharacterEditTarget muda de arquivo
├── types/campaignCharacter.ts                 # + sheetFile no detail e no update; comentários corrigidos
├── lib/campaignCharacterForm.ts               # toCampaignUpdate + sheetFile
├── lib/campaignCharacterForm.test.ts          # cobertura nova
└── i18n/locales/pt-BR.json                    # ~10 chaves (renomeadas/novas)
```

**Structure Decision**: aplicação web com `backend/` + `frontend/` (Opção 2 do template), sem nenhum projeto ou
pasta nova. A coluna nova vai na entidade existente — **não** há entidade nova, portanto não há repositório novo,
serviço novo, controller novo, rota nova, provider novo nem entrada nova na cadeia de providers de `main.tsx`.
Os dois únicos arquivos novos do repositório são `backend/Roll6.Infra/Migrations/<timestamp>_AddCampaignSheetFile.cs`
(gerado por `dotnet ef migrations add`), `database/migrations/032-campaign-sheet.sql` e
`frontend/src/components/modals/CampaignCharacterModal.tsx`. `Services/`, `Contexts/` e `hooks/` não mudam:
`updateParticipation`/`getParticipation` já transportam os DTOs que apenas ganham campos.

## Complexity Tracking

> Sem violações do Constitution Check — nada a justificar.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
