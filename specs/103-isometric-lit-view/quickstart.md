# Quickstart: Vista isométrica iluminada (103)

```bash
cd frontend
npm test -- isoLight isoCamera isoFocus viewMode modelSet
npm run lint
npm run build      # confira que three continua só em chunks lazy
npm run dev
```

Prepare uma campanha com: um personagem seu com token **com modelo 3D e armas**, outro personagem (de outro usuário) com
token só com figura 2,5D, um NPC só com imagem, um mapa com máscara 3D e fundo 360°.

1. **Escolha** (US1): no 2D, abra o botão de vista → "Isométrica" (2 cliques). Recarregue: volta isométrica. Escolha
   "3D": a vista atual abre igual a antes (máscara, paredes, caminhada). Volte ao 2D.
2. **Chão plano**: na isométrica não há paredes, céu nem terreno; a imagem do mapa está no chão com a grid hexagonal por
   cima, alinhada aos hexes do 2D.
3. **Luz** (US2): o círculo está na sua peça; ponha peças a 3, 5 e 8 hexes (no 2D, em outra aba): a de 3 inteira, a de 8
   invisível, a da borda cortada (só a metade de dentro). Fora do círculo a imagem e a grid escurecem até o preto, com
   borda suave e névoa escura se mexendo devagar.
4. **Câmera** (US3): arraste para girar e inclinar (nunca abaixo do chão nem vertical); roda, pinça e +/− dão zoom.
5. **Peças** (US4): o modelo está parado na pose de "Parado", com as armas; a figura 2,5D encara a câmera; a imagem do NPC
   está deitada no chão girada pelo `look`.
6. **Foco** (US5): clique na peça do outro personagem (ou use "Foco: …"): câmera e luz vão até ele em menos de 1 s, sem
   piscar nem recarregar modelos; "Voltar ao meu personagem" retorna. Entre como mestre: começa no primeiro PJ do painel.
7. **Tempo real**: mova sua peça pelo 2D em outra aba: o círculo acompanha em até 2 s; troque o token de uma peça: a vista
   mostra o novo.
8. **Celular**: um dedo gira, dois dão zoom, a página não rola.
