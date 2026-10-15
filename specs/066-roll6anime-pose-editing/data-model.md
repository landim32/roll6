# Data Model: Editar a pose girando os ossos (066)

## Edição de um osso (vista, transitória)

| Campo | Tipo | Regra |
|---|---|---|
| `bone` | string | nome do formato (sem prefixo), em `ANIMATION_BONES` |
| `time` | number | instante da barra (pausado) |
| `start` | Quaternion | rotação local quando o arrasto começou (ângulo mostrado = diferença) |
| `degrees` | [x, y, z] | resultado de `degreesFromLocal`, 1 casa |

## Arquivo `roll6-animation` (alterado por `setKey`)

- Trilha existente: chave substituída (|t − time| ≤ 0,02 s) ou inserida em ordem.
- Trilha nova: `times` = poses do arquivo ∪ {time}; `degrees` = [0,0,0] nas poses, o novo no instante (Q1 = A).
- `loop` e instante numa ponta: a outra ponta recebe o mesmo valor se tiver chave.
- Todo o resto copiado sem mudança.

## AnimationHistory (Core, por arquivo)

| Campo | Tipo | Regra |
|---|---|---|
| `Versions` | `List<string>` | conteúdo exato de cada versão, ≤ 100 |
| `Index` | int | versão atual |
| `CanUndo` / `CanRedo` | bool | `Index > 0` / `Index < Count − 1` |

Operações: `Observe(content)`, `Undo() → string?`, `Redo() → string?`, `Rename`, por `AnimationHistoryBook` (dicionário
por nome, sem diferenciar maiúsculas).

## Mensagens novas (ponte)

| Direção | `type` | Campos |
|---|---|---|
| vista → casca | `saveAnimation` | `fileName`, `file` (o documento novo) |
| vista → casca | `undo` / `redo` | — |
| casca → vista | `saveError` | `message` |
| casca → vista | `history` | `undo` (n), `redo` (n) |
| casca → vista | `editing` | `enabled`, `reason?` |
