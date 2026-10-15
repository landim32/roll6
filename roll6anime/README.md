# roll6anime

Editor de animações do Roll6 para Windows. Mostra um modelo 3D (`.glb`) tocando as animações `roll6-animation` de
uma pasta, com barra de tempo, e conversa com o **Claude Code instalado na máquina**, que cria e ajusta essas
animações com a skill `criar-animacao`. Quando um arquivo da pasta muda, por qualquer programa, o modelo passa a
tocar a versão nova sozinho.

A ferramenta só grava o **arquivo de animação aberto**, e só quando você gira um osso ou usa Ctrl+Z/Ctrl+Y (066);
sempre validado com as regras do Roll6. O modelo `.glb` nunca é alterado. Ela só fala com o Roll6 quando você clica
em **Enviar ao Roll6** (067), que manda a animação aberta para a biblioteca de animações.

## Pré-requisitos

- Windows 10/11 com o .NET 8 Windows Desktop runtime. Para compilar, o SDK 8 ou mais novo.
- Runtime WebView2 da Microsoft. Já vem com o Edge.
- Node 20+ e `npm install` feito em `../frontend`, porque a vista 3D usa o código 3D e o `three` do site.
- [Claude Code](https://claude.com/claude-code) instalado e **logado com a sua conta**: rode `claude` uma vez num
  terminal e faça login. A ferramenta tira do ambiente as variáveis de chave de API (`ANTHROPIC_API_KEY`…), para
  valer o login da conta.
- O projeto da mesa (por padrão `C:\repos\gurps-adventure`), com a skill `criar-animacao`.

## Compilar e abrir

```bash
cd viewer
npm install
npm run build            # gera ../Roll6Anime/wwwroot/viewer
cd ..
dotnet build Roll6Anime.sln
dotnet test Roll6Anime.Tests
dotnet run --project Roll6Anime
```

## Configurar

`Roll6Anime/appsettings.json`, copiado para a pasta do executável:

| Chave | Padrão | Para quê |
|---|---|---|
| `Roll6Anime:AnimationsFolder` | `C:\repos\gurps-adventure\animacoes` | pasta listada e acompanhada |
| `Roll6Anime:ClaudeWorkingDirectory` | `C:\repos\gurps-adventure` | onde o Claude Code roda (a pasta das skills) |
| `Roll6Anime:ClaudeExecutable` | `claude` | o CLI, pelo PATH ou por caminho |
| `Roll6Anime:ClaudeAllowedTools` | `Bash(python:*)` | o que o Claude pode rodar no Bash, além de editar arquivos |

As variáveis de ambiente `Roll6Anime__AnimationsFolder` etc. também valem. O último modelo aberto fica em
`%LOCALAPPDATA%\roll6anime\state.json`, junto com o id da animação do Roll6 para onde cada arquivo foi enviado.

**Enviar ao Roll6** usa o mesmo acesso das skills do projeto da mesa: as variáveis `ROLL6_URL` e `ROLL6_API_KEY`, ou
o servidor MCP `roll6` configurado no Claude Code (`~/.claude.json`, de preferência o do projeto da mesa). A chave não
é copiada para lugar nenhum.

## Como usar

1. **Abrir modelo…** escolhe o `.glb`. Arraste para girar e use a roda para aproximar. Um esqueleto sem os nomes
   do Mixamo não recebe animações, e a janela avisa.
2. Escolha uma animação da lista. Um arquivo inválido aparece marcado, com a mesma mensagem que o Roll6 daria.
3. A barra embaixo da vista toca, pausa e, ao ser arrastada, mostra a pose de cada instante. **Esqueleto**, no fim da
   barra, mostra os ossos por cima do modelo semitransparente: em âmbar os que a animação aberta movimenta, em ciano os
   outros; passar o mouse num osso mostra o nome dele (o mesmo dos arquivos, como `LeftForeArm`). A escolha fica
   lembrada, e um print com o esqueleto ligado sai com os ossos e avisa o Claude. Ao lado do tempo, a barra diz em qual
   **pose-chave** a animação está ("Pose 3 de 5" ou "Entre as poses 2 e 3 (de 5)"; as poses são os instantes com chave
   no arquivo). Essa pose vai escrita no canto do print e na legenda.
   **Editar a pose** (com o esqueleto ligado): clique numa junta — a animação pausa e aparecem anéis de rotação.
   Arraste um anel para girar o osso (o ângulo aparece); ao soltar, a rotação é gravada no arquivo aberto naquele
   instante (troca a chave da pose, ou cria uma pose nova entre duas; um osso que o arquivo não movia ganha a trilha
   com 0° nas outras poses). **Ctrl+Z / Ctrl+Y** (ou ↶ ↷ na barra) voltam e refazem as versões do arquivo, inclusive
   as que o Claude gravou. Esc solta o osso. Enquanto o Claude trabalha, a edição fica bloqueada.
4. Escreva um pedido à direita, por exemplo "feche a mão esquerda em punho", e tecle Enter (Shift+Enter quebra a
   linha). O Claude recebe o arquivo aberto e o modelo como contexto. A resposta aparece enquanto chega, e o modelo
   muda quando ele grava o arquivo.
5. **Uma conversa por animação**: os pedidos seguintes continuam a conversa daquela animação ("agora só pela
   metade"). Trocar de animação troca de conversa. **Nova conversa** recomeça a da animação aberta.
6. **Nova animação** deixa nada selecionado. O próximo pedido cria um arquivo, que entra na lista, fica selecionado
   e herda a conversa.
7. **Anexar print** junta ao próximo pedido uma imagem da vista 3D como está na tela: a pose do instante atual,
   vista da câmera onde você a deixou. Antes de anexar, o print abre em **Marcar print**, onde dá para apontar ao
   Claude o que olhar, em vermelho: Lápis, Retângulo e Circunferência pontilhados e Seta (teclas 1–4), com Desfazer
   (Ctrl+Z) e Limpar. **Concluir** (Enter) anexa, com ou sem marcações; **Cancelar** (Esc) desiste do print. Clicar na
   miniatura reabre o editor com as marcações. A miniatura fica sobre o campo do pedido (o X remove), até 5 por pedido. A
   imagem vai ao Claude como imagem, com uma legenda que diz a animação, o instante e de onde a câmera olha ("122° da
   frente, para o lado esquerdo do personagem") e, com marcações, o aviso de que as formas vermelhas são suas. Dá para
   enviar só o print, sem texto.
8. **Parar** interrompe o Claude.
9. **Enviar ao Roll6** (embaixo da lista) manda a animação aberta para a biblioteca do Roll6. Antes, consulta o Roll6
   e diz o que vai fazer: **atualizar** a animação para onde este arquivo já foi enviado (ou, sem isso, a sua animação
   de mesmo nome, sem diferenciar maiúsculas), trocando nome, tipo e arquivo e mantendo o id, de modo que os tokens
   que a usam tocam a versão nova; ou **criar** uma animação nova. Confirme o nome e o tipo (já vêm do arquivo ou da
   animação existente) e clique em Enviar. O resultado aparece na conversa, com o `animation:{id}` para usar no token.
   Só as suas animações são alteradas, e um arquivo inválido não pode ser enviado.

## Como é feito

- `Roll6Anime.Core`: pasta, validação, acompanhamento de arquivos e chamada do Claude. Testado em
  `Roll6Anime.Tests`.
  - A validação é o próprio `AnimationFormat.cs` do backend, incluído por link, com as mesmas chaves e mensagens
    do Roll6.
- `Roll6Anime`: a janela WPF.
- `viewer`: a vista 3D (Vite + TypeScript) dentro de um WebView2. Ela importa o `loadModel`, o `threeClips` e o
  `animationFormat` do site, então uma animação toca aqui exatamente como no Roll6.
- O Claude é chamado assim: `claude -p --input-format stream-json --output-format stream-json --verbose
  --include-partial-messages`, com `--session-id`/`--resume` por animação, `--permission-mode acceptEdits` e o contexto
  em `--append-system-prompt`. O pedido entra pelo stdin como uma mensagem de usuário em JSON, com os prints em base64.

Especificação e decisões: `specs/062-roll6anime-editor/`.
