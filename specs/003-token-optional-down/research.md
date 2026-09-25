# Research: Estado "Deitado" Opcional no Token

**Feature**: 003-token-optional-down | **Date**: 2026-09-25

Sem incógnitas técnicas. As decisões ajustam o Token da feature 001.

## R1. Coluna `down_space` anulável e sem default no banco

- **Decision**: `down_space` passa a `integer NULL` **sem** `DEFAULT`. O padrão 2 (quando há
  imagem deitado) é aplicado no Domain, não no banco. Migração `MakeTokenDownSpaceOptional`
  (`AlterColumn`: `nullable: true`, remove o default); linhas existentes mantêm o valor.
- **Rationale**: com `int?`, o sentinel do EF Core é `null`; se a coluna mantivesse `DEFAULT 2`,
  um `null` explícito seria omitido do INSERT e o banco gravaria 2 — exatamente o que a spec quer
  evitar (FR-003). Sem default no banco, o valor gravado é sempre o calculado pelo Domain.
- **Alternatives considered**: manter o default com `HasSentinel` especial — frágil e obscuro;
  usar 0 como "sem estado deitado" — a spec diferencia 0 de vazio.

## R2. Regra no Domain

- **Decision**: em `Token.Update(...)`:
  `DownSpace = downSpace.HasValue ? NonNegative(downSpace) : (DownImage != null ? 2 : null)`,
  calculado depois de validar a imagem deitado.
- **Rationale**: FR-003/FR-004/FR-005 numa única regra, testável sem banco.

## R3. Contrato

- **Decision**: `TokenInfo.downSpace` passa de `int` para `int?`. `TokenInsertInfo` já aceita
  `downSpace`/`downImage` nulos — sem mudança. `MapTokenInfo.downImageUrl` já é anulável.
- **Impacto**: clientes que tratam `downSpace` como sempre numérico devem aceitar `null`. Não há
  frontend ainda, só a coleção Bruno.
