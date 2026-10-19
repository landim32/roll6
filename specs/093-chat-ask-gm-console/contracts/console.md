# Console contract (093): read-only runs

`RunInfo` gains:

```json
{ "readOnly": true, "maxTurns": 8 }
```

When `readOnly` is true, `Roll6.Console` MUST do the following, whatever the server sends:

1. Run `claude -p` with `--allowedTools Read Glob Grep Skill` instead of the configured `ClaudeAllowedTools`, and with
   `--permission-mode default` instead of `acceptEdits`.
2. Pass `--disallowedTools Bash Write Edit MultiEdit NotebookEdit WebFetch WebSearch Task TodoWrite`.
3. Pass `--strict-mcp-config --mcp-config {"mcpServers":{}}`, so no MCP server of the machine or the project is loaded.
4. Pass `--max-turns` with `maxTurns` (default 8, capped at 12).
5. Start a fresh `--session-id`, never `--resume`.
6. Remove from the child environment: `ROLL6_API_KEY`, `ROLL6_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`,
   `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`.
7. Ignore `files[]` and `watch[]`: write nothing, watch nothing.
8. Report as usual (`Progress`, `Finished` with `permissionDenials`). The server takes the final text of the result as
   the answer.

The console log line reads "Pedido #N (pergunta, somente leitura): rodando o Claude…".
