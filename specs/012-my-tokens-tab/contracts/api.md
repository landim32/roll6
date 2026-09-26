# API Contract: Aba "Meus Tokens" e Edição de Tokens

## Alterado

### `GET /api/token?search=&page=&pageSize=&mine=`

- `mine=true` → só os tokens do usuário logado (`sub` do JWT). Omitido/false → biblioteca inteira
  (inalterado). Resposta `PagedList<TokenInfo>`.

## Usados sem mudança

- `PUT /api/token/{id}` (`TokenInsertInfo`) — só o criador; outro usuário → 403.
- `POST /api/image` — upload das imagens recortadas.
