# Tasks: Peça de NPC mostra vida, energia, status e ficha corretos

**Input**: Design documents from `specs/026-fix-npc-piece-vitals/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: incluídos — pedidos no relato (FR-008): NPC recém-posicionado, NPC após alteração, ficha do NPC e regressão de personagens.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 = mesa mostra a ocorrência; US2 = ficha do NPC na peça; US3 = personagens inalterados

---

## Phase 1: Setup

Nada a configurar.

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T001 Em `backend/Roll6.Domain/Models/MapNpc.cs`: renomear `Life`/`Energy` para `CurrentLife`/`CurrentEnergy` (doc: atuais, ≤ total do NPC, podem ser ≤ 0); `FromNpc` começa com os totais do NPC; `Update(name, currentLife, currentEnergy, status, totalLife, totalEnergy)` recusa atual acima do total com `DomainValidationException` em `currentLife`/`currentEnergy`
- [X] T002 Em `backend/Roll6.Infra/Context/Roll6Context.cs` mapear `CurrentLife` → `current_life` e `CurrentEnergy` → `current_energy`; gerar a migração `RenameMapNpcCurrentVitals` e garantir que o `Up` usa `RenameColumn` (não drop/add) (depende de T001)
- [X] T003 [P] DTOs: `backend/Roll6.DTO/MapNpc/MapNpcInfo.cs` (`life`/`energy` → `currentLife`/`currentEnergy` + `totalLife`/`totalEnergy`), `backend/Roll6.DTO/MapNpc/MapNpcUpdateInfo.cs` (`currentLife`/`currentEnergy`), `backend/Roll6.DTO/MapToken/MapTokenInfo.cs` (+ `totalLife`/`totalEnergy`)
- [X] T004 Ajustar a compilação: `MapNpcService` (usa `CurrentLife`/`CurrentEnergy`, passa os totais do NPC no `Update`, `CharacterUpdate` de turno com campos `currentLife`/`currentEnergy`), `MapTokenService` (mapeamento), testes existentes que usam `MapNpc.Life/Energy` e `MapNpcUpdateInfo.Life/Energy` (depende de T001, T003)

**Checkpoint**: `dotnet build backend/Roll6.sln` e `dotnet test` verdes.

---

## Phase 3: User Story 1 - O mestre vê o NPC com os valores certos na mesa (Priority: P1) 🎯 MVP

**Goal**: peça e card mostram atual/total e status da ocorrência; totais do NPC puxam as atuais para baixo.

**Independent Test**: quickstart passos 1–3, 5 e 6.

### Tests for User Story 1

- [X] T005 [P] [US1] `backend/Roll6.Tests/Domain/Models/MapNpcTests.cs`: `FromNpc` começa com atual = total do NPC; `Update` aceita atual ≤ 0 e recusa atual acima do total (erro em `currentLife`/`currentEnergy`)
- [X] T006 [P] [US1] `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: peça de NPC recém-posicionada → `Life`/`Energy` = atuais da ocorrência (não 0), `TotalLife`/`TotalEnergy` = do NPC; após alterar a ocorrência (vida 1, status) a lista devolve 1 e o status; peça de objeto mantém os próprios valores e totais = os próprios
- [X] T007 [P] [US1] `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs`: `CreateAsync` devolve `currentLife`/`totalLife` = vida do NPC; `UpdateAsync` grava as atuais, recusa acima do total e registra `CharacterUpdate` com `currentLife`/`currentEnergy`
- [X] T008 [P] [US1] `backend/Roll6.Tests/Domain/Services/NpcServiceTests.cs`: baixar `life`/`energy` do NPC chama `IMapNpcRepository.ClampVitalsAsync(npcId, life, energy)` e publica `mapTokens.changed` (mapId nulo) em cada campanha do NPC

### Implementation for User Story 1

- [X] T009 [US1] `backend/Roll6.Domain/Services/MapTokenService.cs` (mapeamento): `TotalLife`/`TotalEnergy` — personagem = totais do personagem, NPC = totais do NPC (`npcs[mapNpc.NpcId]`), objeto = os próprios `Life`/`Energy`; NPC `Life`/`Energy` = `CurrentLife`/`CurrentEnergy`
- [X] T010 [US1] `backend/Roll6.Domain/Services/MapNpcService.cs`: `MapToDtoAsync` preenche `CurrentLife`, `CurrentEnergy`, `TotalLife`, `TotalEnergy` (NPCs carregados em lote); `UpdateAsync` passa os totais do NPC para `MapNpc.Update`
- [X] T011 [US1] `ClampVitalsAsync(long npcId, int totalLife, int totalEnergy)` em `backend/Roll6.Infra.Interfaces/Repository/IMapNpcRepository.cs` e `backend/Roll6.Infra/Repository/MapNpcRepository.cs` (`ExecuteUpdateAsync` como em `CampaignCharacterRepository.ClampVitalsAsync`)
- [X] T012 [US1] `backend/Roll6.Domain/Services/NpcService.cs`: em `UpdateAsync`, chamar o clamp e publicar `mapTokens.changed` (mapId nulo) nas campanhas do NPC, além do `campaignNpcs.changed` (injetar `IMapNpcRepository` antes do `IRealtimeNotifier`; ajustar o construtor nos testes) (depende de T011)
- [X] T013 [P] [US1] Frontend tipos: `frontend/src/types/npc.ts` (`MapNpcInfo`: `currentLife`, `currentEnergy`, `totalLife`, `totalEnergy`) e `frontend/src/types/mapToken.ts` (`totalLife`, `totalEnergy`); ajustar usos/fixtures que quebrarem no `tsc`
- [X] T014 [US1] `frontend/src/components/map/NpcCard.tsx`: com ocorrências no mapa aberto (peças com `npcId` do card), uma linha por ocorrência com nome, `VitalBar` vida `life/totalLife`, energia `energy/totalEnergy` e o status; sem ocorrências, os totais do NPC como hoje (estilos em `frontend/src/styles/app.css` se preciso) (depende de T013)
- [X] T015 [P] [US1] Textos novos em `frontend/src/i18n/locales/pt-BR.json` (ex.: rótulo/aria da lista de ocorrências), se necessários

**Checkpoint**: a mesa mostra os valores da ocorrência sem nenhum `update_map_token`.

---

## Phase 4: User Story 2 - A ficha da peça de NPC mostra a ficha do NPC (Priority: P2)

**Goal**: `MapTokenInfo.Sheet` de peça de NPC = ficha da peça ?? ficha do NPC.

**Independent Test**: quickstart passo 2 (`sheet` na lista de peças).

- [X] T016 [P] [US2] `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: peça de NPC sem ficha própria devolve a ficha do NPC; com ficha própria, a da peça
- [X] T017 [US2] `backend/Roll6.Domain/Services/MapTokenService.cs`: no ramo de NPC do mapeamento, `info.Sheet = mapToken.Sheet ?? npcs.GetValueOrDefault(mapNpc.NpcId)?.Sheet` (depende de T009)

---

## Phase 5: User Story 3 - Personagens continuam iguais (Priority: P1)

**Goal**: regressão das peças de personagem.

- [X] T018 [P] [US3] `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: peça de personagem devolve nome, vida/energia atuais, status e ficha da participação e `TotalLife`/`TotalEnergy` do personagem

---

## Phase 6: Polish & Cross-Cutting

- [X] T019 MCP: `backend/Roll6.Mcp/Tools/MapNpcTools.cs` (`update_map_npc` com `currentLife`/`currentEnergy`, descrição: não passa do total do NPC, ≤ 0 = caído; `place_npc_on_map` diz que começa nos totais) e `backend/Roll6.Mcp/Tools/MapTokenTools.cs` (descrição de `update_map_token`: em peças de personagem/NPC, nome/vida/energia/status/ficha exibidos vêm da participação/ocorrência — alterar com `update_participation`/`update_map_npc`); `backend/Roll6.Mcp/Roll6Guide.cs` com atual/total das ocorrências; rodar os testes do MCP (paridade/descrições)
- [X] T020 Aplicar a migração no banco de dev, regenerar `database/roll6.sql` (com o cabeçalho) e criar `database/migrations/026-npc-current-vitals.sql` (incremental desde a última migração da branch base, idempotente, com cabeçalho)
- [X] T021 [P] Atualizar `CLAUDE.md` (NPCs: `current_life`/`current_energy` + totais do NPC, clamp, ficha do NPC na peça, card do NPC com ocorrências) e `## Recent Changes`; atualizar a requisição `bruno/MapNpc/Update.bru` para `currentLife`/`currentEnergy`
- [X] T022 Rodar `dotnet build`, `dotnet test`, `npm run lint`, `npm test`, `npm run build`
- [X] T023 Validar o `quickstart.md` contra a API local e escrever o resumo final: caminho investigado (sem leitor cru), o que mudou e por quê

---

## Dependencies & Execution Order

- Phase 2: T001 ∥ T003 → T002 (depois de T001), T004 (depois de T001 + T003).
- US1: testes T005–T008 → T009, T010, T011 → T012; frontend T013 → T014; T015 livre.
- US2: T016 → T017 (mesmo arquivo de T009, depois dele).
- US3: T018 a qualquer momento após a Phase 2.
- Polish por último.

### Parallel Opportunities

- T001 ∥ T003; T005 ∥ T006 ∥ T007 ∥ T008; T013 ∥ T015 ∥ backend; T016 ∥ T018; T021 ∥ T020.

### Parallel Example: User Story 1

```text
T005 MapNpcTests | T006 MapTokenServiceTests | T007 MapNpcServiceTests | T008 NpcServiceTests
T011 repositório | T013 tipos do frontend | T015 textos
```

## Implementation Strategy

1. **MVP**: Phase 2 + US1 — atuais/totais da ocorrência na peça e no card.
2. US2 (ficha do NPC) e US3 (regressão) em seguida — pequenas.
3. Polish: MCP, scripts SQL, docs, Bruno e validação com o resumo pedido.
