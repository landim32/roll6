# UI Contract: Console de turnos (028)

## GridSizeFooter

Botão central (ícone chevron ↑ fechado / ↓ aberto), `aria-expanded`, `title` "Console de turnos". Visível só quando
`TurnContext.turnNo !== null`. Estado em localStorage `roll6:console-open`.

## TurnConsole (sobre o mapa)

- Faixa acima da barra inferior, centralizada, altura máx. ~35vh, fundo semitransparente com desfoque, letra pequena.
- Cabeçalho mínimo: "Turnos" + botão "Ampliar" (abre `TurnConsoleModal`).
- Conteúdo: `TurnHistoryList`.

## TurnHistoryList (compartilhada)

- Bloco por turno: "Turno N" (+ hora, se houver) e as linhas das ações (sem o cabeçalho "## Ações"), texto puro.
- Fim da lista: sentinela que carrega mais; "Carregando…"; "Início da campanha" quando `nextBefore` é null; erro →
  "Não foi possível carregar" + "Tentar de novo".
- Vazio: "Nenhum turno finalizado ainda".
- Blocos novos no topo com o usuário rolado: posição mantida + botão "Novidades" (volta ao topo).

## TurnConsoleModal

`Modal wide` (como as configurações da campanha), título "Histórico de turnos", `TurnHistoryList` com fonte normal.
