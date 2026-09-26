# Quickstart: Movimentação de Tokens

```bash
cd backend && dotnet test && dotnet run --project Roll6.API
cd ../frontend && npm test && npm run lint && npm run dev
```

Contas: **Mestre** e **Jogador** (personagem "Aria", movimento 6, peça no mapa virada para cima); um NPC
"Goblin" (movimento 4) e um objeto "Baú" no mesmo mapa.

1. Jogador clica na Aria → menu só com **Mover**; clica no Goblin/Baú → nenhum menu.
2. Mover: contador "0/6"; mouse 2 hexes acima → rastro verde, "2/6"; mouse 1 hex abaixo → caminho com
   giros (ex.: 3 giros + 1 passo = "4/6"); mouse longe → vermelho, clique recusado com aviso.
3. Clique num hex verde → a Aria vai para lá; mover o mouse ao redor → ela gira, o contador soma os giros;
   clique → gravado; recarregar → posição e sentido mantidos.
4. Esc durante o modo → volta ao lugar e sentido originais.
5. Mestre: move o Goblin além de 4 (vermelho) e confirma → aceito. Move o Baú → rastro cinza, sem contador.
6. Peça bloqueando o caminho: o rastro contorna; hex ocupado não tem rastro.
7. API: jogador `PUT /api/maptoken/{goblin}/position` → 403; `PUT` da Aria para longe → 400.
