# Data Model: Dados do turno e processamento do turno para IA (027)

## Turn (`turns`)

- `TurnType.Narration = 5`: sem `character_id`/`npc_id`/`map_npc_id`; `description` obrigatório (≤ 10000); `user_id` = mestre;
  `map_id` = mapa atual.
- `description`: `varchar(2000)` → `varchar(10000)` (migração `TurnNarration`). Ações/resultados continuam ≤ 2000.

## DTOs (`Roll6.DTO/Turn`)

`TurnDataInfo`: `campaignId`, `turnNo`, `currentTurn`, `mapId?`, `characters: TurnDataCharacterInfo[]`,
`npcs: TurnDataNpcInfo[]`, `actions` (markdown da seção "## Ações").

`TurnDataCharacterInfo`: `characterId`, `campaignCharacterId`, `name`, `playerName`, `currentLife`, `totalLife`,
`currentEnergy`, `totalEnergy`, `status?`, `mapTokenId?`, `x?`, `y?`, `look?`, `lookName?`.

`TurnDataNpcInfo`: `mapNpcId`, `npcId`, `mapTokenId?`, `name`, `currentLife`, `totalLife`, `currentEnergy`, `totalEnergy`,
`status?`, `x?`, `y?`, `look?`, `lookName?`.

`TurnProcessInfo`: `characters: TurnProcessCharacterInfo[]`, `npcs: TurnProcessNpcInfo[]`, `narration?`.

`TurnProcessCharacterInfo`: `characterId` (obrigatório), `currentLife?`, `currentEnergy?`, `status?`, `clearStatus`
(bool, para apagar o status), `x?`, `y?`, `look?` — campos nulos não mudam.

`TurnProcessNpcInfo`: `mapNpcId` (obrigatório) + os mesmos campos opcionais.

`TurnProcessResultInfo`: `finishedTurn`, `turnNo` (novo em andamento), `data: TurnDataInfo` (turno processado).

## Regras de validação (antes de gravar)

- Lote com ao menos um item ou narração; sem itens repetidos.
- Personagem aprovado na campanha; ocorrência pertencente ao mapa atual da campanha.
- Atuais ≤ totais (personagem: totais do personagem; NPC: totais do NPC); podem ser ≤ 0.
- Status ≤ 260 caracteres; narração ≤ 10000.
- Posição: exige peça no mapa atual; `x`/`y` informados juntos; `look` 0–5; dentro da grid; destino final único e livre.
