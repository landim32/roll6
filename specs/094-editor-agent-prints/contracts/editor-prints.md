# Contract: `print_stage` (animation editor)

## Tool (sent in `RunInfo.tools` of every editor request; never on asks)

- **name**: `print_stage`
- **description** (English for the schema, the prompt section is Portuguese): "Takes prints of the animation editor's
  stage showing the user's 3D model playing the latest version of the animation file you wrote, and returns them as
  images with captions. Use it after every change to check the result."
- **inputSchema**:

```json
{
  "type": "object",
  "properties": {
    "shots": {
      "type": "array", "minItems": 1, "maxItems": 6,
      "items": {
        "type": "object",
        "properties": {
          "time": { "description": "seconds from the start, or \"key\" for the key pose", "oneOf": [ { "type": "number", "minimum": 0 }, { "const": "key" } ] },
          "view": { "enum": ["front", "back", "right", "left", "top", "three-quarter"] },
          "skeleton": { "type": "boolean" }
        }
      }
    }
  }
}
```

Omitted `shots` = one shot with the defaults (key, three-quarter, no skeleton).

## Server → editor tab: `printRequested`

```json
{ "requestId": 12, "callId": "c3", "content": { "format": "roll6-animation", "...": "…" },
  "shots": [ { "time": "key", "view": "three-quarter", "skeleton": false } ] }
```

Sent only to `EditorRequest.EditorConnectionId`.

## Editor tab → server: `PrintResult`

```json
{ "callId": "c3", "shots": [ { "png": "<base64>", "caption": "Animação \"Aceno\" (Parado) em 0,50 s de 1,20 s …" } ] }
```

or `{ "callId": "c3", "error": "Escolha um modelo 3D no editor para tirar prints." }`.

## Results to the Claude (`toolResult`)

- Success: `text` = captions numbered in order ("Print 1: …\nPrint 2: …"), `images` = the PNGs in the same order.
- Errors (`isError: true`), Portuguese:

| Case | Text |
|---|---|
| More than 6 shots / bad view / bad time | "Pedido de print inválido: …" |
| 30 shots already in this request | "Limite de 30 prints por pedido atingido." |
| Last working file invalid | "O arquivo atual não é uma animação válida: …" |
| Editor tab closed/disconnected | "O editor não está aberto; não há como tirar o print." |
| No answer in 20 s | "O editor não respondeu em 20 s; tente de novo." |
| Request stopped / finished | "O pedido foi encerrado." |
| No model / not Mixamo (from the tab) | "Escolha um modelo 3D no editor para tirar prints." / "O esqueleto do modelo não é Mixamo; não dá para posar a animação." |

## Prompt section (appended by `AnimationPromptContext`)

> **Prints do palco.** Você tem a ferramenta `print_stage`, que tira prints do editor do usuário com o modelo 3D dele
> fazendo a **última versão do arquivo que você escreveu**. Depois de **cada alteração** do arquivo, peça prints e
> confira o resultado antes de responder: use `time: "key"` para a pose principal e instantes em segundos para o
> começo, o meio e o fim do movimento; olhe de mais de um lado (`front`, `right`, `left`, `back`, `top`,
> `three-quarter`) e use `skeleton: true` para ver os ossos (âmbar = movidos pela animação). Até 6 prints por chamada e
> 30 por pedido. Se a ferramenta devolver um erro, siga sem o print e diga isso ao usuário. Os prints mostram o que
> você escreveu, não o que está salvo na biblioteca.
