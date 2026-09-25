# Research: Personagens nas Campanhas (Convites e Pedidos de Acesso)

**Feature**: 005-campaign-characters | **Date**: 2026-09-25

Sem incógnitas técnicas; decisões de encaixe no backend existente.

## R1. Máquina de estados no model

- **Decision**: `CampaignCharacter` (Domain) com status `CampaignCharacterStatus` (Invited = 1,
  RequestedAccess = 2, Approved = 3, Denied = 4) e métodos que aplicam as transições da spec:
  `Invite()`, `AcceptInvite()`, `DeclineInvite()`, `ApproveRequest()`, `DenyRequest()`, e a
  fábrica `RequestAccess(campaignOpen)`. Transição inválida → `ConflictException` (409) com a
  mensagem do motivo (ex.: "Personagem convidado: aceite o convite").
- **Rationale**: regras de estado ficam no model (skill `dotnet-architecture`: models ricos),
  testáveis sem banco; o service só cuida de permissões e persistência.
- **Alternatives considered**: `switch` no service — espalha regras; tabela de transições em
  banco — excesso para 4 estados.

## R2. Quem pode fazer o quê (permissões)

| Ação | Quem | Checagem |
|---|---|---|
| Convidar, aprovar, recusar pedido | mestre | `campaign.UserId == userId` |
| Pedir acesso, aceitar/recusar convite | dono do personagem | `character.UserId == userId` |
| Listar convites | qualquer usuário | só convites dos próprios personagens |
| Listar participações da campanha | mestre (todas) / participante aprovado (só Approved) | ver R3 |

Violação → `UnauthorizedAccessException` (403), como no resto da API.

## R3. Acesso de leitura de participantes aprovados

- **Decision**: `ICampaignCharacterRepository.HasApprovedCharacterAsync(campaignId, userId)` —
  existe participação Approved cujo personagem pertence ao usuário. `MapService`
  (`ListByCampaignAsync`, `GetByIdAsync`) e `MapTokenService.ListByMapAsync` passam a aceitar
  "mestre **ou** participante aprovado"; criar/alterar/excluir continuam exigindo o mestre.
- **Rationale**: FR-012/FR-014; uma consulta indexada por campanha resolve a permissão.
- **Alternatives considered**: guardar `user_id` na participação — duplicaria o dono do
  personagem e ficaria errado se o personagem mudasse de dono.

## R4. Campanhas visíveis a todos e nome do dono

- **Decision**: `ICampaignRepository.ListPagedAsync(search, skip, take)` substitui
  `ListByUserPagedAsync` (lista todas; busca opcional por nome com ILIKE). `GetByIdAsync` do
  service deixa de exigir dono. O nome do dono vem de `IUserRepository.ListByIdsAsync(ids)` (nova),
  numa consulta por página — mesmo padrão já usado para MapModel/Token nas listagens.
- **Rationale**: FR-002/FR-003; evita N+1 sem acoplar Campaign a User no Domain.

## R5. Aberta/fechada

- **Decision**: `campaigns.open boolean NOT NULL DEFAULT false` (constituição: booleans com
  default). `CampaignInsertInfo.open` é `bool?` (vazio → false na criação). Nova rota
  `PUT /api/campaign/{id}/open` `{ open }`; `PUT /{id}/name` continua só renomeando.
- **Rationale**: mantém o contrato existente de renomear; abrir/fechar é uma ação distinta.

## R6. Tabela e exclusões

- **Decision**: `campaign_characters` com PK `campaign_character_id`, FKs `fk_campaign_campaign_character`
  e `fk_character_campaign_character` (`ClientSetNull`), `status integer`, timestamps e índice
  único `ix_campaign_characters_campaign_character (campaign_id, character_id)`.
  Excluir campanha → remove as participações dentro da transação já existente; excluir
  personagem → remove as participações e o personagem numa transação (`IUnitOfWork`).
- **Rationale**: FR-004, FR-013; constituição (nunca Cascade, snake_case).

## R7. Rotas

- **Decision**: controller `CampaignCharacterController` (`/api/campaigncharacter`) com ações
  explícitas (`invite`, `request`, `{id}/accept`, `{id}/decline`, `{id}/approve`, `{id}/deny`,
  `invites`) e `GET /api/campaign/{id}/character` no `CampaignController`.
- **Rationale**: cada transição tem permissão diferente; rotas explícitas deixam isso claro e
  seguem o padrão de sub-recursos já usado (`/campaign/{id}/map`).
