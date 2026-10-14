# Implementation Plan: Tamanho do modelo 3D do token

**Branch**: `063-token-model-scale` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/063-token-model-scale/spec.md`

## Summary

O token ganha **`model_scale`**: a porcentagem (25–400, passos de 5, padrão 100) que multiplica a altura automática do
modelo 3D na vista 3D do mapa. É gravada pelo mesmo `Token.UpdateModel` que já guarda o arquivo e as animações (sem
modelo = 100). Ela viaja em `TokenInsertInfo`/`TokenInfo`/`MapTokenInfo` como `modelScale` e no MCP
(`create_token`/`update_token`).

No site:
- **Formulário:** a aba "3D" (`ModelField` com `section="model"`) ganha o campo **Tamanho**: um range com o valor em
  porcentagem, só quando há modelo.
- **Prévia:** `ModelPreview` recebe `scale`. O disco do chão fica fixo como referência, o modelo cresce sobre ele e a
  câmera se afasta o bastante para ele caber.
- **Vista 3D:** `fitModel`/`fitLyingModel` recebem o fator e multiplicam a escala. O `ModelSpec` leva `scale`, e o
  proxy escondido da figura no raycaster fica `scale` vezes mais largo (e alto, pela proporção 3:4), para os balões e a
  ocultação da cabeça seguirem o modelo.
- **Foto da pose:** não muda (Q2 = A).

Para a mudança chegar à mesa sem recarregar (FR-010), `TokenLibraryService.UpdateAsync` passa a publicar
`mapTokens.changed` (mapId null) em cada campanha com peças daquele token.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: existentes apenas — ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017),
`ModelContextProtocol.AspNetCore` 2.x · React 18, Bootstrap 5.3, i18next, `three` 0.186.1. **Nenhuma dependência nova.**
**Storage**: PostgreSQL — `tokens.model_scale integer not null default 100` (migração `AddTokenModelScale` +
`database/migrations/063-token-model-scale.sql`; `database/roll6.sql` regenerado)
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`: Guard, Token, TokenLibraryService, MCP); Vitest (`modelFit`,
`tokenForm`, `pieceDrawing`, `modelPreviewFraming`)
**Target Platform**: navegador (site) + API Linux em container
**Project Type**: web (backend + frontend)
**Performance Goals**: prévia atualiza no mesmo quadro do range (sem recarregar o modelo); mapa 3D sem custo extra
(uma multiplicação por peça)
**Constraints**: tokens existentes byte a byte iguais na vista 3D (100% = fator 1, sem arredondamento); o Tamanho não
toca 2D, ocupação, movimento nem a foto da pose
**Scale/Scope**: 1 coluna, 3 DTOs, 2 ferramentas MCP (texto + parâmetro), 1 evento de tempo real novo no update de
token, ~6 arquivos de frontend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Nenhuma entidade nova: só um campo no `Token`, seguindo o padrão já gerado (`UpdateModel`, DTOs, `MapToDto`). ✅ |
| II. Stack fixa | Sem dependência nova; Bootstrap `form-range`, Context API existente. ✅ |
| III. Case de diretórios | Arquivos nos diretórios existentes (`components/tokens`, `lib`, `hooks`, `types`). ✅ |
| IV. Convenções de código | `interface` nos tipos novos, sem `enum` (constantes), textos via i18next, erros de domínio via `DomainValidationException` → 400. ✅ |
| V. Banco | Coluna snake_case `model_scale`, migração EF + script incremental, nenhum delete em cascata. ✅ |
| VI. Autenticação | Mesma regra do token: só o dono altera (`[Authorize]` existente). ✅ |
| VII. Grid hexagonal | Não toca a matemática do grid nem a ocupação (FR-011). ✅ |
| MCP | Sem endpoint novo; `create_token`/`update_token` ganham `modelScale` (contagem igual: 109 operações / 110 ferramentas). ✅ |

Re-check pós-design: sem violações. Nada a justificar em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/063-token-model-scale/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── token-model-scale.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Validation/Guard.cs                 # ModelScale (25–400, múltiplo de 5)
├── Roll6.Domain/Models/Token.cs                     # ModelScale + UpdateModel(..., scale)
├── Roll6.Domain/Services/TokenLibraryService.cs     # grava/mapeia; publica mapTokens.changed no update
├── Roll6.Domain/Services/MapTokenService.cs         # MapTokenInfo.modelScale
├── Roll6.DTO/Token/TokenInsertInfo.cs, TokenInfo.cs
├── Roll6.DTO/MapToken/MapTokenInfo.cs
├── Roll6.Infra/Context/Roll6Context.cs              # model_scale default 100
├── Roll6.Infra/Repository/MapTokenRepository.cs     # ListCampaignIdsByTokenAsync
├── Roll6.Infra.Interfaces/Repository/IMapTokenRepository.cs
├── Roll6.Infra/Migrations/*_AddTokenModelScale.cs
├── Roll6.Mcp/Tools/TokenTools.cs, McpDocs.cs, Roll6Guide.cs
└── Roll6.Tests/…                                    # Guard, Token, TokenLibraryService, MCP parity (automático)

database/migrations/063-token-model-scale.sql, database/roll6.sql

frontend/src/
├── types/token.ts, types/mapToken.ts                # modelScale
├── lib/modelScale.ts (+ test)                       # MODEL_SCALE (min/max/step/default), clamp, factor, format
├── lib/modelFit.ts (+ test)                         # fator em fitModel/fitLyingModel
├── lib/tokenForm.ts (+ test)                        # ResolvedModel.modelScale, toTokenInsert
├── lib/pieceDrawing.ts (+ test)                     # spriteSpec.modelScale
├── hooks/useModelFile.ts                            # scale (seed do token; 100 ao remover)
├── components/tokens/ModelField.tsx                 # campo Tamanho na aba 3D
├── components/tokens/ModelPreview.tsx              # prop scale; câmera se afasta, disco fixo
├── components/story/modelLayer.ts, StoryView.tsx    # ModelSpec.scale; proxy escondido mais largo
└── i18n/locales/pt-BR.json                          # tokens.model.scale*
```

**Structure Decision**: web app existente (`backend/` + `frontend/`); nenhum projeto ou pasta nova.

## Complexity Tracking

Sem violações.
