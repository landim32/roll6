# Implementation Plan: Peças de NPC e de objeto — postura, arrasto, retirada e painel

**Branch**: `109-npc-piece-fixes` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/109-npc-piece-fixes/spec.md`

## Summary

Cinco correções na mesa, sem endpoint novo:

1. **Postura de objeto**: `map_tokens.posture` (padrão 1, usada só por peças de objeto). `PUT /api/maptoken/{id}/posture`
   deixa de responder 400 para objetos: só o mestre muda, não grava turno e publica `mapToken.upserted`. O espaço da peça
   segue `Token.SpaceFor(posture)`. No frontend, o menu do hex mostra "Postura" para objetos (só para o mestre), e o
   isométrico deixa de excluir objetos da miniatura tombada.
2. **Corpo no mapa**: retirar uma instância Caída ou Fora de Combate converte a peça em objeto, sem apagá-la
   (`MapToken.LeaveBody`: mesmo id, hex, look e token; nome e postura da instância). Vale nos três caminhos
   (`DELETE /api/mapnpc/{id}`, `DELETE /api/maptoken/{id}` de peça de NPC, `DELETE /api/campaignnpc/{id}`) por meio de
   uma regra pura única (`Domain/Npcs/NpcRemoval`).
3. **Arrasto da unidade**: o card de NPC ganha dois arrastos. O cabeçalho cria uma instância, como hoje, e cada linha de
   instância move aquela peça (novo tipo `application/x-roll6-map-npc` com o `mapTokenId`, que vira o `moveToken` do
   mestre). A imagem de arrasto é sempre o retrato de uma unidade (`setDragImage`), e a linha chama `stopPropagation`
   para o card não iniciar o seu próprio arrasto.
4. **Peça duplicada**: a leitura do código não achou um gesto que envie dois `POST /api/mapnpc` (ver
   [research.md](research.md) R4). A hipótese mais forte é "Incluir NPC", que já põe a instância perto do meio (076),
   seguido do arrasto do card, que cria outra. O plano começa reproduzindo o caso com o log de rede; se aparecer uma
   requisição dupla, ela é corrigida na origem, com teste. A correção de produto vale de qualquer forma:
   - (a) depois do posicionamento automático, a vista centraliza e destaca a peça nova, e o toast diz onde ela ficou;
   - (b) soltar o cabeçalho de um NPC posto automaticamente há menos de 10 s move essa instância em vez de criar outra;
   - (c) o arrasto da linha (item 3) reposiciona sem duplicar.
5. **Painel sob os botões**: `--stm-controls-space` deixa de ser 240 px fixo e passa a ser a altura medida de
   `.stm-controls` (`ResizeObserver` em `MainPage`, que grava a variável em `.stm-map-region`); o valor fixo fica como
   fallback.

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: só as existentes (ASP.NET Core 8, EF Core 9 + Npgsql, SignalR, `ModelContextProtocol.AspNetCore`
2.x; React 18, Bootstrap 5.3, i18next, sonner, `three` lazy). **Nenhuma dependência nova.**
**Storage**: PostgreSQL. Migração `AddObjectPosture` (`map_tokens.posture integer NOT NULL DEFAULT 1`), mais
`database/migrations/109-object-posture.sql` e `database/roll6.sql` regenerado.
**Testing**: xUnit + Moq + FluentAssertions (`MapTokenServiceTests` para a postura de objeto, `MapNpcServiceTests` e
`CampaignNpcServiceTests` para o corpo deixado, `NpcRemovalTests`, espaço de objeto caído no `MapOccupancyLoader`, testes de
descrição do MCP); Vitest (`lib/mapInteraction.canSetPosture`, `lib/isoMiniature.miniatureState`, `lib/mapTokens` para
o soltar da instância e a guarda de 10 s, `i18n/keys.test.ts`).
**Target Platform**: SPA, containers da API e do MCP.
**Project Type**: web application (backend + frontend).
**Performance Goals**: postura de objeto visível aos outros em até 2 s (SC-002), com um evento de peça e sem recarregar
o mapa.
**Constraints**: FKs `ClientSetNull`; `map_tokens.map_npc_id` continua único (o corpo fica com `null`); registros de
turno da instância preservados; nada de turno para objetos; o MCP mantém a mesma contagem de ferramentas.
**Scale/Scope**: 1 coluna, 0 endpoints novos, 3 caminhos de remoção alterados, cerca de 8 arquivos do backend e 10 do
frontend.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | Sem entidade nova; coluna e regras seguem `dotnet-architecture`; mudanças de contexto/hook seguem `react-architecture`. | PASS |
| II. Stack fixa | Nenhuma dependência; Context API; Fetch API; sem docker local. | PASS |
| III. Casing | `Contexts/`, `Services/`, `hooks/`, `types/` como estão. | PASS |
| IV. Convenções | `[JsonPropertyName]`; `interface`; constantes em vez de `enum`; `UnauthorizedAccessException` (403) para quem não é mestre; `DomainValidationException` para postura inválida. | PASS |
| V. Banco | snake_case `posture`, `HasDefaultValue(Posture.Standing).HasSentinel((Posture)0)` como nas outras colunas de postura; nenhuma FK nova; nenhum cascade. | PASS |
| VI. Auth | Mesma rota `[Authorize]`; regra de mestre no service. | PASS |
| VII. Grid | Espaço e forma por `Token.SpaceFor` + `HexGrid.Footprint`/`Occupancy`; posições continuam `x`/`y`. | PASS |

Post-design re-check: PASS (sem violações; Complexity Tracking vazio).

## Project Structure

### Documentation (this feature)

```text
specs/109-npc-piece-fixes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/
│   ├── Models/MapToken.cs                      # Posture, ChangePosture, LeaveBody
│   ├── Npcs/NpcRemoval.cs                      # novo, puro: corpo ou exclusão por instância
│   └── Services/
│       ├── MapTokenService.Posture.cs          # ramo de objeto (mestre, sem turno)
│       ├── MapTokenService.cs                  # DeleteAsync de peça de NPC; MapToDtoAsync com postura/espaço de objeto
│       ├── MapNpcService.cs                    # DeleteAsync
│       ├── CampaignNpcService.cs               # RemoveAsync
│       └── MapOccupancyLoader.cs               # postura de objeto no espaço
├── Roll6.Infra/Context/Roll6Context.cs         # coluna posture
├── Roll6.Infra/Migrations/*AddObjectPosture*
├── Roll6.Mcp/Tools/{MapTokenTools,MapNpcTools,CampaignNpcTools}.cs, Roll6Guide.cs   # descrições
└── Roll6.Tests/...
database/migrations/109-object-posture.sql, database/roll6.sql

frontend/src/
├── lib/mapInteraction.ts                       # canSetPosture para objetos (só mestre)
├── lib/isoMiniature.ts                         # objetos tombam
├── lib/pieceDrawing.ts                         # comentário de isShownIn3d (objetos agora têm postura)
├── lib/mapTokens.ts                            # MAP_NPC_DRAG_TYPE, mapNpcDropAction, guarda recentAutoPlaced
├── hooks/useMapInteraction.ts                  # aceita e solta a instância
├── Contexts/NpcContext.tsx                     # lembra a última instância posta automaticamente (id + hora)
├── components/map/NpcCard.tsx                  # dois arrastos + imagem de arrasto
├── components/modals/NpcPickerModal.tsx        # toast com o lugar + centralizar a peça nova
├── pages/MainPage.tsx                          # mede .stm-controls; mensagem de retirada com corpo
├── styles/app.css                              # usa a variável medida
└── i18n/locales/pt-BR.json
```

**Structure Decision**: a estrutura atual de backend + frontend, sem projeto novo.

## Complexity Tracking

Nenhuma violação.
