# Implementation Plan: Servidor MCP do Roll6

**Branch**: `020-mcp-server` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/020-mcp-server/spec.md`

## Summary

Servidor MCP remoto (Q1 → A) hospedado na própria API em `/mcp` (Streamable HTTP, SDK oficial
`ModelContextProtocol.AspNetCore`), autenticado pelas chaves de API da 019 (ou JWT). Cada uma das 73
operações da API do escopo vira uma ferramenta que chama o **mesmo service de domínio** do controller e
mapeia erros com a mesma tabela — comportamento idêntico, inclusive tempo real (017). Descrições e o guia
do Roll6 em inglês (Q2 → B), detalhadas e padronizadas, com anotações read-only/destructive/idempotent.
Testes por reflexão garantem que toda operação da API do escopo tem exatamente uma ferramenta.

## Technical Context

**Language/Version**: C# 12 / .NET 8
**Primary Dependencies**: `ModelContextProtocol.AspNetCore` (NuGet, SDK oficial MCP, 2.x) — dependência
nova; restante existente (ASP.NET Core, services de domínio, autenticação 019)
**Storage**: N/A (sem tabelas novas)
**Testing**: xUnit + Moq + FluentAssertions (cobertura por reflexão, qualidade das descrições, mapeamento de
erros, amostra de ferramentas); fumaça HTTP `initialize`/`tools/list`/`tools/call`
**Target Platform**: API Linux (Docker homolog/prod) atrás de nginx/Caddy
**Project Type**: web service (camada de apresentação adicional)
**Performance Goals**: mesma latência das rotas da API (uma chamada de service por ferramenta)
**Constraints**: comportamento idêntico à API; nada executa sem credencial; sem regras duplicadas
**Scale/Scope**: 73 ferramentas + guia

## Constitution Check

| Princípio | Situação |
|---|---|
| I. Skills obrigatórias | Não há entidades novas; o MCP é apresentação sobre services existentes (a skill `dotnet-architecture` é seguida no posicionamento: nada no domínio muda, DI de apresentação no `Program.cs` como `AddControllers`). ✅ |
| II. Stack fixa | Continua .NET 8/ASP.NET Core; `ModelContextProtocol.AspNetCore` é biblioteca de protocolo (como o Swashbuckle para OpenAPI), pedida explicitamente pelo usuário ("crie um MCP"). ✅ (justificada em Complexity Tracking) |
| III. Casing | Só backend. ✅ |
| IV. Convenções | PascalCase/`_camelCase`; saída JSON camelCase como a API; erros no formato `ProblemDetails`. ✅ |
| V. Banco | Sem mudanças. ✅ |
| VI. Segurança | `/mcp` exige autorização (chave ou JWT); operações de login humano não expostas; permissões nos services. ✅ |
| VII. Hex grid | Descrições explicam `x`/`y` odd-q e `look` 0–5 conforme o guia Red Blob; nenhuma matemática nova. ✅ |

**Resultado**: sem violações; reavaliado após o design — sem mudanças.

## Project Structure

### Documentation (this feature)

```text
specs/020-mcp-server/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/tools.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.API/Roll6.API.csproj (+ModelContextProtocol.AspNetCore)
├── Roll6.API/Program.cs (AddMcpServer().WithHttpTransport().WithToolsFromAssembly().WithResources…; MapMcp("/mcp").RequireAuthorization())
├── Roll6.API/Mcp/
│   ├── McpToolRunner.cs, McpUser.cs, ApiOperationAttribute.cs, McpJson.cs
│   ├── Roll6Guide.cs (+ GuideResources/GuideTools)
│   └── Tools/ UserTools, ImageTools, TokenTools, CharacterTools, NpcTools, CampaignTools,
│              ParticipationTools, CampaignNpcTools, MapModelTools, MapTools, MapTokenTools,
│              MapNpcTools, TurnTools, CampaignPlanTools
└── Roll6.Tests/Mcp/ McpCoverageTests.cs, McpDescriptionTests.cs, McpToolRunnerTests.cs, McpToolsBehaviorTests.cs
    (Roll6.Tests passa a referenciar Roll6.API)

frontend/
├── nginx.conf (location /mcp sem buffering)
└── vite.config.ts (proxy /mcp)
```

**Structure Decision**: as ferramentas moram no projeto `Roll6.API`, ao lado dos controllers: são outra
porta de entrada para os mesmos services.

## Complexity Tracking

| Item | Por que é necessário | Alternativa mais simples rejeitada porque |
|---|---|---|
| Pacote `ModelContextProtocol.AspNetCore` | Implementa o protocolo MCP (negociação, sessões, JSON-RPC, streaming HTTP) pedido pelo usuário | Implementar o protocolo à mão seria extenso e frágil |
| Referência `Roll6.Tests` → `Roll6.API` | Testes de cobertura por reflexão precisam ver controllers e ferramentas | Sem ela a garantia de "todas as operações" (SC-001) seria manual |
