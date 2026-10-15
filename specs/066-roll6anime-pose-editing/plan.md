# Implementation Plan: Editar a pose girando os ossos no roll6anime

**Branch**: `066-roll6anime-pose-editing` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/066-roll6anime-pose-editing/spec.md`

## Summary

Com o esqueleto ligado (065), clicar numa junta (ou numa linha, que é o osso pai) seleciona o osso: a animação pausa e
um `TransformControls` do three.js em modo **rotate** (anéis X/Y/Z no referencial do personagem) se prende ao osso.

**Enquanto arrasta**
- O mixer fica congelado, para não sobrescrever a rotação.
- O rótulo mostra o ângulo, por exemplo "LeftForeArm: 32°".

**Ao soltar**
1. A vista converte a rotação local nova do osso em graus do arquivo, invertendo exatamente a conversão do site:
   `D = P·Q·L⁻¹·P⁻¹·C⁻¹`. P é a orientação de descanso do osso pai, L a do próprio osso e C o ajuste de braço relaxado.
2. Monta o arquivo novo com uma função pura, `setKey`:
   - troca a chave daquele instante ou cria uma nova;
   - se o osso não tinha trilha, cria a trilha com a pose de descanso nas outras poses (Q1 = A);
   - se a animação repete, mantém as duas pontas iguais.
3. Manda o arquivo à casca com `saveAnimation`.

**Na casca C#**
- Confere que é o arquivo aberto e que o Claude não está trabalhando.
- Valida com o `AnimationFormat.cs` do backend e grava de forma atômica.
- O `FolderWatcher` já devolve a versão nova à vista, mantendo o instante.

**Histórico (Q2)**: um `AnimationHistory` por arquivo, no `Roll6Anime.Core`. Toda versão lida da pasta que difere da
atual entra no histórico, venha ela da ferramenta, do Claude ou de um editor. Ctrl+Z e Ctrl+Y gravam a versão anterior
ou a seguinte, com o conteúdo exato. A vista ganha botões ↶ e ↷ com as contagens.

Para os dois sentidos da conversão nunca divergirem, os dados de descanso (`restFrame`: P, L, C) saem do `threeClips`
do site, e o `buildRoll6Clip` passa a usá-los também.

## Technical Context

**Language/Version**: TypeScript 5 (vista) e C# 12 / .NET 8 (`Roll6Anime.Core`, casca WPF); uma pequena refatoração em
`frontend/src/components/story/threeClips.ts`
**Primary Dependencies**: existentes — `three` 0.186.1 (`TransformControls` de `three/examples/jsm/controls`, `Quaternion`,
`Euler`), `AnimationFormat.cs` linkado do backend. **Nenhuma dependência nova.**
**Storage**: o arquivo de animação aberto (gravação atômica: arquivo temporário + `File.Replace`/`Move`); histórico só em
memória (≤ 100 versões por animação)
**Testing**: Vitest (vista: `setKey`, inversão da conversão em ida e volta com um esqueleto de teste, ângulos);
xUnit (`AnimationHistory`, gravação validada); Vitest do site (o `buildRoll6Clip` refatorado continua igual); janela real
**Target Platform**: Windows 10/11 + WebView2
**Project Type**: desktop app (`roll6anime/`)
**Performance Goals**: gravação + volta da versão nova em < 500 ms (assentamento de 200 ms do watcher incluído)
**Constraints**: só o arquivo aberto; nunca o `.glb`; arquivo sempre validado; preservar campos não editados; graus com
1 casa decimal e |graus| ≤ 180 (decomposição XYZ)
**Scale/Scope**: 2 módulos novos na vista, 1 no core, ajustes em `main.ts`, `player.ts`, `bridge.ts`, `ViewerBridge`,
`MainViewModel`, `MainWindow`; `threeClips.ts` refatorado sem mudar o resultado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| II. Stack fixa | roll6anime = exceção da 062; `TransformControls` vem do `three` já usado. ✅ |
| Formato com três implementações (059) | Nenhuma regra nova de formato: a gravação usa o `AnimationFormat.cs` do backend (o mesmo do Roll6). ✅ |
| Site | `threeClips.buildRoll6Clip` só ganha um helper exportado (`restFrame`); os testes do site provam que o resultado não muda. ✅ |
| Regra da 062 | Alterada por decisão do usuário (opção A): grava só o arquivo aberto, por ação explícita, validado; documentado no CLAUDE.md, README e contratos. ✅ (mudança de escopo aprovada) |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/066-roll6anime-pose-editing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── pose-editing.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
frontend/src/components/story/threeClips.ts   # + export restFrame(root, boneName) usado por buildRoll6Clip

roll6anime/
├── viewer/src/
│   ├── poseEdit.ts (+ test)        # puro: degreesFromLocal (inversa), setKey (trilhas/chaves/pontas do loop), EDITABLE
│   ├── boneGizmo.ts                # TransformControls rotate preso ao osso; ângulo; eventos de início/fim
│   ├── player.ts                   # freeze()/source exposto
│   ├── main.ts                     # seleção por clique, gizmo, saveAnimation, undo/redo, editing on/off
│   ├── bridge.ts, index.html, style.css   # ↶ ↷ e mensagens novas
├── Roll6Anime.Core/Animations/
│   ├── AnimationHistory.cs         # versões por arquivo, Record/Undo/Redo, limite 100
│   └── AnimationWriter.cs          # valida (AnimationFormat.Parse) e grava atômico
├── Roll6Anime.Tests/AnimationHistoryTests.cs, AnimationWriterTests.cs
└── Roll6Anime/ViewerBridge.cs, MainViewModel.cs, MainWindow.xaml(.cs)
specs/062-roll6anime-editor/contracts/viewer-bridge.md   # mensagens novas
```

**Structure Decision**: a matemática e o arquivo novo na vista (onde estão o modelo e a pose); validar, gravar e
historiar na casca (que já lê a pasta e valida com o código do backend).

## Complexity Tracking

Sem violações (a mudança da regra da 062 é decisão explícita do usuário, registrada na spec).
