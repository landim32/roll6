# Contract: Esqueleto na vista (065)

## Barra da vista

```text
[▶/❚❚] [────────●──────] 0,8 s de 1,2 s   [Esqueleto]
```

- Botão `#skeleton` (`aria-pressed` = ligado, `title`/`aria-label` "Mostrar o esqueleto" / "Esconder o esqueleto");
  desativado sem modelo aberto; estado inicial do `localStorage`.
- Ligado: modelo a 35% de opacidade; ossos em âmbar (movimentados pela animação aberta) e ciano (os demais), por cima da
  malha; juntas como pontos.
- Rótulo `#bone-label` junto ao ponteiro com o nome do osso mais próximo (≤ 14 px na tela), sem prefixo do Mixamo; o osso
  em branco. Some com um botão do mouse pressionado, fora do canvas ou com o esqueleto desligado.
- Aviso `#skeleton-note` "Este modelo não tem esqueleto." quando ligado num modelo sem ossos.

## Ponte (atualiza specs/062-roll6anime-editor/contracts/viewer-bridge.md)

| `type` | Campos novos | Efeito |
|---|---|---|
| `captured` | `skeleton` (boolean) | o esqueleto estava visível no print |

## Legenda (casca)

`ViewCapture.Caption` com `Skeleton = true` acrescenta, depois da câmera:

```text
 Esqueleto visível: o modelo aparece semitransparente e as linhas são os ossos (âmbar = movimentados pela animação aberta, ciano = os demais).
```
