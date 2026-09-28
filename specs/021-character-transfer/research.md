# Research: Transferir personagem (021)

## R1 — O que precisa mudar no banco

- **Decision**: só `characters.user_id`. Nenhuma migração.
- **Rationale**: `campaign_characters`, `map_tokens` (`campaign_character_id`) e `turns` (`character_id`) apontam para o
  personagem, não para o dono. As demais colunas `user_id` (`map_models`, `campaigns`, `maps`, `tokens`, `npcs`,
  `api_keys`) não pertencem ao personagem. Todas as checagens de jogador (`MapTokenService` mover, `TurnService`
  agir/resetar, `CampaignCharacterService` aceitar convite/editar participação, `CharacterService` dono) leem
  `character.UserId` na hora — trocar o dono troca as permissões (FR-009) e preserva todo o resto (FR-006–008).
- **Alternatives**: copiar o personagem para o novo dono e apagar o antigo — perderia ids, peças e turnos; rejeitado.

## R2 — Atomicidade e concorrência

- **Decision**: `ExecuteUpdateAsync` com `WHERE character_id = @id AND user_id = @from`, gravando `user_id` e `updated_at`;
  0 linhas afetadas → `ConflictException` (409) "O personagem já não pertence a você.".
- **Rationale**: uma única instrução é atômica (FR-010) e resolve duas transferências simultâneas (só a primeira casa
  o `WHERE`).
- **Alternatives**: leitura + update numa transação (janela de corrida); coluna de versão (exigiria migração).

## R3 — Identificação do destinatário

- **Decision**: e-mail exato, normalizado como no login (`Trim().ToLowerInvariant()`), via `IUserRepository.GetByEmailAsync`.
  Vazio/formato inválido → 400 (`errors.email`); não encontrado → 404 "Usuário não encontrado."; o próprio dono → 400.
- **Rationale**: decisão Q1 = A. O 404 revela se um e-mail está cadastrado, mas o cadastro já revela isso (409 no
  e-mail duplicado); a chamada exige login e o e-mail exato.

## R4 — Resposta do endpoint

- **Decision**: `POST /api/character/{id}/transfer` → **204 No Content**.
- **Rationale**: depois da transferência quem chamou não pode mais ler o personagem (`GET` é só do dono); devolver o
  `CharacterInfo` não teria uso. POST porque repetir a chamada não tem o mesmo efeito (a 2ª vez → 403).

## R5 — Tempo real

- **Decision**: após o update, em cada campanha do personagem publicar `party.changed` e `mapTokens.changed`
  (o mesmo `PublishToCampaignsAsync` do update/delete) e chamar `RemoveUserFromCampaignAsync(antigoDono, campanha)`
  quando ele não é o mestre e ficou sem personagem aprovado (mesma regra de `CampaignCharacterService.RemoveOwnerIfNoAccessAsync`).
- **Rationale**: `party.changed` já faz o `CharacterContext` recarregar personagens/participações (`refresh(true)`) e o
  grupo; o combo do antigo dono cai no fallback de `lib/characterSelection`. O novo dono recebe o evento se já está no
  grupo da campanha; se não estiver, o `RealtimeContext` re-tenta o `JoinCampaign` a cada 30 s e a lista
  "Selecionar personagem" recarrega ao abrir — suficiente para a SC-004 (participantes conectados).
- **Alternatives**: grupo SignalR por usuário para avisar o novo dono — fora do escopo (017 é por campanha).

## R6 — Onde fica a opção no frontend

- **Decision**: botão "Transferir" em cada linha de `SelectCharacterModal` ("Selecionar personagem"), que já é a lista
  dos personagens do usuário; abre `TransferCharacterModal` (nome do personagem, e-mail, aviso FR-011, botão vermelho).
  Sucesso → toast, fecha e recarrega; se era o personagem selecionado, o fallback troca a seleção.
- **Alternatives**: item no `CharacterFormModal` — ele também abre para mestre/visualizador; rejeitado.

## R7 — MCP

- **Decision**: ferramenta `transfer_character` (`[ApiOperation("POST", "/api/character/{id}/transfer")]`),
  `Destructive = true` (o chamador perde o personagem), `Idempotent = false`, descrição com `McpDocs.DESTRUCTIVE`.
  `McpCoverageTests`/`McpRouteParityTests`/`McpDescriptionTests` passam a exigir essa ferramenta.
