# Research: Deslocamento do personagem na campanha (037)

Todas as decisões abaixo saem do código atual (feature 031 — postura — é o precedente mais próximo: um campo da participação,
editável por dono/mestre, registrado no turno e aceito pelo `process_turn`). Nenhum `NEEDS CLARIFICATION` ficou aberto.

## D1 — Onde o valor fica

- **Decision**: nova coluna `campaign_characters.current_move integer not null` (propriedade `CampaignCharacter.CurrentMove`).
- **Rationale**: é por campanha (Clarification Q1), ao lado de `current_life`/`current_energy`, e segue o mesmo ciclo de vida
  (`ResetFrom`). Peças de personagem já leem tudo da participação (`MapTokenService.MapToDtoAsync`).
- **Alternatives considered**: coluna nullable "null = usa o Movimento" (opção C da clarificação, rejeitada); valor por peça
  (`map_tokens.move`, opção B, rejeitada — trocar de mapa perderia o ajuste).

## D2 — Migração e preenchimento

- **Decision**: migração `AddCampaignCharacterMove` adiciona a coluna com `defaultValue: 0` e, na mesma migração,
  `UPDATE campaign_characters cc SET current_move = c.move FROM characters c WHERE c.character_id = cc.character_id`; script
  incremental `database/migrations/037-campaign-move.sql` com o mesmo conteúdo (padrão de 029/031/036). Sem `HasDefaultValue`
  no `Roll6Context` (o domínio sempre define o valor em `ResetFrom`), portanto sem `HasSentinel`.
- **Rationale**: FR-002 (participações existentes recebem o Movimento atual) e SC-005 (nada muda para quem nunca ajustou).

## D3 — Limite usado no movimento

- **Decision**: em `MapTokenService.MapToDtoAsync`, peças de personagem passam a devolver `Move = participation.CurrentMove`
  (antes `character.Move`); `EnsurePlayerMoveAsync` compara o custo com `participation.CurrentMove`.
- **Rationale**: o frontend já usa `MapTokenInfo.move` como total do modo Mover (`useTokenMovement`: `total: token.move`), então
  contador, cor do caminho e servidor mudam juntos sem tocar em `lib/movement.ts` nem em `hexGrid`. O mestre continua sem limite
  (`free`), e NPCs/objetos não mudam.

## D4 — Permissão e atualização parcial

- **Decision**: `CampaignCharacterUpdateInfo.CurrentMove` é `int?` — null/omitido mantém (como `posture`, `tokenId`, `sheetFile`).
  A permissão é a que `CampaignCharacterService.UpdateAsync` já aplica (dono do personagem **ou** mestre, Clarification Q3);
  qualquer outro → 403. Novo método de domínio `CampaignCharacter.ChangeMove(int)` (só aprovado; `Guard.NonNegative(…, "currentMove")`;
  devolve false quando igual).
- **Rationale**: clientes atuais (MCP antigo, telas) que não mandam o campo não zeram o valor.
- **Limite máximo**: nenhum, igual ao `Character.Move` (`Guard.NonNegative`); pode passar do Movimento.

## D5 — Acompanhar o Movimento da ficha

- **Decision**: `ICampaignCharacterRepository.FollowMoveAsync(characterId, oldMove, newMove)` —
  `ExecuteUpdate … WHERE character_id = @id AND current_move = @oldMove SET current_move = @newMove`, chamado em
  `CharacterService.UpdateAsync` dentro da transação existente, só quando o Movimento mudou (ao lado de `ClampVitalsAsync`).
- **Rationale**: Clarification Q2 (acompanha só quando não ajustado). O turno já registra "Movimento de X para Y" por campanha
  (024); não se cria um segundo registro de "Deslocamento" para o acompanhamento automático. `PublishToCampaignsAsync` já avisa
  as mesas (`party.changed` + `mapTokens.changed`).

## D6 — Registro no turno

- **Decision**: chave de diff `"currentMove"` em `TurnChange.Diff` (`CampaignCharacterService.UpdateAsync` e `process_turn`);
  `TurnSummary` ganha o rótulo `"currentMove" => "Deslocamento"` e a chave entra em `NUMBER_FIELDS`.
- **Rationale**: FR-008; mesmo formato de "Postura"/"Vida".

## D7 — Dados e processamento de turno (027)

- **Decision**: `TurnDataCharacterInfo` ganha `currentMove` e `move` (Movimento da ficha); `TurnProcessCharacterInfo` (não a classe
  base, que é compartilhada com NPCs) ganha `currentMove?`, validado no lote (`characters[i].currentMove`, ≥ 0) e gravado/registrado
  junto com o resto.
- **Rationale**: FR-009; NPCs fora do escopo.

## D8 — Leitura nas listas e no detalhe

- **Decision**: `CampaignCharacterInfo` (e, por herança, `CampaignCharacterDetailInfo`) ganha `currentMove`; `characterMove`
  continua sendo o Movimento da ficha.
- **Rationale**: a janela "Personagem na Campanha" carrega o detalhe; manter `characterMove` evita quebrar quem já o lê.

## D9 — Frontend

- **Decision**: `CampaignCharacterModal` ganha o campo "Deslocamento" em "Nesta campanha" (input numérico na linha de vida/energia,
  editável nos modos owner/master, leitura no modo viewer); `lib/campaignCharacterForm` valida (`currentMove` inteiro ≥ 0, erro
  `campaignCharacter.moveInvalid`) e envia `currentMove` em `toCampaignUpdate`; `types/campaignCharacter.ts` ganha `currentMove`;
  chaves i18n `characterForm.currentMove` e o erro. Nenhum context/provider novo.
- **Rationale**: FR-004; o modo Mover não muda (D3).

## D10 — MCP (020)

- **Decision**: `update_participation` ganha `currentMove` (int?, "null keeps"); descrições de `get_participation`,
  `get_turn_data`, `process_turn` e o guia (`roll6://guide`, seção de personagens/movimento) explicam que o Deslocamento é o limite
  de movimento do jogador nesta campanha, que dono e mestre o alteram e que acompanha o Movimento enquanto não ajustado.
  Nenhum endpoint novo → `McpCoverageTests` continua em 86 operações / 87 tools; `McpRouteParityTests` sem mudança de rota.
