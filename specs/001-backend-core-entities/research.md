# Research: Backend das Entidades Principais

**Feature**: 001-backend-core-entities | **Date**: 2026-09-24

Todas as decisões abaixo respeitam a constituição v2.0.0 (NAuth e zTools removidos; usuários,
autenticação e imagens são implementados pelo próprio sistema).

## R1. Usuários e senhas

- **Decision**: tabela `users` local. Senha guardada como hash com
  `Microsoft.AspNetCore.Identity.PasswordHasher<User>` (PBKDF2, salt por usuário), sem o
  restante do ASP.NET Identity. E-mail normalizado em minúsculas com índice único.
- **Rationale**: atende FR-001..FR-006 com uma única dependência já presente no ASP.NET Core;
  não adiciona tabelas nem conceitos (roles, claims store) fora do escopo.
- **Alternatives considered**: ASP.NET Core Identity completo (muitas tabelas e convenções
  próprias que conflitam com o snake_case/PK da constituição); BCrypt.Net (pacote extra sem
  ganho relevante).

## R2. Autenticação da API

- **Decision**: JWT próprio (HS256) emitido em `POST /api/user/login`, validado com
  `Microsoft.AspNetCore.Authentication.JwtBearer` 8.x. Claims: `sub` (user_id), `name`,
  `email`. Expiração configurável (padrão 24 h). Header `Authorization: Bearer {token}`.
  O frontend guardará o token em localStorage (Princípio VI).
- **Rationale**: stateless, suportado nativamente, sem serviço externo. Um helper
  `User.GetUserId()` lê o `sub` para os controllers.
- **Alternatives considered**: cookie de sessão (proibido pelo Princípio VI); tokens opacos em
  tabela (exige tabela e limpeza extras).

## R3. Armazenamento de imagens (S3)

- **Decision**: `AWSSDK.S3`. Upload por `POST /api/image` (multipart), que valida tipo
  (PNG, JPEG, WebP, conferindo também a assinatura dos primeiros bytes) e tamanho (≤ 10 MB),
  grava em `{S3:Folder}/{guid}.{ext}` (pasta configurável, padrão `roll6`) e retorna `{ fileName, url }`. As entidades guardam apenas o
  `fileName` (`varchar(260)`). As respostas trazem a URL gerada como *presigned GET URL*
  (validade configurável, padrão 60 min). `S3:ServiceUrl` aponta para o provedor compatível — o projeto usa **DigitalOcean Spaces** (`https://{região}.digitaloceanspaces.com`, `S3:Region` = `us-east-1`, `S3:ForcePathStyle` = false; `true` só para MinIO). Com endpoint customizado, o cliente usa checksums só quando exigidos e desliga o upload chunked.
- **Rationale**: upload separado mantém os endpoints das entidades em JSON puro; presigned
  URLs permitem bucket privado; gerar a URL não faz chamada de rede.
- **Alternatives considered**: upload multipart em cada endpoint de entidade (duplica
  validação em 3 controllers); bucket público (expõe todas as imagens).
- **Encapsulamento**: interface `IImageStorageAppService` em Infra.Interfaces; implementação
  `S3ImageStorageAppService` em Infra (padrão AppService da skill `dotnet-architecture`).
  O Domain nunca referencia o SDK da AWS.

## R4. Timestamps `timestamp without time zone` com Npgsql

- **Decision**: colunas `timestamp without time zone` (constituição) com valores em UTC.
  Ativar `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true)` no startup.
- **Rationale**: Npgsql 6+ rejeita `DateTime` com `Kind=Utc` em colunas sem timezone; o switch
  legado permite gravar UTC sem conversões manuais em cada model.
- **Alternatives considered**: `timestamp with time zone` (viola a constituição); forçar
  `DateTimeKind.Unspecified` em cada atribuição (propenso a erro).

## R5. Formato das respostas e erros

- **Decision** (constituição v3.0.0, Princípio IV — padrão ASP.NET Core):
  - Sucesso devolve o DTO diretamente: `Ok(dto)`, `CreatedAtAction(..., dto)` (201),
    `NoContent()` (204) em exclusões e na troca de senha.
  - Listas paginadas devolvem `PagedList<T>`: `{ items, page, pageSize, totalCount }`.
  - Erros de validação → `ValidationProblem` (400, `ValidationProblemDetails` com `errors`
    por campo). Demais erros de negócio → `Problem(detail, statusCode)` (`ProblemDetails`):
    `UnauthorizedAccessException` → 403, `KeyNotFoundException` → 404,
    `ConflictException` (exceção própria do Domain: registro em uso / e-mail duplicado) → 409. Não usar `InvalidOperationException`, que o EF Core lança em falhas de conexão.
  - `[ApiController]` mantém a validação automática de model binding (400 ProblemDetails).
  - O `catch (Exception ex) => StatusCode(500, ex.Message)` da constituição fica por último.
- **Rationale**: formato padrão do ASP.NET Core, entendido pelo Swagger e por clientes HTTP
  sem envelope próprio.
- **Alternatives considered**: envelope próprio com `sucesso`/`mensagem`/`erros` (removido da
  constituição na v3.0.0).

## R6. Validação de entrada

- **Decision**: validação no Domain (métodos dos models e services) lançando
  uma `DomainValidationException` própria (Domain) com erros por campo, que o controller
  converte em `ValidationProblem`.
  Sem FluentValidation nesta feature.
- **Rationale**: a constituição não inclui FluentValidation na stack; regras são poucas e
  ficam junto das regras de negócio (models ricos, conforme a skill).
- **Alternatives considered**: FluentValidation (dependência fora da stack); DataAnnotations
  nos DTOs (espalharia regras entre DTO e Domain).

## R7. Paginação e busca

- **Decision**: query `page` (padrão 1), `pageSize` (padrão 20, limitado a 100), `search`
  opcional. Busca com `ILIKE '%termo%'` em `name` ou `description` (`EF.Functions.ILike`).
  Ordenação por `name`, depois por id. Um único endpoint `GET` atende "listar" e "buscar".
- **Rationale**: FR-011, FR-017, FR-031; case-insensitive como pedido na spec.
- **Alternatives considered**: full-text search do PostgreSQL (desnecessário para nome e
  descrição curtos); endpoints separados para busca (duplicação).

## R8. Numeração de mapas

- **Decision**: coluna `sequence` em `maps` com índice único
  `(campaign_id, map_model_id, sequence)`. Ao criar: `max(sequence) + 1` considerando todos os
  status (inclusive Deleted); nome = `"{MapModel.Name} {sequence}"`, gravado em `name` e
  editável depois. Em conflito do índice único (criação concorrente), tenta de novo uma vez.
- **Rationale**: FR-020 e o caso de borda de nunca reutilizar números.
- **Alternatives considered**: extrair o número do nome (quebra quando o nome é editado).

## R9. Exclusões e FKs (`ClientSetNull`, nunca Cascade)

- **Decision**: exclusão física para Character, Token, Campaign, MapModel e MapToken; lógica
  (status Deleted) para Map. Antes de excluir, o service verifica uso:
  - Token referenciado por qualquer `map_tokens` → 409.
  - MapModel referenciado por qualquer `maps` (qualquer status) → 409.
  - Campaign com mapas Active/Archived → 409. Se só houver mapas Deleted, o service remove
    fisicamente esses mapas e os `map_tokens` deles, depois a campanha, na mesma transação.
- **Rationale**: FR-033 e a regra `ClientSetNull` da constituição; o banco nunca apaga em
  cascata e as FKs ficam protegidas pela checagem no service.

## R10. Testes

- **Decision**: projeto `Roll6.Tests` com xUnit, Moq e FluentAssertions, cobrindo
  os Domain services (dono, numeração de mapas, bloqueios de exclusão, validações, troca de
  senha). Criado pela skill `dotnet-test`.
- **Rationale**: as regras de negócio vivem nos services e podem ser testadas sem banco.

## R11. Ambiente local

- **Findings**: SDK .NET 9.0.309 e runtime ASP.NET Core 8.0.31 instalados; `dotnet-ef` 10.0.5
  global; Docker indisponível (constituição); `psql` não encontrado no PATH.
- **Decision**: projetos com `TargetFramework` `net8.0` (o SDK 9 compila net8.0). PostgreSQL
  local ou remoto precisa estar acessível pela connection string; migrações via `dotnet ef`.
  Se o `dotnet-ef` 10 der problema com EF Core 9, instalar a ferramenta local 9.x
  (`dotnet new tool-manifest` + `dotnet tool install dotnet-ef --version 9.*`).
