# Implementation Plan: Tokens no Mapa

**Branch**: `011-map-tokens-placement` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-map-tokens-placement/spec.md`

## Summary

O frontend passa a mostrar os tokens do mapa da campanha, destaca em azul claro o hex sob o mouse e
deixa o mestre colocar peças: arrastando o card de um personagem do painel (token do personagem, ou
modal de tokens quando ele não tem um, gravando o escolhido no personagem) ou pelo menu do hex
("Incluir token" / "Alterar token"). O modal de tokens tem as abas "Buscar tokens" (grade de 3
colunas) e "Incluir token" (cadastro).

Backend: `characters.token_id` (opcional) e `map_tokens.campaign_character_id` (opcional, único por
mapa, obrigatório só no tipo Character); o token do mapa de personagem lê nome/vida/energia/status/
ficha/movimento da participação; `POST /api/maptoken/character` coloca um personagem (e grava o token
no personagem quando ele não tem); `PUT /api/maptoken/{id}/position` e `PUT /api/maptoken/{id}/token`;
hex ocupado → 409; token em uso por personagem não pode ser excluído; remover participação/personagem
remove antes os tokens do mapa ligados. Matemática pixel→hex (`pixelToHex` com `hexRound`) no
`lib/hexGrid.ts` e espelhada em `HexGrid.cs`.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 + React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql; Vite 6, Bootstrap 5.3, i18next, sonner,
Radix Dialog, react-easy-crop (existentes; nada novo). Arraste com HTML5 Drag and Drop nativo.
**Storage**: PostgreSQL — migration `AddCharacterTokenAndMapTokenParticipation` (2 colunas + 2 FKs +
1 índice único filtrado)
**Testing**: xUnit + Moq + FluentAssertions (modelos `MapToken`/`Character`, `MapTokenService`,
`TokenLibraryService`, `CharacterService`, `CampaignCharacterService`, `HexGrid.PixelToHex`); Vitest
(`lib/hexGrid.ts` com valores de referência compartilhados, `lib/mapTokens.ts`)
**Target Platform**: navegadores desktop atuais; API Linux/Docker
**Project Type**: web app (`backend/` + `frontend/`)
**Performance Goals**: destaque do hex a cada `pointermove` sem re-render do mapa inteiro (camada
própria, só um `<path>`); tokens carregados uma vez por mapa aberto
**Constraints**: hex math pelo guia Red Blob (Princípio VII): pixel→hex com hex fracionário +
arredondamento cúbico; nada de `q`/`r` persistido; FKs `ClientSetNull`
**Scale/Scope**: 1 migration; 3 endpoints novos + 2 alterados; 2 entidades novas no frontend
(`token`, `mapToken`) com Types/Service/Context/Hook; 3 componentes de mapa, 1 modal com 2 abas, 1 menu

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Backend pela `dotnet-architecture` (colunas/FKs inline no `Roll6Context`, `dotnet ef migrations add`, DTOs `Info`/`InsertInfo`); frontend: `token` e `mapToken` criados pela `react-architecture` (Types → Services → Contexts → hooks → provider no `main.tsx`), ajustada à constituição (DTO direto, sem envelope) | ✅ |
| II | Stack fixa | Nenhuma dependência nova; Fetch; Context API; drag and drop nativo | ✅ |
| III | Casing | `Contexts/TokenContext.tsx`, `Contexts/MapTokenContext.tsx`, `Services/tokenService.ts`, `Services/mapTokenService.ts`, `hooks/useToken.ts`, `hooks/useMapToken.ts`, `types/token.ts`, `types/mapToken.ts` | ✅ |
| IV | Convenções | `[JsonPropertyName]`; `interface`, arrow functions, constantes em vez de `enum` (`MAP_TOKEN_TYPE`) | ✅ |
| V | Banco | `token_id`/`campaign_character_id` snake_case, `bigint` nulláveis; FKs `fk_token_character`, `fk_campaign_character_map_token` com `ClientSetNull`; exclusões feitas antes no service | ✅ |
| VI | Segurança | Escrita em tokens do mapa só do mestre (dono do mapa); gravar token no personagem só quando ele não tem (exceção documentada na spec FR-001); `[Authorize]` nos controllers | ✅ |
| VII | Grid hexagonal | `pixelToHex` = pixel → hex fracionário (inverso do layout flat-top) → `hexRound` cúbico → offset odd-q; espelhado 1:1 em `HexGrid.cs`; posições gravadas como `x`/`y` | ✅ |
| — | Respostas / erros | DTO direto; 400/403/404/409 via exceções de domínio | ✅ |

Re-check pós-design: sem violações; nada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-map-tokens-placement/
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
│   ├── Character/CharacterInfo.cs, CharacterInsertInfo.cs     # + tokenId (+ tokenName, tokenImageUrl no Info)
│   ├── CampaignCharacter/CampaignCharacterInfo.cs              # + characterTokenId
│   └── MapToken/
│       ├── MapTokenInfo.cs                                     # + campaignCharacterId, characterId
│       ├── MapTokenCharacterInsertInfo.cs                      # novo: mapId, campaignCharacterId, tokenId?, x, y
│       ├── MapTokenPositionInfo.cs                             # novo: x, y
│       └── MapTokenTokenInfo.cs                                # novo: tokenId
├── Roll6.Domain/
│   ├── Grid/HexGrid.cs                                         # + PixelToHex, HexRound
│   ├── Models/Character.cs                                     # + TokenId, AssignTokenIfMissing
│   ├── Models/MapToken.cs                                      # + CampaignCharacterId, PlaceCharacter, ChangeToken
│   ├── Interfaces/IMapTokenService.cs
│   └── Services/MapTokenService.cs, TokenLibraryService.cs, CharacterService.cs, CampaignCharacterService.cs
├── Roll6.Infra.Interfaces/Repository/                          # IMapTokenRepository, ICharacterRepository (+ métodos)
├── Roll6.Infra/Context/Roll6Context.cs, Repository/*, Migrations/<ts>_AddCharacterTokenAndMapTokenParticipation.cs
├── Roll6.API/Controllers/MapTokenController.cs                 # POST character, PUT position, PUT token
└── Roll6.Tests/Domain/…

frontend/src/
├── lib/hexGrid.ts (+ test)                                     # pixelToHex, hexRound, isInsideGrid
├── lib/mapTokens.ts (+ test)                                   # tokenAt, tokenOfParticipation, characterDropAction
├── types/token.ts, types/mapToken.ts
├── Services/tokenService.ts, Services/mapTokenService.ts
├── Contexts/TokenContext.tsx, Contexts/MapTokenContext.tsx
├── hooks/useToken.ts, hooks/useMapToken.ts, hooks/useMapPointer.ts
├── components/map/TokenLayer.tsx, HexHighlight.tsx, HexMenu.tsx, MapCanvas.tsx, PartyCard.tsx, PartyPanel.tsx
├── components/modals/TokenModal.tsx, CharacterFormModal.tsx
├── pages/MainPage.tsx, main.tsx, styles/app.css
└── i18n/locales/pt-BR.json
```

**Structure Decision**: web app existente; nenhuma pasta nova.

## Complexity Tracking

Sem violações.
