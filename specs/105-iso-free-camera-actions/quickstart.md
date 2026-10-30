# Quickstart: validar a 105

Pré-requisitos: backend (`dotnet run --project Roll6.API`) e frontend (`npm run dev`), uma campanha ativa com mapa atual,
um personagem de jogador com peça, um NPC e um objeto no mapa. Dois navegadores: mestre e jogador.

## Automático

```bash
cd frontend
npm test -- isoCamera storyBubbles mapInteraction   # puros novos/alterados
npm test                                            # tudo (MapCanvas não pode regredir)
npm run lint && npm run build                        # three continua só em chunks lazy
```

## Manual

1. **Seletor**: botão de vista → "Mapa 2D", "Isométrica", "3D (legado)". "3D (legado)" abre a vista antiga igual.
2. **Câmera**: na isométrica, arrastar com o esquerdo até a borda do mapa — o chão acompanha o mouse, a luz vai junto,
   para na borda. Arrastar com o direito gira/inclina sem menu do navegador. Outro usuário move uma peça → a câmera não
   pula. Não há combo de foco.
3. **Menu (SC-002)**: para cada caso (próprio personagem, aliado comandado, NPC, objeto, hex vazio; como mestre e como
   jogador; campanha pausada; modo livre; peça caída), clicar no hex na isométrica e no 2D e comparar as opções.
   Clicar no corpo de uma miniatura alta abre o menu dela, não do hex atrás.
4. **Mover (SC-003)**: jogador, turno normal: Mover → caminho com contador → clique → direção → clique. Conferir no 2D
   posição, direção e rastro. Esc e clique direito cancelam; arrastes não. Repetir em modo livre (hex ocupado vermelho +
   aviso). Arrastar um cartão do grupo e um de NPC para a isométrica.
5. **Agir sobre…**: escolher um alvo clicando numa peça na isométrica; o chat mostra "sobre …".
6. **Balões**: declarar uma ação; o balão fica sobre a cabeça, inclusive com a peça no topo da tela; girar/deslizar e o
   balão acompanha; passar o mouse → transparente; clicar através dele abre o menu do hex de trás.
7. **Celular**: um dedo desliza, dois dedos zoom/giro/inclinação, toque abre o menu; Mover com toque duplo.
