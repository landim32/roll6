# Research: Peça de NPC mostra vida, energia, status e ficha corretos (026)

## R1 — Investigação: quem lê os campos crus da peça? (FR-001)

Percorridos todos os caminhos que devolvem uma peça (`MapTokenInfo`):

| Caminho | Passa por `MapTokenService.MapToDtoAsync`? |
|---|---|
| `GET /api/map/{id}/token` (lista; MCP `list_map_tokens`) | sim |
| `POST /api/maptoken`, `POST /api/maptoken/character` | sim |
| `PUT /api/maptoken/{id}` / `/position` / `/token` (MCP `update_map_token`, `move_map_token`…) | sim |
| Eventos 017 `mapToken.upserted` (`PublishPieceAsync`) | sim (o `data` é o DTO já juntado) |
| `POST /api/mapnpc`, `PUT /api/mapnpc/{id}` | publicam `mapTokens.changed` → o cliente recarrega a lista (juntada) |

`new MapTokenInfo` só existe dentro de `MapToDtoAsync`. No frontend (branches `main`, `024`, `025`, `026`), **nenhuma tela
mostra vida, energia, status ou ficha de uma peça**: `TokenLayer` usa nome/imagem/posição; `HexMenu` só nome e ações. A
única tela com barras de NPC é `NpcCard` (painel de NPCs), que usa `CampaignNpcInfo` — os valores **do NPC da biblioteca**
(`current={npc.life} total={npc.life}`), nunca os da ocorrência.

**Conclusão**: não há leitor de campos crus no app; o "0/0" do relato veio de um assistente externo (outro repositório),
confirmado pelo usuário. Defeitos reais encontrados:
1. `MapToDtoAsync` não junta a ficha da peça de NPC (`Sheet` fica o da peça, nulo).
2. A mesa não mostra os valores das ocorrências (o card mostra a biblioteca), então `update_map_npc` não aparece.
3. A ocorrência guarda vida/energia sem deixar claro que são **atuais**, e não há total para comparar.

## R2 — Vida/energia atuais na ocorrência

- **Decision**: renomear `map_npcs.life/energy` → `current_life/current_energy` (`MapNpc.CurrentLife/CurrentEnergy`); os
  totais são `npcs.life/energy`. `FromNpc` começa com atual = total. DTOs: `MapNpcInfo` lê `currentLife`, `currentEnergy`,
  `totalLife`, `totalEnergy`; `MapNpcUpdateInfo` recebe `currentLife`, `currentEnergy`. Atual pode ser ≤ 0 (caído) e,
  como no personagem, não pode passar do total (400 `currentLife`/`currentEnergy`).
- **Rationale**: decisão do usuário (Q2 = ocorrência); espelha a participação (`current_life` + totais do personagem).
- **Alternatives**: nova coluna mantendo `life` (duas colunas para o mesmo dado); valor atual no NPC da campanha (todas as
  ocorrências compartilhariam a vida).

## R3 — Peça (`MapTokenInfo`)

- **Decision**: `MapTokenInfo` ganha `totalLife`/`totalEnergy` (personagem = totais do personagem; NPC = totais do NPC;
  objeto = os próprios `life`/`energy`). Para NPC: `life`/`energy` = atuais da ocorrência, `status` = ocorrência, `sheet` =
  ficha da peça se houver, senão a do NPC (`npcs[mapNpc.NpcId].Sheet`). Nada é copiado para `map_tokens`.
- **Rationale**: FR-002/FR-004; o `npcs` já é carregado no mapeamento — nenhuma consulta extra.

## R4 — Totais baixados

- **Decision**: `NpcService.UpdateAsync` chama `IMapNpcRepository.ClampVitalsAsync(npcId, life, energy)` (mesma forma de
  `CampaignCharacterRepository.ClampVitalsAsync`) e publica `mapTokens.changed` (mapId nulo) nas campanhas do NPC, além do
  `campaignNpcs.changed` atual.

## R5 — Card do NPC

- **Decision**: `NpcCard` usa as peças já carregadas (`MapTokenContext.tokens` com `npcId`) do mapa aberto: para cada
  ocorrência, uma linha com nome da ocorrência, barras `life/totalLife` e `energy/totalEnergy` e o status; sem
  ocorrências, as barras dos totais do NPC (como hoje). Atualiza sozinho: `mapTokens.changed` já recarrega as peças.

## R6 — MCP, turno e compatibilidade

- `update_map_npc`: parâmetros `currentLife`, `currentEnergy` (descrição: não passa do total do NPC; ≤ 0 = caído).
- `update_map_token`: descrição passa a dizer que, em peças de personagem/NPC, nome/vida/energia/status/ficha exibidos vêm da
  participação/ocorrência e que para alterá-los se usa `update_participation`/`update_map_npc` (agora refletido na mesa).
- Turno (024): `CharacterUpdate` de NPC grava `currentLife`/`currentEnergy` (rótulos "Vida"/"Energia" já existem no
  `TurnSummary`); registros antigos com `life`/`energy` continuam legíveis.
- Guia `roll6://guide`: atual/total das ocorrências.
