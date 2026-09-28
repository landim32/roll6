# UI Contract: Registro completo do turno e resumo em markdown (024)

## GridSizeFooter

"Turno N" vira um botão (mesmo visual do badge, `title` "Ver o resumo do turno") que abre `TurnLogModal`.

## TurnLogModal

- Título "Resumo do turno".
- `<select>` "Turno" com N (atual, rotulado "N (em andamento)") até 1; padrão = atual.
- Texto em `<pre class="stm-turn-log">` (fonte monoespaçada, quebra de linha, rolagem), exatamente o markdown da API.
- Botões "Copiar" (primário; `navigator.clipboard.writeText`; toast "Resumo copiado"; erro → toast "Não foi possível copiar")
  e "Fechar".
- Carregando → "Carregando…"; recarrega quando o turno atual ou seus registros mudam enquanto aberto.

## Listas de turno existentes

`TurnSummaryModal` (turno finalizado) e marcadores do mapa ignoram `CharacterUpdate` onde hoje só consideram movimento/ação.
