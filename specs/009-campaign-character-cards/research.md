# Research: Cards dos Personagens da Campanha

## R1. Onde guardar vida/energia atuais

- **Decision**: duas colunas novas em `campaign_characters`: `current_life` e `current_energy`
  (`integer NOT NULL`). `characters.life`/`characters.energy` passam a ser os **totais**.
- **Rationale**: a spec pede o atual "no CampaignCharacter" e independente por campanha; a
  participação já é a linha "personagem nesta campanha".
- **Alternatives considered**: tabela `campaign_character_vitals` (1:1 sem ganho); guardar só no
  personagem (não seria por campanha).
- **Migration**: `AddCampaignCharacterVitals` adiciona as colunas com `defaultValue: 0` e, em seguida,
  `UPDATE campaign_characters cc SET current_life = c.life, current_energy = c.energy FROM characters c
  WHERE c.character_id = cc.character_id` (FR-012 para participações existentes). O modelo EF não
  declara default de banco para essas colunas (valores sempre explícitos), então não precisa de
  `HasSentinel`.

## R2. Quando os valores atuais são (re)iniciados

- **Decision**: o modelo `CampaignCharacter` recebe os totais sempre que a participação é criada ou
  **passa a Approved**: `RequestAccess(..., autoApprove, totalLife, totalEnergy)`,
  `CreateInvite(..., totalLife, totalEnergy)`, `AcceptInvite(totalLife, totalEnergy)`,
  `ApproveRequest(totalLife, totalEnergy)` e `Invite(totalLife, totalEnergy)` (quando vira Approved).
  O service já carrega o personagem nesses fluxos (Approve/Accept passam a carregar também).
- **Rationale**: FR-012 ("ao entrar, atuais = totais") fica garantido no domínio, inclusive se o total
  mudou entre o convite e o aceite.
- **Alternatives considered**: iniciar só na criação (o valor ficaria defasado se o total subisse antes
  da aprovação).

## R3. Regras dos valores

- **Decision**:
  - `CampaignCharacter.SetVitals(currentLife, currentEnergy, totalLife, totalEnergy)`: só com status
    Approved (`ConflictException` senão); `current ≤ total` (`DomainValidationException` em
    `currentLife`/`currentEnergy`); negativos permitidos (caído).
  - `Character.Update`: `life`/`energy` agora `Guard.NonNegative` (são totais; o formulário da 008 já
    exigia ≥ 0). Doc do método atualizado.
  - FR-011: após `CharacterService.UpdateAsync`, `ICampaignCharacterRepository.ClampVitalsAsync(
    characterId, life, energy)` — `ExecuteUpdate` com `LEAST(current, total)` em todas as campanhas.
- **Rationale**: invariantes no domínio; clamp em lote sem carregar linhas.

## R4. Permissão de edição do mestre

- **Decision**: "pode editar o personagem" = dono **ou** mestre de uma campanha em que o personagem
  está `Approved`. Novo `ICampaignCharacterRepository.IsApprovedInCampaignOfAsync(characterId,
  masterUserId)` (join com `campaigns`). Vale para `GET /api/character/{id}` (o mestre precisa da ficha
  para abrir o modal) e `PUT /api/character/{id}`. `DELETE` continua só do dono.
- **Valores atuais**: `PUT /api/campaigncharacter/{id}/vitals` — dono do personagem ou mestre da
  campanha daquela participação.
- **Rationale**: FR-008/FR-009 com a menor mudança; o dono continua sendo o único que exclui.
- **Alternatives considered**: endpoint separado "editar como mestre" (duplicaria validação/mapeamento).

## R5. Dados do painel

- **Decision**: reaproveitar `GET /api/campaign/{id}/character` (mestre vê todos; aprovados veem os
  aprovados — regra da 005). `CampaignCharacterInfo` ganha `currentLife`, `currentEnergy`, `totalLife`,
  `totalEnergy` (os totais vêm do personagem já carregado em lote no `MapToDtoAsync`). O frontend filtra
  `Approved`.
- **Quem consulta**: só quando o usuário é o mestre ou tem personagem próprio aprovado (evita 403 em
  loop); 403 limpa o painel sem toast.
- **Atualização**: a cada 15 s com a aba visível (`visibilitychange` dispara uma atualização ao voltar),
  ao trocar de campanha e após cada edição.
- **Alternatives considered**: endpoint dedicado "party" (mesma informação); WebSocket (fora do
  "simple").

## R6. Frontend

- **Decision**:
  - Estado no `CharacterContext` (já concentra personagens/participações): `party`, `refreshParty`,
    `canEditParty(member)`, `updateVitals`, `getCharacter`, `updateCharacter`.
  - `components/map/PartyPanel.tsx` (lista + recolher) e `PartyCard.tsx`; `VitalBar` com
    `progress` do Bootstrap (altura 6 px; vida `bg-danger`, energia `bg-info`).
  - Regras puras em `lib/vitals.ts`: `vitalPercent(current, total)` (0–100, total 0 → 0),
    `isFallen(currentLife)`, `validateVitals(...)`; testes Vitest.
  - `CharacterFormModal` ganha modo edição (`editing?: { characterId; participation }`): carrega o
    personagem, preenche os campos, mostra a imagem atual com opção de trocar (o `ImageCropper` recebe
    `currentUrl`), aba **Dados** ganha o bloco "Nesta campanha" (vida/energia atuais, podem ser
    negativas, ≤ total). Salvar = `PUT /api/character/{id}` → `PUT …/vitals` → `refreshParty`.
  - Layout: painel absoluto à esquerda, `top: calc(var(--stm-menu-height) + 8px)`, `bottom:
    calc(var(--stm-footer-height) + 8px)`, largura 220 px, rolagem interna; recolhido = aba de 28 px.
    Estado recolhido em localStorage `simple-tabletop-map:party-collapsed` (try/catch).
- **Rationale**: reaproveita o modal da 008 (spec: "abre o modal do cadastro do personagem") e o
  padrão de estado existente.
