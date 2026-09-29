# Research: Administração do log de turnos (030)

Sem itens "NEEDS CLARIFICATION" no Technical Context: a funcionalidade só estende o serviço de turnos existente
(016/024/027/028/029). As decisões abaixo registram as escolhas de desenho.

## D1 — Reaproveitar `POST /api/turn` e `DELETE /api/turn/{id}`

- **Decision**: ampliar a inclusão direta existente (`TurnService.CreateAsync`) para os tipos 4 (CharacterUpdate, com
  `changes`) e 5 (Narration, sem ator) e para `moved` em movimentos; manter a exclusão como está (já é mestre-only e
  vale para qualquer tipo/turno). Nenhuma rota nova para incluir/excluir.
- **Rationale**: uma operação por intenção; o MCP (`create_turn_entry`/`delete_turn_entry`) e quem já usa a API
  continuam funcionando; `McpCoverageTests` exige exatamente uma ferramenta por ação.
- **Alternatives**: rotas `/api/turn/admin/*` separadas — rejeitado, duplicaria regra e ferramenta.

## D2 — Limite do número do turno (1 … turno atual)

- **Decision**: inclusão e alteração exigem `1 ≤ turnNo ≤ campaign.CurrentTurn` (erro de validação no campo
  `turnNo`). Hoje a inclusão aceita turnos futuros; isso passa a ser recusado (400).
- **Rationale**: registros em turnos futuros apareceriam "do nada" quando o turno avançasse e confundiriam o resumo e a
  regra de um movimento por turno. A mudança é compatível com o uso real (sem `turnNo` = turno atual).
- **Alternatives**: permitir futuros — rejeitado (FR-004).

## D3 — Ator precisa pertencer à campanha (inclusão)

- **Decision**: na inclusão, `characterId` precisa ter uma participação na campanha (qualquer status — registros antigos
  podem ser de personagens depois recusados), `npcId` precisa estar disponível na campanha (`CampaignNpc`),
  `mapNpcId` precisa ser uma ocorrência desse NPC em um mapa da campanha e `mapId` um mapa da campanha (inclusive
  arquivado/excluído, já que é histórico). Violação → 400 no campo correspondente.
- **Rationale**: hoje nada impede um registro apontar para um personagem de outra campanha, o que vazaria nomes no
  resumo. Na alteração o ator não muda, então só `mapId` é revalidado.
- **Alternatives**: exigir participação aprovada — rejeitado (bloquearia corrigir histórico de quem saiu).

## D4 — Alteração parcial (`PUT /api/turn/{id}`)

- **Decision**: `TurnUpdateInfo` com todos os campos opcionais; `null` = mantém. Campos aceitos por tipo: texto
  (`description`) para Action/ActionResult/Narration; `beforeX/beforeY/beforeLook/x/y/look/moved` para Movement;
  `changes` (lista substituída inteira, não vazia) para CharacterUpdate; `turnNo` e `mapId` para todos. Campo que não
  vale para o tipo → 400 naquele campo (evita a ilusão de ter gravado). `mapId` não pode ser limpo (fora do escopo).
  O domínio ganha métodos no `Turn` (`MoveToTurn`, `ChangeText`, `ChangeMovement`, `ChangeChanges`, `ChangeMap`) que
  reaproveitam as validações das fábricas. Tipo, ator, autor (`user_id`) e `created_at` nunca mudam.
- **Rationale**: PATCH-like sobre PUT é o padrão já usado em `CampaignCharacterUpdateInfo` (null = mantém) e cabe
  melhor para a IA corrigir um campo só.
- **Alternatives**: substituição completa — rejeitado (obrigaria reenviar posições/texto); PATCH JSON — sem precedente
  no projeto.

## D5 — Definir o turno atual (`PUT /api/campaign/{id}/turn/current`)

- **Decision**: corpo `{ turnNo, discardLaterEntries }`. `turnNo < 1` → 400. Igual ao atual → 200 sem gravar nem
  publicar. Maior → grava e publica `turn.finished` com `{ finishedTurn = turnNo - 1, turnNo }` (o frontend já trata
  como finalização: notificação e console). Menor → se houver registros em turnos `> turnNo`: sem
  `discardLaterEntries` → 409 (`ConflictException` listando os turnos); com ele → exclui esses registros e grava o
  turno na mesma transação (`IUnitOfWork`), publica `turn.changed`. Resposta `TurnSetCurrentResultInfo
  { previousTurn, turnNo, discardedEntries }`. `Campaign.SetCurrentTurn(int)` valida ≥ 1.
- **Rationale**: nenhuma perda silenciosa (SC-003); rota sob a campanha como `turn/finish` e `turn/process`.
- **Alternatives**: manter registros posteriores ao voltar — rejeitado (o turno reaberto misturaria registros de turnos
  "futuros"); mover automaticamente para o novo turno — rejeitado (ambíguo).

## D6 — Avisos em tempo real

- **Decision**: incluir/alterar/excluir registro → `turn.changed` (como hoje). Voltar o turno → `turn.changed`.
  Avançar → `turn.finished`. Nada de evento novo em `TableEventType`.
- **Rationale**: o frontend recarrega estado/entradas do turno em ambos; FR-015 proíbe mudanças no frontend.
- **Limitação conhecida**: ao voltar o turno, o console de turnos aberto num navegador pode continuar mostrando o bloco
  do turno reaberto até recarregar (o console só acrescenta turnos quando `turnNo` sobe). Aceito: operação rara, de
  correção, e o spec exclui mudanças no frontend.

## D7 — Regra de um movimento por turno e processamento

- **Decision**: a administração não aplica `ExistsMovementAsync` nem move peças/valores (FR-005/FR-006). Como a regra
  da mesa consulta os registros, excluir/mover um movimento do turno em andamento libera o personagem para mover de
  novo — comportamento natural, sem código extra.

## D8 — MCP

- **Decision**: novas ferramentas `update_turn_entry` (`PUT /api/turn/{id}`, Destructive, Idempotent) e
  `set_current_turn` (`PUT /api/campaign/{id}/turn/current`, Destructive, Idempotent); `create_turn_entry` ganha
  `changes` (lista `{field, before, after}`) e `moved`, e a descrição passa a citar tipos 4 e 5 e o limite de turno;
  `delete_turn_entry` ganha menção a turnos antigos. `Roll6Guide` ganha um parágrafo "Fixing the turn log".
  `McpCoverageTests`: 83 → 85 ações e 84 → 86 ferramentas; `McpRouteParityTests` cobre as duas rotas novas.
- **Rationale**: regra do projeto — todo endpoint novo tem exatamente uma ferramenta.
