# Tasks: Movimentação de Tokens

**Input**: Design documents from `/specs/015-token-movement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: a spec não pede TDD, mas a regra de custo precisa ser idêntica nos dois lados (Princípio VII):
entram testes xUnit e Vitest com os **mesmos casos de referência** do pathfinding, testes do estado do
modo (`lib/movement.ts`) e do service. O restante é verificado pelo quickstart.

**Organization**: por user story. Caminhos a partir da raiz do repositório.

## Format: `[ID] [P?] [Story] Description`

## Casos de referência (grid 5 × 5, sem obstáculos salvo indicado)

| Início `(x, y, look)` | Fim `(x, y, look)` | Custo |
|---|---|---|
| (2,2,0) | (2,2,0) | 0 |
| (2,2,0) | (2,1,0) | 1 (1 passo) |
| (2,2,0) | (2,2,3) | 3 (3 giros) |
| (2,2,0) | (3,1,1) | 2 (1 giro + 1 passo) |
| (2,2,0) | (2,3,3) | 4 (3 giros + 1 passo) |
| (2,2,0) | (2,0,0) | 2 |
| (2,2,0) com (2,1) bloqueado | (2,0,0) | > 2, caminho sem passar por (2,1) |
| (2,2,0) | fora da grid / hex bloqueado | inalcançável |

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde: `dotnet test` em `backend/`; `npm run lint` + `npm test` em `frontend/`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: matemática de sentido e caminho mínimo nos dois lados, com os mesmos casos.

- [X] T002 [P] Em `lib/hexGrid.ts`: `LOOK_DIRECTIONS` (axial, ordem de `look`: `(0,-1)`, `(1,-1)`, `(1,0)`, `(0,1)`, `(-1,1)`, `(-1,0)`), `neighbor(x, y, look): Offset`, `turnCost(from, to)` (`min(|d|, 6-|d|)`), `interface MoveState { x; y; look }`, `movementField(start, columns, rows, isBlocked: (x, y) => boolean)` (BFS: transições girar esquerda, girar direita, andar; estados dentro da grid e não bloqueados; retorna `{ dist: Map<string, number>; parent: Map<string, string> }` com chave `x,y,look`), `movementCost(field, state)` (`number | null`), `pathTo(field, state): MoveState[]` (do início ao estado), `arrivalCost(field, x, y)` (menor `dist` entre estados do hex alcançados por passo, ou 0 no hex inicial; com o estado correspondente) e `lookToward(center, point, current)` (lado mais próximo do ângulo; ponto no centro mantém `current`) — mesmo comentário de espelho do `HexGrid.cs` — em `frontend/src/lib/hexGrid.ts`
- [X] T003 [P] Espelhar em `HexGrid.cs`: `LookDirections`, `Neighbor(x, y, look)`, `TurnCost(from, to)`, `MovementCost(int fromX, int fromY, int fromLook, int toX, int toY, int toLook, int columns, int rows, Func<int, int, bool> isBlocked)` (mesma BFS; `int?` nulo se inalcançável) em `backend/Roll6.Domain/Grid/HexGrid.cs`
- [X] T004 [P] Testes Vitest com os casos de referência + `neighbor` nos 6 sentidos a partir de uma coluna par e uma ímpar, `turnCost`, `pathTo` (sequência de estados do caso (2,3,3)) e `lookToward` (pontos acima/abaixo/diagonais e no centro) em `frontend/src/lib/hexGrid.test.ts`
- [X] T005 [P] Testes xUnit com os mesmos casos de referência e `Neighbor` nos 6 sentidos em `backend/Roll6.Tests/Domain/Grid/HexGridTests.cs`
- [X] T006 [P] `TokenLayer`: girar cada peça `rotate(look*60)` em torno do centro e desenhar a marca de frente (triângulo pequeno na borda superior antes da rotação, classe `stm-map-token-front`); aceitar `preview?: { mapTokenId; x; y; look }` que substitui posição/sentido dessa peça em `frontend/src/components/map/TokenLayer.tsx`; estilo da marca em `frontend/src/styles/app.css`

**Checkpoint**: casos de referência verdes nos dois lados; peças aparecem giradas.

---

## Phase 3: User Story 1 - Traçar o caminho e ver o custo (Priority: P1) 🎯 MVP

**Goal**: modo Mover com rastro do caminho mínimo, custo e cores.

**Independent Test**: Mover numa peça com movimento 6 → contador 0/6; rastro verde até 2 hexes à frente ("2/6"); para trás soma giros; longe → vermelho; Esc cancela.

- [X] T007 [P] [US1] Criar `lib/movement.ts` (puro): tipos `MovementPhase = 'idle' | 'path' | 'facing'`, `MovementKind = 'limited' | 'free'` (objeto = `free`), `MovementState`; `startMovement(piece, total, field)`, `hoverPath(state, hex)` (custo/caminho/estado de chegada via `arrivalCost`/`pathTo`; hex inalcançável → sem caminho), `statusOf(cost, total, kind)` → `'ok' | 'over' | 'free'`, `canPickDestination(state, isMaster)` e `canConfirm(state, isMaster)` (jogador não avança com `over`) em `frontend/src/lib/movement.ts`
- [X] T008 [P] [US1] Testes do estado: início em 0/total; hover recalcula custo/status; objeto sempre `free`; jogador não avança com `over`, mestre sim; hex inalcançável sem caminho em `frontend/src/lib/movement.test.ts`
- [X] T009 [US1] Criar `hooks/useTokenMovement.ts`: guarda o `MovementState`; `start(piece)` calcula o `movementField` uma vez (grid do `draft`, peças atuais exceto a movida como bloqueios) com o total = `piece.move` (objetos: `free`); `hover(hex)`; `cancel()`; expõe `preview` (peça no início virada para o 1º passo do caminho) e `trail` (estados do caminho, status); cancela ao trocar de mapa em `frontend/src/hooks/useTokenMovement.ts`
- [X] T010 [P] [US1] Criar `MovementLayer` (`{ trail: MoveState[]; destination: Offset | null; status }`): `polyline` pelos centros (`hexCenter`) e hex de destino (`hexPath`) com classes `stm-move-trail is-{status}` / `stm-move-target is-{status}`, `pointer-events: none` em `frontend/src/components/map/MovementLayer.tsx`
- [X] T011 [P] [US1] Criar `MovementCounter` (`{ spent; total; status }`): caixa fixa no canto inferior direito, à esquerda dos controles, "spent/total" em verde/vermelho, rótulo `movement.counter` e dica `movement.hint` em `frontend/src/components/map/MovementCounter.tsx`
- [X] T012 [US1] `HexMenu`: item **Mover** (ícone de setas) via prop `onMove?`; o menu pode abrir só com Mover (`canManage=false` esconde Incluir/Alterar/Excluir) em `frontend/src/components/map/HexMenu.tsx`
- [X] T013 [US1] `MapCanvas`: menu da peça — mestre como hoje + Mover; jogador (sem `canPlace`) abre o menu só ao clicar numa peça de personagem cujo `campaignCharacterId` é de um personagem dele (`CharacterContext.party`/`myParticipations`), só com Mover; com o modo ativo: `pointermove` → `hover`, `contextmenu` e Esc → `cancel`, pan continua funcionando e o menu não abre; renderizar `<MovementLayer>` sobre o destaque e passar `preview` ao `TokenLayer`; `<MovementCounter>` fora do SVG quando `kind === 'limited'` em `frontend/src/components/map/MapCanvas.tsx`
- [X] T014 [P] [US1] Estilos: `.stm-move-trail` (`fill: none; stroke-width: 6; stroke-linecap: round; vector-effect: non-scaling-stroke`), cores `is-ok` verde, `is-over` vermelho, `is-free` cinza (traço e preenchimento translúcidos), `.stm-move-counter` (posição absoluta `right: calc(1rem + 48px + 12px)`, `bottom: calc(var(--stm-footer-height) + 1rem)`, fundo escuro translúcido, fonte grande tabular) em `frontend/src/styles/app.css`
- [X] T015 [P] [US1] Textos `hexMenu.move`, `movement.counter`, `movement.hint`, `movement.overLimit`, `movement.unreachable` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: quickstart passos 1, 2 (sem confirmar), 4 e 6.

---

## Phase 4: User Story 2 - Confirmar destino e sentido (Priority: P1)

**Goal**: 1º clique → destino e modo de sentido; 2º clique → grava posição e sentido.

**Independent Test**: mover 2 hexes (2/6), clicar, apontar para trás (5/6), clicar; recarregar e ver posição/sentido gravados.

- [X] T016 [US2] Backend: `MapTokenPositionInfo` ganha `Look` (`int?`, `[JsonPropertyName("look")]`); `MoveAsync` valida `look` 0–5 (400) e grava `MoveTo(x, y)` + `Look` em `backend/Roll6.DTO/MapToken/MapTokenPositionInfo.cs` e `backend/Roll6.Domain/Services/MapTokenService.cs` (`MapToken.Face(int look)` com a validação em `backend/Roll6.Domain/Models/MapToken.cs`)
- [X] T017 [US2] Frontend: `MapTokenPositionInfo.look` em `frontend/src/types/mapToken.ts`; `MapTokenContext.moveToken(id, x, y, look?)` envia o sentido em `frontend/src/Contexts/MapTokenContext.tsx`
- [X] T018 [US2] `lib/movement.ts`: `pickDestination(state)` (vai para `facing` com destino e sentido de chegada), `pointFacing(state, look)` (custo = `movementCost(field, {destino, look})`, status) + testes em `frontend/src/lib/movement.ts` e `frontend/src/lib/movement.test.ts`
- [X] T019 [US2] `useTokenMovement`/`MapCanvas`: no modo `path`, clique num hex alcançável → `pickDestination` (jogador com `over` → toast `movement.overLimit`; inalcançável → toast `movement.unreachable`); no modo `facing`, `pointermove` → `lookToward(hexCenter(destino), ponto do mouse)` → `pointFacing`; clique → `canConfirm` → `moveToken(id, x, y, look)` → toast `toast.tokenMoved` → `idle`; erro → toast e mantém o modo em `frontend/src/hooks/useTokenMovement.ts` e `frontend/src/components/map/MapCanvas.tsx`
- [X] T020 [P] [US2] Texto `toast.tokenMoved` em `frontend/src/i18n/locales/pt-BR.json`
- [X] T021 [P] [US2] Testes: `MoveAsync` grava `look`; `look` 6 → 400 em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`

**Checkpoint**: quickstart passo 3.

---

## Phase 5: User Story 3 - Quem pode mover e com qual limite (Priority: P1)

**Goal**: jogador move só os próprios personagens, sem passar do movimento (validado no servidor); mestre sem limite.

**Independent Test**: jogador não vê menu em NPC/objeto; não confirma vermelho; `PUT` de peça alheia → 403; `PUT` além do movimento → 400; mestre confirma vermelho.

- [X] T022 [US3] `MoveAsync`: mestre (dono do mapa) sem limite; senão exige peça `Character` cuja participação é aprovada e o personagem é do usuário (403 caso contrário); calcula `HexGrid.MovementCost` do estado atual ao pedido com o grid do modelo e as outras peças do mapa como bloqueios; inalcançável ou > `character.Move` → `DomainValidationException("move", "O movimento passou do máximo.")`; NPC/objeto só mestre em `backend/Roll6.Domain/Services/MapTokenService.cs` (+ `IMapTokenRepository.ListByMapAsync` já existente para os bloqueios)
- [X] T023 [P] [US3] Testes: jogador move o próprio personagem dentro do movimento; além → 400; peça de outro jogador / NPC / objeto → 403; mestre além do movimento → ok em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`
- [X] T024 [US3] Frontend: o mestre confirma mesmo com `over` (rastro vermelho); jogador bloqueado com toast (já em `canConfirm`); jogador sem menu em peças que não são dele (T013) — conferir e ajustar em `frontend/src/components/map/MapCanvas.tsx`

**Checkpoint**: quickstart passos 1, 5 e 7.

---

## Phase 6: User Story 4 - Mover objetos (Priority: P2)

**Goal**: objetos movem e giram sem custo; rastro cinza; sem contador.

**Independent Test**: mestre move um baú para longe e gira; rastro cinza; sem contador; gravado.

- [X] T025 [US4] `useTokenMovement.start`: peça `object` → `kind = 'free'`, total `null`; o caminho continua sendo o mínimo (para desenhar o rastro) e o contador não aparece; `MapCanvas` não renderiza `MovementCounter` para `free` em `frontend/src/hooks/useTokenMovement.ts` e `frontend/src/components/map/MapCanvas.tsx`

**Checkpoint**: quickstart passo 5 (baú).

---

## Phase 7: Polish & Cross-Cutting

- [X] T026 [P] Atualizar o `CLAUDE.md` (hex math: sentidos/`neighbor`/BFS de movimento espelhados; modo Mover no mapa; regra de permissão do `PUT …/position`)
- [X] T027 Rodar `dotnet build` + `dotnet test` em `backend/`; `npm run lint` + `npm test` + `npm run build` em `frontend/`
- [ ] T028 Executar `specs/015-token-movement/quickstart.md` com Mestre e Jogador

---

## Dependencies & Execution Order

- Setup → Foundational (T002–T006) → US1 → US2 → US3 → US4 → Polish.
- `MapCanvas.tsx` (T013, T019, T024, T025), `lib/movement.ts` (T007, T018), `MapTokenService.cs` (T016, T022) e `pt-BR.json` são tocados por várias tarefas — em sequência.
- US3 (backend) depende de T016 (look no DTO) e T003 (`MovementCost`).

### Parallel Opportunities

- Foundational: T002/T003 (lados diferentes), T004/T005 (testes), T006 em paralelo.
- US1: T007, T008, T010, T011, T014, T015 em paralelo; T009 depois de T002/T007; T013 no fim.
- US2: T020 e T021 em paralelo com o resto.

## Parallel Example: Foundational

```text
Task: "T002 pathfinding em frontend/src/lib/hexGrid.ts"
Task: "T003 pathfinding em backend/Roll6.Domain/Grid/HexGrid.cs"
Task: "T006 peças giradas em frontend/src/components/map/TokenLayer.tsx"
```

## Implementation Strategy

### MVP (US1)

Setup → Foundational → US1: Mover mostra caminho, custo e cores (ainda sem gravar).

### Incremental

1. US2: confirmar destino e sentido (grava).
2. US3: permissões do jogador e validação no servidor.
3. US4: objetos.
4. Polish.
