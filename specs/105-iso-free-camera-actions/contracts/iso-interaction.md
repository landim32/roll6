# Contract: interação na vista isométrica (105)

Contrato de UI (não há API nova). Vale para mouse; o toque está no fim.

## Entradas

| Gesto | Sem modo ativo | Mover (015) | "Agir sobre…" (098) |
|---|---|---|---|
| Esquerdo, arraste ≥ 4 px | desliza a câmera (+ luz) | desliza; movimento continua | desliza; escolha continua |
| Esquerdo, clique < 4 px | abre o menu do hex (se o 2D abriria) | fase caminho: prévia / escolhe destino; fase direção: gira / confirma | escolhe o alvo (fora do mapa cancela) |
| Direito, arraste ≥ 4 px | gira (horizontal) e inclina (vertical) | gira; movimento continua | gira; escolha continua |
| Direito, clique < 4 px | nada (sem menu do navegador) | **cancela** o movimento | **cancela** a escolha |
| Roda / +− | zoom | zoom | zoom |
| Esc | fecha o menu | cancela | cancela |
| Ponteiro parado sobre o chão | destaca o hex / forma da peça | caminho até o hex / direção | destaca o hex |
| Cartão do grupo/NPC arrastado | destaca o hex; soltar = `characterDropAction` / `npcDropAction` do 2D | — | — |

**Hex de um clique**: peça desenhada sob o ponteiro (a mais próxima, só iluminadas) → o `(x, y)` dela; senão o hex do
chão (`hexAt`). Nada sob o ponteiro (fora do mapa) → sem menu.

**Direção no Mover**: `lookToward(centro do destino, floorAt(ponteiro), look atual)` — o mesmo cálculo do 2D com o ponto
do chão no lugar do ponto do SVG.

## Saídas

- O menu é o `HexMenu` do 2D, com as mesmas props/permissões (`useMapInteraction` + `MapHexMenu`), posicionado no ponto do
  clique dentro da região do mapa.
- As janelas (`TokenModal`, `ActModal`, `RepeatedActionModal`, `MapNpcFormModal`, `ConfirmModal`) são as de `MainPage`,
  abertas pelos mesmos callbacks que o `MapCanvas` recebe.
- Mover salva por `MapTokenContext.moveToken` (mesma validação no servidor); `MovementCounter` igual ao 2D.

## Câmera

- `target` preso ao retângulo da grid (`0…mapWidth`, `0…mapHeight` em px).
- Eventos de peças/tempo real **nunca** mudam `target`. Só a primeira montagem (salta para o personagem do usuário);
  não há combo de foco.
- Luz = `target` (centro da vista).

## Balões

- Âncora = cabeça projetada (`anchors()`); `ceiling: 0` → logo acima da cabeça; abaixo só sem espaço.
- `is-see-through` enquanto o ponteiro está na caixa do balão; `pointer-events: none` (clique atravessa).
- Escondidos durante o Mover.

## Toque

| Gesto | Efeito |
|---|---|
| 1 dedo, arraste | desliza |
| 1 dedo, toque curto | clique (menu; no Mover: prévia, depois confirma) |
| 2 dedos | pinça = zoom; torção = giro; ponto médio na vertical = inclinação |
