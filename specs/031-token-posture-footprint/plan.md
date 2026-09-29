# Implementation Plan: Postura das peças e tokens de vários hexes

**Branch**: `031-token-posture-footprint` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/031-token-posture-footprint/spec.md`

## Summary

Duas mudanças ligadas:

1. **Postura** (`Posture`: 1 Em pé, 2 Caído, 3 Fora de combate) guardada na participação (`campaign_characters.posture`)
   e na ocorrência de NPC (`map_npcs.posture`), lida pelas peças como vida/status. Alterável pelo dono ou mestre
   (NPC: mestre) por um endpoint novo da peça (`PUT /api/maptoken/{id}/posture`, usado pelo menu da peça), pelos
   `PUT` de participação/ocorrência, pelo processamento de turno e pelo MCP (`set_piece_posture` + parâmetros).
   Registrada no log do turno (`CharacterUpdate`, campo `posture`) e enviada em tempo real pelos eventos existentes.
2. **Formatos** de 1, 2, 3, 7 e 10 hexes a partir dos campos já existentes do token (`up_space`, `down_space`, agora
   restritos a esses valores); a postura escolhe o tamanho vigente. `HexGrid.Footprint` (C#) / `footprint` (TS),
   espelhados com casos de referência compartilhados, e uma `Occupancy` pura passam a valer para colocar, mover (BFS
   com o formato inteiro em cada giro/passo), clicar, destacar, arrastar, resetar turno e processar turno. Mudança de
   postura nunca é recusada por falta de espaço (Q2).

O desenho (`TokenLayer` e `mapSnapshot`) usa o formato em coordenadas locais de look 3 girado pela direção, imagem
deitada (ou em pé virada 90°) e preto e branco para "Fora de combate".

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), ModelContextProtocol.AspNetCore 2.x (020); React, Bootstrap 5, i18next, sonner, Radix Dropdown/Dialog — nenhuma dependência nova
**Storage**: PostgreSQL — `campaign_characters.posture`, `map_npcs.posture` (`integer not null default 1`); normalização de `tokens.up_space`/`down_space`; 1 migração + `database/migrations/031-posture-footprint.sql`
**Testing**: xUnit + Moq + FluentAssertions (`HexGridTests`, `OccupancyTests` novo, `MapTokenServiceTests`, `CampaignCharacterServiceTests`, `MapNpcServiceTests`, `TurnServiceTests`, `TokenLibraryServiceTests`, `TurnSummaryTests`, `Mcp/*`); Vitest (`hexGrid.test.ts`, `occupancy.test.ts` novo, `mapTokens.test.ts`, `movement.test.ts`, `tokenForm.test.ts`, `turnStatus`/cards se aplicável)
**Target Platform**: containers Linux (`roll6-api`, `roll6-mcp`) + SPA
**Project Type**: web (backend + frontend) + gateway MCP
**Performance Goals**: ocupação calculada em memória por mapa (dezenas de peças); BFS de movimento com checagem de até 10 hexes por estado continua instantânea em grids de até ~100×100
**Constraints**: matemática só em `HexGrid.cs` ⇄ `lib/hexGrid.ts` (Princípio VII, mesmos casos de referência); posições continuam `x`/`y`; `ConflictException` para hex ocupado; sem Cascade; sem `enum` no TS
**Scale/Scope**: 1 endpoint novo + 5 alterados; 1 ferramenta MCP nova + ~8 descrições; 2 colunas; ~8 componentes frontend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Sem entidade nova; enum, colunas, DTOs e partial `MapTokenService.Posture.cs` seguem o padrão `dotnet-architecture` (DTO `Info`, mapeamento manual, config inline no `Roll6Context`). Frontend sem entidade nova (só serviço/contexto existentes ganham `setPosture`). ✅ |
| II. Stack fixa | Nada novo; Fetch nos serviços; Context API. Sem Docker local. ✅ |
| III. Casing | Arquivos novos em `src/lib/` e `components/map/`; imports com casing exato. ✅ |
| IV. Convenções | `[JsonPropertyName]` camelCase; `POSTURE` como constante (`erasableSyntaxOnly`); `interface`. ✅ |
| V. Banco | snake_case, `integer` com default 1 para enum, sem FK nova, sem cascade; migração + script incremental. ✅ |
| VI. Segurança | Endpoint novo em controller `[Authorize]`; permissão no serviço (dono/mestre; NPC mestre). ✅ |
| VII. Grid hexagonal | Formatos calculados em axial a partir de `x`/`y`, sem persistir q/r; módulo puro espelhado 1:1 com casos de referência; nada novo persistido além da postura. ✅ |

**Resultado**: sem violações. Re-check pós-design (data-model/contracts): continua ✅.

## Project Structure

### Documentation (this feature)

```text
specs/031-token-posture-footprint/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   ├── mcp.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/
│   ├── MapToken/MapTokenInfo.cs                 # + posture, space
│   ├── MapToken/MapTokenPostureInfo.cs          # novo
│   ├── CampaignCharacter/*Info.cs               # + posture (info/detail/update)
│   ├── MapNpc/MapNpcInfo.cs, MapNpcUpdateInfo.cs# + posture
│   └── Turn/TurnProcessInfo.cs, TurnDataInfo.cs # + posture
├── Roll6.Domain/
│   ├── Enums/Posture.cs                         # novo
│   ├── Grid/HexGrid.cs                          # ALLOWED_SPACES, Footprint, MovementCost(space)
│   ├── Grid/Occupancy.cs                        # novo, puro
│   ├── Validation/Guard.cs                      # TokenSpace
│   ├── Models/Token.cs                          # validação + SpaceFor
│   ├── Models/CampaignCharacter.cs, MapNpc.cs   # Posture, ChangePosture, reset
│   ├── Turns/TurnSummary.cs                     # rótulo/valores de postura
│   └── Services/
│       ├── MapTokenService.cs                   # ocupação por formato em criar/colocar/atualizar/mover; DTO
│       ├── MapTokenService.Posture.cs           # novo partial: SetPostureAsync
│       ├── MapOccupancy (helper de carga)        # peças + tokens + posturas → Occupancy (usado pelos serviços abaixo)
│       ├── CampaignCharacterService.cs          # posture no UpdateAsync/Diff
│       ├── MapNpcService.cs                     # posture no UpdateAsync/Diff; CreateAsync com formato
│       ├── TurnService.cs                       # reset com formato
│       └── TurnService.Processing.cs            # posture no lote; posições com formato
├── Roll6.Infra/
│   ├── Context/Roll6Context.cs                  # colunas posture
│   ├── Repository/MapTokenRepository.cs         # remove ExistsAtAsync
│   └── Migrations/*AddPostureAndTokenSpaces*    # + normalização
├── Roll6.API/Controllers/MapTokenController.cs  # PUT {id}/posture
├── Roll6.Mcp/Tools/{MapTokenTools,ParticipationTools,MapNpcTools,TurnTools,TokenTools}.cs, Roll6Guide.cs
└── Roll6.Tests/                                 # Grid/HexGridTests, Grid/OccupancyTests, serviços, Mcp counts 86/87
database/
├── migrations/031-posture-footprint.sql
└── roll6.sql                                    # regenerado

frontend/src/
├── types/mapToken.ts, token.ts, campaignCharacter.ts, npc.ts  # POSTURE, posture, space
├── lib/hexGrid.ts                               # ALLOWED_SPACES, footprint, footprintLocal, movementField(space)
├── lib/occupancy.ts                             # novo
├── lib/mapTokens.ts                             # tokenAt por formato; drop actions com tamanho
├── lib/movement.ts, hooks/useTokenMovement.ts   # tamanho no campo/preview
├── lib/tokenForm.ts, components/tokens/TokenFormFields.tsx   # selects 1/2/3/7/10
├── lib/mapSnapshot.ts                           # formato, deitada, cinza por pixel
├── Services/mapTokenService.ts, Contexts/MapTokenContext.tsx # setPosture
├── components/map/{TokenLayer,HexMenu,HexHighlight,MovementLayer,MapCanvas,PartyCard,NpcCard}.tsx
├── components/characters/CharacterFormModal (área "Nesta campanha") # select Postura
└── i18n/locales/pt-BR.json                      # posture.*, tokens.spaceOptions, tokens.doesNotFit
```

**Structure Decision**: backend existente (`backend/`, camadas DTO → Infra.Interfaces → Domain → Infra → API +
`Roll6.Mcp`) e frontend existente (`frontend/src`). A matemática nova fica só em `HexGrid.cs`/`Occupancy.cs` e no
espelho `lib/hexGrid.ts`/`lib/occupancy.ts`. `CLAUDE.md` ganha linhas nas seções de peças/movimento/MCP; `docs/` é do
`analyst`.

## Complexity Tracking

Sem violações a justificar.
