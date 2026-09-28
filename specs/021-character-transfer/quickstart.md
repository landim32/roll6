# Quickstart: Transferir personagem (021)

Pré-requisitos: API (`dotnet run --project Roll6.API`) e frontend (`npm run dev`); usuários A (dono), B (destino) e M (mestre).

1. A cria o personagem "Kael" com token, entra na campanha de M e é aprovado; M coloca a peça no mapa; A move a peça e age no turno; M baixa a vida atual de Kael.
2. A abre "Personagem atual" → "Selecionar", clica em "Transferir" em Kael, informa o e-mail de B e confirma.
3. Para A: toast de sucesso; Kael some da lista e do combo; mover a peça ou agir → recusado.
4. Para M (sem recarregar): o card de Kael continua no grupo com a mesma vida atual, status e ficha; a peça no mesmo hex e direção.
5. B abre "Selecionar": Kael aparece aprovado na campanha; B o seleciona, abre o card como dono, e o menu da peça não oferece "Mover" (já moveu neste turno).
6. Erros: e-mail inexistente → "Usuário não encontrado."; o próprio e-mail → recusado; transferir de novo como A (pela API) → 403.
7. API: `POST /api/character/{id}/transfer` com `X-Api-Key` e `{"email":"b@x.com"}` → 204.
