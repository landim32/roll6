# Tasks: Transferir personagem para outro usuário

**Input**: Design documents from `specs/021-character-transfer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: incluídos — o projeto cobre as regras de domínio em `Roll6.Tests` e as regras de formulário com Vitest,
e os testes do MCP exigem uma ferramenta para cada rota nova.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 = transferir; US2 = todos veem o novo dono

---

## Phase 1: Setup

Nada a configurar: sem pacote, projeto ou migração novos (research R1).

---

## Phase 2: Foundational (bloqueia as histórias)

- [X] T001 [P] Criar `CharacterTransferInfo { string Email }` em `backend/Roll6.DTO/Character/CharacterTransferInfo.cs` (mesmo namespace/estilo de `CharacterInsertInfo`, doc comment)
- [X] T002 [P] Adicionar `Task<bool> TransferAsync(long characterId, long fromUserId, long toUserId)` em `backend/Roll6.Infra.Interfaces/Repository/ICharacterRepository.cs` (doc: update condicional; false quando o dono já não é `fromUserId`)
- [X] T003 Implementar `TransferAsync` em `backend/Roll6.Infra/Repository/CharacterRepository.cs` com `ExecuteUpdateAsync` filtrando `CharacterId == characterId && UserId == fromUserId`, gravando `UserId = toUserId` e `UpdatedAt = DateTime.UtcNow`; retorna `affected > 0` (depende de T002)

**Checkpoint**: `dotnet build backend/Roll6.sln` compila.

---

## Phase 3: User Story 1 - Transferir um personagem (Priority: P1) 🎯 MVP

**Goal**: o dono informa o e-mail de outro usuário e o personagem passa a ser dele, com campanhas, vitais, status, fichas, peças e turnos intactos.

**Independent Test**: quickstart passos 1–3, 5–7 (com a API e a lista "Selecionar personagem").

### Tests for User Story 1

- [X] T004 [P] [US1] Testes de `TransferAsync` em `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`: sucesso chama `ICharacterRepository.TransferAsync(id, dono, destino)` com o destinatário achado por e-mail normalizado (`"  B@X.COM "` → `"b@x.com"`); personagem inexistente → `KeyNotFoundException`; não dono → `UnauthorizedAccessException`; e-mail vazio/inválido → `DomainValidationException` com chave `email`; e-mail sem usuário → `KeyNotFoundException("Usuário não encontrado.")`; destinatário = dono → `DomainValidationException`; `TransferAsync` do repositório retornando false → `ConflictException`; em nenhum caso de erro o repositório é chamado para transferir
- [X] T005 [P] [US1] Criar `frontend/src/lib/transferForm.test.ts` para `validateTransferEmail` (vazio → erro obrigatório, formato inválido → erro, espaços nas pontas aceitos e removidos, e-mail válido → sem erro)

### Implementation for User Story 1

- [X] T006 [US1] Adicionar `Task TransferAsync(long userId, long characterId, CharacterTransferInfo info)` em `backend/Roll6.Domain/Interfaces/ICharacterService.cs`
- [X] T007 [US1] Implementar `TransferAsync` em `backend/Roll6.Domain/Services/CharacterService.cs`: `GetOwnedAsync` (404/403); validar o e-mail com `Guard.Email(info.Email, "email")` após `Trim().ToLowerInvariant()`; `_userRepository.GetByEmailAsync` → `KeyNotFoundException("Usuário não encontrado.")`; destino == `userId` → `DomainValidationException` em `email` ("O personagem já é seu."); `_repository.TransferAsync` false → `ConflictException("O personagem já não pertence a você.")` (depende de T001, T003, T006)
- [X] T008 [US1] Endpoint `[HttpPost("{id:long}/transfer")]` em `backend/Roll6.API/Controllers/CharacterController.cs`: `[FromBody] CharacterTransferInfo`, `await _characterService.TransferAsync(CurrentUserId, id, info)`, `return NoContent()`, no padrão `try { } catch (Exception ex) { return HandleException(ex); }` e com `ProducesResponseType` 204/400/403/404/409 como os vizinhos (depende de T007)
- [X] T009 [US1] Ferramenta MCP `transfer_character` em `backend/Roll6.Mcp/Tools/CharacterTools.cs`: `[ApiOperation("POST", "/api/character/{id}/transfer")]`, `[McpServerTool(Name = "transfer_character", Title = "Transfer character", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]`, parâmetros `characterId` e `email` descritos (≥ 20 caracteres), descrição com What it does / Who can use it / Returns / Common errors (400, 403, 404 user not found, 409) / Related tools (`list_my_characters`, `get_character`) e `McpDocs.DESTRUCTIVE`; corpo `api.SendAsync(HttpMethod.Post, $"/api/character/{characterId}/transfer", new CharacterTransferInfo { Email = email })`
- [X] T010 [US1] Atualizar as contagens em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (73 → 74 operações, 74 → 75 ferramentas) e rodar `dotnet test` (cobertura, paridade de rota e descrições devem passar)
- [X] T011 [P] [US1] Criar `frontend/src/lib/transferForm.ts` com `validateTransferEmail(value: string): string | null` (retorna a chave i18n do erro) e `normalizeTransferEmail` (trim), mesmas regras de formato de `lib/userForms.ts`
- [X] T012 [P] [US1] Adicionar `interface CharacterTransferInfo { email: string }` em `frontend/src/types/character.ts` e `transfer(id: number, data: CharacterTransferInfo): Promise<void>` em `frontend/src/Services/characterService.ts` (`POST ${API_BASE}/${id}/transfer`, `getHeaders(true)`, 204 tratado via `handleResponse` sem corpo — seguir o padrão dos outros métodos sem retorno)
- [X] T013 [US1] Expor `transferCharacter(characterId: number, email: string): Promise<void>` em `frontend/src/Contexts/CharacterContext.tsx` via `run(() => characterService.transfer(...))` (recarrega personagens/participações; a seleção cai no fallback de `lib/characterSelection`) e no tipo do contexto (depende de T012)
- [X] T014 [US1] Criar `frontend/src/components/modals/TransferCharacterModal.tsx` conforme `contracts/ui.md` (props `open`, `onOpenChange`, `character: CharacterInfo | null`; `Modal` de `components/ui/Modal`; campo e-mail com autofocus, `alert-warning`, botões Cancelar/Transferir `btn-danger` com spinner; valida com `validateTransferEmail`; sucesso → `toast.success`, fecha; erro → `toast.error`, continua aberto; limpa o campo ao abrir) (depende de T011, T013)
- [X] T015 [US1] Em `frontend/src/components/modals/SelectCharacterModal.tsx`, botão de ícone "Transferir" por personagem (`title`/`aria-label`, desabilitado com `busyId`) que abre `TransferCharacterModal` para aquele personagem (depende de T014)
- [X] T016 [P] [US1] Textos em `frontend/src/i18n/locales/pt-BR.json`: título, descrição, rótulo do e-mail, aviso, botões, erros de validação e toast de sucesso (`{{name}} foi transferido para {{email}}.`)

**Checkpoint**: transferir pela UI e pela API funciona; o novo dono vê o personagem ao abrir "Selecionar".

---

## Phase 4: User Story 2 - Todos veem o novo dono (Priority: P2)

**Goal**: participantes conectados veem a mudança sem recarregar; o antigo dono perde os eventos das campanhas em que ficou sem acesso.

**Independent Test**: quickstart passo 4 com mestre, antigo e novo dono conectados.

### Tests for User Story 2

- [X] T017 [US2] Em `backend/Roll6.Tests/Domain/Services/CharacterServiceTests.cs`: após transferir um personagem presente em 2 campanhas, `IRealtimeNotifier.PublishAsync` recebe `party.changed` e `mapTokens.changed` para cada campanha; `RemoveUserFromCampaignAsync(antigoDono, c)` só é chamado onde ele não é o mestre e `HasApprovedCharacterAsync(c, antigoDono)` é false; nenhuma publicação quando a transferência falha

### Implementation for User Story 2

- [X] T018 [US2] Em `backend/Roll6.Domain/Services/CharacterService.cs`: injetar `ICampaignRepository<Campaign>` (antes do `IRealtimeNotifier`, que continua o último parâmetro; ajustar o construtor nos testes existentes); após o update bem-sucedido, `PublishToCampaignsAsync(campaignIds, userId)` e, para cada campanha, remover o antigo dono do grupo quando não for o mestre e não tiver outro personagem aprovado (mesma regra de `CampaignCharacterService.RemoveOwnerIfNoAccessAsync`)
- [X] T019 [US2] Conferir em `frontend/src/Contexts/CharacterContext.tsx` que `party.changed` recarrega `myCharacters`/`myParticipations` do antigo e do novo dono e que a seleção inválida cai no fallback; se `myCharacters` não for recarregado por `refresh(true)`, incluir o recarregamento

**Checkpoint**: com três navegadores, o card e a peça continuam iguais para o mestre, o combo do antigo dono muda sozinho.

---

## Phase 5: Polish & Cross-Cutting

- [X] T020 [P] Atualizar `CLAUDE.md` (seção de personagens/backend: `POST /api/character/{id}/transfer`, só `characters.user_id` muda, 204, regras de erro; frontend: botão em `SelectCharacterModal` + `TransferCharacterModal`; MCP 74 ferramentas) e `## Recent Changes`
- [X] T021 [P] Acrescentar ao guia `backend/Roll6.Mcp/Roll6Guide.cs` uma linha sobre transferência de personagem (o que é preservado)
- [X] T022 Rodar `dotnet build backend/Roll6.sln`, `dotnet test`, `npm run lint`, `npm test` e `npm run build` em `frontend/`
- [X] T023 Validar o `quickstart.md` contra a API local (`dotnet run --project Roll6.API`) e o frontend

---

## Dependencies & Execution Order

- Phase 2 (T001–T003) bloqueia tudo.
- US1: T004/T005 (testes) → T006 → T007 → T008 → T009 → T010; frontend T011/T012 → T013 → T014 → T015; T016 a qualquer momento.
- US2 depende de T007 (mesmo método) — T017 → T018; T019 depois de T013.
- Polish por último.

### Parallel Opportunities

- T001 ∥ T002; T004 ∥ T005 ∥ T011 ∥ T012 ∥ T016; T020 ∥ T021.
- Backend (T006–T010) e frontend (T011–T016) podem avançar juntos depois da Phase 2.

### Parallel Example: User Story 1

```text
T004 testes do serviço        | T005 testes do formulário
T011 lib/transferForm.ts      | T012 tipo + characterService.transfer | T016 textos pt-BR
```

## Implementation Strategy

1. **MVP**: Phase 2 + US1 — transferência completa pela UI, API e MCP.
2. **Incremento**: US2 — eventos em tempo real e saída do antigo dono dos grupos.
3. Polish: documentação, guia do MCP e validação final.
