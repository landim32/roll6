# Research: Console de turnos na barra inferior (028)

## R1 — Fonte dos dados

- **Decision**: endpoint novo `GET /api/campaign/{id}/turn/history?before={turnNo}&limit={n}`: turnos finalizados com número
  `< before` (padrão: turno atual), do mais recente ao mais antigo, `limit` 1–20 (padrão 5). Cada item: `turnNo`, `actions`
  (texto "## Ações" do resumo), `finishedAt` (hora do último registro do turno, se houver). `nextBefore` = menor turno da
  página quando ainda há turnos anteriores, senão `null`.
- **Rationale**: buscar o resumo turno a turno (`/turn/summary`) exigiria uma chamada por bloco; a página carrega os
  registros de vários turnos numa consulta (`ListByCampaignTurnRangeAsync`) e os nomes uma vez (`LoadNamesAsync`).
  Cursor por número de turno é estável quando turnos novos chegam no topo.
- **Alternatives**: offset/page (desloca quando entra um turno novo); reaproveitar `turn/summary` (N chamadas, posições
  desnecessárias).

## R2 — Tempo real

- **Decision**: não criar evento novo. O `TurnContext` já atualiza `turnNo` com `turn.finished` (017) ou pela verificação
  periódica sem conexão; `useTurnHistory` observa `turnNo`: quando sobe, busca `history(before = turnNo)` com limite = turnos
  novos e faz merge no topo (dedupe por `turnNo`).
- **Rationale**: cumpre "atualizado por socket" reusando o canal existente, e cobre o modo sem tempo real (FR-007).

## R3 — Lista infinita

- **Decision**: `IntersectionObserver` numa sentinela no fim da lista (dentro do contêiner rolável); dispara `loadMore`
  quando visível e não está carregando/fim/erro. Sem biblioteca de virtualização (o volume por campanha é pequeno).
- "Novidades": se o contêiner está rolado (`scrollTop > 0`) quando entram blocos no topo, a posição é preservada
  (ajustando `scrollTop` pela diferença de altura) e aparece um botão "Novidades" que volta ao topo.

## R4 — Apresentação

- Bloco: título "Turno N" + as linhas das ações sem o cabeçalho "## Ações" (texto puro em `white-space: pre-wrap`, sem
  renderizar markdown — mesmo cuidado do `TurnLogModal`, os nomes já vêm escapados).
- Console: faixa acima da barra (`bottom: var(--stm-footer-height)`), largura central, altura máx. ~35vh, fundo
  `rgba(var(--bs-body-bg-rgb), .6)` + `backdrop-filter`, fonte ~0.75rem; `pointer-events` só na faixa (o mapa fora dela
  continua clicável). Botão "Ampliar" no canto → `TurnConsoleModal` (`Modal wide`, fonte normal).
- Botão da barra: centralizado na `GridSizeFooter` (`position: absolute; left: 50%`), ícone de seta (chevron) para cima/baixo,
  `aria-expanded`. Só aparece quando o usuário lê turnos (`TurnContext.turnNo !== null`).

## R5 — MCP

- `get_turn_history` (GET, ReadOnly) — a cobertura exige uma ferramenta por operação; útil também para assistentes lerem o
  histórico em lotes.
