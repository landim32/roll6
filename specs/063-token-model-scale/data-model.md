# Data Model: Tamanho do modelo 3D do token (063)

## Token (alterado)

| Campo | Coluna | Tipo | Regra |
|---|---|---|---|
| `ModelScale` | `tokens.model_scale` | `integer not null default 100` | Porcentagem da altura automática do modelo 3D. 25–400, múltiplo de 5 (`Guard.ModelScale`, chave `modelScale`). Null na entrada = 100. Sem `ModelFile` = 100. |

- Gravado por `Token.UpdateModel(modelFile, idleClip, walkClip, downClip, scale)`.
- Trocar o arquivo do modelo mantém o valor enviado; remover o modelo volta a 100.
- Migração `AddTokenModelScale`: `ALTER TABLE tokens ADD model_scale integer NOT NULL DEFAULT 100;` — tokens existentes
  ficam com 100. Script incremental `database/migrations/063-token-model-scale.sql`.

## DTOs

| DTO | Campo JSON | Tipo | Observação |
|---|---|---|---|
| `TokenInsertInfo` | `modelScale` | `int?` | Omitido = 100 (o PUT substitui tudo, como os outros campos do modelo). |
| `TokenInfo` | `modelScale` | `int` | Sempre presente. |
| `MapTokenInfo` | `modelScale` | `int` | O do token da peça (100 sem modelo). |

## Frontend

- `TokenInfo.modelScale` / `MapTokenInfo.modelScale` (`number`, opcional na leitura: ausente = 100).
- `lib/modelScale.ts`: `MODEL_SCALE = { min: 25, max: 400, step: 5, standard: 100 }`, `modelScaleFactor(percent?)`,
  `clampModelScale`, `formatModelScale` ("120%"), `previewFraming(factor)`.
- `useModelFile`: `scale` (seed = `token.modelScale ?? 100`; volta a 100 ao remover o modelo; mantido ao trocar o
  arquivo) → `ResolvedModel.modelScale`.
- `ModelSpec.scale` (fator) na camada de modelos; `RenderSprite.width` do proxy escondido × fator.

## Eventos

- `TokenLibraryService.UpdateAsync` → `mapTokens.changed` (mapId null) por campanha com peças do token, depois de gravar.
