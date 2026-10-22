# Roll6.Console

A ponte entre o Roll6 e o **Claude Code da sua máquina** (feature 086). Um programa de console que conecta **de dentro
para fora** no site, com a sua chave de API, e fica esperando pedidos: o servidor manda as instruções, o texto, as imagens,
os arquivos a gravar e as pastas a acompanhar; o console roda o `claude` com a sua conta (não com uma chave da Anthropic),
devolve a resposta aos poucos e avisa cada arquivo que mudou. Ele **não sabe o que é uma animação** — o editor de
animações é só a primeira tela que o usa; qualquer tela futura do Roll6 pode mandar outro pedido.

## Antes de rodar

- [Claude Code](https://docs.anthropic.com/claude-code) instalado e logado com a sua conta (`claude` em um terminal).
- Uma chave de API do Roll6: menu do usuário › **Chaves de API** › Nova chave. Ela nunca é gravada pelo console.
- O projeto da mesa (por padrão `C:\repos\gurps-adventure`, com a skill `criar-animacao`): é a única pasta onde o console
  grava e acompanha arquivos.

## Configuração

`appsettings.json` ao lado do executável:

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

Variáveis de ambiente: `ROLL6_API_KEY` (obrigatória), `ROLL6_URL` (sobrepõe `Url`), `Roll6Console__*` (qualquer chave).

## Rodar

```powershell
$env:ROLL6_API_KEY = "r6_…"
cd backend
dotnet run --project Roll6.Console
```

```text
Roll6.Console · ponte entre o Roll6 e o Claude Code desta máquina
12:00:01 Claude Code 2.x
12:00:02 Conectado ao roll6.site como Rodrigo (máquina DESKTOP-ABC) · pasta C:\repos\gurps-adventure
12:03:10 Pedido #12: rodando o Claude…
12:03:14   Editando animacoes/7-aceno.json
12:03:15 Arquivo alterado: animacoes/7-aceno.json
12:03:16 Pedido #12 terminado.
```

Saídas: chave ausente ou recusada → código 2; pasta de trabalho inexistente → 2; sem rede → tenta de novo a cada 15 s;
Ctrl+C para o pedido em andamento e sai.

Publicar: `dotnet publish Roll6.Console -c Release -r win-x64 --self-contained false -o ../dist/roll6-console`.

## O que ele faz com um pedido

1. Grava os `files[]` (arquivo temporário + move; um arquivo igual não é regravado) — só dentro da pasta de trabalho; um
   caminho fora dela faz o pedido falhar.
2. Passa a acompanhar os `watch[]` (arquivos, ou pastas terminadas em `/`).
3. Roda `claude -p --input-format stream-json --output-format stream-json --verbose --include-partial-messages
   (--session-id | --resume) <sessão> --permission-mode acceptEdits --allowedTools <config> --append-system-prompt <texto>`
   com o pedido no stdin (imagens primeiro, depois o texto).
4. Repassa cada evento (`Progress`), cada arquivo acompanhado que mudou (`FileChanged`, também nos 30 s depois do
   resultado) e o desfecho (`Finished`).

Fora de um pedido, o servidor pode mandar `writeFiles` (por exemplo, uma pose editada na página) e o console só grava.

## Codex: o gerador de mapas (095)

A página **Biblioteca › Mapas › Gerador** usa o **Codex** da sua máquina (não o Claude), pelo mesmo console:

1. Instale e entre: `npm i -g @openai/codex` e `codex login` (verificado com o codex-cli 0.161.0; `codex features list`
   deve mostrar `image_generation true`). Se o executável não estiver no PATH, ajuste `Roll6Console:CodexExecutable`
   em `appsettings.json` (o padrão `codex` acha o `codex.cmd` do npm).
2. Cada pedido roda `codex exec --json --skip-git-repo-check -s workspace-write -C <pasta de trabalho> [-i imagens] -`
   (ou `codex exec … resume <conversa> …` nos pedidos seguintes da mesma aba), com o pedido no stdin. O sandbox
   `workspace-write` só deixa o Codex gravar dentro da pasta de trabalho.
3. As instruções de mapa visto de cima vêm do servidor; o console só grava as imagens de entrada (base e marcações) em
   `mapas-gerados/<sessão>/entrada/`, passa-as com `-i` e acompanha `mapas-gerados/<sessão>/`.
4. Imagens (`.png`, `.jpg`, `.jpeg`, `.webp`) acompanhadas são enviadas ao servidor como bytes em base64, até 10 MB
   (maiores viram um aviso); o servidor valida e manda para a aba do gerador.
5. Se o Codex terminar sem salvar a imagem (por exemplo, tentou gravar o PNG em base64 dentro de um comando, longo
   demais para a linha de comando), o console pega a imagem mais nova que ele gerou nessa conversa
   (`~/.codex/generated_images/<conversa>/`, ou `CODEX_HOME`) e a copia para a pasta da sessão como
   `codex-exec-….png`, que vira uma versão normal. A linha "O Codex não salvou a imagem; usando a que ele gerou" aparece no log.

As pastas `mapas-gerados/` podem ser apagadas quando quiser: nada nelas é usado depois que a aba fecha.

## Modo GM (096)

Com o **Modo GM** ligado numa campanha sua (clipe de papel do chat › "Modo GM"), o Roll6 manda a este console, toda vez
que o último personagem aprovado agir, um pedido para **fechar o turno**: o Claude roda a skill **`gm`** do seu
repositório (`.claude/skills/gm/`), que lê a mesa, confere os movimentos, resolve as ações pelas regras, registra o
repositório e chama `process_turn` — sem pedir nada a ninguém. É um pedido comum do console (não é somente leitura):
`claude -p --permission-mode acceptEdits --allowedTools <ClaudeAllowedTools>`, sessão nova a cada turno, sem arquivos
nem pastas acompanhadas. A skill fala com o roll6 pelo `roll6.py` (a chave do `~/.claude.json`), então nenhuma
ferramenta de MCP precisa ser pré-aprovada; `Bash(python:*)` basta.

- Sem console conectado nada é processado; quando ele conecta, um turno que ficou pronto é processado na hora.
- Um pedido do GM dura no máximo 10 minutos; o Roll6 manda `stop` depois disso, e também quando o mestre desliga o
  modo. O chat mostra "O GM começou a processar o turno N." e, se o turno ficar aberto, o motivo.
- Sem a skill `gm` no repositório, o Claude responde `GM_NOT_CONFIGURED` e o chat avisa que ela não está configurada.
  Um modelo da skill está em `specs/096-campaign-gm-mode/contracts/skill-gm.md`.
- **Só pelo MCP (097)**: a skill `gm` nunca mexe na campanha guardada no repositório (`campanha/`, `personagens/`,
  `historico/`, `campanha/roll6.json`): tudo vem do roll6 (`gm.py contexto --campanha N`) e tudo volta para o roll6
  no `process_turn` (status, PV/Fadiga, posições, narração). As skills `processar-turno` e `validar-movimento`
  ganharam `--so-mcp --campanha N` para isso; sem a flag seguem locais como sempre.

### Campanha do pedido (097)

Um pedido do Modo GM (e uma pergunta) chega com a campanha (`campaign`: id, nome e, no GM, o turno). O console a mostra
na primeira linha do pedido — `Pedido #42 (GM): campanha «Tormento Vil II» (campaignId 3), turno 15 · Claude, sessão
nova` — e põe a linha `CAMPANHA DO PEDIDO: «…» (campaignId …), turno …. Trabalhe só nela; ignore campanha/roll6.json.`
na frente do prompt e no fim do system prompt. O modelo recusa um pedido sem campanha (`campanha não informada`).

### Log (097)

Cada linha de um pedido traz o número dele (`HH:mm:ss #42  …`), e o pedido inteiro aparece na tela: `sessão …`,
`→ Ferramenta {entrada}` (o comando com os argumentos, o arquivo, a chamada ao roll6 com os parâmetros — até 1500
caracteres), `← resultado` (os primeiros 600 caracteres; `← ERRO:` quando falhou), `Claude: texto` (o texto inteiro de
cada resposta), `Arquivo gravado/alterado`, `Ferramentas recusadas: …` e o desfecho (`terminado`, `parado`, `falhou:
motivo`). Chaves `r6_…` nunca aparecem. Nada disso vai ao servidor: as abas e o chat recebem o que recebiam antes.

## Ferramentas de um pedido (094)

Um pedido pode trazer `tools[]` (nome, descrição e esquema dos argumentos, montados pelo servidor — hoje o
`print_stage` do editor de animação, que tira prints do palco). Quando traz, e o pedido não é somente leitura:

1. o console abre, só enquanto o Claude roda, um **servidor MCP local** em `http://127.0.0.1:<porta escolhida pelo
   sistema>/mcp` com uma senha aleatória do pedido (qualquer chamada sem `Authorization: Bearer <senha>` recebe 401);
2. passa ao Claude `--mcp-config` com esse servidor (`roll6-editor`) e acrescenta `mcp__roll6-editor__<nome>` a
   `--allowedTools`;
3. a cada chamada, primeiro envia as mudanças de arquivo ainda não relatadas (para o servidor já ter a edição que o
   Claude acabou de fazer), depois repassa a chamada (`ToolCall`) e devolve ao Claude a resposta do servidor
   (`toolResult`: texto e imagens) — sem resposta em 60 s, devolve "O Roll6 não respondeu a tempo.";
4. fecha o servidor quando o pedido termina.

O console não sabe o que as ferramentas fazem. Pedidos somente leitura (as perguntas da mesa) nunca recebem
ferramentas. Verificado com o Claude Code 2.1.301 (cabeçalho com a senha, ferramenta pré-aprovada sem perguntar,
imagem chegando ao modelo).

## Perguntas da mesa (093, "Perguntar")

Com o console conectado, os jogadores das campanhas em que você é mestre podem usar **Perguntar** no chat. Cada pergunta
chega como um pedido **somente leitura** (`readOnly`), e o console roda o Claude assim (flags verificadas com
o Claude Code 2.1.301):

- ferramentas existentes só `Read,Glob,Grep,Skill` (`--tools`); só `Skill` pré-aprovada; `Bash`, `Write`, `Edit`,
  `WebFetch`, `WebSearch`, `Task`… recusadas pelo nome; `--permission-mode dontAsk` (nada pergunta: o que não for
  permitido é negado — leitura fora da pasta de trabalho inclusive);
- nenhum servidor MCP (`--strict-mcp-config --mcp-config {"mcpServers":{}}`), sessão nova e não guardada
  (`--no-session-persistence`);
- nenhum arquivo gravado nem acompanhado (o console descarta `files[]`/`watch[]` de um pedido somente leitura);
- `ROLL6_API_KEY`/`ROLL6_URL` e as variáveis de chave da Anthropic saem do ambiente do processo do Claude.

A pergunta vai entre `<pergunta_do_jogador>` e `</pergunta_do_jogador>` (com `<`/`>` do jogador trocados por `‹`/`›`),
e o prompt do sistema manda usar a skill **`perguntar`** do seu repositório. Sem ela, a resposta diz que a skill não está
configurada. Um modelo de skill está em `specs/093-chat-ask-gm-console/contracts/skill-perguntar.md` — coloque-o em
`.claude/skills/perguntar/SKILL.md` na pasta de trabalho e ajuste as pastas que podem (e não podem) ser lidas.

As perguntas entram na mesma fila dos pedidos do editor de animação (um por vez); uma pergunta sem resposta em 2 minutos
falha. As respostas aparecem no chat na hora; você pode apagá-las ou corrigi-las ("Corrigir resposta").
