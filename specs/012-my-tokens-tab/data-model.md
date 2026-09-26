# Data Model: Aba "Meus Tokens" e Edição de Tokens

Sem mudança de schema.

## Token (`tokens`) — existente

| Campo | Regra relevante |
|---|---|
| `user_id` | criador; filtro de "Meus Tokens" e dono para edição |
| `name` | obrigatório, ≤ 260 |
| `description` | ≤ 2.000 |
| `up_space` / `down_space` | inteiros ≥ 0; `down_space` null = sem estado deitado (regra da feature 003) |
| `up_image` / `down_image` | `{guid}.{ext}`; imagens novas quadradas 240 × 240 (feature 011) |

## Regras

| Ação | Quem | Resultado |
|---|---|---|
| Listar todos | qualquer usuário logado | biblioteca paginada (inalterado) |
| Listar "meus" | qualquer usuário logado | só `user_id = sub do JWT` |
| Editar | só o criador | 403 para os demais (inalterado) |

Efeitos da edição: o mesmo token é usado por peças de mapas e por personagens, então nova imagem vale
para todos; peças NPC mantêm o `name` próprio.
