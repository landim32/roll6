# Contract: the piece menu and the repeated-action window (099)

## Menu (`HexMenu`)

```text
[avatar] Aria
Mover                          ⤢
── Ação ─────────────────────────
Agir sobre…                    ⌖
Agir                           💬
Ação repetida…            ●    ⟳     (● = active)
Resetar turno                  ↶
── Postura ──────────────────────
[ 🧍 ] [ ⤓ ] [ 💔 ]                 (one row; current one highlighted and disabled)
Editar NPC / Alterar token / Excluir
```

- Items inside a group have **no rule between them**; a group has one rule above its header.
- Posture buttons: 44 × 44, `role="menuitemradio"`, `aria-checked`, `title`/`aria-label` = "Em pé"/"Caído"/"Fora de
  combate".
- "Ação repetida…": same availability as "Agir"; active marker (`title` "Ação repetida ativa").

## `RepeatedActionModal`

- Title "Ação repetida — {name}".
- Explanation (i18n `repeated.explain`): "A ação repetida vale como a ação do personagem no início de cada turno, até
  você removê-la, declarar outra ação ou o mestre a encerrar quando ela se cumprir. Para um melhor resultado, descreva
  bem: o que fazer, contra quem e até quando." + example (`repeated.example`): "Ex.: Enquanto existirem inimigos vivos
  nesta sala, prepare o machado e ataque de forma repetida, sem ataque total, até não existir mais nenhum inimigo."
- Textarea (≤ 2000, Enter submits, Shift+Enter new line), opened with the active repetition.
- Buttons: Cancelar · **Remover ação repetida** (danger, only when active) · Salvar.
- Toasts: `repeated.saved` ("Ação repetida ativada."), `repeated.savedNow` ("Ação repetida ativada e já registrada neste
  turno."), `repeated.removed`.

## Elsewhere

- `PartyCard` / `NpcCard` instance row: small `ArrowRepeatIcon` with the text in `title` while active.
- Chat: a repeated action shows a small "repetida" badge next to the lightning icon.
