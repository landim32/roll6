# Quickstart: Estado "Deitado" Opcional no Token

**Feature**: 003-token-optional-down

## Banco

```bash
cd backend
dotnet ef database update --project SimpleTabletopMap.Infra --startup-project SimpleTabletopMap.API
```

Aplica `MakeTokenDownSpaceOptional`. Em homolog/produção a migração roda na inicialização.

## Testes

```bash
cd backend
dotnet test --filter "FullyQualifiedName~TokenLibraryServiceTests"
```

## Validação manual

1. `POST /api/token` com `downImage` e `downSpace` nulos → `downSpace: null`, `downImage: null`.
2. `POST /api/token` com `downImage` (fileName do upload) e `downSpace` nulo → `downSpace: 2`.
3. `POST /api/token` com `downSpace: 3` e `downImage` nulo → `downSpace: 3`.
4. `POST /api/token` com `downSpace: 0` → `downSpace: 0` (diferente de `null`).
5. `PUT /api/token/{id}` de um token com estado deitado, enviando os dois campos nulos → os dois
   voltam `null`.
6. Token criado antes da migração continua com `downSpace` 2.
