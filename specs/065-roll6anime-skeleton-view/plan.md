# Implementation Plan: Esqueleto na vista 3D do roll6anime

**Branch**: `065-roll6anime-skeleton-view` | **Date**: 2026-10-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/065-roll6anime-skeleton-view/spec.md`

## Summary

O botão **Esqueleto** fica na própria vista 3D (a página `viewer/` dentro do WebView2), na barra de tempo, ao lado de
tocar/pausar. Tudo o que é desenhado acontece ali:

- **Ossos:** um `LineSegments` com uma linha de cada osso ao osso pai, refeito a cada quadro a partir das posições dos
  ossos na pose atual, com `depthTest` desligado e desenhado por último, para nunca ficar escondido pela malha. Ganha
  pontos nas juntas e cores por vértice.
- **Modelo semitransparente:** os materiais do modelo passam a 35% de opacidade, sem escrever profundidade; os valores
  originais são guardados para voltar exatamente como estavam.
- **Destaque:** os ossos que a animação aberta movimenta (trilhas do arquivo e o quadril quando há `hipsLift`) ficam em
  âmbar; os outros em ciano.
- **Nome ao passar o mouse:** um rótulo HTML mostra o osso cujo segmento projetado na tela fica mais perto do ponteiro
  (até 14 px), com o nome normalizado pelo `normalizeBoneName` do site. Esse osso é realçado em branco.
- **Lembrar a escolha:** o estado do botão fica no `localStorage` da vista. A pasta de dados do WebView2 é persistente,
  em `%LOCALAPPDATA%\roll6anime\WebView2`.

O print já desenha a cena e lê o canvas na hora, então os ossos e a transparência entram sozinhos e o rótulo, que é
HTML, fica de fora. A mensagem `captured` ganha `skeleton: boolean`, e `ViewCapture.Caption` acrescenta o aviso das
linhas e das cores. A parte pura fica em `viewer/src/skeleton.ts`, testada pelo Vitest: ossos movidos, segmentos,
osso mais próximo e cores.

## Technical Context

**Language/Version**: TypeScript 5 (vista, Vite) e C# 12 / .NET 8 (`Roll6Anime.Core`, casca WPF)
**Primary Dependencies**: existentes — `three` 0.186.1 do `frontend/` (`LineSegments`, `Points`, `BufferGeometry`,
`LineBasicMaterial`), `@roll6/lib/modelAnimations.normalizeBoneName`. **Nenhuma dependência nova.**
**Storage**: `localStorage` da vista (`roll6anime:skeleton` = "on"/"off"), no perfil persistente do WebView2
**Testing**: Vitest em `roll6anime/viewer` (regras puras); xUnit em `Roll6Anime.Tests` (legenda); janela e Claude reais
**Target Platform**: Windows 10/11 + WebView2
**Project Type**: desktop app (`roll6anime/`)
**Performance Goals**: atualizar ~65 segmentos por quadro (um `Float32Array`); a busca do osso mais perto só roda no
movimento do ponteiro
**Constraints**: desligado = vista idêntica à de hoje (materiais restaurados); cores distintas do vermelho da 064
**Scale/Scope**: 1 módulo novo na vista + ajustes em `main.ts`, `bridge.ts`, `index.html`, `style.css`; 1 campo no
`ViewCapture` e na ponte C#

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| II. Stack fixa | roll6anime = exceção da 062; só usa o `three` e o código do site que a vista já importa. ✅ |
| I, V, VI, VII | Sem entidade, banco, autenticação ou grid. ✅ (não se aplica) |
| IV. Convenções | TS sem `enum` (constantes), funções puras testadas; textos de tela em português. ✅ |
| Site/API/MCP | Nada muda (o `normalizeBoneName` é só importado). ✅ |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/065-roll6anime-skeleton-view/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── viewer-skeleton.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
roll6anime/
├── viewer/
│   ├── index.html                  # botão Esqueleto na barra, rótulo do osso, aviso "sem esqueleto"
│   └── src/
│       ├── skeleton.ts (+ test)    # puro: movedBones, boneSegments, nearestSegment, segmentColors, SKELETON_COLORS
│       ├── skeletonView.ts         # three.js: linhas/pontos por quadro, transparência dos materiais, hover
│       ├── main.ts                 # cria a SkeletonView por modelo, liga o botão, captured.skeleton
│       ├── bridge.ts               # captured: + skeleton
│       └── style.css
├── Roll6Anime.Core/Claude/PromptImage.cs   # ViewCapture.Skeleton + nota na legenda
├── Roll6Anime/ViewerBridge.cs              # lê captured.skeleton
└── Roll6Anime.Tests/PromptImageTests.cs
specs/062-roll6anime-editor/contracts/viewer-bridge.md   # captured.skeleton
```

**Structure Decision**: tudo dentro do `roll6anime/` existente; o desenho dos ossos na vista (onde está o three.js), só o
aviso da legenda na casca C#.

## Complexity Tracking

Sem violações.
