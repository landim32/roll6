# Contract: REST API (035)

Nenhum endpoint novo. `TokenController` já é `[Authorize]`; só o criador altera um token (inalterado).

## `POST /api/token`, `PUT /api/token/{id}` — `TokenInsertInfo`

```jsonc
{
  "name": "Guerreira", "description": null,
  "upSpace": 1, "downSpace": null,
  "upImage": "…png", "downImage": null,
  "frontImage": "a1…f0.webp",   // 034
  "rightImage": "b2…e1.webp",   // NOVO — de perfil olhando para a direita da imagem
  "leftImage":  "c3…d2.webp",   // NOVO — de perfil olhando para a esquerda da imagem
  "backImage":  "d4…c3.webp"    // NOVO — de costas
}
```

- Todos opcionais e independentes. O PUT **substitui todos os campos**: uma imagem omitida é removida.
- 400 com a chave `rightImage` / `leftImage` / `backImage` para nome fora do formato `{guid}.{png|jpg|webp}` (como `frontImage`).

## `TokenInfo` — `GET /api/token`, `GET /api/token/{id}`, respostas de POST/PUT

Novos: `rightImage`, `rightImageUrl`, `leftImage`, `leftImageUrl`, `backImage`, `backImageUrl` (URL pré-assinada ou `null`).

## `MapTokenInfo` — `GET /api/map/{id}/token` e eventos `mapToken.upserted`

Novos: `rightImageUrl`, `leftImageUrl`, `backImageUrl`, ao lado de `frontImageUrl` (do token da peça; `null` quando não há).
A direção da peça (`look`, 0–5) já vem nele; o 3D escolhe a imagem com ela e a posição da câmera (nada disso passa pelo servidor).

## Regras que não mudam

Posicionamento, movimento, postura e permissões das peças e dos tokens continuam como antes; o 2D não usa as quatro imagens.
