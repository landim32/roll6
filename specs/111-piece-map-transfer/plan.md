# Implementation Plan: Mudar peça de mapa

**Branch**: `111-piece-map-transfer` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/111-piece-map-transfer/spec.md`

## Summary

O mestre escolhe **"Mudar de mapa"** no menu de uma peça de personagem ou NPC (2D e isométrica), escolhe um mapa ativo
da campanha numa janela, e a **mesma** peça (e, no NPC, a mesma instância) passa para esse mapa no mesmo hex e direção —
ou no hex livre mais próximo quando a forma não cabe ali. Backend: rota nova `PUT /api/maptoken/{id}/map` em
`MapTokenService.ChangeMap.cs` (sem tabela nova), busca pura `Occupancy.NearestFree`, eventos já existentes
(`mapToken.deleted`/`upserted`, `character.map`, `mapTokens.changed`) e a ferramenta MCP `change_piece_map`. Frontend:
item no `HexMenu` via `MapHexMenu`/`useMapInteraction`, `ChangeMapModal`, `mapTokenService.changeMap` +
`MapTokenContext.changeMap`, toasts com "Abrir mapa".

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 + React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR, `ModelContextProtocol.AspNetCore` 2.x; Vite 6,
Bootstrap 5.3, i18next, sonner, `@radix-ui/react-dialog` — nada novo
**Storage**: PostgreSQL — sem tabela, coluna ou migração nova (atualiza `map_tokens` e `map_npcs`)
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`: `OccupancyTests`, `MapTokenServiceChangeMapTests`,
`MapTokenTests`, `MapNpcTests`, MCP coverage/parity/description); Vitest (`lib/mapInteraction`, `keys.test.ts`)
**Target Platform**: API Linux (Docker) + SPA em navegadores desktop/celular
**Project Type**: web (backend `backend/`, frontend `frontend/`)
**Performance Goals**: uma requisição, uma transação; a busca do hex livre percorre no máximo `grid_width × grid_height`
hexes (mesma ordem de `FirstFree`); peça visível no destino para os outros em ≤ 2 s (SC-004)
**Constraints**: só o mestre; mesmas regras de status/arquivamento da 108; nada gravado no turno; ids preservados
**Scale/Scope**: 1 rota, 1 ferramenta MCP, 1 modal, ~8 chaves i18n

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Nenhuma entidade nova. Métodos novos seguem os padrões existentes (`dotnet-architecture` para DTOs `MapTokenMapInfo`/`MapTokenMapResultInfo`, serviço e controller); modal pela skill `react-modal`, toasts `react-alert`; nenhum Context/Provider novo (só um método em `MapTokenContext`). ✅ |
| II. Stack fixa | Sem dependência nova; Fetch API no serviço; Context API. ✅ |
| III. Casing | Arquivos em `Services/`, `Contexts/`, `hooks/`, `types/` existentes; `components/modals/ChangeMapModal.tsx`. ✅ |
| IV. Convenções | `[JsonPropertyName]` nos DTOs; DTO direto / `ProblemDetails`; `interface`, sem `enum`. ✅ |
| V. Banco | Sem mudança de esquema. ✅ |
| VI. Segurança | `[Authorize]` no `MapTokenController`; o serviço confere o mestre pelo `sub` do JWT; destino de outra campanha → 404. ✅ |
| VII. Grid | Posição continua `x`/`y` odd-q; `NearestFree` usa a distância cúbica de `HexGrid.OffsetToAxial` no módulo puro `Domain/Grid/Occupancy`; forma por `HexGrid.Footprint`. Não há espelho de `FirstFree` no TS, logo nada a espelhar. ✅ |

**Pós-design**: reavaliado após research/data-model/contracts — sem violações; *Complexity Tracking* vazio.

## Project Structure

### Documentation (this feature)

```text
specs/111-piece-map-transfer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── change-piece-map.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.DTO/MapToken/
│   ├── MapTokenMapInfo.cs                 # novo { mapId }
│   └── MapTokenMapResultInfo.cs           # novo { mapToken, fromMapId, adjusted }
├── Roll6.Domain/
│   ├── Grid/Occupancy.cs                  # NearestFree(x, y, …); FirstFree delega
│   ├── Services/MapOccupancyLoader.cs     # MapLayout.NearestFree(x, y, look, space)
│   ├── Models/MapToken.cs                 # MoveToMap(mapId, x, y, name?)
│   ├── Models/MapNpc.cs                   # MoveToMap(mapId, name)
│   ├── Interfaces/IMapTokenService.cs     # ChangeMapAsync
│   └── Services/MapTokenService.ChangeMap.cs  # novo (partial)
├── Roll6.API/Controllers/MapTokenController.cs   # PUT {id}/map
├── Roll6.Mcp/Tools/MapTokenTools.cs              # change_piece_map
├── Roll6.Mcp/Roll6Guide.cs                       # seção de peças/mapas
└── Roll6.Tests/
    ├── Domain/Grid/OccupancyTests.cs
    ├── Domain/Models/MapTokenTests.cs, MapNpcTests.cs
    ├── Domain/Services/MapTokenServiceChangeMapTests.cs   # novo
    └── Mcp/McpCoverageTests.cs (contagens)

frontend/src/
├── types/mapToken.ts                     # MapTokenMapResultInfo
├── Services/mapTokenService.ts           # changeMap
├── Contexts/MapTokenContext.tsx          # changeMap
├── lib/mapInteraction.ts (+ .test.ts)    # canChangeMap
├── hooks/useMapInteraction.ts            # onChangeMap nas props
├── components/map/HexMenu.tsx, MapHexMenu.tsx   # item "Mudar de mapa"
├── components/modals/ChangeMapModal.tsx  # novo
├── components/ui/icons.tsx               # ícone (Bootstrap Icons)
├── pages/MainPage.tsx                    # estado + modal + toast "Abrir mapa"
└── i18n/locales/pt-BR.json
```

**Structure Decision**: aplicação web existente (`backend/` + `frontend/`); a feature acrescenta um caso de uso ao serviço
de peças (partial `MapTokenService`) e um modal à mesa, sem novos projetos.

## Design notes

- **Fluxo do serviço** (`ChangeMapAsync(userId, mapTokenId, MapTokenMapInfo)`): carrega peça → origem → campanha
  (mestre, `EnsureMapEditable(true)`) → tipo (personagem/NPC) → destino (mesma campanha, ativo, ≠ origem) → layout do
  destino (`_occupancy.LoadAsync(target)`), espaço da peça pela postura atual (`layout.SpaceOf(piece)` — calculado com o
  layout da origem se o do destino não conhecer a peça; usar `MapOccupancyLoader.PieceSpace(token, posture)`) → posição
  (`Fits` ou `NearestFree`, 409) → NPC: nome final por `MapNpc.NextName` só se repetido → transação (`map_npcs` +
  `map_tokens`) → eventos (contrato).
- **Personagem não usa `TransferTo`** (que vira a peça para cima, regra da 108 para o arrasto do card): `MoveToMap`
  mantém `look`.
- **MCP**: toda rota nova precisa de ferramenta (020) — `McpCoverageTests`/`McpRouteParityTests`/`McpDescriptionTests`.
- **CLAUDE.md**: acrescentar ao bloco "Character pieces"/NPCs a rota e a regra (feito na implementação).
- **Commit**: `feat: mudar personagem/NPC de mapa pelo menu da peça (111)`.

## Complexity Tracking

Sem violações.
