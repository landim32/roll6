# Contracts: 109-npc-piece-fixes

Nenhuma rota nova. Mudam regras de rotas existentes.

## PUT /api/maptoken/{id}/posture

Corpo: `{ "posture": 1 | 2 | 3 }`

| Peça | Antes | Agora |
|---|---|---|
| Objeto | 400 `posture` "Objetos não têm postura." | Mestre: 200 `MapTokenInfo` (`posture` e `space` atualizados), evento `mapToken.upserted`, sem turno. Outro usuário: 403 "Apenas o mestre altera a postura de objetos.". Mapa não editável: 409, como nas outras escritas. |
| Personagem / NPC | inalterado | inalterado |

## DELETE /api/mapnpc/{id} · DELETE /api/maptoken/{id} (peça de NPC) · DELETE /api/campaignnpc/{id}

Respostas inalteradas (204). Efeito novo: cada instância com postura 2 ou 3 deixa a sua peça no mapa como objeto, com:

- `tokenType: 4`, `mapNpcId: null`, `npcId: null`;
- `name` e `posture` da instância;
- o mesmo `mapTokenId`, `x`, `y`, `look` e `tokenId`.

Instâncias em pé apagam a peça, como hoje.

Eventos: quando a peça vira corpo, `DELETE /api/maptoken/{id}` publica `mapToken.upserted` (o corpo) em vez de
`mapToken.deleted`. Os outros dois caminhos já publicam `mapTokens.changed`.

## MCP

Sem ferramenta nova (contagem inalterada). Descrições a atualizar:

- `set_piece_posture`: objetos aceitos, só o mestre, sem turno;
- as ferramentas de retirar instância, excluir peça e retirar NPC da campanha: o corpo fica no mapa;
- a seção de NPCs/peças do `Roll6Guide`.

## Frontend (tipos de arrasto)

| Tipo | Valor | Origem | Efeito ao soltar |
|---|---|---|---|
| `application/x-roll6-npc` | `npcId` | cabeçalho do card de NPC | nova instância no hex, ou move a instância posta automaticamente há menos de 10 s |
| `application/x-roll6-map-npc` | `mapTokenId` | linha de instância | move a peça para o hex |
