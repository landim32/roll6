# Quickstart: Posição x/y e Direção do Olhar do Token no Mapa

**Feature**: 004-maptoken-position-look

## Banco

```bash
cd backend
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API
```

Aplica `MapTokenPositionXY` (renomeia q/r e converte a linha) e `AddMapTokenLook` (cria `look`).

## Testes

```bash
cd backend
dotnet test --filter "FullyQualifiedName~HexGridTests"
dotnet test --filter "FullyQualifiedName~MapTokenServiceTests"
```

## Validação manual

1. Antes da migração, criar um token no mapa em `q: 3, r: 1`; aplicar a migração; `GET
   /api/map/{id}/token` → `x: 3, y: 2, look: 0`.
2. `POST /api/maptoken` com `x: 3, y: 2, look: 1` → devolve os mesmos valores; resposta sem `q`/`r`.
3. `PUT /api/maptoken/{id}` com `x: 4, y: 0, look: 5` → devolve os novos valores.
4. `POST` sem `x`, `y`, `look` → `0, 0, 0`.
5. `look: 6` ou `look: -1` → 400 com erro em `look`.
6. Bruno: pasta `MapToken` (Create/Update enviam `x`, `y`, `look`).
