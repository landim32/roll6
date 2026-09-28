# Research: Registro completo do turno e resumo em markdown (024)

## R1 — Onde guardar as alterações

- **Decision**: coluna `turns.changes jsonb` com `[{ "field": "currentLife", "before": "10", "after": "6" }]`; no domínio
  `List<TurnChange>` (`Field`, `Before`, `After` como texto), convertida para JSON por um `ValueConverter` no `Roll6Context`.
- **Rationale**: uma alteração pode ter vários campos; uma coluna por campo exigiria mudar a tabela a cada campo novo.
  Valores em texto servem para números e para o status.
- **Alternatives**: tabela `turn_changes` (mais uma entidade para algo que só é lido junto com o turno); texto pronto em
  `description` (perderia a estrutura para o frontend/MCP).

## R2 — Autor obrigatório e registros antigos

- **Decision**: migração em 3 passos — adiciona `user_id` nulo; preenche: registros com `character_id` → dono do
  personagem (`characters.user_id`), demais (NPC) → mestre (`campaigns.user_id`); `ALTER COLUMN user_id SET NOT NULL`
  + FK `fk_user_turn` (`ClientSetNull`) + índice. Resultados (`ActionResult`) antigos com personagem também vão para o
  mestre (só o mestre cria resultados).
- **Rationale**: atende "obrigatório" sem perder histórico; é a melhor aproximação disponível.

## R3 — Quem é o autor em cada escrita

- **Decision**: o `userId` do `sub` (JWT ou chave de API) que chamou o serviço: `MoveAsync`, `ActAsync`, `CreateAsync`
  (resultado/manual do mestre), `ResetAsync` não cria registros; `CampaignCharacterService.UpdateAsync`,
  `MapNpcService.UpdateAsync`, `CharacterService.UpdateAsync` criam `CharacterUpdate` com esse autor.

## R4 — Pontos gastos (`moved`)

- **Decision**: `MapTokenService.MoveAsync` calcula `HexGrid.MovementCost(...)` para toda peça de personagem/NPC (antes
  só para jogadores) e grava em `moved`; se não houver caminho (mestre movendo por cima de peças) grava o custo
  ignorando obstáculos; objetos não geram registro. O resumo mostra "gastou N pontos de movimento (T)", com `T` = soma de
  `moved` do ator no turno (spec, Assumptions).

## R5 — Quando gerar `CharacterUpdate`

- **Decision**: comparar antes/depois dentro do serviço (`TurnChange.Diff`) e só inserir quando a lista não é vazia;
  inserir na mesma transação da alteração e publicar `turn.changed`.
  - Participação: `currentLife`, `currentEnergy`, `characterStatus`, `notes` (valor omitido no texto, spec).
  - Ocorrência de NPC: `name`, `life`, `energy`, `status` → `npc_id` + `map_npc_id`.
  - Personagem (dono): `name`, `life` (total), `energy` (total), `move` → um registro por campanha com participação
    **aprovada**, no turno em andamento de cada uma. Imagem, token, ficha e ficha em arquivo não geram registro.
  - Clamp de vitais causado por baixar o total não gera um segundo registro (já está no registro dos totais).
- **Rationale**: FR-003/FR-004/FR-005.

## R6 — Reset e pendências

- **Decision**: `ResetAsync` passa a apagar só `Movement` e `Action` do ator; `FinishAsync` continua contando só `Action`.
  `ExistsMovementAsync` inalterado. No frontend, `lib/turnStatus` já filtra por tipo; conferir que `CharacterUpdate`
  não vira balão nem rastro.

## R7 — Gerador do resumo

- **Decision**: `Roll6.Domain/Turns/TurnSummary.Build(turnNo, entries, actors, authors, masterUserId, positions)` puro,
  retorna o markdown; `TurnService.GetSummaryAsync(userId, campaignId, turnNo?)` monta os dados:
  - registros do turno (ordem `created_at`, `turn_id`);
  - rótulos: personagem = "Nome (dono)", NPC = "Nome (GM)" (nome da ocorrência quando houver), autor mestre que não é o
    dono = "GM (nome do mestre)";
  - linhas: Movement → "{ator}: Moveu de (x, y) olhando para o {dir} para (x, y) olhando para o {dir}, gastou N pontos de
    movimento (T)" (sem `moved` omite a parte do custo); Action → `{ator}: "texto"`; ActionResult →
    "{autor}: Resultado para {ator}: texto"; CharacterUpdate → "{autor}: Alterou {ator}: Vida de 10 para 6; Energia de 8
    para 5; Status de "a" para "b"" (autor = ator quando o dono altera o próprio personagem, então "Cedric (José): Alterou
    Cedric (José): …" vira "Cedric (José): Alterou: …");
  - posições: mapa atual da campanha (turno em andamento) ou o mapa dos registros do turno (turno passado); peças de
    personagem e NPC ordenadas por nome; para turnos passados, a posição é a do último `Movement` do ator com
    `turn_no ≤ N`, senão a atual;
  - direções: 0 Norte, 1 Nordeste, 2 Sudeste, 3 Sul, 4 Sudoeste, 5 Noroeste;
  - escape de `\ ` * _ [ ] # < >` em nomes e textos livres; sem registros → "Nenhuma ação registrada.".
- **Rationale**: puro = testável com o exemplo da spec como referência fixa.

## R8 — Interface

- **Decision**: `GridSizeFooter` troca o badge por `<button class="badge …">` que abre `TurnLogModal` (mestre ou aprovado —
  quem já tem `turnNo` no `TurnContext`). O modal: `<select>` de turnos (N..1, padrão = atual), `<pre>` com o texto,
  "Copiar" (`navigator.clipboard.writeText`, toast "Resumo copiado"), recarrega quando `TurnContext.entries`/`turnNo`
  mudam (eventos 017 ou polling).
