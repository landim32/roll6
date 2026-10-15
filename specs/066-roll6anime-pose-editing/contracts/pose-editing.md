# Contract: Edição da pose (066)

## Na vista

- Esqueleto ligado + clique (sem arrastar) numa junta ou linha → seleciona o osso (`nearestBone`); a animação pausa; o
  gizmo de rotação aparece na junta; o rótulo fixa o nome. Osso fora de `ANIMATION_BONES` → rótulo "LeftEye não pode ser
  animado" e nada mais.
- Arrastar um anel → o osso gira; rótulo "LeftForeArm: 32°" (ângulo desde o início do arrasto).
- Soltar → `saveAnimation`; o gizmo fica no osso até a versão nova chegar (e continua depois, no mesmo osso).
- Esc ou clique no vazio → tira a seleção. Retomar a reprodução também tira.
- Barra: `[↶ 2] [↷ 0]` (desativados com 0 ou com edição bloqueada); Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z.
- `editing.enabled = false` → gizmo e ↶↷ desativados; o rótulo/aviso mostra `reason`.

## Ponte (adiciona a specs/062-roll6anime-editor/contracts/viewer-bridge.md)

| Direção | `type` | Campos | Efeito |
|---|---|---|---|
| vista → casca | `saveAnimation` | `fileName`, `file` | A casca valida e grava o arquivo aberto (se for ele e o Claude não estiver trabalhando). |
| vista → casca | `undo`, `redo` | — | A casca grava a versão anterior/seguinte do histórico. |
| casca → vista | `saveError` | `message` | A gravação foi recusada; a vista volta à pose do arquivo e mostra a mensagem. |
| casca → vista | `history` | `undo`, `redo` (números) | Contagens dos botões ↶ ↷. |
| casca → vista | `editing` | `enabled`, `reason` (texto ou null) | Liga/desliga a edição. |

## Gravação (casca)

- Caminho: a pasta configurada + `fileName` do arquivo aberto; mais nenhum.
- Validação: `AnimationFormat.Parse` (backend). Erro → nada gravado, `saveError` com "chave: mensagem".
- Escrita: JSON indentado (2 espaços), UTF-8 sem BOM, via `nome.json.tmp` + mover por cima.
- Histórico: toda versão lida da pasta diferente da atual entra; Ctrl+Z/Ctrl+Y gravam o texto exato da versão.
