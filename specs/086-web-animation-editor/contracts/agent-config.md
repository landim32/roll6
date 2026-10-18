# Contract: `Roll6.Console` configuration and console lines (086)

## Files

`backend/Roll6.Console/appsettings.json` (copied next to the executable). Nothing about animations: the server says
which files to write and watch, always inside the working directory.

```jsonc
{
  "Roll6Console": {
    "Url": "https://roll6.site",
    "ClaudeWorkingDirectory": "C:\\repos\\gurps-adventure",
    "ClaudeExecutable": "claude",
    "ClaudeAllowedTools": "Bash(python:*)"
  }
}
```

Environment: `ROLL6_API_KEY` (required; never written anywhere), `ROLL6_URL` (overrides `Url`),
`Roll6Console__*` (overrides any key, the `__` convention).

## Start-up

1. Read the settings; missing `ROLL6_API_KEY` → "Defina a variável ROLL6_API_KEY com uma chave de API do Roll6
   (menu do usuário › Chaves de API)." exit 2.
2. `GET {Url}/api/user/me` with the key: 401 → "Chave de API inválida ou revogada." exit 2; network error → retry
   every 15 s with a line.
3. `claude --version` (the configured executable): failure → warning line; requests then fail with
   `ClaudeRunner.NOT_FOUND`.
4. The working directory must exist (else exit 2).
5. Connect to `{Url}/hubs/animation` with the `X-Api-Key` header, `WithAutomaticReconnect`, `RegisterAgent({
   machine: Environment.MachineName, folder })`; re-register after each reconnect.

## Console lines (Portuguese, one per event)

```
Roll6.Console · ponte entre o Roll6 e o Claude Code desta máquina
Conectado ao roll6.site como Rodrigo (máquina DESKTOP-ABC) · pasta C:\repos\gurps-adventure
Pedido #12: rodando o Claude…
  Editando animacoes/7-aceno.json
  Arquivo alterado: animacoes/7-aceno.json
Pedido #12 terminado.
Conexão perdida; reconectando…
Reconectado.
```

Ctrl+C: a running request is stopped (`Finished(Stopped)`), the connection closed, exit 0.

## Build and run

```bash
cd backend
dotnet build Roll6.sln
dotnet run --project Roll6.Console              # needs ROLL6_API_KEY
dotnet publish Roll6.Console -c Release -r win-x64 --self-contained false -o ../dist/roll6-console
```
