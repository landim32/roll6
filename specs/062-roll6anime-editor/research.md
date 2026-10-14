# Research: roll6anime (062)

## R1 — Tecnologia da janela

- **Decision**: WPF em `net8.0-windows`, com a vista 3D num controle **WebView2**.
- **Rationale**:
  - O usuário pediu ".NET para Windows".
  - WPF é o caminho mais direto e maduro para uma janela com lista, campo de texto e área de conversa.
  - A máquina já tem o Windows Desktop runtime 8 (8.0.23 e 8.0.32) e o runtime WebView2 Evergreen (155).
  - .NET 8 é o mesmo runtime do backend.
- **Alternatives considered**:
  - **WinForms**: funciona com WebView2, mas o layout de três colunas redimensionáveis e a conversa rolando
    ficam mais trabalhosos.
  - **WinUI 3 / Windows App SDK**: empacotamento e ferramentas mais pesados para uma ferramenta pessoal.
  - **.NET MAUI**: multiplataforma sem necessidade, e o WebView no Windows é o mesmo WebView2.
  - **Avalonia**: dependência nova sem ganho; o pedido é só Windows.

## R2 — Como mostrar o `.glb` animado igual ao Roll6

- **Decision**: uma página **Vite + TypeScript sem React** (`roll6anime/viewer`) dentro do WebView2. Ela importa,
  por caminho relativo, os módulos 3D do site:
  - `frontend/src/components/story/loadModel.ts` (leitura do glTF, bind pose, alinhamento do esqueleto);
  - `components/story/threeClips.ts` (`buildRoll6Clip`: referencial do personagem, braços relaxados,
    `hipsLift`);
  - `lib/animationFormat.ts` (`toRoll6Clip`).

  O `three` é resolvido para `frontend/node_modules/three` (alias no `vite.config.ts`), para haver uma cópia só.
  O build sai em `roll6anime/Roll6Anime/wwwroot/viewer/` e vai junto com o executável.
- **Rationale**:
  - SC-004 pede as mesmas poses que o Roll6. O jeito seguro é rodar **o mesmo código**.
  - O conversor tem detalhes difíceis de reproduzir: rest pose do rig, `P⁻¹·D·P·L`, correção dos braços,
    altura do quadril com `of: "hips"`. Todos já são cobertos por testes no frontend.
  - Mudanças futuras no conversor chegam ao roll6anime num novo build da vista, sem segunda implementação.
- **Alternatives considered**:
  - **Helix Toolkit (SharpDX) + SharpGLTF**: skinning e animação teriam de ser escritos em C#, um segundo
    conversor que divergiria.
  - **Página do próprio site aberta no WebView2**: dependeria do servidor e do login do Roll6 (fora do escopo,
    Q2 = A).
  - **React na vista**: desnecessário para um canvas e uma barra; o site não tem um componente reutilizável
    puro para isso. O `ModelPreview` é preso ao formulário do token.

## R3 — Como a vista recebe o modelo e as animações

- **Decision**:
  - **Modelo**: a vista recebe a URL `https://model.roll6anime/<arquivo>.glb?v=<n>`. A casca responde a esse host
    no evento `WebResourceRequested` do WebView2, com o arquivo do disco e `Access-Control-Allow-Origin: *`, porque o
    `fetch` sai do host da vista e é de outra origem. O `loadModel` faz `fetch` dessa URL como de qualquer outra, e
    o `?v=` impede o cache dele de devolver outro modelo de mesmo nome.

    Na implementação, o mapeamento de pasta (`SetVirtualHostNameToFolderMapping`) não serve para o modelo: ele não
    manda cabeçalhos CORS, e o `fetch` vindo de `viewer.roll6anime` seria bloqueado.
  - **Vista**: servida por outro host virtual (`viewer.roll6anime` → `wwwroot/viewer`).
  - **Animação**: vai **por mensagem** (`PostWebMessageAsJson`) já validada em C#, com o conteúdo do arquivo.
- **Rationale**:
  - Hosts virtuais evitam `file://`, onde o `fetch` é bloqueado, e não abrem servidor HTTP local.
  - Mandar o conteúdo validado garante que a vista só toca versões válidas (FR-008) e mantém a validação num
    lugar só da casca.
- **Alternatives considered**:
  - Servidor HTTP local (Kestrel): porta, firewall e ciclo de vida a mais.
  - Ler o JSON pela vista via host virtual: a validação e a regra "manter a última válida" ficariam no TS, e a
    lista precisaria validar em C# do mesmo jeito.

## R4 — Validação do formato

- **Decision**: o projeto `Roll6Anime.Core` **inclui por link** (`<Compile Include="..\..\backend\Roll6.Domain\…" Link="…"/>`)
  três arquivos do backend:
  - `Animations/AnimationFormat.cs`;
  - `Enums/AnimationType.cs`;
  - `Exceptions/DomainValidationException.cs`.

  Os três são puros: só usam `System.Text.Json`. Os testes ligam as fixtures de
  `specs/059-token-animation-library/fixtures/` como o `Roll6.Tests` faz.
- **Rationale**:
  - FR-007 e SC-003 pedem o mesmo resultado do Roll6. Com o mesmo arquivo-fonte, o roll6anime não vira uma
    quarta implementação a manter em sincronia.
  - Referenciar o projeto `Roll6.Domain` inteiro traria `Roll6.Infra.Interfaces` e `Roll6.DTO` sem
    necessidade.
- **Alternatives considered**:
  - Reimplementar em C# dentro do roll6anime: uma quarta cópia.
  - Validar só na vista (TS): a lista da casca precisa do resultado sem abrir a vista.
  - Chamar o `validar.py`: dependência de Python na ferramenta.

## R5 — Acompanhar a pasta "em tempo real"

- **Decision**: `FileSystemWatcher` em `*.json` da pasta (sem subpastas), eventos `Created`/`Changed`/`Deleted`/`Renamed`.
  - **Assentamento por arquivo**: a cada evento, um temporizador de 200 ms recomeça. Quando vence, o arquivo é
    lido com até 5 tentativas a cada 50 ms se estiver travado (`IOException`) e só então validado.
  - **Arquivo pela metade**: um JSON incompleto marca o item como inválido. Se o arquivo ainda mudar, a próxima
    leitura corrige. A vista nunca recebe uma versão inválida e continua na última válida.
  - **Remoção também assenta**: o Write do Claude apaga e recria o arquivo. Por isso `Deleted` espera o mesmo
    temporizador: se o arquivo existir ao vencer, é uma alteração (`FileSettled`); se não, é uma remoção
    (`FileRemoved`). Achado no teste com o Claude real, quando o arquivo aberto "sumia" no meio de um pedido.
  - **Estouro de buffer** (`Error`): relista a pasta inteira.
- **Rationale**:
  - O Claude grava com `Write`/`Edit`, que geram 1 a 3 eventos `Changed` seguidos.
  - 200 ms de assentamento mais a leitura e a remontagem do clip ficam bem abaixo de 1 s (SC-002).
- **Alternatives considered**:
  - **Varrer a pasta por tempo (polling)**: latência ou CPU piores.
  - **Ler no primeiro evento**: pega o arquivo pela metade.

## R6 — Chamar o Claude Code com a conta (não API)

- **Decision**: para cada pedido, um processo `claude` na pasta de trabalho configurada, com:

  ```text
  claude -p --output-format stream-json --verbose --include-partial-messages
         (--session-id <uuid> | --resume <uuid>)
         --permission-mode acceptEdits --allowedTools "Bash(python:*)"
         --append-system-prompt "<contexto da tela>"
  ```

  - **Pedido**: vai pelo **stdin**, sem problemas de aspas e acentos na linha de comando.
  - **Ambiente**: o processo herda o do usuário **sem** `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` e
    `CLAUDE_CODE_USE_BEDROCK`/`VERTEX`. Assim o CLI usa o login da conta.
  - **Parar**: `Process.Kill(entireProcessTree: true)`.
- **Rationale**: conferido nesta máquina (Claude Code 2.1.300), com a saída em
  [contracts/samples/claude-ok.jsonl](contracts/samples/claude-ok.jsonl):
  - `system/init` traz `session_id` e `apiKeySource: "none"`, ou seja, a conta e não a API;
  - `stream_event` com `content_block_delta`/`text_delta` traz o texto aos poucos;
  - `assistant` traz as mensagens completas, inclusive `tool_use` com `input.file_path`;
  - `result` traz `is_error`, `result` e `permission_denials`;
  - `--resume <id>` continua a mesma sessão e o mesmo `session_id`.

  `acceptEdits` deixa o Claude gravar em `animacoes/` sem perguntar. O modo `-p` não tem como perguntar. O
  `Bash(python:*)` deixa rodar o `validar.py` da skill.
- **Alternatives considered**:
  - **Claude Agent SDK / API Messages**: exigiria chave de API, e o pedido foi "conta, não API".
  - **Sessão interativa num pseudo-terminal**: frágil de ler.
  - **`--input-format stream-json` com um processo vivo por conversa**: mais estado para gerenciar. Um processo
    por pedido com `--resume` dá a mesma memória.
  - **`bypassPermissions`**: deixaria o Claude fazer qualquer coisa na máquina sem perguntar.

## R7 — Uma conversa por animação (Q3 = A)

- **Decision**: o `ConversationBook` guarda, na memória da sessão da ferramenta, `nome do arquivo → session_id`.
  - **Primeiro pedido** de uma animação: um `Guid` novo com `--session-id`. **Pedidos seguintes**: `--resume`.
  - **"Nova conversa"**: troca o id da animação aberta por um novo.
  - **Pedido sem animação aberta**: usa uma conversa "nova animação". Quando um `.json` novo aparece na pasta
    durante esse pedido, essa conversa passa a ser a dele, e ele é selecionado (FR-015).
  - **Animação renomeada na pasta**: a conversa segue o nome novo.
- **Rationale**: o próprio Claude Code guarda o histórico da sessão. A ferramenta só lembra qual sessão é de
  qual arquivo, e o histórico visível de cada uma fica numa lista em memória.
- **Alternatives considered**: guardar as sessões em disco entre aberturas. Não foi pedido, e as sessões antigas
  ficam no histórico do Claude Code (`claude --resume`) de qualquer forma.

## R8 — Contexto enviado com o pedido (FR-011)

- **Decision**: `--append-system-prompt` com um texto curto em português, montado pelo `PromptContext`:
  - que o pedido vem do roll6anime;
  - que deve usar a skill `criar-animacao`;
  - o caminho do arquivo aberto (relativo à pasta de trabalho) ou "nenhum: crie um novo em `animacoes/`";
  - o caminho do modelo;
  - que grave **no mesmo arquivo** e valide com `validar.py`;
  - que não envie ao Roll6 se não for pedido.

  O texto do usuário vai sem mudanças no stdin.
- **Rationale**: o usuário escreve "feche a mão esquerda" sem citar o arquivo, e o contexto não polui o histórico
  da conversa.
- **Alternatives considered**: prefixar o contexto no texto do pedido. O histórico ficaria repetitivo, e o Claude
  trataria o contexto como fala do usuário.

## R9 — Mensagens de falha do Claude (FR-014)

- **Decision**:
  - `claude` não encontrado (`Win32Exception` ao iniciar) → "O Claude Code não foi encontrado. Instale-o e
    confira o caminho em appsettings.json (Roll6Anime:ClaudeExecutable)."
  - `result.is_error` ou saída ≠ 0 com texto de autenticação → "O Claude Code não está logado. Abra um terminal,
    rode `claude` e faça login com a sua conta."
  - Qualquer outro erro → a mensagem do `result`.
  - `permission_denials` não vazio → aviso com a ferramenta negada.
- **Rationale**: SC-006. A janela nunca fecha por causa do Claude; a vista e a lista continuam funcionando.

## R10 — Configuração

- **Decision**: `appsettings.json` ao lado do executável, seção `Roll6Anime`:
  - `AnimationsFolder` (padrão `C:\repos\gurps-adventure\animacoes`);
  - `ClaudeWorkingDirectory` (padrão `C:\repos\gurps-adventure`);
  - `ClaudeExecutable` (padrão `claude`);
  - `ClaudeAllowedTools` (padrão `Bash(python:*)`).

  O último modelo aberto vai em `%LOCALAPPDATA%\roll6anime\state.json`, porque é estado do usuário e não
  configuração. Ver [contracts/configuration.md](contracts/configuration.md).
- **Rationale**: FR-016. Trocar a pasta é só editar o arquivo e reabrir. O estado não suja o arquivo versionado.
