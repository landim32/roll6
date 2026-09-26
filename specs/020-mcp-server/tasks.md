# Tasks: Servidor MCP do Roll6

**Input**: Design documents from `/specs/020-mcp-server/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tools.md, quickstart.md

**Tests**: incluídos — a paridade com a API (SC-001/SC-002) e a qualidade das descrições são verificadas por
testes automáticos (xUnit), como nas features anteriores.

**Organization**: US1 conectar (P1), US2 todas as operações como ferramentas (P1), US3 descrições e guia (P2).
Toda ferramenta já nasce com a descrição em inglês no padrão de `contracts/tools.md`; a US3 acrescenta o guia
e os testes que garantem a qualidade.

**Descrição padrão de cada ferramenta** (usar em todas as tarefas de ferramentas): `[Description]` do método
em inglês com as linhas *What it does*, *Who can use it*, *Returns*, *Common errors*, *Related tools*; cada
parâmetro com `[Description]` (tipo/limites/unidade/exemplo); `[ApiOperation("VERB", "/api/rota")]`;
anotações `ReadOnly`/`Destructive`/`Idempotent` conforme a tabela de `contracts/tools.md`; corpo =
`McpToolRunner.RunAsync(() => service.MetodoAsync(McpUser.Id(accessor), …))`, os mesmos argumentos do controller.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [X] T001 Confirmar a base verde (`dotnet test` em `backend/`) e verificar que `ModelContextProtocol.AspNetCore` suporta `net8.0`; instalar a versão mais recente compatível (`dotnet add Roll6.API package ModelContextProtocol.AspNetCore`) em `backend/Roll6.API/Roll6.API.csproj`
- [X] T002 [P] Proxies: nginx `location /mcp` → `api:8080` com `proxy_http_version 1.1`, `proxy_buffering off`, `proxy_read_timeout 3600s`, `client_max_body_size 16m` em `frontend/nginx.conf`; Vite `'/mcp': { target: apiProxy, changeOrigin: true }` em `frontend/vite.config.ts`

---

## Phase 2: Foundational

- [X] T003 [P] `ApiOperationAttribute(string verb, string route)` (AttributeUsage Method) em `backend/Roll6.API/Mcp/ApiOperationAttribute.cs`
- [X] T004 [P] `McpUser.Id(IHttpContextAccessor)` → `long` pelo claim `sub` (mesma lógica do `ClaimsPrincipalExtensions.GetUserId`; sem usuário → `UnauthorizedAccessException`) em `backend/Roll6.API/Mcp/McpUser.cs`
- [X] T005 `McpToolRunner.RunAsync(Func<Task<object?>>)` e `RunAsync(Func<Task>)` → `CallToolResult`: sucesso = JSON camelCase (mesmas `JsonSerializerOptions` da API, `JsonSerializerDefaults.Web`) em `TextContentBlock` + `StructuredContent`; sem corpo → `{ "ok": true }`; exceções → `IsError = true` com JSON `ProblemDetails` pela mesma tabela do `ApiControllerBase.HandleException` (`DomainValidationException` 400 + `errors`, `UnauthorizedAccessException` 403, `KeyNotFoundException` 404, `ConflictException` 409, outras 500 com a mensagem) em `backend/Roll6.API/Mcp/McpToolRunner.cs`
- [X] T006 `Program.cs`: `builder.Services.AddHttpContextAccessor()`, `AddMcpServer(options => ServerInfo Roll6 + Instructions curtas).WithHttpTransport().WithToolsFromAssembly()`; `app.MapMcp("/mcp").RequireAuthorization()` depois de `MapControllers` em `backend/Roll6.API/Program.cs`
- [X] T007 [P] `Roll6.Tests` referencia `Roll6.API`; testes do `McpToolRunner` (sucesso serializa camelCase + structured; cada exceção → status/título/errors certos; sem corpo → ok) em `backend/Roll6.Tests/Roll6.Tests.csproj` e `backend/Roll6.Tests/Mcp/McpToolRunnerTests.cs`

**Checkpoint**: infraestrutura do MCP compila e mapeia erros como a API.

---

## Phase 3: User Story 1 - Conectar um assistente (P1) 🎯 MVP

**Goal**: um cliente MCP com chave de API conecta, lista ferramentas e chama uma.

**Independent Test**: `initialize` → `tools/list` → `tools/call get_my_profile` com `X-Api-Key` devolve o usuário; sem chave → 401.

- [X] T008 [US1] `UserTools.get_my_profile` (GET /api/user/me → `IUserService` como no `UserController.GetMe`) em `backend/Roll6.API/Mcp/Tools/UserTools.cs`
- [X] T009 [US1] Fumaça: subir a API (conexão por variável de ambiente) e, com uma chave real, executar `initialize`, `notifications/initialized`, `tools/list`, `tools/call get_my_profile`; sem chave → 401; chave revogada → 401 (script temporário no scratchpad, não versionado)

**Checkpoint**: conexão e autenticação funcionando.

---

## Phase 4: User Story 2 - Todas as operações como ferramentas (P1)

**Goal**: as 73 operações de `contracts/tools.md`, cada uma chamando o mesmo service do controller.

**Independent Test**: teste de cobertura por reflexão verde + amostra de comportamento por área.

- [X] T010 [P] [US2] `ImageTools.upload_image(fileName, contentBase64, contentType?)`: base64 inválido → 400 `file`; tipo pela extensão (png/jpg/jpeg/webp) quando não informado; `IImageService.UploadAsync(stream, length, contentType)` em `backend/Roll6.API/Mcp/Tools/ImageTools.cs`
- [X] T011 [P] [US2] `TokenTools`: `list_tokens` (page, pageSize, search, mine), `get_token`, `create_token`, `update_token`, `delete_token` — mesmos parâmetros/DTOs do `TokenController` em `backend/Roll6.API/Mcp/Tools/TokenTools.cs`
- [X] T012 [P] [US2] `CharacterTools`: `list_my_characters`, `search_characters`, `get_character`, `create_character`, `update_character`, `delete_character` (`CharacterController`) em `backend/Roll6.API/Mcp/Tools/CharacterTools.cs`
- [X] T013 [P] [US2] `NpcTools`: `list_my_npcs`, `get_npc`, `create_npc`, `update_npc`, `delete_npc` (`NpcController`) em `backend/Roll6.API/Mcp/Tools/NpcTools.cs`
- [X] T014 [P] [US2] `CampaignTools`: `list_campaigns`, `get_campaign`, `create_campaign`, `rename_campaign`, `set_campaign_open`, `delete_campaign`, `set_current_map`, `list_campaign_maps`, `list_campaign_characters`, `list_campaign_npcs`, `list_campaign_plans`, `get_turn_state`, `list_turn_entries`, `finish_turn` (`CampaignController`) em `backend/Roll6.API/Mcp/Tools/CampaignTools.cs`
- [X] T015 [P] [US2] `ParticipationTools`: `request_campaign_access`, `invite_character`, `list_my_invites`, `accept_invite`, `decline_invite`, `approve_access_request`, `deny_access_request`, `list_my_participations`, `get_participation`, `update_participation`, `remove_participation` (`CampaignCharacterController`) em `backend/Roll6.API/Mcp/Tools/ParticipationTools.cs`
- [X] T016 [P] [US2] `CampaignNpcTools`: `add_npc_to_campaign`, `remove_npc_from_campaign` (`CampaignNpcController`) e `MapNpcTools`: `place_npc_on_map`, `update_map_npc`, `delete_map_npc` (`MapNpcController`) em `backend/Roll6.API/Mcp/Tools/CampaignNpcTools.cs` e `backend/Roll6.API/Mcp/Tools/MapNpcTools.cs`
- [X] T017 [P] [US2] `MapModelTools`: `list_map_models`, `get_map_model`, `create_map_model`, `update_map_model`, `delete_map_model` (`MapModelController`) em `backend/Roll6.API/Mcp/Tools/MapModelTools.cs`
- [X] T018 [P] [US2] `MapTools`: `get_map`, `add_map_to_campaign`, `update_map`, `delete_map`, `list_map_tokens`, `list_map_npcs` (`MapController`) em `backend/Roll6.API/Mcp/Tools/MapTools.cs`
- [X] T019 [P] [US2] `MapTokenTools`: `add_object_to_map`, `place_character_on_map`, `move_map_token` (descrição completa de `contracts/tools.md`), `change_map_token_image`, `update_map_token`, `delete_map_token` (`MapTokenController`) em `backend/Roll6.API/Mcp/Tools/MapTokenTools.cs`
- [X] T020 [P] [US2] `TurnTools`: `act_in_turn`, `reset_turn`, `create_turn_entry`, `delete_turn_entry` (`TurnController`) em `backend/Roll6.API/Mcp/Tools/TurnTools.cs`
- [X] T021 [P] [US2] `CampaignPlanTools`: `get_campaign_plan`, `create_campaign_plan`, `update_campaign_plan`, `delete_campaign_plan` (`CampaignPlanController`) em `backend/Roll6.API/Mcp/Tools/CampaignPlanTools.cs`
- [X] T022 [US2] Teste de cobertura: por reflexão, todas as ações dos controllers (verbo + rota montada de `[Route]`/`[Http*]`, sem restrições `:long`/`:int`) menos as 8 excluídas = conjunto de `[ApiOperation]` das ferramentas, sem duplicatas; nomes de ferramenta únicos; total 73 em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs`
- [X] T023 [P] [US2] Testes de comportamento (services mockados, `IHttpContextAccessor` com `sub`): uma leitura e uma escrita por área (ex.: `move_map_token` repassa x/y/look e o usuário; `list_campaigns` repassa `mine`/página; `delete_campaign` de outro → 403 no resultado; validação → 400 com `errors`; `upload_image` base64 inválido → 400) em `backend/Roll6.Tests/Mcp/McpToolsBehaviorTests.cs`

**Checkpoint**: MVP funcional completo (conectar + todas as operações).

---

## Phase 5: User Story 3 - Descrições e guia (P2)

**Goal**: o assistente aprende o Roll6 pelas descrições e pelo guia.

**Independent Test**: teste de qualidade das descrições verde; `resources/read roll6://guide` e `get_roll6_guide` devolvem o guia.

- [X] T024 [US3] `Roll6Guide.Markdown` (inglês): o que é o Roll6; papéis (master/player/owner/approved participant); campanha, participação e status; biblioteca (tokens, characters, NPCs) × campanha; modelo de mapa × mapa da campanha × mapa atual; grade hexagonal flat-top odd-q (`x` coluna, `y` linha, 0-based, `gridWidth`×`gridHeight`, `look` 0–5 horário a partir do topo, custo de movimento); peças Character/Npc/Object; turnos (movement uma vez, actions, reset, finish); planos e imagens (`roll6-image:`); paginação; erros; fluxos comuns com a sequência de ferramentas em `backend/Roll6.API/Mcp/Roll6Guide.cs`
- [X] T025 [US3] Recurso `roll6://guide` (`[McpServerResourceType]`, `text/markdown`) e ferramenta `get_roll6_guide` (ReadOnly, Idempotent, sem `ApiOperation`, excluída da contagem de 73) + `WithResourcesFromAssembly()` e `Instructions` do servidor resumindo o guia e apontando para ele em `backend/Roll6.API/Mcp/GuideTools.cs` e `backend/Roll6.API/Program.cs`
- [X] T026 [US3] Testes de qualidade: toda ferramenta tem descrição ≥ 80 caracteres contendo "Who can use it" e "Returns"; todo parâmetro (exceto serviços injetados) tem descrição ≥ 20; GET → `ReadOnly`+`Idempotent`; DELETE → `Destructive`; guia contém as seções-chave (`look`, `odd`, `turn`) em `backend/Roll6.Tests/Mcp/McpDescriptionTests.cs`
- [X] T027 [US3] Revisão das descrições contra `contracts/tools.md` e o guia (coerência de nomes de ferramentas citadas em *Related tools* — um teste confere que toda ferramenta citada existe) em `backend/Roll6.API/Mcp/Tools/*.cs` e `backend/Roll6.Tests/Mcp/McpDescriptionTests.cs`

**Checkpoint**: todas as stories funcionais.

---

## Phase 6: Polish & Cross-Cutting

- [X] T028 [P] Documentação: seção "MCP server" no `CLAUDE.md` (onde fica, como adicionar ferramenta junto com um endpoint novo — o teste de cobertura falha se esquecer —, autenticação, formato de erro) e tirar o "(planned)" de Recent Changes; instruções de configuração do cliente em `README.md` (se existir seção de API) ou `docs/` via agente `analyst` se necessário
- [X] T029 Rodar `dotnet build` + `dotnet test`; frontend `npm run build` (só proxies mudaram)
- [X] T030 Executar `specs/020-mcp-server/quickstart.md` (fumaça HTTP: `tools/list` com 74 ferramentas, `resources/read`, `tools/call` de mover peça com efeito no tempo real)

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T007) → US1 (T008–T009) → US2 (T010–T023) → US3 (T024–T027) → Polish.
- US2: T010–T021 são arquivos independentes (paralelos); T022 e T023 depois deles.
- US3 depende das ferramentas existirem (os testes varrem todas); T024 → T025 → T026/T027.

## Parallel Opportunities

- T002 com T001; T003, T004 e T007 juntos.
- US2: as 12 classes de ferramentas (T010–T021) em paralelo.
- US3: T026 e T027 juntos depois de T025.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US1 + US2 → assistente conectado com as 73 operações.
2. **Incremento**: US3 → guia e garantia automática da qualidade das descrições.
3. Polish: documentação e fumaça ponta a ponta.

## Notes (implementation)

- T030: HTTP smoke done against the local API (74 tools, guide resource, full table flow via MCP, 409 on a second move, real-time events). `upload_image` answered 500 exactly like `POST /api/image` locally (S3 credentials not available in the dev process) — verify on homolog. The SC-003 run with a real assistant is still manual.
