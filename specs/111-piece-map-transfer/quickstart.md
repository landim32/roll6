# Quickstart: Mudar peça de mapa (111)

## Testes automatizados

```bash
cd backend
dotnet test --filter "FullyQualifiedName~OccupancyTests"          # NearestFree + FirstFree inalterado
dotnet test --filter "FullyQualifiedName~MapTokenServiceChangeMapTests"
dotnet test --filter "FullyQualifiedName~Mcp"                     # cobertura, paridade de rota, descrições

cd ../frontend
npm test -- mapInteraction                                        # canChangeMap
npm test -- keys                                                  # chaves i18n
npm run lint && npm run build
```

## Roteiro manual (campanha ativa com mapas A e B, um personagem e um NPC em A)

1. Como **mestre**, abra o mapa A, clique na peça do personagem → **Mudar de mapa** → escolha B.
   - A peça some de A; toast "Aria foi para B." com "Abrir mapa".
   - Abra B: a peça está no mesmo hex e olhando para o mesmo lado.
   - No navegador do **jogador** (vendo A): aparece "O mestre está mudando o mapa" e a tela vai para B.
   - O chat/turno não mostra movimento; o Deslocamento e "Mover" continuam disponíveis no turno.
2. Faça o mesmo com o NPC ferido: em B ele tem a mesma vida/fadiga/status/postura; o resumo do turno ainda lista a ação
   que ele já tinha declarado.
3. Ocupe em A o hex correspondente ao de uma peça de B e traga essa peça de volta → toast de posição ajustada; ela fica
   ao lado.
4. Com um "Guarda 2" em cada mapa, leve um deles para o outro → chega como "Guarda 3".
5. Como **jogador**, abra o menu da própria peça: "Mudar de mapa" não aparece. Via MCP com a chave do jogador,
   `change_piece_map` → 403.
6. Pause a campanha: a opção some; arquive B: B não aparece na lista; com só um mapa ativo a janela mostra
   "Não há outro mapa ativo nesta campanha.".
7. Repita o passo 1 na visão **isométrica**: o mesmo menu traz a opção.
