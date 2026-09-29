# Quickstart: validar a feature 031

Pré-requisitos: banco com a migração `AddPostureAndTokenSpaces` aplicada (`dotnet ef database update --project
Roll6.Infra --startup-project Roll6.API`), API (`dotnet run --project Roll6.API`), frontend (`npm run dev`), uma campanha
com mapa atual, um jogador com personagem aprovado e um NPC na campanha.

## Automático

```bash
cd backend && dotnet test --filter "FullyQualifiedName~HexGridTests|FullyQualifiedName~OccupancyTests|FullyQualifiedName~MapTokenServiceTests|FullyQualifiedName~TokenLibraryServiceTests|FullyQualifiedName~Mcp"
cd frontend && npm test -- hexGrid occupancy mapTokens movement tokenForm && npm run lint && npm run build
```

Os casos de referência de `Footprint` (5 tamanhos × 6 direções, coluna par e ímpar) têm de ser iguais nos dois lados.

## Manual — postura (US1)

1. Como jogador, clique na sua peça → Postura → "Caído": a peça deita; em outra aba (mestre) muda sem recarregar.
2. Como mestre, "Fora de combate": peça deitada e cinza; cartão do grupo em cinza com o selo.
3. MCP: `set_piece_posture { mapTokenId, posture: 1 }` volta a peça a Em pé para todos.
4. Outro jogador tenta `PUT /api/maptoken/{id}/posture` na peça alheia → 403.
5. Clique em "Turno N" no rodapé: resumo mostra "Postura de "Em pé" para "Caído"".

## Manual — tamanhos (US2)

1. Crie tokens de 2, 3, 7 e 10 hexes (o formulário só oferece 1/2/3/7/10); `POST /api/token` com `upSpace: 4` → 400.
2. Coloque cada um como objeto: o formato aparece inteiro; clique em qualquer hex dele abre o menu da peça.
3. Tente colocar outra peça num hex do formato → 409; perto da borda de modo que saia da grade → 400.
4. Mova a peça de 10 hexes: giros que não cabem não aparecem; o destino mostra o formato inteiro.

## Manual — postura muda o tamanho (US3)

1. Token 1 em pé / 2 deitado num personagem; deixe o hex de trás livre, marque "Caído": passa a ocupar 2 hexes.
2. Ocupe o hex de trás com outra peça e marque "Caído" de novo: aceita e fica sobreposta; mover a peça exige espaço.
3. Volte para "Em pé": ocupa 1 hex.
4. Compartilhe o mapa: a imagem gerada mostra formatos, peças deitadas e cinza iguais à tela.
