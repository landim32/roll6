# Implementation Plan: Movimentação de Tokens

**Branch**: `015-token-movement` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-token-movement/spec.md`

## Summary

Movimentação de peças com custo: 1 ponto por passo para o hex vizinho à frente e 1 ponto por giro de
60°. O caminho mínimo é uma busca em largura (BFS, "Movement range"/pathfinding do guia Red Blob) sobre
estados (hex, sentido), com os vizinhos axiais do guia, contornando peças e respeitando a grid. A mesma
matemática fica no módulo puro `lib/hexGrid.ts` e é espelhada 1:1 em `HexGrid.cs`, onde o backend valida
o custo quando quem move é um jogador. Na tela: item **Mover** no menu da peça, contador "gasto/total" no
canto inferior direito, rastro verde/vermelho (cinza para objetos), primeiro clique leva ao destino e
entra no modo de sentido, segundo clique grava posição e sentido (`PUT /api/maptoken/{id}/position` com
`look`). Peças passam a ser desenhadas giradas conforme o sentido.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 + React 18 (frontend)
**Primary Dependencies**: existentes; nada novo
**Storage**: sem mudança de schema (`map_tokens.x`, `y`, `look` já existem)
**Testing**: xUnit (`HexGrid` pathfinding com valores de referência compartilhados; `MapTokenService`
permissões/custo); Vitest (`lib/hexGrid.ts` com os mesmos valores; `lib/movement.ts` estado do modo)
**Target Platform**: navegadores desktop atuais; API Linux/Docker
**Project Type**: web app (`backend/` + `frontend/`)
**Performance Goals**: BFS calculado uma vez ao entrar no modo Mover (≤ 50 × 50 × 6 = 15 000 estados);
cada `pointermove` só reconstrói o caminho pelo mapa de pais (SC-002)
**Constraints**: Princípio VII — distâncias/vizinhos pelo guia (axial), posições gravadas como `x`/`y`
odd-q, sentido 0–5 horário a partir do topo; mesma função nos dois lados
**Scale/Scope**: funções de hex puras (~6) nos dois lados; 1 endpoint alterado; 1 hook de estado, 2
componentes de mapa, ajustes em `MapCanvas`, `HexMenu`, `TokenLayer`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Sem entidades novas; extensões seguem os padrões existentes (service + DTO no backend, hook/context no frontend) | ✅ |
| II | Stack fixa | Nada novo | ✅ |
| III | Casing | `hooks/useTokenMovement.ts`, `lib/movement.ts`, `components/map/*` | ✅ |
| IV | Convenções | `interface`, arrow functions, constantes; `[JsonPropertyName]` | ✅ |
| V | Banco | Sem alteração | ➖ N/A |
| VI | Segurança | Jogador só move peça do próprio personagem e o backend recalcula o custo (não confia no cliente); objetos e NPCs só pelo mestre | ✅ |
| VII | Grid hexagonal | Direções axiais e BFS do guia em `lib/hexGrid.ts`, espelhadas em `HexGrid.cs` com os mesmos casos de referência; gravação em `x`/`y` | ✅ |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/015-token-movement/
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
├── Roll6.Domain/Grid/HexGrid.cs                    # LookDirections, Neighbor, TurnCost, MovementCost (BFS)
├── Roll6.DTO/MapToken/MapTokenPositionInfo.cs      # + look
├── Roll6.Domain/Services/MapTokenService.cs        # MoveAsync: dono do personagem + custo; look
└── Roll6.Tests/Domain/{Grid,Services}/…

frontend/src/
├── lib/hexGrid.ts (+ test)                         # LOOK_DIRECTIONS, neighbor, turnCost, movementField, pathTo, lookToward
├── lib/movement.ts (+ test)                        # estado do modo Mover (fases, custo, cor, permissões)
├── hooks/useTokenMovement.ts                       # liga o estado ao mapa (BFS, preview, confirmar/cancelar)
├── components/map/MovementLayer.tsx                # rastro + hex de destino
├── components/map/MovementCounter.tsx              # contador "gasto/total"
├── components/map/TokenLayer.tsx                   # peça girada pelo sentido + marca de frente; preview
├── components/map/HexMenu.tsx, MapCanvas.tsx       # item Mover; menu do jogador; cliques/Esc no modo
├── Services/mapTokenService.ts, Contexts/MapTokenContext.tsx  # move com look
├── pages/MainPage.tsx, styles/app.css, i18n/locales/pt-BR.json
```

**Structure Decision**: web app existente; nenhuma pasta nova.

## Complexity Tracking

Sem violações.
