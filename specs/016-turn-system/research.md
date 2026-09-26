# Research: Sistema de Turnos

## R1 — Modelo

- **Decision**: tabela `turns` com um registro por evento: `campaign_id`, `map_id?`, `character_id?`,
  `npc_id?`, `map_npc_id?` (ocorrência do NPC, pela clarificação Q1), `turn_no`, `turn_type` (1 Movement,
  2 Action, 3 ActionResult), `before_x/y/look?`, `x/y/look?`, `description varchar(2000)?`, `created_at`.
  Regras no modelo: exatamente um de personagem/NPC; NPC exige `map_npc_id` quando vem de uma peça;
  Movement exige antes/depois; Action/ActionResult exigem texto. `campaigns.current_turn` (int, default 1)
  e `Campaign.AdvanceTurn()`.
- **Rationale**: é a entidade pedida ("Turn"), mais a ocorrência de NPC exigida pela Q1; o número do turno
  atual fica na campanha para não depender de contar registros.
- **Alternatives**: tabela de turnos + tabela de eventos — mais normalizado, mas foge do pedido.

## R2 — Movimento único e registro

- **Decision**: `MapTokenService.MoveAsync` passa a, para peças de personagem/NPC: recusar (409 "Já se
  moveu neste turno.") se já existe Movement do mesmo personagem (ou da mesma ocorrência de NPC) no turno
  atual; senão gravar o movimento e o registro Movement (antes/depois) na mesma transação. Objetos não
  registram nem têm limite.
- **Rationale**: FR-006; uma só porta de entrada para movimentos.

## R3 — Ações, reset e resultados

- **Decision**:
  - `POST /api/turn/action { mapTokenId, description }`: personagem (dono ou mestre) ou NPC (mestre) da
    peça; grava Action no turno atual com o mapa da peça.
  - `POST /api/turn/reset { mapTokenId }`: dono ou mestre; apaga os registros do personagem/ocorrência no
    turno atual; se houver Movement, devolve a peça a `before_*` se o hex estiver livre (senão mantém a
    posição e responde com aviso `reverted=false`).
  - `POST /api/turn` (mestre): criação direta de qualquer tipo, inclusive ActionResult (só por API);
    `DELETE /api/turn/{id}` (mestre).
- **Rationale**: FR-003/005/007; o jogador nunca escreve registros "soltos".

## R4 — Finalizar

- **Decision**: `POST /api/campaign/{id}/turn/finish { force }` (mestre): calcula os personagens aprovados
  sem Action no turno atual; com pendentes e `force = false` → 200 `{ finished: false, pending: [nomes] }`;
  senão incrementa `current_turn` → `{ finished: true, turnNo: N+1, finishedTurn: N }`.
- **Rationale**: FR-010 com "Finalizar mesmo assim" (Q3) sem usar erro HTTP para um fluxo normal.

## R5 — Estado do turno e polling

- **Decision**: `GET /api/campaign/{id}/turn` (mestre + participantes aprovados) → `{ turnNo, entries }`
  com os registros do turno atual (nomes já resolvidos). `GET /api/campaign/{id}/turn/{turnNo}` → resumo de
  um turno. O `TurnContext` consulta o estado a cada 15 s com a aba visível e após cada ação do usuário.
- **Rationale**: FR-014/SC-002 com o mesmo padrão do painel de personagens.

## R6 — Notificação de fim de turno

- **Decision**: quando o `turnNo` recebido é maior que o anterior (ou após o próprio mestre finalizar), o
  `TurnContext` adiciona uma notificação "Turno N finalizado" à lista local; o `NotificationBell` mostra-as
  junto dos convites; clicar abre o `TurnSummaryModal` do turno N. Última notificação lida guardada em
  localStorage por campanha (`roll6:turn-seen`).
- **Rationale**: FR-011 sem infraestrutura de push; usa o sino existente.

## R7 — Status, rastros e balões (frontend, puro)

- **Decision**: `lib/turnStatus.ts`:
  - `pieceStatus(entries, piece)` → `none | moved | acted` (personagem por `characterId`; NPC por
    `mapNpcId`);
  - `npcStatus(entries, npcId, pieces)` → pior status entre as ocorrências (vermelho se alguma sem nada,
    amarelo se alguma só moveu, verde se todas agiram);
  - `characterStatus(entries, characterId)`;
  - `lastActions(entries, pieces)` → texto da última Action por peça do mapa aberto;
  - `movementTrails(entries, mapId)` → antes/depois de cada Movement do mapa.
  `TurnTrailLayer` desenha cada rastro pelo caminho mínimo da BFS (015) do estado antes ao depois,
  ignorando obstáculos atuais (linha reta se nada for achado). `SpeechBubbleLayer` usa `foreignObject`
  acima de cada peça com um balão (div com ponta), texto truncado em 3 linhas e completo no `title`.
- **Rationale**: FR-008/012/013 testáveis sem DOM.

## R8 — Integridade

- **Decision**: FKs `ClientSetNull`; limpeza nos services: excluir ocorrência de NPC (`MapNpc`) → apaga os
  registros dela; excluir personagem → apaga seus registros; excluir NPC → apaga seus registros; excluir
  campanha → apaga os registros da campanha; retirar NPC da campanha → apaga registros das ocorrências
  removidas.
- **Rationale**: constituição (sem cascade) e FKs consistentes.
