# Quickstart: Backend das Entidades Principais

**Feature**: 001-backend-core-entities

## Pré-requisitos

- .NET SDK 8+ (a máquina atual tem SDK 9.0.309 e runtime ASP.NET Core 8.0.31).
- `dotnet-ef` (`dotnet tool install -g dotnet-ef`; se a versão 10 falhar com EF Core 9, use a
  9.x como ferramenta local).
- PostgreSQL acessível (local ou remoto). **Não usar Docker localmente** (constituição).
- Bucket S3 (ou compatível, ex.: MinIO) com credenciais de escrita/leitura.

## Configuração

`backend/Roll6.API/appsettings.Development.json` (não versionar segredos reais):

```json
{
  "ConnectionStrings": {
    "Roll6Context": "Host=localhost;Port=5432;Database=roll6;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Secret": "troque-por-um-segredo-com-pelo-menos-64-caracteres-.....................",
    "Issuer": "Roll6",
    "ExpirationHours": 24
  },
  "S3": {
    "BucketName": "roll6",
    "Region": "us-east-1",
    "ServiceUrl": null,
    "UrlExpirationMinutes": 60
  }
}
```

Equivalentes em variáveis de ambiente: `ConnectionStrings__Roll6Context`,
`ASPNETCORE_ENVIRONMENT`, `Jwt__Secret`, `S3__BucketName`, `S3__Region`, `S3__ServiceUrl`.
Credenciais AWS pelas variáveis padrão (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) ou
perfil AWS.

## Build, banco e execução

```bash
cd backend
dotnet build Roll6.sln
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API
dotnet run --project Roll6.API
```

Swagger: `https://localhost:{porta}/swagger` (botão **Authorize** aceita `Bearer {token}`).

Nova migração (após alterar o DbContext):

```bash
dotnet ef migrations add NomeDaMigracao --project Roll6.Infra --startup-project Roll6.API
```

## Testes

```bash
cd backend
dotnet test                                                        # todos
dotnet test --filter "FullyQualifiedName~MapServiceTests"          # uma classe
dotnet test --filter "FullyQualifiedName~MapServiceTests.Create_NumbersMapsSequentially"  # um teste
```

## Roteiro de validação manual (cobre as user stories)

1. `POST /api/user` → `POST /api/user/login`; guardar o `token`.
2. `PUT /api/user/name`, `PUT /api/user/password`; login de novo com a senha nova.
3. `POST /api/image` com um PNG → usar o `fileName` retornado.
4. `POST /api/mapmodel` ("Masmorra") → `GET /api/mapmodel?search=masm`.
5. `POST /api/campaign` → `POST /api/map` duas vezes com o mesmo modelo → nomes
   "Masmorra 1" e "Masmorra 2".
6. `POST /api/token` sem upSpace/downSpace → confirmar 1 e 2.
7. `POST /api/maptoken` em (0,0) → `PUT /api/maptoken/{id}` para (2,-1) →
   `GET /api/map/{id}/token`.
8. `DELETE /api/token/{id}` do token em uso → 409. `DELETE /api/map/{id}` → some da
   listagem da campanha.
9. Criar um segundo usuário e confirmar 403 ao alterar/excluir registros do primeiro, e que
   `GET /api/character` e `GET /api/campaign` não mostram dados do outro usuário.
