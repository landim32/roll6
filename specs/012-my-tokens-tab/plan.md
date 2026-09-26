# Implementation Plan: Aba "Meus Tokens" e Edição de Tokens

**Branch**: `012-my-tokens-tab` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-my-tokens-tab/spec.md`

## Summary

O modal de tokens ganha a aba "Meus Tokens" (primeira, com só os tokens do usuário) e as grades passam
a 4 colunas. Cada token próprio tem um lápis flutuante no canto superior direito da imagem que troca o
modal de tokens pelo modal "Editar token" (mesmos campos e recorte do cadastro); salvar ou cancelar volta
ao modal de tokens em "Meus Tokens", preservando a ação pendente. Backend: só o filtro
`GET /api/token?mine=true` (a edição `PUT /api/token/{id}` já é restrita ao dono).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 + React 18 (frontend)
**Primary Dependencies**: existentes (ASP.NET Core 8, EF Core 9; Vite 6, Bootstrap 5.3, i18next, sonner,
Radix Dialog, react-easy-crop); nada novo
**Storage**: PostgreSQL — sem migration (filtro por `tokens.user_id`, coluna existente)
**Testing**: xUnit + Moq (listagem com dono em `TokenLibraryServiceTests`); Vitest (`lib/tokenForm.ts`:
`toTokenForm`)
**Target Platform**: navegadores desktop atuais; API Linux/Docker
**Project Type**: web app (`backend/` + `frontend/`)
**Performance Goals**: mesma paginação da busca (12 por página); cada aba carrega só quando visível
**Constraints**: regras de imagem do token (quadrado 240 × 240, zoom < 1, rotação) reaproveitadas
**Scale/Scope**: 1 parâmetro novo na API; 1 modal novo, 1 componente de campos extraído, ajustes no
`TokenModal`, service e context

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Nenhuma entidade nova; extensões seguem o padrão `dotnet-architecture` (service → repositório com `ownerUserId`, como `MapModel`) e `react-architecture` (Service → `TokenContext`) | ✅ |
| II | Stack fixa | Nada novo; Fetch; Context API | ✅ |
| III | Casing | Arquivos em `components/modals/`, `components/tokens/`, `Services/`, `Contexts/`, `lib/` | ✅ |
| IV | Convenções | `interface`, arrow functions, sem `enum`; `[FromQuery] bool mine` como no `MapModelController` | ✅ |
| V | Banco | Sem alteração de schema | ✅ |
| VI | Segurança | Edição continua `GetOwnedAsync` (403); `mine` usa o `sub` do JWT, nunca um id vindo do cliente | ✅ |
| VII | Grid hexagonal | Não afetado | ➖ N/A |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/012-my-tokens-tab/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── contracts/ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.API/Controllers/TokenController.cs                    # List: [FromQuery] bool mine
├── Roll6.Domain/Interfaces/ITokenLibraryService.cs              # ListAsync(query, ownerUserId?)
├── Roll6.Domain/Services/TokenLibraryService.cs
├── Roll6.Infra.Interfaces/Repository/ITokenRepository.cs        # ListPagedAsync(search, skip, take, ownerUserId?)
├── Roll6.Infra/Repository/TokenRepository.cs
└── Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs

frontend/src/
├── Services/tokenService.ts                                     # update(id, data); list aceita mine
├── Contexts/TokenContext.tsx                                    # update
├── lib/tokenForm.ts (+ test)                                    # toTokenForm(token)
├── components/tokens/TokenFormFields.tsx                        # campos + 2 croppers (cadastro e edição)
├── components/tokens/TokenGrid.tsx                              # grade 4 colunas + lápis opcional + paginação
├── components/modals/TokenModal.tsx                             # abas mine/search/create; troca para edição
├── components/modals/TokenEditModal.tsx                         # novo
├── styles/app.css                                               # .stm-token-edit (lápis flutuante)
└── i18n/locales/pt-BR.json
```

**Structure Decision**: web app existente; nova pasta `components/tokens/` para os pedaços reaproveitados
pelo modal de tokens e pelo de edição.

## Complexity Tracking

Sem violações.
