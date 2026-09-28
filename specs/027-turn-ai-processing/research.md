# Research: Dados do turno e processamento do turno para IA (027)

## R1 — Onde implementar

- **Decision**: `TurnService` ganha `GetDataAsync(userId, campaignId, turnNo?)` e `ProcessAsync(userId, campaignId, info)`.
  O carregamento em lote de `GetSummaryAsync` (registros, participações, personagens, donos, ocorrências, NPCs, autores,
  peças) vira um método privado `LoadSnapshotAsync(campaign, turnNo)` usado pelos três.
- **Rationale**: uma única fonte para nomes/rótulos/posições — "mesma lógica do texto em markdown" (pedido do usuário).
- **Alternatives**: serviço novo (duplicaria o carregamento ou exigiria dependência circular com `TurnService`).

## R2 — Conteúdo de Dados do Turno

- Personagens = participações **aprovadas** da campanha (não só os que têm peça): `characterId`, `campaignCharacterId`,
  `name`, `playerName` (dono), `currentLife`/`totalLife`, `currentEnergy`/`totalEnergy` (fadiga = energia), `status`,
  `mapTokenId`/`x`/`y`/`look`/`lookName` quando houver peça no mapa atual.
- NPCs = ocorrências do **mapa atual** (`map_npcs` do mapa): `mapNpcId`, `npcId`, `mapTokenId`, `name`, atuais e totais,
  `status`, `x`, `y`, `look`, `lookName`.
- `actions` = texto da seção "## Ações" do resumo (`TurnSummary.BuildActions`), do turno pedido (padrão: em andamento).
- Valores dos personagens/NPCs são sempre os atuais (a spec aceita isso para turnos passados).

## R3 — Processamento: validação e atomicidade

- **Decision**: fase 1 valida tudo sem gravar (lote não vazio; sem itens repetidos; personagem aprovado na campanha;
  ocorrência no mapa atual; atuais ≤ totais; status ≤ 260; posição só com peça no mapa atual, dentro da grid e com os
  destinos finais únicos e livres considerando as peças que não se movem); erros acumulados num
  `DomainValidationException` com chaves `characters[i].field` / `npcs[i].field`. Fase 2 grava tudo em
  `IUnitOfWork.ExecuteInTransactionAsync`.
- **Rationale**: FR-009/FR-010; chaves por item deixam a IA corrigir o lote.
- **Alternatives**: gravar item a item com rollback manual (mais frágil).

## R4 — Registros no turno

- Vitais/status → `CharacterUpdate` (campos `currentLife`, `currentEnergy`, `characterStatus` p/ personagem, `status` p/
  NPC) só com o que mudou; posição → `Movement` (antes/depois, `moved` = `HexGrid.MovementCost` sem obstáculos), autor = mestre,
  sem a regra de um movimento por turno (o mestre move livremente); narração → `TurnType.Narration` (5), sem ator,
  `description` até 10000, `map_id` = mapa atual.
- `Turn.Create` hoje exige um ator: a narração usa uma fábrica própria que dispensa a regra; `CreateAsync` (entrada manual)
  continua aceitando só 1–3.
- Coluna `description`: `varchar(2000)` → `varchar(10000)`; ações/resultados continuam validando 2000 no domínio.

## R5 — Finalizar

- **Decision**: na mesma transação, `campaign.AdvanceTurn()` + `UpdateAsync` (como `FinishAsync` com `force`); após o
  commit publica `party.changed`, `mapTokens.changed` (mapId nulo), `turn.finished` (`{ finishedTurn, turnNo }`).
- Resposta: `TurnProcessResultInfo { finishedTurn, turnNo, data }`, `data` = `GetDataAsync` do turno processado.

## R6 — Resumo e frontend

- `TurnSummary`: `Narration` escreve `GM (Rodrigo): Narração: texto` (ou o nome do autor). Frontend: `TURN_TYPE.narration`
  e rótulo no `TurnSummaryModal` para não aparecer como "Ação"; nenhum componente novo.

## R7 — MCP

- `get_turn_data` (GET, ReadOnly) e `process_turn` (POST, não idempotente, **Destructive** porque finaliza o turno de forma
  irreversível) em `TurnTools`, com descrição do fluxo recomendado: `get_turn_data` → decidir → `process_turn`; ficha e
  anotações em `get_participation`/`update_participation`.
