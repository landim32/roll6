# Contract: REST API (034)

Nenhum endpoint novo. Controllers já `[Authorize]`. Campos em camelCase com `[JsonPropertyName]`.

## Map model — `POST /api/mapmodel`, `PUT /api/mapmodel/{id}`

```jsonc
{
  "name": "Masmorra", "description": null, "image": "…png",
  "gridWidth": 20, "gridHeight": 15, "imageWidth": 1220, "imageHeight": 1074, "imageTop": 0, "imageLeft": 0,
  "maskImage": "3f2a…c1.png",        // NOVO — Máscara 3D; null = sem paredes no 3D
  "backgroundImage": "9b77…e0.jpg"   // NOVO (era skyImage na 033) — fundo/céu do 3D
}
```

- Saem `kind`, `walls`, `skyImage` (033). O PUT continua substituindo todos os campos.
- 400 `maskImage` / `backgroundImage` para nome fora do formato `{guid}.{png|jpg|webp}`.
- A proporção da máscara **não** é validada no servidor (research D2).

`MapModelInfo`: + `maskImage`, `maskImageUrl`, `backgroundImage`, `backgroundImageUrl`; − `kind`, `walls`,
`skyImage`, `skyImageUrl`.

## Token — `POST /api/token`, `PUT /api/token/{id}`

`TokenInsertInfo` + `frontImage` (opcional; o PUT substitui: omitido = removido, como `downImage`).
`TokenInfo` + `frontImage`, `frontImageUrl`. 400 `frontImage` para nome inválido.

## Peças — `GET /api/map/{id}/token`, eventos `mapToken.upserted`

`MapTokenInfo` + `frontImageUrl` (imagem "2,5D frente" do token da peça; null quando não há).

## Regras de posição

Voltam às de antes da 033: nenhuma resposta 409 por parede; a máscara não é lida pelo servidor.
