# Quickstart: 109-npc-piece-fixes

```bash
cd backend
dotnet ef migrations add AddObjectPosture --project Roll6.Infra --startup-project Roll6.API
dotnet ef database update --project Roll6.Infra --startup-project Roll6.API
dotnet test
cd ../frontend && npm test && npm run lint && npm run build
```

Roteiro manual (mestre, campanha ativa, mapa aberto):

1. **Postura de objeto**: "Incluir token" num hex → menu da peça → Postura → Caído (a peça deita e ocupa o espaço
   "caído") → Fora de Combate (preto e branco). Numa outra aba, como jogador: a mudança aparece e o menu não mostra
   Postura. Na vista isométrica a miniatura tomba.
2. **Corpo**: NPC no mapa → Caído → X da linha no card (a confirmação avisa que o corpo fica) → a peça continua no hex,
   cinza de objeto e deitada, e o card some. Repetir com o NPC em pé: a peça some. Repetir com "Retirar da campanha".
3. **Arrasto**: NPC com duas instâncias → arrastar a linha de "Guarda 2" para um hex livre → só ela se move, e a imagem
   arrastada é um único retrato. Arrastar o cabeçalho → nova instância.
4. **Duplicada**: "Incluir NPC" com um NPC novo → a vista centraliza a peça nova e o toast diz onde ela ficou → arrastar
   o cabeçalho logo depois → a mesma instância muda de lugar e o total continua 1. Conferir no log de rede que cada gesto
   faz um único `POST /api/mapnpc`.
5. **Painel**: 15 NPCs no mapa, em desktop e celular, layouts mapa e dividido, com "Editar mapa" ligado → o painel termina
   acima dos botões e rola.
