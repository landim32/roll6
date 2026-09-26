# Research: Servidor MCP do Roll6 (020)

## R1 — SDK

- **Decision**: SDK oficial C# do Model Context Protocol, pacote `ModelContextProtocol.AspNetCore`
  (versão estável atual 2.2.0 — confirmar compatibilidade com `net8.0` na instalação), transporte
  **Streamable HTTP** mapeado em `/mcp` (`app.MapMcp("/mcp")`). Ferramentas declaradas com
  `[McpServerToolType]` / `[McpServerTool(Name = …, ReadOnly = …, Destructive = …, Idempotent = …)]` e
  `[Description]` em métodos e parâmetros; serviços injetados por parâmetro (DI do ASP.NET Core).
- **Rationale**: Q1 → A (remoto hospedado com a API); SDK mantido pela comunidade MCP com a Microsoft; o
  Streamable HTTP é o transporte remoto atual do protocolo (SSE legado não é necessário).
- **Alternatives**: implementar JSON-RPC à mão (protocolo extenso, negociação de versão, sessões);
  servidor Node/TypeScript separado (outra stack, contra a constituição II).

## R2 — Mesmo comportamento da API

- **Decision**: cada ferramenta chama o **mesmo service de domínio** que o controller correspondente, com o
  `userId` do claim `sub` (igual a `CurrentUserId`), e converte exceções com a mesma tabela do
  `ApiControllerBase.HandleException` (400 validação com `errors`, 403, 404, 409, 500). Os services já
  publicam o tempo real (017), então FR-009 vem de graça.
- **Rationale**: os controllers são finos (try/catch + chamada ao service); regras, permissões e validações
  ficam todas nos services → comportamento idêntico sem chamada HTTP interna.
- **Alternatives**: o MCP chamar a própria API por HTTP (loopback) — duplica autenticação e latência sem
  ganho de fidelidade; reaproveitar controllers diretamente (acoplado a `IActionResult`).

## R3 — Formato de resultado e erro

- **Decision**: helper `McpToolRunner.RunAsync(Func<Task<object?>>)` → `CallToolResult`: sucesso = JSON do
  DTO (mesma serialização camelCase da API) em conteúdo de texto **e** `structuredContent`; operações sem
  corpo (204) → `{ "ok": true }`. Falha → `IsError = true` com JSON no formato `ProblemDetails`
  (`status`, `title`, `detail`, `errors`) — as mensagens da API (pt-BR) vão como estão (Q2).
- **Rationale**: o assistente vê o mesmo conteúdo que um cliente HTTP veria; `IsError` permite ao modelo se
  corrigir (o SDK esconderia mensagens de exceções não tratadas).

## R4 — Autenticação

- **Decision**: `app.MapMcp("/mcp").RequireAuthorization()` com a autorização padrão (JWT **ou** chave de
  API, 019 — o esquema padrão já escolhe pelo cabeçalho). O cliente MCP envia
  `X-Api-Key: r6_…` (cabeçalho configurável nos clientes remotos). Sem chave/JWT válido → 401 antes de qualquer
  ferramenta (FR-003, SC-005). O `userId` vem do `HttpContext.User` (`IHttpContextAccessor`).
- **Alternatives**: OAuth 2.1 do MCP (fluxo de autorização completo — desproporcional para o Roll6; pode
  vir depois).

## R5 — Descrições (Q2 → B, inglês)

- **Decision**: cada ferramenta tem descrição em inglês com seções fixas: *What it does*, *Who can use it*,
  *Returns*, *Common errors*, *Related tools*; cada parâmetro descreve tipo, obrigatoriedade, limites,
  unidades e exemplo. Nomes `snake_case` estáveis (`move_map_token`). Anotações do protocolo:
  `ReadOnly` para leituras, `Destructive` para exclusões/remoções/revogações, `Idempotent` para
  PUTs e leituras.
- **Guia**: `Roll6Guide` (texto em inglês: campanha, mestre, participação e status, modelo × mapa, mapa
  atual, grade hexagonal flat-top odd-q com `x` coluna / `y` linha e `look` 0–5 horário a partir do topo,
  custo de movimento, peças Character/Npc/Object, turnos, planos, imagens) exposto como **recurso MCP**
  `roll6://guide`, como **ferramenta** `get_roll6_guide` (clientes que não leem recursos) e resumido nas
  `instructions` do servidor.

## R6 — Onde fica o código

- **Decision**: pasta `Roll6.API/Mcp/` (camada de apresentação, como os controllers): uma classe de
  ferramentas por área (`UserTools`, `ImageTools`, `TokenTools`, `CharacterTools`, `NpcTools`,
  `CampaignTools`, `ParticipationTools`, `CampaignNpcTools`, `MapModelTools`, `MapTools`, `MapTokenTools`,
  `MapNpcTools`, `TurnTools`, `CampaignPlanTools`), `McpToolRunner`, `McpUser` (userId do contexto),
  `Roll6Guide`, `ApiOperationAttribute`. Registro `AddMcpServer().WithHttpTransport().WithToolsFromAssembly()`
  no `Program.cs`, junto com `AddControllers()` (ambos são apresentação); o domínio não muda.

## R7 — Cobertura e paridade verificáveis

- **Decision**: cada ferramenta leva `[ApiOperation("PUT", "/api/maptoken/{id}/position")]`. Um teste
  descobre por reflexão todas as ações dos controllers (método + rota) e exige que as 73 do escopo tenham
  exatamente uma ferramenta, e que as 8 excluídas não tenham (SC-001). Outro teste exige descrição ≥ 80
  caracteres em toda ferramenta e ≥ 20 em todo parâmetro, nomes únicos e anotações coerentes (GET → ReadOnly;
  DELETE → Destructive). Testes de comportamento com services mockados cobrem o mapeamento de erros e uma
  amostra de ferramentas por área (SC-002). Fumaça ponta a ponta: `initialize` → `tools/list` →
  `tools/call` via HTTP com uma chave real.

## R8 — Imagens

- **Decision**: `upload_image(fileName, contentBase64, contentType?)`: decodifica base64 (erro 400 se
  inválido), infere o tipo pela extensão quando não informado e chama `IImageService.UploadAsync` com os
  mesmos limites da API (10 MB, png/jpg/webp). O `/mcp` aceita corpo até ~15 MB (base64 de 10 MB).

## R9 — Proxies

- **Decision**: nginx: `location /mcp` para `api:8080` com `proxy_buffering off` e timeouts longos
  (streaming HTTP); Vite dev proxy `/mcp` (útil para testar localmente). Caddy já encaminha tudo ao `web`.
