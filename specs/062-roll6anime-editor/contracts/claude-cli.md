# Contract: chamada ao Claude Code local (062)

Conferido com o Claude Code 2.1.300 nesta máquina. Saída real em [samples/claude-ok.jsonl](samples/claude-ok.jsonl).

## Processo

| Item | Valor |
|---|---|
| Executável | `Roll6Anime:ClaudeExecutable` (padrão `claude`, pelo PATH) |
| WorkingDirectory | `Roll6Anime:ClaudeWorkingDirectory` (padrão `C:\repos\gurps-adventure`) |
| Argumentos (1º pedido da conversa) | `-p --output-format stream-json --verbose --include-partial-messages --session-id <uuid> --permission-mode acceptEdits --allowedTools <ClaudeAllowedTools> --append-system-prompt <contexto>` |
| Argumentos (pedidos seguintes) | igual, com `--resume <uuid>` no lugar de `--session-id <uuid>` |
| stdin | o texto do pedido, UTF-8, depois fechado |
| stdout | uma linha JSON por evento (UTF-8) |
| stderr | guardado; usado só na mensagem de falha |
| Ambiente | o do usuário **menos** `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, para valer o login da conta |
| Parar | `Process.Kill(entireProcessTree: true)`; o pedido fica `Stopped` |

Os argumentos são passados por `ProcessStartInfo.ArgumentList`, um por item, sem montar string.

## Contexto (`--append-system-prompt`)

Em português, montado por `PromptContext`:

```text
Você está atendendo um pedido feito no roll6anime, o editor de animações do Roll6.
Use a skill criar-animacao (formato roll6-animation v1).
Animação aberta: animacoes/<arquivo>.json — altere este mesmo arquivo e valide com o validar.py da skill.
  (ou: Nenhuma animação aberta — crie um arquivo novo em animacoes/ e valide com o validar.py da skill.)
Modelo aberto na tela: <caminho do .glb> (só para referência; não o altere).
Grave e altere arquivos com as ferramentas Write/Edit. No Bash, rode só comandos python simples, como o validar.py (sem heredoc, "&&", ";" ou "|"): o resto não tem permissão.
Não envie a animação ao Roll6 a menos que o usuário peça.
```

O caminho da animação é relativo a `ClaudeWorkingDirectory` quando a pasta de animações estiver dentro dela;
senão, é absoluto.

## Eventos lidos (stdout)

| Linha | Condição | Evento |
|---|---|---|
| `{"type":"system","subtype":"init",…}` | — | `Started(session_id, apiKeySource == "none")` |
| `{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":…}}}` | — | `TextDelta(text)` |
| `{"type":"assistant","message":{"content":[…]}}` | cada item `tool_use` | `ToolUse(name, input.file_path ?? input.command ?? input.pattern)` |
| `{"type":"result",…}` | — | `Finished(is_error, result, permission_denials[].tool_name)` |
| outra linha JSON | — | ignorada |
| linha que não é JSON | — | ignorada |

O texto do `assistant` não é repetido, porque já chegou pelos `TextDelta`.

## Falhas (mensagens em português)

| Situação | Mensagem |
|---|---|
| Executável não encontrado (`Win32Exception`) | "O Claude Code não foi encontrado. Instale-o ou ajuste Roll6Anime:ClaudeExecutable em appsettings.json." |
| `ClaudeWorkingDirectory` inexistente | "A pasta de trabalho do Claude não existe: {caminho}." |
| Fim sem `result` e saída ≠ 0, ou `result.is_error`, com "login"/"auth"/"401" no texto | "O Claude Code não está logado. Abra um terminal, rode `claude` e faça login com a sua conta." |
| Outro `is_error` | o `result` do Claude |
| `permission_denials` não vazio | aviso: "O Claude não teve permissão para: {ferramentas}." (o pedido termina normalmente) |
