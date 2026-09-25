# Data Model: Posição x/y e Direção do Olhar do Token no Mapa

**Feature**: 004-maptoken-position-look | **Date**: 2026-09-25

## map_tokens (alterada)

| Antes | Depois | Regras |
|---|---|---|
| `q integer DEFAULT 0` | `x integer DEFAULT 0` | coluna da grid (odd-q); valor copiado de `q` |
| `r integer DEFAULT 0` | `y integer DEFAULT 0` | linha da grid; convertido: `y = r + (q - (q & 1)) / 2` |
| — | `look integer NOT NULL DEFAULT 0` | lado do hexágono para onde o token olha, 0..5 |

Exemplos de conversão (q, r) → (x, y): (0, 0) → (0, 0); (3, 1) → (3, 2); (2, −1) → (2, 0);
(1, 0) → (1, 0); (−3, 2) → (−3, 0).

## Model `MapToken` (Domain)

- `Q`, `R` → `X`, `Y` (int); `MoveTo(int x, int y)`.
- Novo `Look` (int, padrão 0), constante `MAX_LOOK = 5`.
- `Update(name, tokenType, sheet, life, energy, status, move, x, y, look)`: `look` vazio → 0;
  fora de 0..5 → `DomainValidationException("look", …)`.

## `HexGrid` (Domain/Grid) — funções novas

```text
OffsetToAxial(x, y): q = x;  r = y - (x - (x & 1)) / 2
AxialToOffset(q, r): x = q;  y = r + (q - (q & 1)) / 2
```

## `look` — lados do hexágono flat-top

```text
          0
      5 /‾‾‾\ 1
      4 \___/ 2
          3
```

## DTOs

| DTO | Mudança |
|---|---|
| `MapTokenInsertInfo` | `q`, `r` → `x`, `y`; novo `look?` |
| `MapTokenUpdateInfo` | `q`, `r` → `x`, `y`; novo `look?` |
| `MapTokenInfo` | `q`, `r` → `x`, `y`; novo `look` |
