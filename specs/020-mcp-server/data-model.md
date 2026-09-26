# Data Model: Servidor MCP (020)

Nenhuma tabela ou migração: o MCP é uma camada de apresentação sobre os services existentes.

## Ferramenta (código)

| Elemento | Onde | Regras |
|---|---|---|
| Nome | `[McpServerTool(Name = "snake_case")]` | único, estável, ver `contracts/tools.md` |
| Descrição | `[Description]` no método | inglês, ≥ 80 caracteres, seções *What it does / Who can use it / Returns / Common errors / Related* |
| Parâmetros | argumentos do método + `[Description]` | inglês, ≥ 20 caracteres; nomes camelCase dos DTOs; obrigatórios sem valor padrão |
| Anotações | `ReadOnly`, `Destructive`, `Idempotent` | GET → ReadOnly+Idempotent; DELETE, revogar/remover/resetar → Destructive; PUT → Idempotent |
| Operação | `[ApiOperation("VERB", "/api/rota")]` | exatamente uma operação da API do escopo por ferramenta |
| Execução | `McpToolRunner.RunAsync` | chama o service com `McpUser.Id(context)`; mapeia exceções como `HandleException` |

## Guia

`Roll6Guide.Markdown` (constante em inglês) servido pelo recurso `roll6://guide`, pela ferramenta
`get_roll6_guide` e resumido nas `instructions` do servidor.

## Identidade

`McpUser.Id(HttpContext)` = claim `sub` (chave de API da 019 ou JWT); ausente → a requisição nem chega às
ferramentas (401 do endpoint `/mcp`).
