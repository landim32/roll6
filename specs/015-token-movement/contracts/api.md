# API Contract: Movimentação de Tokens

## Alterado

### `PUT /api/maptoken/{id}/position` → `200 MapTokenInfo`

```json
{ "x": 4, "y": 2, "look": 3 }
```

- `look` opcional (0–5); ausente mantém o sentido atual; fora de 0–5 → 400.
- **Mestre** (dono do mapa): qualquer peça, sem limite de movimento.
- **Jogador**: só peça de personagem (tipo 1) cuja participação aprovada é de um personagem dele; o
  servidor recalcula o custo mínimo (passos + giros) de `(x, y, look)` atual até o pedido, com as outras
  peças como obstáculos:
  - inalcançável ou custo > movimento do personagem → 400 `{ "move": ["O movimento passou do máximo."] }`;
  - peça de outro jogador, NPC ou objeto → 403.
- Destino fora da grid → 400; ocupado por outra peça → 409 (regras existentes).
