# Quickstart: Console de turnos (028)

Pré-requisitos: campanha com vários turnos finalizados (ex.: rode a coleção do Bruno algumas vezes ou use `process_turn`).

1. Abra o mapa da campanha: a barra inferior tem a seta ↑ no centro. Clique: o console abre (↓) com "Turno N-1" no topo.
2. Role até o fim: carregam turnos mais antigos até "Início da campanha".
3. Recarregue a página: o console volta aberto.
4. Com outra sessão (jogador aprovado) aberta, finalize o turno como mestre: nas duas telas o novo bloco aparece no topo
   em poucos segundos. Role para baixo e finalize outro: a posição não pula e aparece "Novidades".
5. "Ampliar" abre a janela em tela cheia com o mesmo histórico e rolagem infinita.
6. Usuário fora da campanha: o botão não aparece. API: `GET /api/campaign/{id}/turn/history?limit=2` pagina com `nextBefore`.
