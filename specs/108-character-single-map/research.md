# Research: Personagem em um único mapa, sem mapa atual

Não há `NEEDS CLARIFICATION` em aberto. Cada decisão abaixo foi tomada a partir do código em `main` (`6939ed2`).

## R1. Como garantir "um mapa por personagem" (FR-001)

**Decisão**: trocar o índice único `ix_map_tokens_map_campaign_character` (`map_id` + `campaign_character_id`) por
`ix_map_tokens_campaign_character`, único em `campaign_character_id` onde não é nulo. Excluir um mapa passa a apagar
as peças de personagens dele.

**Rationale**: a participação pertence a uma campanha, então a coluna sozinha já garante a regra, mesmo com duas abas ao
mesmo tempo. O código atual só faz checagem antes de inserir, o que não resiste a concorrência.

**Consequências**:
- Violação do índice hoje vira 500: `MapTokenRepository` não trata `UniqueViolation`. A inserção de peça de personagem
  precisa traduzi-la para `ConflictException` (409), como `MapRepository` já faz.
- Mapas excluídos hoje guardam as peças. Elas precisam sair, ou o personagem nunca mais poderia ser colocado.
- O resumo de turnos antigos de um mapa excluído perde essas posições. Aceitável: o mapa nem existe mais.

**Alternativas**: coluna `campaign_id` desnormalizada ou gatilho, para manter as peças em mapas excluídos. Rejeitadas:
mais estado para zero ganho, já que mapa excluído não volta. Índice parcial por `maps.status` é impossível no PostgreSQL.

## R2. Transferir é um UPDATE, não DELETE + INSERT (FR-003)

**Decisão**: a transferência altera a própria linha (`MapToken.TransferTo(mapId, tokenId, name, x, y)`): troca `map_id`,
posição e zera `look` e os campos de caminhada. O `map_token_id` é preservado.

**Rationale**: uma única instrução é atômica por natureza e não abre janela em que o índice único seria violado. Manter
o id também mantém válida uma ação em preparo na tela do jogador. Nenhuma tabela tem FK para `map_tokens`.

**Alternativas**: apagar e criar em transação. Rejeitada: mais trabalho e mesmo resultado, trocando o id sem motivo.

## R3. Contrato da confirmação (FR-002, FR-006)

**Decisão**: `MapTokenCharacterInsertInfo` ganha `transfer` (bool, padrão false). Com o personagem em outro mapa e
`transfer: false` → 409 `O personagem está no mapa {X}.` O site pergunta antes, usando `mapId`/`mapName` da participação
que o mestre já tem, e só então envia `transfer: true`.

**Rationale**: o MCP e a API recebem a recusa com o nome do mapa no texto; o site não precisa de um formato novo de erro
(`ApiError` só carrega `status` e `message`). Se a informação do site estiver velha, o 409 vira toast e o evento recarrega
o painel.

**Alternativas**: 409 com `mapId` em extensão do `ProblemDetails`. Rejeitada: exigiria mudar `ApiError` para um caso em
que o site já sabe a resposta.

## R4. De onde o jogador sabe o mapa do personagem (FR-010)

**Decisão**: `CampaignCharacterInfo` ganha `mapId`/`mapName`, preenchidos em lote por `MapToDtoAsync`. `GET mine` traz os
do próprio jogador; `GET /api/campaign/{id}/character` só os traz para o mestre (em `ListByCampaignAsync`, que já separa
mestre de jogador).

**Rationale**: `mine` já é carregado por `CharacterContext`, e o personagem escolhido só existe no navegador
(`roll6:character`). O servidor não pode decidir "o mapa escolhido"; ele informa o mapa de cada personagem e o cliente
resolve.

**Temporização**: `openCampaignMapBySlug` e a restauração de `roll6:map` rodam antes de `CharacterContext` ter dados da
campanha. Essas duas rotas buscam `listMine(campaignId)` e resolvem com `readStoredSelections` + `resolveSelection`
(`lib/characterSelection`), que funcionam fora do React. O efeito de seguir usa o contexto, que passa a expor
`participationsLoadedFor`, para que "ainda carregando" não pareça "sem mapa".

## R5. Sinal da mudança de mapa (FR-013, FR-015)

**Decisão**: novo evento `character.map` (`{ campaignCharacterId, mapId }`, `mapId` nulo = saiu de todos), publicado via
`PublishSplitAsync(full, [mestre, dono], null)` depois da gravação em colocação, transferência e retirada de peça.
`CharacterContext` recarrega ao recebê-lo; `MapEditorContext` liga a mensagem quando o evento é do personagem escolhido,
tem `mapId` e o usuário não é mestre.

**Rationale**: hoje colocar ou tirar peça só publica `mapToken.*` do mapa, que nunca chegaria a um jogador em outro mapa.
A mensagem depende do evento, e não da mudança de estado, para não aparecer em `resync`, ao trocar de personagem ou ao
abrir a campanha (spec: US2.3, US3.6). Excluir um mapa publica `party.changed`, sem mensagem: o personagem só fica sem mapa.

**Alternativas**: inferir a mudança comparando `mapId` no cliente. Rejeitada: não distingue reconexão de mudança ao vivo.

## R6. Audiência dos eventos de peça (FR-015)

**Decisão**: `TableEventAudience.For` passa a responder "evento de mapa" ou "todos". Para eventos de mapa, o notifier
resolve mestre + donos de personagens no mapa por uma consulta única `IMapTokenRepository.ListCharacterOwnerIdsAsync(mapId)`
e envia a `ConnectionsOf(user, campaign)`. `mapId` nulo continua indo ao grupo: é um pedido de recarga sem dados.

**Caminhada** (`TableHub.Walk`): hoje vai a `OthersInGroup` e o id do mapa não está na mensagem. O relay passa a usar o
mesmo público, guardado junto com a permissão no cache de 10 s de `TableConnections` (evita consulta a cada amostra, até
10/s). Um atraso de até 10 s para refletir a audiência é aceitável: o cliente ignora peças fora do mapa aberto.

**Publicação depois do commit**: na transferência, o dono já não está no mapa de origem e deixa de receber
`mapToken.deleted`. Correto: a tela dele vai mudar de qualquer forma.

## R7. Turno com vários mapas (FR-018)

**Decisão**:
- **`turns.map_id`**: só o `Movement`, a ação e o `CharacterUpdate` carregam mapa, o do ator. Conversa, enquete, cutucada,
  narração e divisor ficam nulos. As únicas leituras de regra são sobre `Movement`, e a outra dependência (a escolha do
  mapa do resumo) desaparece.
- **Dados do turno**: `TurnDataInfo.maps[]` novo; `TurnDataCharacterInfo`/`TurnDataNpcInfo` ganham `mapId`. O `mapId`
  da raiz **fica**, preenchido só quando há exatamente um mapa, senão nulo.
- **`process_turn`**: estado por mapa (`ProcessMapState`: mapa, modelo, peças, instâncias, ocupação, hexes reclamados),
  em dicionário por `mapId`. A validação final roda por mapa. `TurnProcessInfo` não muda: os itens são por personagem e
  instância, e o mapa se deriva. Mover um personagem entre mapas não é possível por essa via.
- **Resumo**: com um mapa, "## Posições" sai igual a hoje; com mais de um, uma subseção `### {mapa}` por mapa. A comparação
  com o último movimento usa o `MapId` da peça.

**Rationale do `mapId` da raiz**: `processar_turno.py` (repositório `gurps-adventure`) lê `dados.get("mapId")` para ligar
o mapa a um índice local. Mantê-lo no caso de um mapa não quebra a mesa de ninguém; com grupo dividido, o script recebe
`None` e segue sem índice local, sem falhar. Adaptá-lo a `maps[]` é trabalho daquele repositório.

**Sem mudança**:
- **Reset**: já só reverte se `movement.MapId == map.MapId`. Peça em outro mapa fica onde está, e A→B→A funciona.
- **Ação repetida**: já não filtra por mapa; muda só o mapa carimbado, por consulta em lote.
- **`ListOverlapsAsync`**: já percorre mapa a mapa.
- **`ExistsMovementAsync`**: é por ator e turno, então "já se moveu" sobrevive à troca de mapa.

## R8. Quem pode colocar (FR-007, FR-005)

**Decisão**: `PlaceCharacterAsync` exige ser o mestre da campanha (`campaign.UserId`, devolvido por
`EnsureMapEditableAsync`), trocando a checagem por dono do mapa ou do personagem, e passa a recusar destino arquivado com
409 `Este mapa está arquivado.` Essa checagem não existia: nenhum caminho de `MapTokenService` olha `Archived`.

No site, `canPlaceOwn` deixa de habilitar arrastar cards (`PartyPanel`, `acceptsDrag`), mas continua decidindo movimento e
postura (`useTokenMovement`, `lib/mapInteraction`).

## R9. Migração (FR-019)

**Decisão**: tudo em uma migração `RemoveCurrentMap`, com SQL manual antes das alterações de esquema, nesta ordem:

1. Apagar peças de personagens em mapas arquivados ou excluídos.
2. Para cada participação, manter a peça do mapa apontado por `current_map_id`, senão a de maior
   `COALESCE(updated_at, created_at)`, desempate por `map_token_id`.
3. `UPDATE maps SET status = 1 WHERE status = 4`.
4. Remover `fk_map_campaign_current`, `ix_maps_campaign_current`, a coluna `current_map_id`.
5. Trocar o índice único.

**Rationale**: os passos 1–3 precisam de `status = 4` e `current_map_id`, por isso vêm antes. `updated_at` também avança
ao virar a peça, mas ainda é o melhor indício de uso recente.

Migrações aplicam na subida em homolog e produção; a exclusão é irreversível.

## R10. Mapa inicial do mestre (FR-020) e seleção de mesa (FR-014)

**Decisão**: `TableMapInfo` ganha `characterCount` e `characterIds`. `maps` passa a vir também para jogadores, só com
mapas onde há personagens deles. `lib/tableSelect` filtra para o jogador pelo personagem escolhido (localStorage) e mostra
`menu.noMap` quando não há. `lib/viewerMap.masterDefaultMap(maps)` escolhe o maior `characterCount`, depois o maior
`mapId`; aplicado uma única vez por campanha na rota `/campaign/:slug` com nenhum mapa aberto. "Novo mapa" nunca dispara,
porque só vale na primeira resolução daquela campanha.

Sem `map.current`, o combo recarrega em `character.map` e `party.changed`.

## R11. Mensagem na tela (FR-013)

**Decisão**: estado `mapChanging` em `MapEditorContext`; elemento `.stm-map-changing` dentro de `.stm-map-region`
(`MainPage`). Essa região só existe com o mapa na tela, o que cumpre a regra da biblioteca e do layout só de chat sem
checagem extra.

**Quando some**: quando a promessa de `openCampaignMap` termina, respeitando um mínimo de 1,5 s para ser legível, com
limite de 15 s como segurança. `MapEditor.loading` foi descartado: é compartilhado com `saveMap`. Falha mostra toast e
desliga a mensagem. O efeito hoje engole o erro (`catch` vazio) e passa a tratá-lo. Com alterações não salvas o mapa não
muda, mantendo o toast de hoje e sem mensagem.

## R12. Prévia de link (FR-023)

**Decisão**: `ForCampaignAsync` usa a imagem da campanha por uma nova rota anônima
`GET /api/meta/image/campaign/{slug}.jpg`, mesmo renderizador e cache de `image/map/{slug}.jpg`, com 302 para a marca sem
imagem. O texto alternativo vira o nome da campanha. Excluída do MCP como as demais rotas de meta.

**Rationale**: URLs assinadas expiram e não servem para prévias guardadas por outros sites.

## R13. Remoções sem substituto

`PUT /api/campaign/{id}/current-map`, `CampaignCurrentMapInfo`, evento `map.current`, `MapStatus.Current`, `Map.IsCurrent`/
`IsPlayable`/`MakeCurrent`/`LeaveCurrent`, `Campaign.CurrentMapId`/`SetCurrentMap`, `CampaignTableInfo.currentMap*`, MCP
`set_current_map`, e no site `MakeCurrentMapButton`, `lib/currentMap`, `PinMapIcon`, `MAP_STATUS_CURRENT` e os textos
`currentMap.*`. Contagens de `McpCoverageTests`: 133 → 132 e 134 → 133.

`MapGeneratorPrompt.cs:72` diz "mapa atual" com outro sentido e fica como está. `unsaved.message` ("O mapa atual tem
alterações…") muda para "O mapa aberto tem alterações…" por causa do SC-006.
