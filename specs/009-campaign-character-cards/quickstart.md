# Quickstart: Cards dos Personagens da Campanha

```bash
cd backend
dotnet ef migrations add AddCampaignCharacterVitals --project SimpleTabletopMap.Infra --startup-project SimpleTabletopMap.API
dotnet ef database update --project SimpleTabletopMap.Infra --startup-project SimpleTabletopMap.API   # banco de dev
dotnet test
cd ../frontend && npm test -- vitals && npm run lint && npm run build
```

## Roteiro (Mestre e Jogador)

1. Mestre cria a campanha e inclui "Goblin" (vida 10, energia 4); Jogador entra com "Aria" (vida 12,
   energia 6) e o Mestre aprova.
2. Ambos veem o painel à esquerda com dois cards, barras cheias "10/10", "12/12"…
3. Jogador: lápis só em "Aria". Edita → vida atual 8 → salva → card "8/12", barra em 2/3.
4. Mestre: lápis nos dois cards. Edita "Aria" → vida atual -2 → card "Caído"; em até 15 s o Jogador
   vê "-2/12" sem recarregar.
5. Mestre põe a vida atual de "Aria" em 12; Jogador edita a vida **total** para 10 → o card passa a
   "10/10" (atual reduzido junto). Mestre tenta vida atual 11 → toast "O valor atual não pode passar
   do total." e nada é salvo.
6. Jogador tenta `PUT /api/character/{goblinId}` (Bruno) → 403.
7. Recolher o painel, F5 → continua recolhido; trocar de campanha → cards da outra campanha.
