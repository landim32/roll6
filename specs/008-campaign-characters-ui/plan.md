# Implementation Plan: Personagens na Campanha (combo, gerenciar, selecionar, incluir e convites)

**Branch**: `008-campaign-characters-ui` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-campaign-characters-ui/spec.md`

## Summary

Frontend dos personagens de campanha: o combo real "Personagem atual" (Radix Dropdown com
"Mestre (GM)" + personagens próprios aprovados, e as ações "Gerenciar Personagens", "Selecionar
Personagem" e "Incluir Personagem" na própria lista), três modais, e o sino de convites à direita do
nome. Um `CharacterContext` novo concentra personagens, participações da campanha atual, escolha por
campanha (localStorage) e convites (atualizados a cada 60 s). O backend ganha quatro ajustes sem
migration: busca pública de personagens, remoção de participação pelo mestre, consulta das próprias
participações e aprovação direta quando o mestre inclui o próprio personagem (research R1).

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 + React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql; Vite 6, Bootstrap 5.3 (tema escuro),
i18next, sonner, `@radix-ui/react-dialog` e `@radix-ui/react-dropdown-menu` (já instalados)
**Storage**: PostgreSQL (tabelas existentes, sem migration); localStorage para a escolha por campanha
**Testing**: xUnit + Moq + FluentAssertions (services); Vitest (`lib/`); roteiro do quickstart
**Target Platform**: navegadores desktop atuais; API Linux/Docker
**Project Type**: web app (`backend/` + `frontend/`)
**Performance Goals**: listas de campanha e busca paginadas (≤ 100 por página); nomes de donos em
lote, sem N+1; convites em no máximo 1 min (SC-003)
**Constraints**: textos só via i18next pt-BR; feedback só por toast; janelas como modal; sem enums TS
**Scale/Scope**: 3 endpoints novos + 1 regra alterada; 1 contexto, 2 services, 2 componentes de menu,
3 modais de feature + 2 componentes de UI, 2 módulos puros

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Backend: métodos novos em repositórios/services/controllers e DTO `CharacterSearchInfo` pela `dotnet-architecture`; frontend: Types → Services → `CharacterContext` → `useCharacter` → provider pela `react-architecture` | ✅ |
| II | Stack fixa | Nada novo; Radix Dropdown já adotado na 007; Context API, Fetch | ✅ |
| III | Casing de diretórios | `src/Contexts/CharacterContext.tsx`, `src/Services/characterService.ts`, `src/hooks/useCharacter.ts`, `src/types/character.ts` | ✅ |
| IV | Convenções de código | Backend PascalCase/_camelCase/file-scoped; frontend `interface`, arrow functions, constantes em vez de `enum` | ✅ |
| V | Banco | Sem mudança de esquema; remoção apaga só `campaign_characters` (FKs seguem `ClientSetNull`) | ✅ |
| VI | Autenticação e segurança | Endpoints com `[Authorize]`; busca expõe só nome/imagem/dono; remoção e listagem completa só para o mestre; `mine` filtra pelo usuário do JWT | ✅ |
| VII | Grid hexagonal | Não afetado | ➖ N/A |
| — | Respostas / erros | DTO direto / `PagedList<T>`; erros via `HandleException` (403/404/409) | ✅ |

Re-check pós-design: sem violações; nada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-campaign-characters-ui/
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
├── Roll6.DTO/Character/CharacterSearchInfo.cs            # novo
├── Roll6.Infra.Interfaces/Repository/
│   ├── ICharacterRepository.cs            # + ListPagedAsync
│   └── ICampaignCharacterRepository.cs    # + ListByCampaignAndUserAsync, DeleteAsync
├── Roll6.Infra/Repository/
│   ├── CharacterRepository.cs
│   └── CampaignCharacterRepository.cs
├── Roll6.Domain/
│   ├── Models/CampaignCharacter.cs        # RequestAccess(autoApprove)
│   └── Services/                          # CharacterService.SearchAsync; CampaignCharacterService.ListMineAsync, RemoveAsync, RequestAccess do mestre
├── Roll6.API/Controllers/
│   ├── CharacterController.cs             # GET search
│   └── CampaignCharacterController.cs     # GET mine, DELETE {id}
└── Roll6.Tests/Domain/Services/
    ├── CharacterServiceTests.cs           # novo
    └── CampaignCharacterServiceTests.cs   # + casos

bruno/Character, bruno/CampaignCharacter   # + requisições dos endpoints novos

frontend/src/
├── types/character.ts, types/campaignCharacter.ts
├── Services/characterService.ts, Services/campaignCharacterService.ts
├── Contexts/CharacterContext.tsx          # + provider em main.tsx; logout limpa a chave local
├── hooks/useCharacter.ts
├── lib/characterSelection.ts (+ .test.ts), lib/characterForm.ts (+ .test.ts)
├── components/
│   ├── menu/CharacterSelect.tsx, menu/NotificationBell.tsx, menu/TopMenu.tsx
│   ├── modals/ManageCharactersModal.tsx, modals/SelectCharacterModal.tsx, modals/CharacterFormModal.tsx
│   └── ui/ConfirmModal.tsx, ui/CharacterAvatar.tsx, ui/StatusBadge.tsx
├── i18n/locales/pt-BR.json                # character.*, manage.*, notifications.*
└── styles/app.css
```

**Structure Decision**: web app com as duas pastas existentes; backend só estende o que a 005 criou
(sem entidades novas). Contratos: [contracts/api.md](./contracts/api.md) e
[contracts/ui.md](./contracts/ui.md).

## Complexity Tracking

Nenhuma violação a justificar.
