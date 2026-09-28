# Quickstart: Registro completo do turno e resumo em markdown (024)

Pré-requisitos: migração aplicada; mestre "Rodrigo" com campanha, mapa atual, personagem "Comam" (dele) e o jogador
"José" com "Cedric" aprovado; um NPC "Goblin" no mapa.

1. José move Cedric de (2, 11) olhando Sudoeste para (2, 12) olhando Sul (custo 3).
2. Rodrigo abre o card de Cedric e muda Vida atual 10 → 6, Energia 8 → 5 e Status para "Agachado"; salva.
3. Rodrigo age com Comam: "Vou largar minha picareta e fazer um saque rápido da minha espada".
4. Clique em "Turno N" no rodapé: o modal mostra

   ```
   ## Ações
   Cedric (José): Moveu de (2, 11) olhando para o Sudoeste para (2, 12) olhando para o Sul, gastou 3 pontos de movimento (3)
   GM (Rodrigo): Alterou Cedric (José): Vida de 10 para 6; Energia de 8 para 5; Status de "…" para "Agachado"
   Comam (Rodrigo): "Vou largar minha picareta e fazer um saque rápido da minha espada"
   ## Posições
   - Cedric (José) - (2, 12) - Sul
   - Comam (Rodrigo) - (…) - …
   - Goblin (GM) - (…) - …
   ```

5. "Copiar" → cole num editor markdown: duas seções corretas.
6. Salve o card sem mudar nada: nenhum registro novo. "Resetar turno" de Cedric: o movimento some, a alteração continua.
7. API: `GET /api/campaign/{id}/turn/summary` (sem turnNo) = turno atual; `?turnNo=1` = turno 1.
