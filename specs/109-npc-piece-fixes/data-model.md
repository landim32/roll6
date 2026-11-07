# Data Model: 109-npc-piece-fixes

## map_tokens (alterada)

| Coluna | Tipo | Regra |
|---|---|---|
| `posture` | `integer NOT NULL DEFAULT 1` | `Posture`: 1 Standing, 2 Down, 3 OutOfCombat. Só tem efeito em peças de objeto (`token_type = 4`); personagem lê da participação, NPC da instância. |

`MapToken`:

- `Posture Posture` (padrão Standing).
- `bool ChangePosture(int posture)`: fora de 1–3 → `DomainValidationException("posture", …)`; mesmo valor → `false`.
- `void LeaveBody(string name, Posture posture)` (só para peça de NPC):
  - muda: `MapNpcId = null`, `TokenType = Object`, `Posture = posture`, `Name = name`;
  - zera: `Life = Energy = Move = 0`, `Status = Sheet = null`, walk limpo;
  - mantém: `MapTokenId`, `MapId`, `TokenId`, `X`, `Y`, `Look`.

Espaço de um objeto: `Token.SpaceFor(piece.Posture)`, usado em `MapOccupancyLoader.PosturesAsync` e `MapToDtoAsync`.

## Regra pura `Domain/Npcs/NpcRemoval`

```text
Decide(MapNpc instance) → Body   quando instance.Posture ∈ {Down, OutOfCombat}
                        → Delete quando Standing
```

## Transições ao retirar uma instância

```text
Peça de NPC (map_npc_id = N) ──instância Em pé──────────────▶ apagada
                             ──instância Caída/Fora de Combate─▶ peça de objeto (map_npc_id = null, posture = a da instância)
MapNpc N ────────────────────────────────────────────────────▶ removed_at = agora (como hoje)
```

## Frontend

- `MapTokenInfo.posture` já existe; para objetos passa a vir de `map_tokens.posture`.
- `lib/mapTokens`:
  - `MAP_NPC_DRAG_TYPE`;
  - `mapNpcDropAction({ hex, piece, tokens, columns, rows }) → none | same | occupied | blocked | move`;
  - `npcDropAction` ganha `recentAutoPlaced?: { npcId, mapTokenId, at }` e `now`: dentro de 10 s, soltar o cabeçalho do
    mesmo NPC → `move` dessa peça.
- `NpcContext` guarda `recentAutoPlaced` depois de cada `placeOnMap` sem hex.
