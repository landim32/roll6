# Implementation Plan: roll6anime — editor de animações com o Claude local

**Branch**: `062-roll6anime-editor` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/062-roll6anime-editor/spec.md`

## Summary

O roll6anime é um programa de desktop para Windows, na pasta `roll6anime/` do repositório. Ele mostra um modelo
`.glb` tocando uma animação `roll6-animation` da pasta configurada, com barra de tempo, e tem um campo de pedidos
para o **Claude Code local** (o CLI `claude`, logado na conta do usuário, rodando em `C:\repos\gurps-adventure`).
Quando um arquivo da pasta muda, por qualquer programa, o modelo passa a tocar a versão nova. A ferramenta nunca
grava animações (Q1 = A), não fala com o Roll6 (Q2 = A) e mantém uma conversa do Claude por animação (Q3 = A).

Abordagem:

- **Casca WPF (.NET 8, Windows)** com lista de animações, conversa e configuração.
- **Vista 3D num WebView2** com uma página Vite/TypeScript, sem React. Ela **reaproveita o código do site**
  (`frontend/src/components/story/loadModel.ts`, `threeClips.buildRoll6Clip`, `lib/animationFormat.toRoll6Clip`),
  então a animação toca exatamente como no Roll6 (SC-004), sem um segundo conversor.
- **Validação em C#** pelo próprio `AnimationFormat.cs` do backend, incluído no projeto por link de arquivo. O
  formato continua com três implementações, não quatro.
- **Pasta acompanhada** com `FileSystemWatcher` e espera de assentamento, para não ler um arquivo pela metade.
- **Claude Code** chamado como processo filho:
  - `claude -p --output-format stream-json --verbose --include-partial-messages`;
  - `--session-id`/`--resume` dão a conversa por animação;
  - as variáveis de chave de API são tiradas do ambiente do processo, para valer o login da conta.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (`net8.0-windows` para a casca WPF, `net8.0` para o núcleo); TypeScript 5 para a vista 3D
**Primary Dependencies**:
- WPF (Windows Desktop runtime 8, já instalado);
- **Microsoft.Web.WebView2** (NuGet; o runtime Evergreen 155 já está na máquina);
- Microsoft.Extensions.Configuration.Json + Binder (o `appsettings.json`);
- three 0.186.1 e Vite 6, os mesmos do `frontend/`. A vista 3D importa os módulos do site; não há cópia.

**Storage**: arquivos.
- A pasta de animações configurada (só leitura).
- `appsettings.json`, ao lado do executável.
- O último modelo aberto em `%LOCALAPPDATA%\roll6anime\state.json`.

**Testing**: xUnit + FluentAssertions (mesmo padrão do `backend/Roll6.Tests`) em `roll6anime/Roll6Anime.Tests`, cobrindo:
- validação contra as 23 fixtures da 059, ligadas por link;
- leitor do stream-json do Claude, com linhas de exemplo;
- acompanhamento da pasta, em diretório temporário;
- caderno de conversas;
- montagem do pedido.

Vitest em `roll6anime/viewer` para o que é puro na vista (estado da reprodução, mensagens).

**Target Platform**: Windows 10/11 x64, com o runtime WebView2 (Evergreen) e o Claude Code CLI no PATH
**Project Type**: desktop-app (WPF + WebView2), fora da stack web do Roll6
**Performance Goals**:
- mudança no arquivo aberta no modelo em ≤ 1 s (SC-002), na prática ~300 ms;
- modelo de 20 MB aberto e tocando em ≤ 3 s (SC-005);
- vista a 60 fps.

**Constraints**:
- nunca gravar arquivos de animação (FR-009);
- nenhuma credencial do Roll6 nem chave de API da Anthropic (FR-018, FR-010);
- textos em português (FR-019);
- não executar `docker` (constituição).

**Scale/Scope**: uso pessoal, uma janela, dezenas de arquivos na pasta, um pedido ao Claude por vez

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação | Observação |
|---|---|---|
| I. Skills de arquitetura | **N/A** | Não há entidade, repositório, DTO, migração nem Types/Service/Context/Hook do site; nada do que as skills `dotnet-architecture`/`react-architecture` cobrem. O backend e o frontend do Roll6 não mudam. |
| II. Stack fixa | **Exceção justificada** | A stack fixa é a do backend web e do SPA. O roll6anime é um terceiro programa, de desktop, pedido explicitamente como ".NET para Windows". Usa .NET 8 (o mesmo runtime) e, na vista 3D, Vite + TypeScript + three, já da stack do frontend. Nada entra no backend nem no SPA. Ver Complexity Tracking. Sem `docker`. |
| III. Casing de diretórios | **OK** | A vista 3D não tem `Contexts/`/`Services/`; pastas em minúsculas (`viewer/src`). Os imports do site respeitam o casing real (`../../frontend/src/Services/...` só chega por dentro do `loadModel`). |
| IV. Convenções de código | **OK** | C#: namespaces file-scoped `Roll6Anime.*`, PascalCase, `_camelCase`, constantes UPPER_CASE. TS: `interface`, arrow functions, `const`. Não há DTO HTTP. |
| V. Banco de dados | **N/A** | Sem banco. |
| VI. Autenticação | **OK / N/A** | Sem login próprio. A ferramenta não guarda nenhum segredo (FR-018); o Claude Code usa o login que o usuário já fez. |
| VII. Grid hexagonal | **N/A** | Sem mapa. |

**Resultado**: passa, com a exceção do Princípio II registrada abaixo.

**Reavaliação após o design (Fase 1)**: inalterada. O design não acrescenta nenhuma tabela, endpoint, DTO nem
provider no Roll6. A validação reusa o arquivo do backend (R4) e a vista reusa os módulos do site (R2), sem cópias
novas do formato. O único segredo envolvido é o login do Claude Code, que fica com o próprio CLI.

## Project Structure

### Documentation (this feature)

```text
specs/062-roll6anime-editor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── claude-cli.md        # como o Claude Code é chamado e o que a ferramenta lê da saída
│   ├── viewer-bridge.md     # mensagens entre a casca WPF e a vista 3D
│   └── configuration.md     # appsettings.json e state.json
├── checklists/requirements.md
└── tasks.md                 # /speckit.tasks
```

### Source Code (repository root)

```text
roll6anime/
├── Roll6Anime.sln
├── README.md                          # como compilar, configurar e usar
├── Roll6Anime.Core/                   # net8.0 — tudo que não é tela (testável)
│   ├── Roll6Anime.Core.csproj         # liga AnimationFormat.cs, AnimationType.cs e DomainValidationException.cs do backend
│   ├── Settings/AnimeSettings.cs      # pasta de animações, pasta do Claude, executável
│   ├── Settings/UserState.cs          # último modelo (state.json)
│   ├── Animations/AnimationEntry.cs   # um .json da pasta: nome, tipo, duração, repete, erro
│   ├── Animations/AnimationFolder.cs  # lista e valida a pasta
│   ├── Animations/FolderWatcher.cs    # FileSystemWatcher + assentamento por arquivo
│   ├── Claude/ClaudeEvent.cs          # o que a tela mostra: texto, ferramenta, fim, erro
│   ├── Claude/StreamJsonReader.cs     # linhas stream-json → ClaudeEvent
│   ├── Claude/ClaudeRunner.cs         # processo, ambiente sem chave de API, parar
│   ├── Claude/PromptContext.cs        # o contexto da tela enviado com cada pedido
│   └── Claude/ConversationBook.cs     # uma sessão por animação (Q3 = A)
├── Roll6Anime/                        # net8.0-windows, WPF — a janela
│   ├── Roll6Anime.csproj
│   ├── appsettings.json
│   ├── App.xaml(.cs)
│   ├── MainWindow.xaml(.cs)           # lista | vista 3D | conversa
│   ├── MainViewModel.cs
│   ├── ViewerBridge.cs                # WebView2: host da vista, modelo via WebResourceRequested (CORS), mensagens
│   └── wwwroot/viewer/                # saída do build da vista (gerada, ignorada no git)
├── Roll6Anime.Tests/                  # xUnit + FluentAssertions
│   ├── AnimationFolderTests.cs        # fixtures da 059 por link
│   ├── FolderWatcherTests.cs
│   ├── StreamJsonReaderTests.cs       # + Samples/*.jsonl
│   ├── ConversationBookTests.cs
│   └── PromptContextTests.cs
└── viewer/                            # Vite + TypeScript (sem React)
    ├── package.json                   # vite, typescript, vitest; three vem do frontend (alias)
    ├── vite.config.ts                 # alias @roll6 → ../../frontend/src, three → frontend/node_modules/three, outDir ../Roll6Anime/wwwroot/viewer
    ├── index.html
    └── src/
        ├── main.ts                    # cena, câmera orbital, luzes, chão
        ├── player.ts                  # monta o clip (buildRoll6Clip), toca, pausa, busca, troca mantendo o tempo
        ├── player.test.ts
        ├── timeline.ts                # barra de tempo (tocar/pausar, arrastar)
        └── bridge.ts                  # mensagens com a casca (contracts/viewer-bridge.md)
```

**Structure Decision**: uma pasta `roll6anime/` na raiz, ao lado de `backend/` e `frontend/`, com:
- o núcleo testável sem tela (`Roll6Anime.Core`);
- a janela WPF (`Roll6Anime`);
- os testes;
- a vista 3D web (`viewer/`), que reaproveita o código 3D do site por import de caminho relativo.

A solução é própria (`Roll6Anime.sln`) e não entra em `backend/Roll6.sln`, para o build e os testes do servidor
não dependerem de Windows.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Programa de desktop (WPF + WebView2) fora da stack web do Princípio II | O usuário pediu explicitamente ".NET para Windows" e um programa que chama o Claude Code da máquina e acompanha arquivos locais, o que um SPA no navegador não pode fazer | Página dentro do site: o navegador não executa o `claude` nem acompanha pastas locais. Console .NET: não mostra o modelo 3D. |
| Vista 3D em HTML (WebView2) em vez de renderização .NET nativa | A animação precisa tocar **igual** ao Roll6 (SC-004); o conversor (`threeClips`, braços relaxados, `hipsLift`) e o leitor de `.glb` (`loadModel`: bind pose, alinhamento do esqueleto) já existem e são testados em TypeScript | Renderizar o glTF com skinning em .NET (Helix Toolkit, SharpGLTF + DirectX) exigiria reescrever e manter um segundo conversor e um segundo leitor, que divergiriam do Roll6. |
| Quarto projeto .NET (`Roll6Anime.Core`) separado da janela | Testar o leitor de stream-json, o acompanhamento da pasta e o caderno de conversas sem abrir janela | Tudo no projeto WPF: os testes precisariam de `net8.0-windows` e de um despachante WPF. |
