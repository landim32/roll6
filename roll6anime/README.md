# roll6anime

Editor de animações do Roll6 para Windows. Mostra um modelo 3D (`.glb`) tocando as animações `roll6-animation` de
uma pasta, com barra de tempo, e conversa com o **Claude Code instalado na máquina**, que cria e ajusta essas
animações com a skill `criar-animacao`. Quando um arquivo da pasta muda, por qualquer programa, o modelo passa a
tocar a versão nova sozinho.

A ferramenta **nunca grava arquivos de animação**. Quem grava é o Claude, ou você num editor. Ela também não fala
com o Roll6: para enviar uma animação pronta, use o site (menu do usuário › Animações), o `enviar.py` da skill ou
peça ao Claude.

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
`%LOCALAPPDATA%\roll6anime\state.json`.

## Como usar

1. **Abrir modelo…** escolhe o `.glb`. Arraste para girar e use a roda para aproximar. Um esqueleto sem os nomes
   do Mixamo não recebe animações, e a janela avisa.
2. Escolha uma animação da lista. Um arquivo inválido aparece marcado, com a mesma mensagem que o Roll6 daria.
3. A barra embaixo da vista toca, pausa e, ao ser arrastada, mostra a pose de cada instante.
4. Escreva um pedido à direita, por exemplo "feche a mão esquerda em punho", e tecle Enter (Shift+Enter quebra a
   linha). O Claude recebe o arquivo aberto e o modelo como contexto. A resposta aparece enquanto chega, e o modelo
   muda quando ele grava o arquivo.
5. **Uma conversa por animação**: os pedidos seguintes continuam a conversa daquela animação ("agora só pela
   metade"). Trocar de animação troca de conversa. **Nova conversa** recomeça a da animação aberta.
6. **Nova animação** deixa nada selecionado. O próximo pedido cria um arquivo, que entra na lista, fica selecionado
   e herda a conversa.
7. **Anexar print** junta ao próximo pedido uma imagem da vista 3D como está na tela: a pose do instante atual,
   vista da câmera onde você a deixou. A miniatura fica sobre o campo do pedido (o X remove), até 5 por pedido. A
   imagem vai ao Claude como imagem, com uma legenda que diz a animação, o instante e de onde a câmera olha ("122° da
   frente, para o lado esquerdo do personagem"). Dá para enviar só o print, sem texto.
8. **Parar** interrompe o Claude.

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
