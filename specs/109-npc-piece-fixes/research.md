# Research: 109-npc-piece-fixes

## R1 — Onde guardar a postura de um objeto

- **Decision**: coluna `map_tokens.posture` (int, padrão 1 Standing), lida só quando `token_type = 4`. Para personagens e
  NPCs a postura continua na participação e na instância; a coluna fica em 1 e é ignorada.
- **Rationale**: um objeto não tem outra linha onde guardar estado; a peça já guarda os campos próprios dele (nome, sheet,
  life…). Usa a mesma configuração EF das outras posturas (`HasDefaultValue` + `HasSentinel((Posture)0)`).
- **Alternatives**: tabela própria (exagero para um campo); reaproveitar `status` (texto livre, quebraria o desenho e o
  espaço).

## R2 — Quem muda a postura de um objeto e o que é publicado

- **Decision**: só o mestre do mapa (403 "Apenas o mestre altera a postura de objetos."), depois de
  `EnsureMapEditableAsync`. Mesmo valor = sem escrita nem evento. Sem registro de turno. Publica `mapToken.upserted` com o
  `MapTokenInfo` (`PublishPieceAsync`). Nunca recusado por falta de espaço (031).
- **Rationale**: objetos já são só do mestre (incluir, trocar token, excluir), e objetos não têm turno (FR-005).

## R3 — Corpo deixado ao retirar

- **Decision**: a regra pura `NpcRemoval.Decide(MapNpc)` devolve `Body` quando a postura não é Standing e `Delete`
  quando é. A peça do corpo vira objeto por `MapToken.LeaveBody(name, posture)`:
  - muda: `MapNpcId = null`, `TokenType = Object`, `Posture` = a da instância, `Name` = o nome da instância;
  - zera: `Life`/`Energy`/`Move` = 0, `Status`/`Sheet` = null, walk limpo;
  - mantém: `X`, `Y`, `Look`, `TokenId`.

  A instância é marcada removida como hoje (`MapNpc.Remove`, que já limpa a ação repetida). Tudo na mesma transação.
- **Caminhos**:
  - `MapNpcService.DeleteAsync`;
  - `MapTokenService.DeleteAsync` (peça de NPC): publica `mapToken.upserted` do corpo em vez de `mapToken.deleted`;
  - `CampaignNpcService.RemoveAsync`: lista as peças com `ListByMapNpcIdsAsync`, converte as caídas e apaga as outras pelos
    ids.
- **Rationale**: uma regra só evita que "Retirar do mapa", o X do card e a retirada da campanha divirjam. O índice único
  de `map_npc_id` não atrapalha, porque a coluna vira null. O token continua em uso pela peça, então `ExistsByTokenAsync`
  já bloqueia apagá-lo.
- **Alternatives**:
  - manter a instância com uma marca de "corpo": continuaria no painel e no turno, o oposto do pedido;
  - criar uma peça nova: mudaria o id, e o tempo real veria um apagar seguido de um criar.

## R4 — Peça duplicada (uma no hex escolhido, outra no meio)

- **Findings**: a única criação de peça de NPC é `MapNpcService.CreateAsync`, e o "meio do mapa" vem de
  `Occupancy.FirstFree`, usado só quando faltam `x`/`y`. Do lado do site:
  - soltar um card (2D `MapCanvas.onDrop`, iso `IsoView.onDrop`) faz um único `placeOnMap(npcId, x, y)`; só uma vista
    fica montada por vez em `MainPage`, e não há outro `onDrop` na árvore;
  - `NpcPickerModal` chama `placeOnMap(npcId)` **sem hex** ao clicar num NPC já na campanha e em `joinAndPlace` (076),
    para um NPC novo com mapa aberto;
  - a ferramenta MCP `place_npc_on_map` aceita omitir `x`/`y`, inclusive quando chamada pelo Claude do Modo GM.

  Nenhum gesto encontrado gera dois POSTs. O resultado relatado (uma peça no hex, outra no meio) bate com esta sequência:
  "Incluir NPC" faz o posicionamento automático, avisado só por um toast; o mestre então arrasta o card para onde
  queria, e esse arrasto **sempre cria** outra instância.
- **Decision**:
  1. A primeira tarefa é reproduzir em dev com o log de rede (2D e iso; "Incluir NPC" com NPC novo e com NPC já na
     campanha; soltar o card) e registrar o resultado aqui. Se aparecer uma requisição dupla, corrigir na origem e cobrir
     com teste.
  2. Independentemente disso, depois de um posicionamento automático a vista centraliza a peça nova
     (`MapEditorContext.centerOn`), e o toast diz onde ela ficou e como mudá-la de lugar (FR-013).
  3. Ao soltar o **cabeçalho** de um NPC cuja instância foi posta automaticamente há menos de 10 s, o site move essa
     instância para o hex em vez de criar outra (guarda de intenção, pura em `lib/mapTokens.npcDropAction` com
     `recentAutoPlaced`). Isso fecha o caso relatado e mantém o comportamento de hoje.
  4. O arrasto da linha da instância (R5) passa a ser o jeito normal de reposicionar.
- **Alternatives**: tirar o posicionamento automático (o usuário pediu para manter); idempotência no servidor (não há
  requisição duplicada a deduplicar, até o diagnóstico mostrar o contrário).

### R4 — Diagnóstico (T001)

Não há PostgreSQL na máquina de desenvolvimento, então o roteiro com o log de rede não pôde ser rodado aqui; o
diagnóstico foi feito pela leitura de todos os caminhos de criação:

- `MapNpcService.CreateAsync` é a única escrita de peça de NPC, e o "meio do mapa" só sai de `Occupancy.FirstFree`
  quando o pedido chega sem `x`/`y`;
- os únicos pedidos sem hex do site são os dois de `NpcPickerModal` ("Incluir NPC"); o soltar do card (2D e iso) manda
  sempre o hex, num único pedido por `drop` (uma única vista montada, um único `onDrop`, `placeOnMap` sem repetição);
- nada no tempo real, no reset ou no processamento cria instâncias.

Conclusão: nenhuma requisição dupla por gesto. As duas peças vêm de dois gestos — "Incluir NPC" (posta perto do meio,
avisada só por toast) seguido do arrasto do card, que criava outra instância. Corrigido pelos itens 2–4 da decisão;
T029/T030 (requisição dupla) não se aplicam. Conferir no roteiro 4 do `quickstart.md` assim que houver um banco.

## R5 — Arrastar uma instância

- **Decision**: cada linha de instância é `draggable` com `MAP_NPC_DRAG_TYPE = 'application/x-roll6-map-npc'` → o
  `mapTokenId`; o `onDragStart` chama `stopPropagation()` e `setDragImage` com o retrato da linha. O cabeçalho continua
  com `NPC_DRAG_TYPE` e passa a usar `setDragImage` com o próprio retrato.

  Ao soltar, `mapNpcDropAction` (pura) devolve uma destas ações:
  - `same`: nada muda;
  - `occupied` ou `blocked`: forma fora da grade ou ocupada, via `lib/occupancy` + `footprint`;
  - `move`: chama `MapTokenContext.moveToken` (PUT position do mestre; o servidor aplica as regras do Mover e do modo
    livre).

  `dropEffect` = `move`. Só o mestre (`canPlace`), como os outros arrastos (108).
- **Rationale**: o HTML5 DnD já é usado pelos cards, e o PUT de posição já valida tudo.

## R6 — Painel sob os botões

- **Decision**: `ResizeObserver` em `MainPage` sobre `.stm-controls`, gravando `--stm-controls-space` = `altura + 8px` em
  `.stm-map-region`. O CSS mantém os valores atuais (240 px / 72 px) como fallback. A fórmula do `max-height` de
  `.stm-party.stm-side-right` continua igual, e o painel já rola por dentro.
- **Rationale**: a coluna muda de altura com "Editar mapa", a vista, o compartilhar e o layout; um número fixo sempre
  fica desatualizado.
- **Alternatives**: aumentar o número fixo (quebra de novo no próximo botão); mover os botões (muda o layout aprovado).
