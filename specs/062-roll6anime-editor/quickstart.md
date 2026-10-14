# Quickstart: roll6anime (062)

## Pré-requisitos

- Windows 10/11 com o .NET 8 Windows Desktop runtime (para compilar: SDK 8 ou mais novo).
- Runtime WebView2 (Evergreen). Já vem com o Edge.
- Node 20+ com `npm install` feito em `frontend/`, porque a vista usa o `three` de lá.
- Claude Code instalado e logado com a sua conta: rode `claude` uma vez num terminal e faça login.
- O projeto da mesa em `C:\repos\gurps-adventure`, com a skill `criar-animacao`.

## Compilar e abrir

```bash
cd roll6anime/viewer
npm install
npm run build                 # gera ../Roll6Anime/wwwroot/viewer
cd ..
dotnet build Roll6Anime.sln
dotnet test Roll6Anime.Tests
dotnet run --project Roll6Anime
```

## Configurar

`roll6anime/Roll6Anime/appsettings.json` (copiado para a pasta do executável):

```json
{ "Roll6Anime": { "AnimationsFolder": "C:\\repos\\gurps-adventure\\animacoes", "ClaudeWorkingDirectory": "C:\\repos\\gurps-adventure" } }
```

## Roteiro de verificação

1. **Ver** (US1). Abrir `C:\repos\gurps-adventure\personagens\urzog-bigorna\orc-gordo.glb` e escolher
   `aceno-duplo.json` na lista.
   - O orc acena.
   - Pausar, arrastar a barra até 0,6 s: a pose fica parada naquele instante.
   - Girar o modelo com o mouse.
2. **Inválido** (US1-4). Copiar `specs/059-token-animation-library/fixtures/invalid-bone-unknown.json` para a
   pasta.
   - O item aparece marcado como inválido, com "Osso "LeftElbow" não existe no esqueleto Mixamo (trilha 3)."
3. **Mudança por fora** (US3).
   - Com `aceno-duplo.json` aberto, mudar um giro num editor de texto e salvar: o orc muda em menos de 1 s, sem a
     câmera mexer.
   - Salvar o arquivo quebrado (apagar um `]`): aparece o erro, e o orc continua com a versão anterior.
   - Desfazer: volta a tocar.
4. **Pedir ao Claude** (US2). Com `aceno-duplo.json` aberto, pedir "feche a mão esquerda em punho".
   - A resposta aparece aos poucos, mostrando "Editando animacoes/aceno-duplo.json".
   - Quando o Claude grava, o orc fecha a mão sem nada ser clicado.
   - Pedir "agora feche só pela metade": o Claude entende pelo pedido anterior (mesma conversa).
5. **Nova animação** (US2-4). Clicar em "Nova animação" (nenhuma aberta) e pedir "crie uma animação de o
   personagem se agachar e olhar para os lados".
   - O arquivo novo aparece na lista, fica selecionado e toca.
6. **Conversa por animação** (Q3).
   - Voltar a `aceno-duplo.json`: a conversa dele reaparece.
   - "Nova conversa" limpa só a dele.
7. **Parar**. Fazer um pedido longo e clicar em "Parar": o pedido termina como parado e o campo volta.
8. **Sem Claude** (SC-006). Pôr `ClaudeExecutable` = `claude-inexistente` e reabrir.
   - Um pedido mostra "O Claude Code não foi encontrado…".
   - Ver e tocar animações continua funcionando.
9. **Pasta inexistente** (US4-2). Pôr uma pasta que não existe: a janela abre e diz qual pasta falta.
10. **Nada gravado** (FR-009). Depois dos passos 1–3 e 6, `git status` em `C:\repos\gurps-adventure` não mostra
    mudanças feitas pela ferramenta. Só os pedidos ao Claude mudam arquivos.
