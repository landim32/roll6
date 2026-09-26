# Quickstart: Painel de NPCs

```bash
cd backend && dotnet run --project Roll6.API
cd ../frontend && npm test && npm run lint && npm run dev
```

Contas: **Mestre** (campanha C com um mapa de campanha aberto) e **Jogador** aprovado em C.

1. Mestre no mapa: painel "NPCs (0)" à direita, com "Incluir NPC" no fim; os dois painéis e os controles
   do mapa não se sobrepõem (inclusive em 1366 × 768).
2. "Incluir NPC" → aba "Novo NPC": sem nome/token → aviso; com nome "Goblin", token, vida 7 → salvo; o
   card aparece com barras 7/7.
3. "Incluir NPC" → "Meus NPCs": o Goblin aparece como "Na campanha"; outro NPC da biblioteca → incluído.
4. Arrastar o card do Goblin para dois hexes livres → duas peças; para um hex ocupado → aviso.
5. Lápis do Goblin → mudar a vida para 9 → salvar → card 9/9. "Retirar da campanha" → confirmar → card e
   peças somem.
6. Recolher o painel → aba estreita à direita; recarregar → continua recolhido.
7. Jogador no mapa: não vê o painel de NPCs nem "Incluir NPC"; vê as peças de NPC no mapa.
