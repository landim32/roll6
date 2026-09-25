# Implementation Plan: Backend das Entidades Principais

**Branch**: `001-backend-core-entities` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-backend-core-entities/spec.md`

## Summary

Criar a Web API do SimpleTabletopMap com sete entidades (User, Character, Token, Campaign,
MapModel, Map, MapToken) em Clean Architecture, seguindo a skill `dotnet-architecture`.
Usuários, senhas (hash PBKDF2) e login (JWT próprio) são locais; imagens vão para S3 via
`AWSSDK.S3` com upload em endpoint próprio e URLs temporárias nas leituras. As regras de dono,
numeração de mapas, status de mapa e bloqueio de exclusão ficam nos Domain services. Detalhes
em [research.md](./research.md), [data-model.md](./data-model.md) e
[contracts/api.md](./contracts/api.md).

## Technical Context

**Language/Version**: C# 12 / .NET 8.0 (compilado com SDK 9.0.309)
**Primary Dependencies**: ASP.NET Core 8 Web API, EF Core 9.x + Npgsql.EntityFrameworkCore.PostgreSQL 9.x, Microsoft.AspNetCore.Authentication.JwtBearer 8.x, AWSSDK.S3, Swashbuckle.AspNetCore 8.x
**Storage**: PostgreSQL (dados) + S3 ou compatível (imagens)
**Testing**: xUnit + Moq + FluentAssertions (`SimpleTabletopMap.Tests`, skill `dotnet-test`)
**Target Platform**: Linux server (produção) / Windows (desenvolvimento)
**Project Type**: web-service (backend de uma web app; frontend em feature futura)
**Performance Goals**: listagens e buscas paginadas ≤ 1 s com 10.000 registros por entidade (SC-004)
**Constraints**: sem Docker local; `timestamp without time zone`; FKs `ClientSetNull`; uploads ≤ 10 MB
**Scale/Scope**: 7 entidades, ~40 endpoints, uso pequeno (grupos de RPG)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | Todas as entidades criadas com `dotnet-architecture` (DTO → Infra.Interfaces → Domain → Infra → Application); testes com `dotnet-test` | ✅ |
| II | Stack fixa | .NET 8, EF Core 9, PostgreSQL, Swashbuckle 8; sem outro ORM; sem NAuth/zTools. JwtBearer e AWSSDK.S3 preenchem o que a v2.0.0 deixou em aberto | ✅ |
| III | Casing de diretórios | Regras de frontend; não se aplica a esta feature (só backend) | ➖ N/A |
| IV | Convenções de código | Namespaces file-scoped `SimpleTabletopMap.*`, `_camelCase`, `[JsonPropertyName]` camelCase em todos os DTOs, DTOs `Info`/`InsertInfo`; respostas padrão ASP.NET Core (DTO direto, `ProblemDetails` nos erros) | ✅ |
| V | Banco | snake_case plural, PK `{entidade}_id` bigint identity, `{tabela}_pkey`, `fk_{pai}_{filho}`, `ClientSetNull`, `timestamp without time zone`, `varchar(n)`, enums `integer` | ✅ |
| VI | Autenticação e segurança | `[Authorize]` em todos os controllers (exceto cadastro/login); token Bearer guardado em localStorage pelo frontend; segredos só em config/env; CORS aberto só em Development | ✅ |
| VII | Grid hexagonal | MapToken guarda posição axial `q`, `r`; `s` nunca persistido | ✅ |
| — | Env vars | `ConnectionStrings__SimpleTabletopMapContext`, `ASPNETCORE_ENVIRONMENT` + `Jwt__*`, `S3__*` | ✅ |
| — | Erros backend | `catch (Exception ex) => StatusCode(500, ex.Message)` mantido; capturas específicas antes dele devolvem `ProblemDetails` (400/403/404/409) | ✅ |

Re-check pós-design (data-model e contratos): sem violações novas.

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-core-entities/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── SimpleTabletopMap.sln
├── SimpleTabletopMap.DTO/                  # sem dependências
│   ├── Common/          PagedList<T>, PageQuery
│   ├── Settings/        JwtSettings, S3Settings
│   └── {User,Character,Token,Campaign,MapModel,Map,MapToken,Image}/  *Info, *InsertInfo, *UpdateInfo
├── SimpleTabletopMap.Infra.Interfaces/     # contratos genéricos <TModel>
│   ├── Repository/      I{Entity}Repository<TModel>
│   └── AppServices/     IImageStorageAppService
├── SimpleTabletopMap.Domain/
│   ├── Models/          User, Character, Token, Campaign, MapModel, Map, MapToken
│   ├── Enums/           MapStatus, MapTokenType
│   ├── Interfaces/      I{Entity}Service, IPasswordHasherService, ITokenService
│   └── Services/        {Entity}Service, ImageService
├── SimpleTabletopMap.Infra/
│   ├── Context/         SimpleTabletopMapContext (Fluent API snake_case)
│   ├── Repository/      {Entity}Repository
│   ├── AppServices/     S3ImageStorageAppService, JwtTokenService, PasswordHasherService
│   └── Migrations/
├── SimpleTabletopMap.Application/
│   └── Startup.cs       DI centralizado (DbContext, repos, services, JWT, S3)
├── SimpleTabletopMap.API/
│   ├── Controllers/     User, Image, Character, Token, Campaign, MapModel, Map, MapToken
│   ├── Extensions/      ClaimsPrincipalExtensions (GetUserId)
│   ├── Program.cs       CORS → Authentication → Authorization, Swagger com Bearer
│   └── appsettings*.json
└── SimpleTabletopMap.Tests/
    └── Domain/Services/ {Entity}ServiceTests
```

**Structure Decision**: solução .NET em `backend/`, com os projetos de camada definidos pela
skill `dotnet-architecture` e a API como camada de apresentação. A pasta `frontend/` fica
reservada para a feature do React (Vite).

Dependências entre projetos: `API → Application → {Domain, Infra, DTO}`;
`Infra → {Domain, Infra.Interfaces}`; `Domain → {Infra.Interfaces, DTO}`;
`Infra.Interfaces → DTO`; `Tests → {Domain, DTO, Infra.Interfaces}`.

Pontos que atravessam camadas:

- **Dono do registro**: o controller lê o `user_id` do JWT (`User.GetUserId()`) e passa ao
  service; o service compara com o `UserId` do model e lança `UnauthorizedAccessException`.
- **Imagens**: services recebem e gravam só o `fileName`; ao montar `*Info`, chamam
  `IImageStorageAppService.GetUrl(fileName)` para preencher `*Url`.
- **Map ↔ Campaign**: `MapService` usa os repositórios de Campaign e MapModel para validar o
  dono e gerar o nome; `CampaignService.DeleteAsync` usa os repositórios de Map e MapToken
  para a limpeza em transação (research R9).

## Complexity Tracking

Sem violações da constituição a justificar.
