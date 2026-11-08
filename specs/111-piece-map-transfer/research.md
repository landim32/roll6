# Research: Mudar peça de mapa (111)

Não havia `NEEDS CLARIFICATION` no contexto técnico; as decisões abaixo saem da leitura do código atual
(`MapTokenService.PlaceCharacterAsync`, `MapToken.TransferTo`, `MapNpcService.CreateAsync`, `Occupancy.FirstFree`,
`HexMenu`/`MapHexMenu`/`useMapInteraction`).

## R1 — Uma rota nova, não reaproveitar `POST /api/maptoken/character`

- **Decision**: nova rota `PUT /api/maptoken/{id}/map` (`MapTokenMapInfo { mapId }`) que serve personagem **e** NPC,
  partindo da peça (é o que o menu da peça tem na mão).
- **Rationale**: `POST /api/maptoken/character` parte da participação, exige o hex de destino e vira a peça para cima
  (`TransferTo` → `Look = 0`); não cobre NPC. A nova rota recebe só o mapa e o servidor decide a posição (mesmo hex,
  mesma direção, ou o livre mais próximo), o que dá uma única regra para frontend e MCP.
- **Alternatives**: `transfer: true` + `x/y` do frontend em `/character` e outra rota para NPC — duas regras, posição
  decidida no cliente sem conhecer a ocupação do destino; rejeitado.

## R2 — A mesma linha muda de mapa (personagem e NPC)

- **Decision**: personagem: a mesma `map_tokens` (`campaign_character_id` único, 108) muda `map_id`/`x`/`y`, mantém `look`,
  token e nome, limpa a caminhada (`MapToken.MoveToMap`, novo). NPC: o mesmo `map_npcs` muda `map_id` (`MapNpc.MoveToMap`,
  novo; recebe o nome final) e a sua peça muda junto, na mesma transação (`IUnitOfWork`).
- **Rationale**: manter os ids preserva as entradas de turno (`turns.map_npc_id`, `character_id`), a ação repetida, as
  reações e o vínculo NPC↔peça (`map_tokens.map_npc_id` único). Nada é apagado nem recriado.
- **Alternatives**: remover a instância e criar outra no destino — perde/duplica o histórico de turno e a ação repetida
  (contradiz FR-008); rejeitado.

## R3 — Posição: mesmo hex, senão o livre mais próximo dele

- **Decision**: generalizar o puro `Occupancy.FirstFree(look, space, columns, rows)` para
  `Occupancy.NearestFree(x, y, look, space, columns, rows)` (distância cúbica a partir de `(x, y)`, desempate linhas de
  cima e colunas à esquerda, como hoje); `FirstFree` passa a chamar `NearestFree(columns / 2, rows / 2, …)`. O destino é
  carregado por `MapOccupancyLoader` (forma pela postura atual, `layout.SpaceOf(piece)`); como a peça ainda não está no
  destino, nada é excluído. Sem lugar → 409 "Não há um hex livre para a peça neste mapa." (o texto já usado em 052).
- **Rationale**: Princípio VII (distância cúbica do módulo puro); reaproveita a busca já testada. `look` é mantido e a forma
  é testada com ele.
- **Mirror**: `FirstFree` não existe em `lib/occupancy.ts` (é só do servidor), então `NearestFree` também fica só no C#;
  nenhum espelho a atualizar.
- **Alternatives**: recusar quando ocupado — obriga o mestre a esvaziar o destino ao levar o grupo inteiro; rejeitado
  (assunção da spec).

## R4 — Resposta informa se a posição foi ajustada

- **Decision**: resposta `MapTokenMapResultInfo { mapToken: MapTokenInfo, fromMapId, adjusted }`.
- **Rationale**: o frontend escolhe o toast ("levado para…" vs "…posição ajustada") e o MCP sabe que precisa olhar o hex
  sem comparar coordenadas.

## R5 — Regras e permissões

- **Decision**: só o mestre (`campaign.UserId`, 403 "Apenas o mestre muda peças de mapa."); `campaign.EnsureMapEditable(true)`;
  origem não apagada; destino da mesma campanha (`404 Mapa não encontrado.` se outra campanha ou apagado — não revela
  mapas alheios), ativo (409 "Este mapa está arquivado."), diferente da origem (409 "A peça já está neste mapa.");
  objeto → 400 `mapTokenId` "Só personagens e NPCs mudam de mapa."; participação não aprovada → 409 como em
  `PlaceCharacterAsync`. Sem `Movement`, sem Deslocamento, sem regra de um movimento, sem entrada de turno.
- **Rationale**: as mesmas regras do transporte da 108 (FR-005/006/009).

## R6 — Nome do NPC no destino

- **Decision**: mantém o nome se nenhuma instância ativa do mesmo NPC no destino o usa; senão
  `MapNpc.NextName(npc.Name, nomesEmUsoNoDestino)`. A peça recebe o mesmo nome. Não gera entrada de turno
  (`CharacterUpdate`) — a troca de mapa não é edição do NPC.
- **Rationale**: regra de nomes da 051 por mapa; renomear sempre perderia "Guarda 2" que o mestre já citou na narração.

## R7 — Tempo real

- **Decision**: personagem — `mapToken.deleted` na origem, `mapToken.upserted` no destino (`PublishPieceAsync`) e
  `character.map` ao mestre e ao dono (`PublishCharacterMapAsync`, tela do jogador acompanha, 108). NPC —
  `mapTokens.changed` para a origem e para o destino (recarrega peças e a lista de instâncias do `NpcPanel`).
  Publicado depois do commit.
- **Rationale**: eventos de mapa já vão só ao mestre e a quem tem personagem naquele mapa (`TableEventAudience`);
  `character.map` é o que move a tela do jogador e atualiza os cards (`CharacterContext`, `MapEditorContext`). A seleção
  de mesa (`CampaignTableInfo.maps` com `characterIds`/`characterCount`) já recarrega em `character.map`; para NPC nada
  muda ali (só conta personagens).

## R8 — Frontend

- **Decision**: item **"Mudar de mapa"** (`MapIcon`/`BoxArrowRightIcon` do Bootstrap Icons, inline em
  `components/ui/icons.tsx`) no `HexMenu`, ao lado de "Editar NPC", passado por `MapHexMenu` só quando
  `ctx.canPlace` (mestre + `canEditMap`) e a peça é personagem ou NPC (puro `lib/mapInteraction.canChangeMap`). Abre
  `components/modals/ChangeMapModal` (Radix via `components/ui/Modal`, skill `react-modal`) com os mapas ativos da campanha
  de `CampaignContext.tableCampaigns` (`CampaignTableInfo.maps`, sempre todos para o mestre) menos o aberto; vazio →
  `changeMap.noOtherMap`. Escolher um mapa = confirmar (lista de botões). `MapTokenContext.changeMap(piece, mapId)` →
  `mapTokenService.changeMap` (Fetch), remove a peça localmente, toast `toast.pieceMapChanged` / `toast.pieceMapAdjusted`
  com ação "Abrir mapa" (abre o destino pelo guard de não salvos). Disponível no 2D e no isométrico porque ambos usam
  `useMapInteraction` + `MapHexMenu` (105).
- **Rationale**: nenhuma entidade nova no frontend (só um método de serviço/contexto), então `react-architecture` não se
  aplica a novos arquivos; modal segue a skill `react-modal`; toasts via `sonner` (`react-alert`).

## R9 — MCP

- **Decision**: ferramenta `change_piece_map` (`[ApiOperation("PUT", "/api/maptoken/{id}/map")]`, `Destructive = false`,
  `Idempotent = false`) em `Roll6.Mcp/Tools/MapTokenTools.cs`; atualizar a seção de mapas/peças do `Roll6Guide` e as
  contagens de `McpCoverageTests`.
