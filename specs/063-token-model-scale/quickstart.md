# Quickstart: Tamanho do modelo 3D do token (063)

## Automático

```bash
cd backend && dotnet test            # Guard.ModelScale, Token.UpdateModel, TokenLibraryService (gravação + evento), MCP
cd frontend && npm run lint && npm test   # modelScale, modelFit (fator), tokenForm, pieceDrawing
```

## Manual (site + API local ou homolog)

1. Abrir "Meus Tokens" → lápis num token **com** modelo 3D → aba **3D**: o campo **Tamanho** mostra 100%.
2. Arrastar para 200%: a prévia mostra o modelo com o dobro da altura sobre o mesmo disco, na hora.
3. Arrastar para 25%: o modelo fica pequeno sobre o disco.
4. Salvar com 150%, reabrir: 150% e a prévia no mesmo tamanho.
5. Num token **sem** modelo: a aba 3D não mostra o campo. Remover o modelo de um token com 150% e salvar: o token volta
   a 100%.
6. Pôr duas peças de tokens com o mesmo `.glb` (100% e 200%) num mapa, abrir a vista **3D**: a segunda tem o dobro da
   altura, pés no chão, no centro do hexágono; deixar uma caída: continua no mesmo tamanho, deitada.
7. Fazer um personagem agir (balão): o balão fica sobre a cabeça do modelo grande.
8. Com outro navegador no mesmo mapa em 3D, mudar o Tamanho do token e salvar: a peça muda sem recarregar (≤ 3 s).
9. "Gerar imagem" num token a 300%: a foto continua ocupando a imagem inteira (Q2 = A).
10. MCP: `update_token` com `modelScale: 42` → 400 `modelScale`; com `modelScale: 120` → o token mostra 120%.
