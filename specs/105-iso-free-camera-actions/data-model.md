# Data Model: Câmera livre e jogo completo na vista isométrica (105)

**Nenhuma mudança de banco, DTO, API ou MCP.** A feature só muda estado de tela (frontend). Tudo o que é salvo continua
passando pelas mesmas operações do 2D (`PUT /api/maptoken/{id}/position`, `POST /api/maptoken/character`,
`POST /api/mapnpc`, `POST /api/turn/action`…).

## Estado de tela (não persistido)

### IsoPose (`lib/isoCamera`, existente — muda o dono do `target`)

| Campo | Tipo | Regra |
|---|---|---|
| `target` | `Point` (map px) | **Agora do usuário**: muda com o deslizar e com o seletor de foco; preso a `mapBounds` (o retângulo da grid). É também o centro da luz. |
| `yaw` | rad (−π, π] | botão direito (horizontal) / torção |
| `pitch` | 30–70° | botão direito (vertical) / dois dedos na vertical |
| `span` | 4–30 hexes | roda, pinça, botões +− |

### Gesto (`IsoView`, em memória)

`{ pointerId(s), button: 'pan' | 'orbit' | 'touch', start: {x, y}, last: {x, y}, grabbed: Point | null, moved: boolean }`
— `moved` quando o ponteiro anda ≥ `CLICK_TOLERANCE` (4 px); só um gesto sem `moved` é clique.

### Interação do mapa (`hooks/useMapInteraction`, extraído de `MapCanvas`)

| Campo | Origem |
|---|---|
| `menu` `{ hex, left, top } \| null` | clique sem arraste num hex permitido |
| `pickedHex` | hex de uma janela aberta pelo menu (token, excluir) |
| `targeting` `ActTarget \| null` | "Agir sobre…" (098) |
| `hoverHex` | hex sob o ponteiro ou o cartão arrastado |
| `movement` | `useTokenMovement` (015/054), inalterado |

Derivados (puros, iguais nas duas vistas): `selectedShape`, `hoverShape`, `movePreview`, `moveDestination`,
`moveStatus`, permissões `canMove`/`canTakeTurn`/`canSetPosture`/`isOwnPiece`.

### Overlays da isométrica (`isoRenderer.setOverlays`)

`{ hover: Offset[] | null, selected: Offset[] | null, path: Offset[], destination: Offset[], status: 'ok' | 'over' | 'blocked' | null }`
— desenhados no chão acima da grade, **fora** da luz (visíveis no escuro).

### Foco (`lib/isoFocus`, existente)

Continua escolhendo a peça inicial e alimentando o `IsoFocusSelect`; deixa de mover a câmera sozinho quando a peça se
move (FR-003). O clique numa peça não muda mais o foco.
