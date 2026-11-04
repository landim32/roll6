# Implementation Plan: Personagem em um único mapa, sem mapa atual

**Branch**: `108-character-single-map` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/108-character-single-map/spec.md`

## Summary

O mapa atual sai por inteiro: coluna, status, endpoint, evento, ferramenta MCP e telas. Quem define o mapa do jogador
passa a ser o personagem escolhido.

**Regra**: `map_tokens` ganha índice único em `campaign_character_id`, e excluir um mapa apaga as peças de personagens
dele. Colocar personagem fica exclusivo do mestre. Com o personagem em outro mapa, `POST /api/maptoken/character` responde
409 citando o mapa; com `transfer: true`, atualiza a própria linha da peça, o que torna a troca atômica e mantém o id.

**Tela do jogador**: `CampaignCharacterInfo` passa a trazer `mapId`/`mapName`, e `lib/viewerMap` decide pelo personagem
escolhido no lugar de `currentMapId`. O novo evento `character.map`, enviado ao mestre e ao dono, recarrega a participação
e liga a mensagem "O mestre está mudando o mapa".

**Tempo real**: eventos de um mapa vão ao mestre e aos donos de personagens nele. A caminhada segue o mesmo público.

**Turno**: continua único. Dados, processamento e resumo passam a trabalhar por mapa. `turns.map_id` fica só nos registros
de ator; conversa e avisos ficam sem mapa.

Decisões e alternativas em [research.md](research.md).

## Technical Context

**Language/Version**: C# 12 / .NET 8; TypeScript 5 / React 18
**Primary Dependencies**: só as existentes: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR,
`ModelContextProtocol.AspNetCore` 2.x; React 18, Bootstrap 5.3, i18next, sonner. **Nenhuma dependência nova.**
**Storage**: PostgreSQL, sem tabela nova. Migração `RemoveCurrentMap` com limpeza de dados + `database/migrations/108-character-single-map.sql`
+ `database/roll6.sql` regenerado.
**Testing**: xUnit + Moq + FluentAssertions (`MapTokenServiceTests`, `TurnServiceTests`, `CampaignServiceTests`,
`MapServiceTests`, `TableEventAudienceTests`, `PageMetaServiceTests`, contagens do MCP); Vitest (`lib/viewerMap`,
`lib/tableSelect`, `lib/mapTokens`, `i18n/keys.test.ts`).
**Target Platform**: SPA, containers da API e do MCP.
**Project Type**: web application (backend + frontend).
**Performance Goals**: uma consulta por evento de mapa para resolver a audiência; nenhuma consulta por amostra de
caminhada (cache de 10 s); mensagem ao jogador em até 2 s (SC-003).
**Constraints**: FKs `ClientSetNull`; hub só do servidor para o cliente, fora a caminhada; NPCs intactos; regra de visão
continua visual, sem bloquear leitura pela API.
**Scale/Scope**: 1 migração destrutiva, 1 endpoint removido e 1 novo (imagem de prévia), 1 ferramenta MCP removida, 1
evento novo e 1 removido, cerca de 25 arquivos do backend e 20 do frontend. Sem entidade nova.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Skills de arquitetura | Sem entidade nova. Repositórios, DTOs e migração seguem `dotnet-architecture`; alterações em contextos seguem `react-architecture`. | PASS |
| II. Stack fixa | Nenhuma dependência; Fetch API; Context API; sem docker local. | PASS |
| III. Casing | `Contexts/`, `Services/`, `hooks/`, `types/` como estão no disco. | PASS |
| IV. Convenções | `[JsonPropertyName]`; `interface`; constantes em vez de `enum`; erros por `ConflictException`/`UnauthorizedAccessException`/`KeyNotFoundException`. | PASS |
| V. Banco | snake_case; índice `ix_map_tokens_campaign_character`; nenhuma FK nova; `ClientSetNull` mantido. | PASS |
| VI. Auth | Rotas seguem `[Authorize]`, com regra de mestre no service. A rota nova de meta é anônima como as demais e expõe só a imagem da campanha. | PASS |
| VII. Grid | Posições seguem `x`/`y`; toda ocupação passa por `Occupancy`/`HexGrid`, agora por mapa. | PASS |

Post-design re-check: PASS (sem violações; Complexity Tracking vazio).

## Project Structure

### Documentation (this feature)

```text
specs/108-character-single-map/
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
│   ├── Models/              # Map, Campaign, MapToken.TransferTo; − MapStatus.Current
│   ├── Realtime/            # TableEventAudience
│   ├── Turns/               # TurnSummary por mapa
│   └── Services/            # MapTokenService(.Walk), MapService, CampaignService, CampaignCharacterService,
│                            # CharacterService, PageMetaService, TurnService.* (Processing, Repeat, Admin, Chat…)
├── Roll6.DTO/               # ver data-model.md
├── Roll6.Infra.Interfaces/  # IMapTokenRepository, IMapNpcRepository, CampaignTableRow
├── Roll6.Infra/             # Roll6Context, repositórios, migração
├── Roll6.Application/Realtime/  # SignalRRealtimeNotifier, TableHub, TableConnections
├── Roll6.API/Controllers/   # CampaignController, MetaController
├── Roll6.Mcp/               # − set_current_map; Roll6Guide, McpDocs, descrições
└── Roll6.Tests/
database/                    # migrations/108-character-single-map.sql, roll6.sql
frontend/src/
├── lib/                     # viewerMap, tableSelect, mapTokens; − currentMap
├── types/                   # campaign, campaignCharacter, map, mapToken, realtime
├── Services/                # mapTokenService, campaignService
├── Contexts/                # MapEditorContext, CharacterContext, CampaignContext, RealtimeContext, MapTokenContext
├── hooks/                   # useMapInteraction, useTableRoute
├── pages/                   # MainPage, library/MapsPage
├── components/              # menu/TableSelect, campaign/CampaignMapsTab, map/PartyCard, map/PartyPanel;
│                            # − campaign/MakeCurrentMapButton
├── styles/app.css           # .stm-map-changing
└── i18n/locales/pt-BR.json
```

**Structure Decision**: projeto web existente, sem pastas novas.

## Ordem de implementação

O mapa atual não pode sair antes de seus substitutos existirem, ou o projeto para de compilar no meio do caminho.

1. **Fundação**: índice, migração, repositórios, `MapToken.TransferTo`, `mapId`/`mapName` nos DTOs.
2. **US1**: colocação e transferência no servidor, confirmação no site.
3. **US2 + US3**: evento `character.map`, audiência, `viewerMap`, seguir o personagem, mensagem.
4. **US4**: turno por mapa, caminhada, seleção de mesa, prévia, MCP; depois a remoção total do mapa atual.
5. **US5**: testes de não regressão de NPCs.

## Riscos

| Risco | Mitigação |
|---|---|
| Migração apaga peças de forma irreversível em produção | Regra em FR-019; roteiro com cópia do banco no quickstart; a limpeza roda dentro da transação da migração |
| Jogadores sem peça perdem o mapa ao subir a versão | Mudança já prevista na spec; o mestre coloca os personagens depois do deploy |
| `process_turn` é a parte de maior risco de regressão | 18 chamadas de teste existentes cobrem o caso de um mapa; novos testes para dois mapas |
| `gurps-adventure` lê `mapId` da raiz em `processar_turno.py` | Campo mantido com um mapa; com grupo dividido vem nulo e o script segue sem índice local. Adaptação fica naquele repositório |
| Skills do `gurps-adventure` que citam fluxos de mapa | Nenhuma usa `set_current_map` ou `currentMapId`; `Roll6Guide` é a fonte para o MCP |
| Ordem de eventos faz o jogador seguir um mapa velho | `character.map` só dispara recarga; a decisão usa sempre o estado recarregado, e o efeito de seguir se corrige sozinho |

## Complexity Tracking

Sem violações da constituição.
