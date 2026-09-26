# UI Contract: Sistema de Turnos

## Menu principal (`TopMenu` → `TurnControls`)

- Todos (com campanha atual): badge "Turno N".
- Mestre: botão "Finalizar turno" ao lado → `POST …/finish { force: false }`:
  - `finished` → toast `toast.turnFinished` + notificação;
  - pendentes → `FinishTurnModal` com a lista e os botões "Voltar" e "Finalizar mesmo assim"
    (`force: true`).

## Cards (`PartyCard`, `NpcCard`)

`TurnStatusDot` (círculo de 10 px) antes do nome: vermelho `none`, amarelo `moved`, verde `acted`, com
`title` ("Ainda não agiu" / "Moveu" / "Agiu").

## Menu da peça (`HexMenu`)

| Item | Quem | Ação |
|---|---|---|
| Mover | como na 015; oculto se a peça já se moveu no turno | — |
| **Agir** | mestre (personagem/NPC) ou dono | `ActModal` |
| **Resetar turno** | mestre ou dono (só se houver registros no turno) | `ConfirmModal` → `POST /api/turn/reset` |

Objetos não têm Agir/Resetar.

## `ActModal`

Título "Agir — {nome}", `textarea` (≤ 2 000, obrigatório), Cancelar / Agir → `POST /api/turn/action` →
toast `toast.actionRecorded`.

## Mapa

- `TurnTrailLayer`: para cada Movement do turno atual no mapa aberto, rastro (mesmo estilo do modo Mover,
  cor `--bs-info` translúcida) do estado antes ao depois pelo caminho mínimo.
- `SpeechBubbleLayer`: sobre cada peça com Action no turno, balão branco com borda escura e ponta para a
  peça (`foreignObject` acima do disco), até 3 linhas, texto completo no `title`.

## Sino (`NotificationBell`)

Itens "Turno N finalizado" (mais recentes primeiro) além dos convites; clicar abre `TurnSummaryModal`.

## `TurnSummaryModal`

Título "Resumo do turno N"; lista cronológica: ícone do tipo, nome, texto (ação/resultado) ou "moveu de
(x,y) para (x,y)"; vazio → "Nada foi feito neste turno."

## Textos (pt-BR)

`turn.label` "Turno {{no}}", `turn.finish` "Finalizar turno", `turn.pendingTitle` "Ainda falta agir",
`turn.pendingMessage`, `turn.finishAnyway` "Finalizar mesmo assim", `turn.back` "Voltar",
`turn.status.none|moved|acted`, `turn.act` "Agir", `turn.actTitle`, `turn.actPlaceholder`,
`turn.reset` "Resetar turno", `turn.resetTitle`, `turn.resetMessage`, `turn.alreadyMoved`,
`turn.summaryTitle`, `turn.summaryEmpty`, `turn.moved` "moveu de ({{fromX}}, {{fromY}}) para ({{x}}, {{y}})",
`turn.result` "Resultado", `notifications.turnFinished` "Turno {{no}} finalizado", `toast.turnFinished`,
`toast.actionRecorded`, `toast.turnReset`, `toast.turnResetNotReverted`.
