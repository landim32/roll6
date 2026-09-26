# Quickstart: chaves de API (019)

Pré-requisitos: migração `AddApiKeys` aplicada; backend e frontend rodando; um usuário com uma campanha.

1. Menu do usuário → "Chaves de API" → Nome "Teste", Validade "30 dias" → Gerar. A chave aparece uma vez;
   copiar. Fechar e reabrir: só aparece `r6_xxxxxxxx…`.
2. `curl -H "X-Api-Key: <chave>" http://localhost:5119/api/campaign?mine=true` → 200 com as campanhas.
3. Com a chave, mover uma peça (`PUT /api/maptoken/{id}/position`) → 200 (escrita permitida, Q1 → A);
   a peça se move para quem estiver no mapa (017).
4. Com a chave: `GET /api/apikey` → 403; `PUT /api/user/password` → 403.
5. Chave inventada (`r6_xxx`) → 401; sem cabeçalho → 401.
6. No modal, "Último uso" mostra a hora do passo 2.
7. Revogar a chave (confirmar) → repetir o passo 2 → 401 na hora.
8. Gerar com "Sem expiração" (aviso aparece) e com "Data específica" amanhã → listas mostram "Nunca" e a
   data; data de ontem é recusada.
9. Excluir a chave revogada → some da lista; tentar excluir uma ativa pela API → 409.
10. `dotnet test` e `npm test` passam.
