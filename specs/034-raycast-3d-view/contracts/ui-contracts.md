# Contract: UI (034)

## `MapControls`

Igual a antes da 033, mais **um** botão: **3D / 2D** (`View3dIcon` / `MapIcon`), para todos, em todo mapa. No 3D os
botões de zoom mudam o FOV; imagem e redimensionar ficam ocultos. Sai o botão de menu (tipo/paredes/céu).

## `ImageModal` ("Imagem do cenário" = cadastro do mapa)

Abas: **Enviar imagem** | **Buscar mapas** | **3D** (nova, só com `canEdit`).

Aba 3D:

| Campo | Comportamento |
|---|---|
| **Máscara 3D** | Escolher arquivo (PNG/JPEG/WebP ≤ 10 MB). Antes de enviar: carrega a imagem, compara a proporção com `imageWidth/imageHeight` do rascunho (tolerância 1%) — diferente → toast `raycast.maskRatio` com as duas proporções e nada é enviado; sem imagem do mapa → `raycast.maskNeedsImage`. Prévia já em preto e branco (limiar 50%). Enviar → `POST /api/image` → `setMaskImage`. Remover. |
| **Imagem de fundo** | Escolher arquivo, prévia, enviar → `setBackgroundImage`. Remover. Texto de ajuda: "Gira com a câmera como um céu; uma imagem estreita se repete." |

Trocar a imagem do mapa para outra proporção com máscara definida → toast `raycast.maskMismatch` (a máscara fica).
Tudo muda só o rascunho; o salvamento é o atual.

## `TokenFormFields` (Incluir / Editar token)

Novo campo **"2,5D frente"** (`tokens.frontImage`) abaixo das imagens de pé/deitada: arquivo enviado como está (sem
recorte), prévia sobre fundo xadrez, "Remover" na edição; ajuda `tokens.frontImageHint` ("Personagem de pé, visto de
frente, de preferência PNG com fundo transparente. Usada na vista 3D.").

## `StoryView` (lazy)

Canvas único com o raycaster; mesmos controles da 033 sem olhar para cima/baixo: W/S ↑/↓ andar, A/D lado, Q/E ←/→
girar, arrastar na horizontal gira (o vertical é ignorado), roda/pinça = FOV, joystick no toque, "Voltar ao
personagem". Sem Canvas 2D → toast `story.noWebgl` (texto passa a "Este dispositivo não consegue exibir a vista 3D.") e 2D.

## i18n

Saem `story.menu`, `story.kind*`, `story.walls`, `story.paint`, `story.erase`, `story.wallsOff`, `story.wallBlocked`,
`story.sky*`. Entram:

```json
"raycast": {
  "tab": "3D",
  "mask": "Máscara 3D",
  "maskHint": "Preto = parede, branco = espaço vazio. Mesma proporção da imagem do mapa.",
  "maskRatio": "A máscara ({{mask}}) não tem a proporção da imagem do mapa ({{map}}).",
  "maskNeedsImage": "Envie primeiro a imagem do mapa.",
  "maskMismatch": "A imagem do mapa mudou de proporção: troque ou remova a Máscara 3D.",
  "background": "Imagem de fundo",
  "backgroundHint": "Gira com a câmera como um céu; uma imagem estreita se repete.",
  "choose": "Escolher arquivo",
  "remove": "Remover",
  "set": "Imagem escolhida. Salve o mapa para guardá-la."
},
"tokens": { "frontImage": "2,5D frente", "frontImageHint": "…", "frontImageRemove": "Remover imagem 2,5D" }
```
