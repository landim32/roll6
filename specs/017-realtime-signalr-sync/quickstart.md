# Quickstart: validar a sincronização em tempo real (017)

Pré-requisitos: backend (`dotnet run --project Roll6.API`) com a migração `AddCampaignCurrentMap`
aplicada, frontend (`npm run dev`) e uma campanha com mestre **M** e jogador **J** (personagem aprovado),
dois mapas (A e B) e NPCs.

1. **Conexão**: abrir M e J em navegadores diferentes. Nenhum selo "Sem tempo real" no rodapé; na aba
   Network há uma conexão WebSocket em `/hubs/table`.
2. **Movimento (US1)**: J move o próprio personagem → M vê a peça nova posição/sentido em ≤ 2 s. M move um
   NPC → J vê.
3. **Peças**: M inclui objeto, troca o token e exclui uma peça → J vê cada mudança sem recarregar.
4. **Turno (US2)**: J age → M vê balão e círculo verde. M finaliza o turno → J vê "Turno N+1" e a
   notificação na hora. J reseta o turno → M vê a peça voltar.
5. **Cartões**: M muda a vida de J e de um NPC do mapa → barras e peça atualizam para ambos. M inclui um
   NPC na campanha → J vê o card.
6. **Troca de mapa (US3)**: M abre o mapa B → J passa ao mapa B com o toast. J recarrega a página → abre B.
   J abre A por conta própria; M abre A e depois B → J volta a seguir.
7. **Mapa salvo**: M ajusta a imagem de B e salva → J vê a nova imagem mantendo o zoom.
8. **Queda (US4)**: J desliga a rede (DevTools → Offline) → aparece "Reconectando…"/"Sem tempo real".
   M move peças e age. J volta a rede → em ≤ 5 s a tela de J fica igual à de M, sem recarregar.
9. **Permissão**: um terceiro usuário sem personagem aprovado abre a campanha (lista pública) → não recebe
   eventos (`JoinCampaign` negado; sem mensagens `tableEvent` na conexão).
10. **API intacta**: `dotnet test` e `npm test` passam; Swagger lista os mesmos endpoints mais
    `PUT /api/campaign/{id}/current-map`.
