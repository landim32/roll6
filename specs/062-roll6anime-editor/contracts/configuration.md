# Contract: configuração (062)

## `appsettings.json` (ao lado do executável, versionado em `roll6anime/Roll6Anime/appsettings.json`)

```json
{
  "Roll6Anime": {
    "AnimationsFolder": "C:\\repos\\gurps-adventure\\animacoes",
    "ClaudeWorkingDirectory": "C:\\repos\\gurps-adventure",
    "ClaudeExecutable": "claude",
    "ClaudeAllowedTools": "Bash(python:*)"
  }
}
```

| Chave | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `AnimationsFolder` | sim | `C:\repos\gurps-adventure\animacoes` | pasta listada e acompanhada (FR-005, FR-008, FR-016) |
| `ClaudeWorkingDirectory` | sim | `C:\repos\gurps-adventure` | `WorkingDirectory` do processo `claude` (FR-010) |
| `ClaudeExecutable` | não | `claude` | nome ou caminho do CLI; resolvido pelo PATH |
| `ClaudeAllowedTools` | não | `Bash(python:*)` | valor de `--allowedTools`, além do `acceptEdits` |

Regras:

- Lido uma vez, ao abrir. Mudanças valem na próxima abertura (FR-016).
- Uma pasta que não existe → aviso na janela: "A pasta de animações não existe: {caminho}. Ajuste
  Roll6Anime:AnimationsFolder em appsettings.json." A janela continua aberta, com a lista vazia.
- O mesmo vale para `ClaudeWorkingDirectory`, mas só bloqueia os pedidos.
- Variáveis de ambiente `Roll6Anime__AnimationsFolder` etc. também valem, pelo provedor padrão.

## `%LOCALAPPDATA%\roll6anime\state.json` (estado do usuário, não versionado)

```json
{ "lastModel": "C:\\repos\\gurps-adventure\\personagens\\urzog-bigorna\\orc-gordo.glb" }
```

- Gravado quando um modelo é aberto com sucesso.
- Lido ao abrir. Um caminho que não existe mais é ignorado.
- É o único arquivo que a ferramenta grava. Arquivos de animação nunca são gravados (FR-009).
