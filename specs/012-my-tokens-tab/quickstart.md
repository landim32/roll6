# Quickstart: Aba "Meus Tokens" e Edição de Tokens

```bash
cd backend && dotnet build Roll6.sln && dotnet test && dotnet run --project Roll6.API
cd ../frontend && npm test && npm run lint && npm run dev
```

Contas **A** e **B**, cada uma com tokens próprios.

1. **A** abre o modal de tokens (menu do hex → "Incluir token"): abas "Meus Tokens" (selecionada),
   "Buscar tokens", "Incluir token"; "Meus Tokens" mostra só os tokens de A em 4 colunas.
2. Buscar por parte do nome filtra; clicar num token (fora do lápis) conclui "Incluir token".
3. Reabrir, clicar no lápis de um token: o modal de tokens fecha, abre "Editar token" preenchido;
   trocar nome e imagem em pé (girar/diminuir), salvar → toast; volta a "Meus Tokens" com os dados novos;
   peças do mapa com esse token mostram a imagem nova após reabrir o mapa.
4. Editar e cancelar → volta a "Meus Tokens" sem mudanças; o hex continua selecionado.
5. Aba "Buscar tokens": nenhum lápis; tokens de B aparecem sem edição.
6. Com o token de A, **B** chama `PUT /api/token/{id}` → 403.
7. Conta sem tokens: "Meus Tokens" mostra a mensagem de vazio.
