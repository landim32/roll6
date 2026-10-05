# Contract: MCP tools (035)

Nenhuma ferramenta nova; `McpCoverageTests` continua em **86 operações / 87 ferramentas**. Parâmetros novos com default
(exigência de `McpRouteParityTests`).

| Ferramenta | Muda |
|---|---|
| `create_token`, `update_token` | + `rightImage`, `leftImage`, `backImage` (strings, default `null`), com as descrições abaixo; `update_token` lembra que omitir remove |
| `get_token`, `list_tokens` | *Returns* com `rightImage`, `rightImageUrl`, `leftImage`, `leftImageUrl`, `backImage`, `backImageUrl` |
| `list_map_tokens` | *Returns* com `rightImageUrl`, `leftImageUrl`, `backImageUrl` |
| `roll6://guide` | seção "3D view" ganha as quatro imagens |

Descrições dos parâmetros (inglês):

- `rightImage`: "Optional \"2.5D right\" image: the standing figure in profile, looking to the RIGHT of the image (we see the right side of the character). Same 3:4 portrait as frontImage. " + `McpDocs.IMAGE_FILE`
- `leftImage`: "… looking to the LEFT of the image (we see the left side of the character)."
- `backImage`: "Optional \"2.5D back\" image: the standing figure seen from behind."

Bloco de campos de token (`FIELDS`): lista as quatro imagens 2,5D e diz que cada uma é opcional.

Guia (`roll6://guide`, seção "3D view"): as quatro imagens; que o 3D mostra a do lado em que a câmera vê o personagem em relação
à direção da peça (frente a ±45° da direção dela, costas a ±45° da oposta, laterais 90°); que "right"/"left" são os lados do
próprio personagem; a reserva (lateral que falta → a oposta espelhada; senão a frente; senão a imagem em pé; as costas nunca
são espelhadas); e que `update_token` substitui todos os campos (reenviar as imagens 2,5D que devem ficar).
