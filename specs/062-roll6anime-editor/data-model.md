# Data Model: roll6anime (062)

Não há banco. Os "dados" são arquivos e estado em memória da janela.

## AnimationEntry (um `.json` da pasta)

| Campo | Tipo | Origem / regra |
|---|---|---|
| `FileName` | string | nome do arquivo, com extensão; chave do item |
| `FullPath` | string | pasta configurada + `FileName` |
| `Name` | string? | `name` do arquivo, se houver; a lista mostra `FileName` sem extensão quando falta |
| `Type` | `AnimationType`? | `type` do arquivo (`idle`…`defend` → 1–7), se houver |
| `Duration` | double? | do arquivo válido |
| `Loop` | bool? | do arquivo válido |
| `Content` | `JsonElement`? | o documento da última versão **válida** (o que a vista toca) |
| `Error` | (Key, Message)? | primeiro erro de `AnimationFormat.Parse`; null quando válido |
| `ChangedAt` | DateTime | última leitura |

Regras:

- A validação é `AnimationFormat.Parse` do backend (link de arquivo): as mesmas chaves e mensagens do Roll6.
- Um arquivo acima de 1 MB dá o erro `content`, como no Roll6.
- Uma leitura inválida atualiza `Error`, mas **mantém** `Content` da última versão válida. A vista continua
  tocando a última versão válida (FR-008).
- Um arquivo apagado sai da lista. Se era o aberto, a vista recebe `clear` e a janela avisa.

Estados:

```text
(novo/alterado) → assentando (200 ms) → lido → válido | inválido
válido|inválido → (alterado) → assentando …
qualquer → (apagado) → removido
```

## ModelSelection

| Campo | Tipo | Regra |
|---|---|---|
| `Path` | string | `.glb` escolhido pelo usuário (diálogo) |
| `Url` | string | `https://model.roll6anime/<nome do arquivo, codificado>?v=<n>`; a casca responde com o arquivo de `Path` (`WebResourceRequested`, CORS) |
| `Mixamo` | bool? | informado pela vista após carregar (`modelLoaded`) |
| `Error` | string? | informado pela vista (`modelError`) |

O último `Path` é guardado em `UserState` (state.json) e reaberto na próxima vez, se ainda existir.

## ClaudeRequest (um pedido)

| Campo | Tipo | Regra |
|---|---|---|
| `Text` | string | o que o usuário digitou (não vazio) |
| `AnimationFile` | string? | o arquivo aberto; null = criar uma nova animação |
| `ModelPath` | string? | o modelo aberto |
| `SessionId` | Guid | da conversa (ver `ConversationBook`) |
| `Resume` | bool | false no primeiro pedido da conversa (`--session-id`), true depois (`--resume`) |
| `State` | enum | `Running` → `Done` \| `Stopped` \| `Failed` |
| `Failure` | string? | mensagem em português (R9) |

Só um pedido roda por vez. O campo fica desativado até `Done`/`Stopped`/`Failed`.

## ClaudeEvent (o que a conversa mostra)

| Variante | Campos | Vem de |
|---|---|---|
| `Started` | `SessionId`, `UsesAccount` (apiKeySource = none) | `system/init` |
| `TextDelta` | `Text` | `stream_event` / `content_block_delta` / `text_delta` |
| `ToolUse` | `Tool`, `Target` (`input.file_path` ou `input.command`) | `assistant.message.content[]` de tipo `tool_use` |
| `Finished` | `IsError`, `Result`, `PermissionDenials[]` | `result` |
| `Unknown` | — | qualquer outra linha (ignorada) |

Linhas que não são JSON são ignoradas pelo leitor. Exemplo real em
[contracts/samples/claude-ok.jsonl](contracts/samples/claude-ok.jsonl).

## ConversationBook (Q3 = A)

| Campo | Tipo | Regra |
|---|---|---|
| `_sessions` | `Dictionary<string, Conversation>` | chave = `FileName` (sem diferenciar maiúsculas) ou `NEW` para "nova animação" |
| `Conversation.SessionId` | Guid | criado no primeiro uso da chave |
| `Conversation.Started` | bool | true depois do primeiro pedido concluído ou parado com `system/init` recebido |
| `Conversation.Messages` | list | pedidos e respostas mostrados na tela |

Operações:

- `For(fileName?)`: devolve ou cria a conversa da chave.
- `Reset(fileName?)` ("Nova conversa"): troca por uma conversa nova (Guid novo, sem mensagens).
- `Adopt(newFileName)`: move a conversa `NEW` para o arquivo criado durante o pedido (FR-015).
- `Rename(old, new)`: acompanha uma renomeação na pasta.

Vive só enquanto a janela está aberta.

## AnimeSettings / UserState

Ver [contracts/configuration.md](contracts/configuration.md).
