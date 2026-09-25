# Data Model: Estado "Deitado" Opcional no Token

**Feature**: 003-token-optional-down | **Date**: 2026-09-25

## tokens (alterada)

| Coluna | Antes | Depois |
|---|---|---|
| `down_space` | `integer NOT NULL DEFAULT 2` | `integer NULL`, sem default |
| `down_image` | `varchar(260) NULL` | sem mudança |

Linhas existentes mantêm o valor de `down_space` (FR-007).

## Model `Token` (Domain)

- `DownSpace`: `int` → `int?`.
- `Update(name, description, upSpace, downSpace, upImage, downImage)`:

| `downImage` | `downSpace` | `DownSpace` gravado |
|---|---|---|
| vazio | vazio | `null` (sem estado deitado) |
| informado | vazio | `2` |
| qualquer | `n ≥ 0` | `n` |
| qualquer | `n < 0` | erro de validação em `downSpace` |

## DTOs

| DTO | Mudança |
|---|---|
| `TokenInfo` | `downSpace`: `int` → `int?` |
| `TokenInsertInfo` | nenhuma (`downSpace` e `downImage` já anuláveis) |
