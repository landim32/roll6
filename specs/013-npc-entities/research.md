# Research: NPCs (biblioteca, campanha e mapa)

## R1 — Ligação MapNpc ↔ peça do mapa (clarificação A)

- **Decision**: coluna `map_tokens.map_npc_id` (FK → `map_npcs`, `ClientSetNull`, índice único filtrado
  `WHERE map_npc_id IS NOT NULL`). A peça é do tipo `Npc`, usa `npc.TokenId` e é criada junto com o
  MapNpc numa transação (`POST /api/mapnpc` recebe `x`, `y`, `look?`). `MapToken` valida: `MapNpcId`
  só com tipo `Npc`; `CampaignCharacterId` só com tipo `Character` (regra existente).
- **Rationale**: mesmo padrão de `campaign_character_id`; o frontend da 011 já desenha, move, troca o
  token e exclui peças.
- **Alternatives**: `map_npcs.map_token_id` — o `MapNpc` teria de ser criado depois da peça e a leitura
  das peças (que é o que o mapa consome) precisaria de um join reverso.

## R2 — Remoção em conjunto

- **Decision**:
  - `DELETE /api/mapnpc/{id}` → apaga a peça ligada e depois o MapNpc (transação).
  - `DELETE /api/maptoken/{id}` de uma peça com `MapNpcId` → apaga a peça e depois o MapNpc.
  - `DELETE /api/campaignnpc/{id}` → apaga as peças e os MapNpcs desse NPC nos mapas da campanha e
    depois o CampaignNpc.
  - Exclusão de campanha (só possível sem mapas ativos): peças dos mapas excluídos → MapNpcs desses mapas
    → mapas → CampaignNpcs → participações → campanha.
  - `DELETE /api/npc/{id}` → recusado (409) se o NPC estiver em alguma campanha.
  - `DELETE /api/token/{id}` → recusado (409) se usado por algum NPC.
- **Rationale**: FKs nunca cascateiam (constituição); a spec pede remoção conjunta nesses casos.

## R3 — Leitura das peças

- **Decision**: `MapTokenService.MapToDtoAsync` carrega em lote os MapNpcs das peças com `MapNpcId` e
  preenche `name`, `life`, `energy`, `status` a partir deles (e `move` do NPC); `MapTokenInfo` ganha
  `mapNpcId` e `npcId`.
- **Rationale**: FR-012; mesmo tratamento das peças de personagem.

## R4 — Permissões

- **Decision**:
  - Npc: listar/consultar/alterar/excluir só o dono (`GET /api/npc` lista só os do usuário).
  - CampaignNpc: incluir/retirar/listar só o mestre; só NPCs do próprio mestre.
  - MapNpc: criar/alterar/remover só o mestre (dono do mapa); listar mestre + participantes aprovados
    (`HasApprovedCharacterAsync`), sem a ficha do NPC.
- **Rationale**: spec FR-002…FR-010 e suposições.

## R5 — Validação

- **Decision**: `Npc.Update` com `Guard.RequiredText(name, 260)`, `NonNegative` para vida/energia/
  movimento, `OptionalText(sheet, 20000)`, `ImageFileName(image)`; `TokenId` obrigatório (> 0, existência
  checada no service → 404). `MapNpc.Update(name ≤ 260, life, energy livres, status ≤ 260)`. `MapNpc`
  nasce de `MapNpc.FromNpc(mapId, npc)` (cópia inicial de nome/vida/energia, status null).
- **Rationale**: mesmos limites de `Character`/`CampaignCharacter`; vida/energia do mapa podem ficar
  ≤ 0 (NPC caído).
