# Implementation Plan: Cards dos Personagens da Campanha

**Branch**: `009-campaign-character-cards` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-campaign-character-cards/spec.md`

## Summary

Painel fixo e recolhível à esquerda do mapa com um card por personagem aprovado (foto redonda, nome,
barras de vida/energia "atual/total"), atualizado a cada 15 s. O lápis (mestre em todos, dono nos
seus) abre o modal de cadastro da 008 em modo edição, com o bloco "Nesta campanha" para vida/energia
atuais. Backend: colunas `current_life`/`current_energy` em `campaign_characters` (migration que
inicia com os totais), totais ≥ 0 no personagem, reinício dos atuais ao entrar na campanha, clamp ao
reduzir totais, edição do personagem também pelo mestre de uma campanha em que está aprovado e
`PUT /api/campaigncharacter/{id}/vitals`.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 + React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql; Vite 6, Bootstrap 5.3, i18next, sonner,
Radix Dialog/Dropdown, react-easy-crop, @uiw/react-md-editor (existentes; nada novo)
**Storage**: PostgreSQL — 2 colunas novas (migration `AddCampaignCharacterVitals`); localStorage para
o painel recolhido
**Testing**: xUnit + Moq + FluentAssertions (modelo/services); Vitest (`lib/vitals.ts`); quickstart
com duas contas
**Target Platform**: navegadores desktop atuais; API Linux/Docker
**Project Type**: web app (`backend/` + `frontend/`)
**Performance Goals**: painel atualizado ≤ 15 s (SC-003); uma consulta por atualização (lista da
campanha já traz os totais em lote)
**Constraints**: painel ≤ 220 px de largura e sem cobrir menu/controles/rodapé (FR-004/SC-004); sem
polling com aba oculta
**Scale/Scope**: 1 migration, 1 DTO novo + 1 alterado, 1 endpoint novo + 2 com permissão ampliada;
1 painel + card + barra, modo edição no modal existente

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Colunas/migration/DTO/serviço pela `dotnet-architecture` (Fluent API inline no `Roll6Context`, `dotnet ef migrations add`); frontend estende Types → Services → `CharacterContext` pelo padrão `react-architecture` | ✅ |
| II | Stack fixa | Nenhuma dependência nova; Context API; Fetch | ✅ |
| III | Casing de diretórios | Arquivos nas pastas existentes (`Contexts/`, `Services/`, `types/`, `components/map/`) | ✅ |
| IV | Convenções de código | PascalCase/_camelCase/file-scoped; `interface`, arrow functions, sem `enum` | ✅ |
| V | Banco | `current_life`/`current_energy` snake_case, `integer NOT NULL`; nenhuma FK nova (sem cascade) | ✅ |
| VI | Autenticação e segurança | Permissões no service: dono ou mestre com personagem Approved; `DELETE` só dono; `vitals` dono ou mestre da participação; `[Authorize]` já nos controllers | ✅ |
| VII | Grid hexagonal | Não afetado | ➖ N/A |
| — | Respostas / erros | DTO direto; 400 (`DomainValidationException`), 403, 404, 409 (`ConflictException`) | ✅ |

Re-check pós-design: sem violações; nada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/009-campaign-character-cards/
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
├── Roll6.DTO/CampaignCharacter/
│   ├── CampaignCharacterInfo.cs            # + currentLife, currentEnergy, totalLife, totalEnergy
│   └── CampaignCharacterVitalsInfo.cs      # novo
├── Roll6.Domain/
│   ├── Models/Character.cs                 # life/energy ≥ 0 (totais)
│   ├── Models/CampaignCharacter.cs         # CurrentLife/CurrentEnergy, totais nas criações/aprovações, SetVitals
│   └── Services/CharacterService.cs, CampaignCharacterService.cs
├── Roll6.Infra.Interfaces/Repository/ICampaignCharacterRepository.cs  # + IsApprovedInCampaignOfAsync, ClampVitalsAsync
├── Roll6.Infra/
│   ├── Context/Roll6Context.cs # colunas novas
│   ├── Repository/CampaignCharacterRepository.cs
│   └── Migrations/<ts>_AddCampaignCharacterVitals.cs
├── Roll6.API/Controllers/CampaignCharacterController.cs  # PUT {id}/vitals
└── Roll6.Tests/Domain/…        # modelo + services

bruno/CampaignCharacter/Update vitals.bru

frontend/src/
├── types/campaignCharacter.ts
├── Services/characterService.ts (getById, update), Services/campaignCharacterService.ts (updateVitals)
├── Contexts/CharacterContext.tsx           # party + polling 15 s + ações de edição
├── lib/vitals.ts (+ .test.ts)
├── components/map/PartyPanel.tsx, PartyCard.tsx, VitalBar.tsx
├── components/ui/ImageCropper.tsx         # currentUrl (imagem atual) + remover
├── components/modals/CharacterFormModal.tsx  # modo edição
├── pages/MainPage.tsx                      # renderiza o PartyPanel
├── i18n/locales/pt-BR.json, styles/app.css
```

**Structure Decision**: web app existente. Contratos em [contracts/api.md](./contracts/api.md) e
[contracts/ui.md](./contracts/ui.md).

## Complexity Tracking

Nenhuma violação a justificar.
