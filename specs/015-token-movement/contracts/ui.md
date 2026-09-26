# UI Contract: Movimentação de Tokens

## Menu da peça (`HexMenu`)

| Usuário / peça | Itens |
|---|---|
| Mestre, peça qualquer | **Mover**, Alterar token, Excluir |
| Mestre, hex vazio | Incluir token |
| Jogador, peça do próprio personagem | **Mover** |
| Jogador, outras peças ou hex vazio | sem menu |

Ícone de Mover: setas em cruz. Item com o mesmo estilo iOS dos demais.

## Modo Mover

| Fase | Mouse | Clique | Esc / botão direito |
|---|---|---|---|
| `path` | rastro do caminho mínimo até o hex sob o mouse; peça (preview) no início, virada para o 1º passo; hex inalcançável/ocupado: sem rastro | hex alcançável → vai para `facing` (jogador: só se `ok`; senão toast `movement.overLimit`) | cancela |
| `facing` | peça no destino, virada para o lado apontado pelo mouse; custo = passos + giros | grava (`PUT …/position`); jogador só se `ok`; toast `toast.tokenMoved` | cancela e restaura |

Cores (rastro `polyline` pelos centros + hex de destino): `ok` verde `rgba(25,135,84,…)`, `over` vermelho
`rgba(220,53,69,…)`, `free` (objeto) cinza `rgba(173,181,189,…)`.

## `MovementCounter`

Canto inferior direito, à esquerda dos controles do mapa: "**gasto**/**total**" (ex.: `3/6`), verde ou
vermelho; título `movement.counter` ("Movimento"). Não aparece para objetos.

## `TokenLayer`

Cada peça girada `look × 60°` em torno do centro, com uma pequena marca (triângulo) na borda do lado da
frente. A peça em movimento é desenhada na posição/sentido do preview.

## Textos (pt-BR)

`hexMenu.move` "Mover", `movement.counter` "Movimento", `movement.overLimit` "O movimento passou do
máximo.", `movement.unreachable` "Não há caminho até esse hex.", `movement.hint` "Clique no destino, depois
no sentido. Esc cancela.", `toast.tokenMoved` "{{name}} movido."
