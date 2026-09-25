<!--
Sync Impact Report
==================
Version change: 3.0.0 → 4.0.0
Bump rationale: MAJOR — Principle VII redefined: positions are now persisted as column/row
(`x`, `y`) in the "odd-q" offset layout instead of axial `(q, r)`; axial/cube stays the form
used for calculations. Flat-top orientation made explicit (feature 002). Driven by feature
004-maptoken-position-look.

Previous:
- 2.0.0 → 3.0.0 — MAJOR — removed the Portuguese response envelope convention (`Result` DTOs
with `sucesso`, `mensagem`, `erros`) from Principle I and added to Principle IV that HTTP
responses follow the ASP.NET Core standard (DTO directly on success, ProblemDetails on
errors).

Previous:
- 1.0.1 → 2.0.0 — MAJOR, removed NAuth and zTools (stack and auth rows); auth mechanism and
  image storage client are decided per feature plan.
- 1.0.0 → 1.0.1 — PATCH, removed the fixed localStorage key.
- (template, unversioned) → 1.0.0 — first ratification.

Principles (template slot → new title):
- [PRINCIPLE_1_NAME] → I. Skills de Arquitetura Obrigatórias
- [PRINCIPLE_2_NAME] → II. Stack Tecnológica Fixa
- [PRINCIPLE_3_NAME] → III. Case Sensitivity de Diretórios (Inviolável)
- [PRINCIPLE_4_NAME] → IV. Convenções de Código
- [PRINCIPLE_5_NAME] → V. Convenções de Banco de Dados (PostgreSQL)
- Added → VI. Autenticação e Segurança
- Added → VII. Grid Hexagonal (Red Blob Games) — project-specific, derived from the
  product brief (not in the supplied input); remove if undesired.

Added sections:
- Variáveis de Ambiente e Tratamento de Erros (replaces [SECTION_2_NAME])
- Fluxo de Desenvolvimento e Checklist (replaces [SECTION_3_NAME])

Removed sections: none

Templates / guidance:
- ✅ .specify/templates/plan-template.md — "Constitution Check" gates are derived at plan
  time from this file; no static text to change.
- ✅ .specify/templates/spec-template.md — no constitution-driven mandatory sections added.
- ✅ .specify/templates/tasks-template.md — tests remain optional; no new task categories.
- ✅ CLAUDE.md — NAuth/zTools references removed.
- ⚠ .claude/skills/react-architecture/SKILL.md — still types API responses with
  `sucesso`/`mensagem`/`erros` and checks `result.sucesso`. The frontend feature must follow
  this constitution (DTO + ProblemDetails) instead; update the skill or override in the plan.
- ⚠ .claude/agents/ux-designer.md — targets Tailwind + shadcn/ui, conflicting with
  Principle II (Bootstrap 5). Pending manual decision.

Deferred TODOs: none
-->

# Roll6 Constitution

> Padrões obrigatórios de stack tecnológica, convenções de código, arquitetura e segurança que
> devem ser seguidos por todos os contribuidores.

## Core Principles

### I. Skills de Arquitetura Obrigatórias

Novas entidades e funcionalidades DEVEM ser implementadas usando as skills abaixo. É PROIBIDO
reimplementar manualmente os padrões que elas cobrem.

| Skill | Quando usar | Invocação |
|---|---|---|
| **dotnet-architecture** | Criar/modificar entidades, services, repositories, DTOs, migrations, DI no backend | `/dotnet-architecture` |
| **react-architecture** | Criar Types, Service, Context, Hook e registrar Provider no frontend | `/react-architecture` |

Essas skills são a fonte de verdade para:

- Estrutura de projetos e fluxo de dependência (Clean Architecture no backend).
- Repositórios genéricos, mapeamento manual e DI centralizado.
- Configuração de DbContext, Fluent API e migrações via `dotnet ef`.
- Padrões de arquivos frontend (Types, Services, Contexts, Hooks), provider chain e registro
  de novos providers.
- Tratamento de erros no frontend (`handleError`, `clearError`, loading state).
- Nomeação de DTOs (`Info`, `InsertInfo`).

**Rationale**: um único padrão executado por skill elimina divergência entre contribuidores.

### II. Stack Tecnológica Fixa

**Backend**

| Tecnologia | Versão | Finalidade |
|---|---|---|
| .NET | 8.0 | Runtime e framework principal |
| Entity Framework Core | 9.x | ORM e migrações |
| PostgreSQL | Latest | Banco de dados relacional |
| Swashbuckle | 8.x | Swagger / OpenAPI |

**Frontend**

| Tecnologia | Versão | Finalidade |
|---|---|---|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Tipagem estática |
| React Router | 6.x | Roteamento SPA |
| Vite | 6.x | Build toolchain |
| Bootstrap | 5.x | Sistema de grid e componentes base |
| i18next | 25.x | Internacionalização |
| Axios | 1.x | HTTP client (legado) |
| Fetch API | Nativo | HTTP client (novos serviços) |

Regras:

- Vite é o bundler obrigatório — NÃO usar CRA, Webpack manual ou outros bundlers.
- EF Core é o único ORM permitido — NÃO introduzir Dapper ou similares.
- Context API é o padrão de estado — NÃO adicionar Redux, Zustand, MobX ou similares.
- NÃO executar `docker` ou `docker compose` no ambiente local — Docker não está acessível.
- Variáveis de ambiente do frontend usam o prefixo `VITE_`; NÃO usar `REACT_APP_`.
- Novos serviços HTTP no frontend DEVEM usar Fetch API; Axios fica restrito a código legado.

**Rationale**: uma stack fechada mantém o projeto simples e compatível com as skills.

### III. Case Sensitivity de Diretórios (Inviolável)

| Diretório | Casing | Motivo |
|---|---|---|
| `Contexts/` | Uppercase C | Compatibilidade Docker/Linux |
| `Services/` | Uppercase S | Compatibilidade Docker/Linux |
| `hooks/` | Lowercase h | Convenção React |
| `types/` | Lowercase t | Convenção TypeScript |

Todos os imports DEVEM corresponder exatamente ao casing no disco.

**Rationale**: Windows ignora o casing, mas o build Linux/Docker falha com imports divergentes.

### IV. Convenções de Código

**Backend (.NET)**

| Elemento | Convenção | Exemplo |
|---|---|---|
| Namespaces | PascalCase, file-scoped | `namespace Roll6.Domain.Services;` |
| Classes / Interfaces | PascalCase | `CampaignService`, `ICampaignRepository` |
| Métodos | PascalCase | `GetById()`, `MapToDto()` |
| Propriedades | PascalCase | `CampaignId`, `CreatedAt` |
| Campos privados | _camelCase | `_repository`, `_context` |
| Constantes | UPPER_CASE | `BUCKET_NAME` |

**Frontend (TypeScript/React)**

| Elemento | Convenção | Exemplo |
|---|---|---|
| Componentes | PascalCase | `LoginPage`, `CampaignCard` |
| Interfaces | PascalCase | `CampaignContextType` |
| Variáveis / Funções | camelCase | `getHeaders`, `loadCampaigns` |
| Constantes | UPPER_CASE | `AUTH_STORAGE_KEY` |
| Tipos | `interface` (não `type`) | `interface CampaignInfo {}` |
| Funções | Arrow functions | `const fn = () => {}` |
| Variáveis | `const` por padrão | `const campaigns = []` |

**JSON**: toda propriedade de DTO no backend DEVE ter `[JsonPropertyName("camelCase")]`; o
frontend acessa os campos diretamente em camelCase nos tipos TypeScript.

**Respostas HTTP**: seguem o padrão do ASP.NET Core, sem envelope próprio. Sucesso devolve o
DTO diretamente (`Ok(dto)`, `CreatedAtAction(...)`, `NoContent()`); erros de validação e de
negócio devolvem `ProblemDetails` / `ValidationProblemDetails` (RFC 7807) com o status HTTP
adequado.

### V. Convenções de Banco de Dados (PostgreSQL)

| Elemento | Convenção | Exemplo |
|---|---|---|
| Tabelas | snake_case plural | `campaigns`, `campaign_entries` |
| Colunas | snake_case | `campaign_id`, `created_at` |
| Primary Keys | `{entidade}_id`, bigint identity | `campaign_id bigint PK` |
| Constraint PK | `{tabela}_pkey` | `campaigns_pkey` |
| Foreign Keys | `fk_{pai}_{filho}` | `fk_campaign_entry` |
| Delete behavior | `ClientSetNull` | Nunca Cascade |
| Timestamps | `timestamp without time zone` | Sem timezone |
| Strings | `varchar` com MaxLength | `varchar(260)` |
| Booleans | `boolean` com default | `DEFAULT true` |
| Status/Enums | `integer` | `DEFAULT 1` |

Configuração de DbContext, Fluent API e comandos de migração seguem a skill
`dotnet-architecture`.

### VI. Autenticação e Segurança

| Aspecto | Padrão |
|---|---|
| Storage (frontend) | localStorage |
| Proteção de rotas | Atributo `[Authorize]` nos controllers |

Regras:

- NUNCA armazenar tokens em cookies — usar localStorage.
- NUNCA expor connection strings ou secrets no frontend.
- Controllers com dados sensíveis DEVEM ter `[Authorize]`.
- CORS `AllowAnyOrigin` é permitido apenas em Development.

### VII. Grid Hexagonal (Red Blob Games)

Toda a matemática de grid DEVE seguir https://www.redblobgames.com/grids/hexagons/:

- Hexágonos são sempre de lado reto em cima (flat-top), em grid retangular.
- Posições são persistidas como coluna/linha da grid retangular (`x`, `y`), no layout offset
  "odd-q" do guia (colunas ímpares deslocadas meia altura para baixo). Nenhuma outra forma de
  coordenada é persistida.
- Distância, vizinhos, linhas e alcance usam as fórmulas cúbicas/axiais do guia: converter
  `x`/`y` → axial (`q = x`, `r = y - (x - (x & 1)) / 2`) antes de calcular e axial → `x`/`y`
  ao gravar. `s = -q - r` é sempre derivado.
- Conversão hex↔pixel passa por um `Layout` (tamanho, origem).
- Pixel→hex usa hex fracionário + arredondamento cúbico (`hex_round`).
- A matemática de hexágonos fica em um módulo puro, sem dependência de framework, testável
  isoladamente; se o backend precisar dela, a implementação C# DEVE espelhá-lo 1:1.

**Rationale**: coluna/linha casam com o tamanho da grid (`grid_width` × `grid_height`) e são
intuitivas para quem usa a API; concentrar as conversões axial↔offset no módulo puro evita bugs
entre frontend, backend e banco.

## Variáveis de Ambiente e Tratamento de Erros

**Backend**

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ConnectionStrings__Roll6Context` | Sim | Connection string PostgreSQL |
| `ASPNETCORE_ENVIRONMENT` | Sim | Development, Docker, Production |

**Frontend**

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | Sim | URL base da API backend |
| `VITE_SITE_BASENAME` | Não | Base path do React Router |

Variáveis do frontend são lidas via `import.meta.env.VITE_*`.

**Erros no backend** — controllers DEVEM seguir o padrão:

```csharp
try { /* lógica */ }
catch (Exception ex) { return StatusCode(500, ex.Message); }
```

Erros no frontend (`handleError`, `clearError`, loading state) seguem a skill
`react-architecture`.

## Fluxo de Desenvolvimento e Checklist

Features seguem o fluxo Spec Kit (`/speckit.specify` → `/speckit.plan` → `/speckit.tasks` →
`/speckit.implement`). O gate "Constitution Check" do `plan.md` DEVE validar os princípios
acima.

Antes de submeter qualquer código, verifique:

- [ ] Utilizou a skill `dotnet-architecture` para novas entidades backend
- [ ] Utilizou a skill `react-architecture` para novas entidades frontend
- [ ] Tabelas e colunas seguem snake_case no PostgreSQL
- [ ] Imports respeitam o casing exato dos diretórios
- [ ] Variáveis de ambiente frontend usam prefixo `VITE_`
- [ ] Controllers com dados sensíveis possuem `[Authorize]`
- [ ] Posições gravadas como `x`/`y` (odd-q) e cálculos de grid feitos pelo módulo de hexágonos (Princípio VII)

## Governance

- Esta constituição prevalece sobre qualquer outra prática, agent ou skill do repositório.
  Em caso de conflito (ex.: um agent sugerindo outra biblioteca de UI), a constituição vence.
- Emendas são feitas via `/speckit.constitution`, com Sync Impact Report atualizado e
  propagação para templates e `CLAUDE.md`.
- Versionamento semântico: MAJOR para remoção/redefinição incompatível de princípios; MINOR
  para princípio ou seção nova ou expandida; PATCH para ajustes de redação.
- Toda revisão de PR e todo `plan.md` DEVEM verificar conformidade; violações só são aceitas
  com justificativa registrada na tabela "Complexity Tracking" do plano.

**Version**: 4.0.0 | **Ratified**: 2026-04-02 | **Last Amended**: 2026-09-24
