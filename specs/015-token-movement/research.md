# Research: Movimentação de Tokens

## R1 — Sentidos e vizinhos (flat-top)

- **Decision**: o sentido `look` 0–5 (horário a partir do topo) corresponde, na ordem, às direções axiais
  do guia para hexágonos flat-top: 0 topo `(0,-1)`, 1 topo-direita `(+1,-1)`, 2 baixo-direita `(+1,0)`,
  3 baixo `(0,+1)`, 4 baixo-esquerda `(-1,+1)`, 5 topo-esquerda `(-1,0)`. `neighbor(x, y, look)`
  converte offset odd-q → axial, soma a direção e volta para offset.
- **Rationale**: Princípio VII (vizinhos pelas fórmulas axiais; posição gravada em odd-q). Conferido pelo
  `hexCenter`: a direção `(0,-1)` sobe √3·size, `(+1,-1)` vai para cima-direita etc.

## R2 — Custo mínimo (passos + giros)

- **Decision**: busca em largura (todos os custos valem 1) sobre estados `(x, y, look)` a partir do
  estado atual da peça. Transições: girar à esquerda / à direita (`look ± 1 mod 6`, custo 1) e andar para
  `neighbor(x, y, look)` (custo 1) se estiver dentro da grid e livre. Resultado: `dist` e `parent` de cada
  estado. Custo para chegar a um hex (fase de caminho) = menor `dist` entre os estados daquele hex
  alcançados por um passo (entrando de frente); custo do estado final (fase de sentido) = `dist(x, y,
  look)`. Caminho = reconstrução pelos pais. Empates: ordem fixa das transições (girar esquerda, girar
  direita, andar) → resultado estável.
- **Rationale**: é o "Movement range"/"Pathfinding" do guia (BFS, custos uniformes) aplicado ao espaço
  (hex, sentido), o que torna os giros parte do caminho mínimo (FR-001–FR-003).
- **Alternatives**: A* com heurística de distância hex — desnecessário para grids ≤ 50 × 50 e um BFS por
  modo; Dijkstra — equivalente com custos uniformes.

## R3 — Sentido pelo mouse (modo de sentido)

- **Decision**: `lookToward(center, point)`: ângulo de `point - center` (SVG: y para baixo), escolhe o
  lado cujo ângulo central (−90°, −30°, 30°, 90°, 150°, −150° para 0…5) está mais próximo; mouse no
  centro mantém o sentido atual.
- **Rationale**: "vira para onde aponta o mouse".

## R4 — Validação no backend

- **Decision**: `PUT /api/maptoken/{id}/position` recebe `{ x, y, look }`.
  - Mestre (dono do mapa): qualquer peça, sem limite.
  - Jogador: só peça de Character cuja participação é de um personagem dele e está aprovada; recalcula
    `HexGrid.MovementCost(from, to, grid, ocupados)`; custo > `character.Move` ou inalcançável → 400
    ("O movimento passou do máximo."); outra peça → 403.
  - Objetos e NPCs: só o mestre.
- **Rationale**: FR-011 exige validação ao gravar; o cliente pode ser adulterado.

## R5 — Estado do modo no frontend

- **Decision**: `lib/movement.ts` puro com o estado `idle | path | facing` (peça, estado inicial, total,
  campo BFS, destino, sentido escolhido) e funções `enterMove`, `hover(hex)`, `pickDestination`,
  `point(look)`, `status(cost, total, kind)` → `ok | over | free`; `canConfirm` (jogador não confirma
  `over`). `hooks/useTokenMovement` guarda esse estado, calcula o campo uma vez por entrada no modo com as
  peças atuais como obstáculos, e grava via `MapTokenContext.moveToken(id, x, y, look)`.
- **Rationale**: regras testáveis sem DOM; `MapCanvas` só roteia eventos.

## R6 — Desenho

- **Decision**: `TokenLayer` gira cada peça por `look × 60°` (a imagem gira; uma pequena marca na borda
  indica a frente) e aceita um `preview` (peça em movimento com posição/sentido temporários).
  `MovementLayer` desenha o rastro como `polyline` pelos centros dos hexes do caminho e preenche o hex de
  destino; cores por classe (`is-ok` verde, `is-over` vermelho, `is-free` cinza). `MovementCounter` fica
  no canto inferior direito, à esquerda da coluna de controles, com "gasto/total" em verde/vermelho.
- **Rationale**: FR-006/FR-007; sentido visível para jogadores e mestre.

## R7 — Menu e cliques

- **Decision**: `HexMenu` ganha **Mover** quando a peça pode ser movida pelo usuário; jogadores passam a
  ver o menu só ao clicar numa peça de personagem próprio (só com Mover). No modo Mover, cliques no mapa
  não abrem o menu: o 1º clique escolhe destino (se alcançável), o 2º confirma; Esc ou botão direito
  (`contextmenu`) cancelam; troca de mapa cancela.
