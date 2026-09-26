# Implementation Plan: Status e Ficha do Personagem por Campanha

**Branch**: `010-campaign-character-sheet` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-campaign-character-sheet/spec.md`

## Summary

O status (texto livre) sai do personagem e passa a existir só na participação, que também ganha uma
**ficha da campanha**, copiada da ficha do personagem sempre que a participação é criada ou passa a
Aprovada (junto com o reinício de vida/energia que já existe). O mestre deixa de editar o personagem:
edita só a participação (vida/energia atuais, status, ficha da campanha). Todos que veem o painel
podem ver tudo em modo leitura.

Backend: colunas `character_status`/`sheet` em `campaign_characters` e remoção de `characters.status`
(migration com cópia dos dados); `CampaignCharacter` recebe o `Character` nas entradas (copia totais +
ficha, zera status) e `UpdatePlay(...)` substitui `SetVitals`; `GET /api/character/{id}` e `PUT`
voltam a ser só do dono; `GET /api/campaigncharacter/{id}` (detalhe com a ficha) e
`PUT /api/campaigncharacter/{id}` (substitui `/vitals`). Frontend: tira o status do formulário do
personagem, o modal aberto pelo card passa a ter três modos (dono / mestre / leitura), com a aba
"Ficha da campanha", e o card ganha o ícone de visualizar.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 + React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql; Vite 6, Bootstrap 5.3, i18next, sonner,
Radix Dialog, @uiw/react-md-editor + rehype-sanitize (existentes; nada novo)
**Storage**: PostgreSQL — migration `MoveCharacterStatusToCampaign` (2 colunas novas, 1 removida,
cópia de dados)
**Testing**: xUnit + Moq + FluentAssertions (modelo `CampaignCharacter`, `CharacterService`,
`CampaignCharacterService`); Vitest (`lib/characterForm.ts`, novo `lib/campaignCharacterForm.ts`);
quickstart com duas contas
**Target Platform**: navegadores desktop atuais; API Linux/Docker
**Project Type**: web app (`backend/` + `frontend/`)
**Performance Goals**: o polling do painel (15 s) não carrega fichas — a ficha só vem no detalhe,
ao abrir o modal (research R3)
**Constraints**: ficha ≤ 20 000 caracteres, status ≤ 260 (mesmos limites de hoje); renderização da
ficha sempre sanitizada
**Scale/Scope**: 1 migration; 2 DTOs novos + 3 alterados; 2 endpoints novos, 1 removido, 2 com
permissão reduzida; modal existente com modos + card com ícone de visualizar

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Colunas/migration/DTOs/serviço pela `dotnet-architecture` (Fluent API inline no `Roll6Context`, `dotnet ef migrations add`); frontend estende Types → Services → `CharacterContext` pelo padrão `react-architecture` | ✅ |
| II | Stack fixa | Nenhuma dependência nova; Context API; Fetch | ✅ |
| III | Casing de diretórios | Só pastas existentes (`Contexts/`, `Services/`, `types/`, `lib/`, `components/`) | ✅ |
| IV | Convenções de código | PascalCase/_camelCase/file-scoped; `[JsonPropertyName]` nos DTOs; `interface`, arrow functions, sem `enum` | ✅ |
| V | Banco | `character_status varchar(260)`, `sheet varchar(20000)` snake_case, nulláveis; nenhuma FK nova | ✅ |
| VI | Autenticação e segurança | Permissões no service: personagem só dono; participação dono ou mestre (Approved); detalhe mestre/participante aprovado/dono; `[Authorize]` já nos controllers; ficha sanitizada no preview | ✅ |
| VII | Grid hexagonal | Não afetado | ➖ N/A |
| — | Respostas / erros | DTO direto; 400 (`DomainValidationException`), 403, 404, 409 (`ConflictException`) | ✅ |

Re-check pós-design: sem violações; nada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/010-campaign-character-sheet/
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
├── Roll6.DTO/
│   ├── Character/CharacterInfo.cs, CharacterInsertInfo.cs          # − status
│   └── CampaignCharacter/
│       ├── CampaignCharacterInfo.cs          # + characterStatus, characterMove
│       ├── CampaignCharacterDetailInfo.cs    # novo: Info + sheet
│       ├── CampaignCharacterUpdateInfo.cs    # novo: currentLife, currentEnergy, characterStatus, sheet
│       └── CampaignCharacterVitalsInfo.cs    # removido
├── Roll6.Domain/
│   ├── Models/Character.cs                   # − Status
│   ├── Models/CampaignCharacter.cs           # + CharacterStatus, Sheet; entradas recebem Character; UpdatePlay
│   ├── Interfaces/ICharacterService.cs, ICampaignCharacterService.cs
│   └── Services/CharacterService.cs          # leitura/edição só dono
│       CampaignCharacterService.cs           # GetByIdAsync, UpdateAsync (substitui UpdateVitalsAsync)
├── Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs  # − IsApprovedInCampaignOfAsync
├── Roll6.Infra/
│   ├── Context/Roll6Context.cs               # colunas novas / removida
│   ├── Repository/CampaignCharacterRepository.cs
│   └── Migrations/<ts>_MoveCharacterStatusToCampaign.cs
├── Roll6.API/Controllers/CampaignCharacterController.cs   # GET {id}, PUT {id}; − PUT {id}/vitals
└── Roll6.Tests/Domain/{Models,Services}/…     # ajustes + casos novos

frontend/src/
├── types/character.ts, types/campaignCharacter.ts          # − status; + characterStatus/characterMove, Detail, Update
├── Services/campaignCharacterService.ts                    # getById, update (substitui updateVitals)
├── Contexts/CharacterContext.tsx                           # getParticipation, updateParticipation
├── lib/characterForm.ts (+ test)                           # − status
├── lib/campaignCharacterForm.ts (+ test)                   # novo: modo de acesso, validação da área da campanha
├── components/ui/MarkdownView.tsx                          # novo: ficha só leitura (sanitizada, lazy)
├── components/modals/CharacterFormModal.tsx                # modos owner/master/viewer, aba "Ficha da campanha"
├── components/map/PartyPanel.tsx, PartyCard.tsx            # ícone editar × visualizar
├── pages/MainPage.tsx                                      # passa o alvo com o modo
└── i18n/locales/pt-BR.json
```

**Structure Decision**: web app existente (`backend/` + `frontend/`); nenhum projeto ou pasta nova.

## Complexity Tracking

Sem violações.
