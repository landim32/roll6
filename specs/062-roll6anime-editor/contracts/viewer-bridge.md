# Contract: casca WPF ↔ vista 3D (062)

A vista é `https://viewer.roll6anime/index.html`. O host virtual mapeia
`<pasta do executável>\wwwroot\viewer`. As mensagens vão pelo WebView2:

- casca → vista: `CoreWebView2.PostWebMessageAsJson`;
- vista → casca: `window.chrome.webview.postMessage(objeto)`.

Todas as mensagens são objetos JSON com `type`.

## Casca → vista

| `type` | Campos | Efeito |
|---|---|---|
| `model` | `url` (string, `https://model.roll6anime/<arquivo>?v=<n>`, respondida pela casca via `WebResourceRequested` com CORS), `name` (string) | Carrega o `.glb` com `loadModel(url)`, mostra-o de frente, inteiro, sobre um disco, e enquadra a câmera. Se já houver uma animação, monta-a nesse modelo. |
| `animation` | `fileName` (string), `file` (o documento `roll6-animation` **já validado**), `keepTime` (bool) | Monta o clip com `toRoll6Clip(file, "animation:" + fileName)` + `buildRoll6Clip(clip, model, height)` e toca. Com `keepTime` (o mesmo arquivo mudou), continua do mesmo instante, limitado à nova duração, e mantém tocando/pausado. Sem `keepTime` (outro arquivo), começa do 0, tocando. A câmera nunca muda. |
| `clear` | — | Para a animação e deixa o modelo na pose de descanso; a barra fica desativada. |
| `capture` | `id` (number) | Desenha a cena de novo e lê o canvas na hora (PNG): o print da vista como está, para anexar ao pedido. |

## Vista → casca

| `type` | Campos | Quando |
|---|---|---|
| `ready` | — | A página carregou e escuta mensagens. A casca só envia depois disso. |
| `modelLoaded` | `mixamo` (bool), `bones` (number) | O modelo abriu. `mixamo` = `isMixamoSkeleton(boneNames)`; false → a janela mostra o aviso de FR-004. |
| `modelError` | `message` (string) | O `.glb` não abriu (inválido, sem WebGL). |
| `animationError` | `message` (string) | O clip não pôde ser montado, por exemplo porque o modelo não tem nenhum osso da animação. |
| `captured` | `id`, `png` (base64 sem `data:`), `time`/`duration` (null sem animação), `paused`, `azimuth`, `elevation` (graus: 0 = de frente, positivo para a esquerda do personagem; acima do centro) | Resposta a `capture`. A casca monta a legenda (`ViewCapture.Caption`). |
| `captured` (065) | + `skeleton` (boolean), `pose` (`{ from, to, count }`, 1-based, ou null) | O esqueleto estava visível (a legenda ganha `ViewCapture.SKELETON_NOTE`); a pose-chave do instante vai na legenda e escrita no canto do PNG ("Pose 2 de 5 · 0,3 s"). |
| `captureFailed` | `id`, `message` | Sem modelo aberto. A casca desiste após 5 s sem resposta. |

## Edição da pose (066)

| Direção | `type` | Campos | Efeito |
|---|---|---|---|
| vista → casca | `saveAnimation` | `fileName`, `file` | A casca valida (`AnimationFormat.Parse`) e grava o arquivo aberto, se for ele e o Claude não estiver trabalhando. |
| vista → casca | `undo`, `redo` | — | A casca grava a versão anterior/seguinte do histórico do arquivo aberto (texto exato). |
| casca → vista | `saveError` | `message` | Gravação recusada: a vista devolve o osso à pose do arquivo e mostra a mensagem. |
| casca → vista | `history` | `undo`, `redo` | Contagens dos botões ↶ ↷. |
| casca → vista | `editing` | `enabled`, `reason` | Liga/desliga os anéis e ↶ ↷ (Claude trabalhando, sem animação, arquivo inválido). |

## Barra de tempo (dentro da vista)

- Botão tocar/pausar, `input type="range"` de 0 até a duração, rótulo "1,2 s de 3,0 s" (vírgula decimal).
- Arrastar pausa e mostra a pose do instante (`action.time = t; mixer.update(0)`).
- Uma animação que não repete toca uma vez e para no último quadro (`LoopOnce` + `clampWhenFinished`).
  "Tocar" no fim recomeça do 0.
- Sem animação, a barra fica desativada.

## Câmera

- Órbita em volta do modelo: arrastar gira, a roda aproxima (`OrbitControls`). O alvo é o centro do modelo.
- Abrir um modelo enquadra-o de frente: o glTF tem +Z como a frente, e a câmera fica em +Z olhando o centro.
- Trocar ou recarregar a animação nunca mexe na câmera (FR-008).
