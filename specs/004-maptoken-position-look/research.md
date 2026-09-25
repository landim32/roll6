# Research: Posição x/y e Direção do Olhar do Token no Mapa

**Feature**: 004-maptoken-position-look | **Date**: 2026-09-25

Base: constituição v4.0.0 (Princípio VII emendado: posições persistidas como coluna/linha "odd-q").

## R1. Conversão dos tokens existentes

- **Decision**: duas migrações, uma por user story:
  - `MapTokenPositionXY` (US1): renomeia `q` → `x` e `r` → `y` (mantendo os valores) e converte a
    linha com `UPDATE map_tokens SET y = y + (x - (x & 1)) / 2;` — fórmula axial→odd-q do guia
    (`col = q`, `row = r + (q - (q & 1)) / 2`). O `Down` faz `y = y - (x - (x & 1)) / 2` e
    renomeia de volta. O EF gera drop/add para propriedade renomeada: a migração DEVE ser editada
    à mão para usar `RenameColumn` + `Sql(...)`, senão os dados se perdem.
  - `AddMapTokenLook` (US2): cria `look integer NOT NULL DEFAULT 0`.
- **Rationale**: preserva a célula de cada token (FR-004). Em PostgreSQL, `&` sobre inteiros é
  bit a bit em complemento de dois (−3 & 1 = 1), igual ao guia, e `(x - (x & 1))` é sempre par,
  então a divisão inteira é exata também para negativos.
- **Alternatives considered**: nova coluna + cópia + remoção — mais passos para o mesmo
  resultado; converter no código na leitura — manteria axial no banco, contra o Princípio VII.

## R2. Funções de conversão no módulo puro

- **Decision**: `HexGrid` ganha `OffsetToAxial(int x, int y) → (int Q, int R)` e
  `AxialToOffset(int q, int r) → (int X, int Y)` (odd-q, flat-top). O backend ainda não calcula
  distância/vizinhos, mas as funções ficam como referência testada para o espelho do frontend e
  documentam a mesma fórmula usada na migração.
- **Rationale**: Princípio VII — conversões concentradas no módulo puro, espelhado 1:1.

## R3. `look`

- **Decision**: inteiro 0..5 no model `MapToken` (constante `MAX_LOOK = 5`), sentido horário a
  partir do lado de cima (0 cima, 1 cima-direita, 2 baixo-direita, 3 baixo, 4 baixo-esquerda,
  5 cima-esquerda). `MapTokenInsertInfo`/`MapTokenUpdateInfo.look` são `int?` (vazio → 0);
  `MapTokenInfo.look` é `int`. Coluna com `HasDefaultValue(0).HasSentinel(int.MinValue)`, como as
  outras colunas com default.
- **Rationale**: FR-005..FR-008; `int?` na entrada permite omitir e aplicar o padrão.
- **Alternatives considered**: enum no contrato (strings "top", "topRight"…) — a spec pede
  número; constraint `CHECK` no banco — validação fica no Domain, como o restante do projeto.

## R4. Nomes no contrato

- **Decision**: `q`/`r` saem de todos os DTOs de MapToken; entram `x`, `y` e `look`. Sem
  compatibilidade retroativa (não há frontend publicado; só a coleção Bruno, atualizada junto).
