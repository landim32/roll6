# Quickstart: Sistema de Turnos

```bash
cd backend && dotnet test
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API   # AddTurns
dotnet run --project Roll6.API
cd ../frontend && npm test && npm run lint && npm run dev
```

Contas: **Mestre** e **Jogador** (Aria aprovada); Bram aprovado de outro jogador; NPC "Goblin" com duas
peças no mapa.

1. Todos veem "Turno 1"; só o mestre vê "Finalizar turno". Cards e NPC com círculo vermelho.
2. Jogador move a Aria → círculo amarelo, rastro visível ao mestre em até 15 s; "Mover" some do menu da
   Aria; `PUT …/position` de novo → 409.
3. Jogador → Agir "Ataco o goblin" → verde e balão sobre a Aria; outra ação → balão novo.
4. Mestre move/age com o goblin 1 → card do Goblin amarelo/verde só quando os dois agirem.
5. Jogador → Resetar turno na Aria → volta ao hex/sentido anteriores, sem balão, vermelho; pode mover de novo.
6. Mestre → Finalizar turno com Bram sem ação → modal lista "Bram"; "Finalizar mesmo assim" → Turno 2,
   círculos vermelhos, rastros e balões somem; sino "Turno 1 finalizado" para mestre e jogador; resumo lista
   tudo em ordem.
7. `POST /api/turn` com `turnType: 3` (resultado) pelo mestre → aparece no resumo; pelo jogador → 403.
