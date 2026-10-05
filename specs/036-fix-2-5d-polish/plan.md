# Implementation Plan: Ajustes do 2,5D — formulário de token, máscara em tons de cinza, chão e balões no 3D

**Branch**: `036-fix-2-5d-polish` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/036-fix-2-5d-polish/spec.md`

## Summary

Quatro ajustes na vista 3D (034) e no cadastro de token (035), **todos no frontend** — nenhuma tabela, coluna, endpoint ou
dependência nova:

1. **Formulário de token alinhado** — os quatro campos "2,5D" passam a ter um *palco* de tamanho fixo (quadrado, com a moldura 3:4
   centralizada) que serve ao recorte, à imagem já gravada e ao campo vazio, e uma grade com *subgrid* que alinha título, descrição,
   palco e controles linha a linha. Causa encontrada: o recorte tem altura fixa (280 px) e a moldura se ajusta à largura, enquanto a
   imagem gravada (120 px de altura) e o seletor vazio (~38 px) têm outras alturas — cada campo muda de tamanho conforme o estado.
2. **Chão contínuo** — fora da imagem do mapa a coluna/linha é "presa" à borda (clamp): o chão e a cor das paredes continuam com o
   pixel da borda mais próxima, sem preto.
3. **Balões no 3D** — uma camada HTML sobre o canvas, posicionada a cada quadro por uma função pura (`lib/storyBubbles.ts`) a partir
   da projeção das figuras que o desenhista de quadro agora devolve (posição na tela, topo e visibilidade da cabeça), com o mesmo
   texto de `lastActions` do 2D.
4. **Máscara em tons de cinza (P3)** — a grade da máscara passa a guardar a **altura** (0–255) de cada célula (mediana da luminância
   da célula, com encaixe nos extremos para máscaras só preto/branco ficarem idênticas); o raio continua pelas paredes mais baixas e
   devolve a lista de faces cada vez mais altas; o quadro é pintado de trás para a frente, com céu e chão como base, e a oclusão das
   figuras passa a ser por linha (acima do topo da mureta a figura aparece).

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend). Backend e MCP: só texto do guia e das descrições (sem mudança de contrato).
**Primary Dependencies**: React 18, Vite 6, Bootstrap 5.3 (dark), i18next, `react-easy-crop`. **Nenhuma dependência nova.**
**Storage**: N/A — nenhuma mudança de esquema; o significado dos tons da `mask_image` existente é que muda.
**Testing**: Vitest `environment: 'node'` — `lib/raycaster.ts`, `lib/raycastFrame.ts`, `lib/maskImage.ts`, `lib/storyBubbles.ts` e `lib/frontImage.ts` são puros e testados sem DOM; xUnit só para o guia do MCP (`McpDescriptionTests`).
**Target Platform**: navegadores desktop e celular; contêineres Linux em homolog/produção; sem Docker na máquina de dev.
**Project Type**: aplicação web (`frontend/` principal; `backend/Roll6.Mcp` só documentação).
**Performance Goals**: SC-006 — ≥ 30 fps com 50 peças, balões, paredes de várias alturas e chão prolongado; a lista de faces por raio é limitada (máx. 8) e o piso só é calculado nas linhas não cobertas por parede.
**Constraints**: máscaras só preto/branco renderizam **idênticas** (FR-008, teste de regressão com o quadro anterior); a máscara nunca afeta o 2D nem as peças; `McpCoverageTests` em 86/87 (nenhum endpoint); balões só de peças em pé (`isShownIn3d`); `.hidden` das abas de token continua (nada se perde ao trocar de aba).
**Scale/Scope**: 0 migrações · 0 endpoints · `lib/maskImage` (+ altura) · `lib/raycaster` (grade de alturas, `castRay` com várias faces) · `lib/raycastFrame` (pintura de trás para frente, chão fixado na borda, resultado com projeções) · `lib/storyBubbles` (novo) · `StoryView` + `raycastRenderer` + `BubbleLayer` (novo) · `MaskPreview` (tons) · `ImageCropper` + `SpriteImageField` + `TokenFormFields` + CSS (palco) · ~6 chaves i18n · texto do guia do MCP e descrição da máscara.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura** | `dotnet-architecture` / `react-architecture` para entidades novas | **PASS** | Nenhuma entidade, service, context ou provider novo; só funções puras em `lib/` e componentes de apresentação. |
| **II. Stack Tecnológica Fixa** | Sem lib fora da stack; sem Docker local | **PASS** | Nenhuma dependência nova; balões em HTML/CSS Bootstrap-friendly, sem biblioteca de layout. |
| **III. Case Sensitivity** | `Contexts/`, `Services/`, `hooks/`, `types/` | **PASS** | Arquivos novos: `lib/storyBubbles.ts`, `components/story/BubbleLayer.tsx` (nenhum diretório novo). |
| **IV. Convenções de Código** | camelCase/PascalCase; `interface`; sem `enum`; arrow functions | **PASS** | Interfaces e constantes (`as const`), sem `enum`/`type`. |
| **V. Banco PostgreSQL** | snake_case, `varchar`, sem Cascade | **PASS** | Nenhuma coluna ou FK. |
| **VI. Autenticação e Segurança** | `[Authorize]`; token em localStorage | **PASS** | Nenhum endpoint novo; os arquivos continuam lidos por `GET /api/image/file` já `[Authorize]`. |
| **VII. Grid Hexagonal** | Matemática de hex no módulo puro; `x`/`y` persistidos | **PASS** | Nada novo é gravado e nenhuma conta de hex nova: a posição das figuras continua vindo de `hexCenter`; o raycaster trabalha em pixels do mapa. |

**Resultado**: sem violações; *Complexity Tracking* vazio.

**Reavaliação pós-Fase 1**: `data-model.md` e `contracts/` não criaram endpoint, tabela, FK, provider nem dependência. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/036-fix-2-5d-polish/
├── plan.md, research.md (D1..D9), data-model.md, quickstart.md
├── contracts/ ui-contracts.md · mcp-docs.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── lib/maskImage.ts (+ test)            # + MASK_MIN_HEIGHT, wallHeight(lum), heightPixels(); thresholdPixels → grayscalePixels (prévia fiel)
├── lib/raycaster.ts (+ test)            # MaskGrid.walls → heights (0–255); buildMaskGrid por mediana; castRay → faces cada vez mais altas; wallColumn(altura); isWallAt = altura > 0
├── lib/raycastFrame.ts (+ test)         # base céu/chão + paredes de trás para frente; chão preso à borda; oclusão por linha; devolve FrameResult
├── lib/storyBubbles.ts (+ test)         # NOVO — bubblePlacement(): posição, escala, visibilidade, limites da tela, ordem por profundidade
├── lib/frontImage.ts (+ test)           # + STAGE (palco quadrado) e frameInStage(): geometria compartilhada pelo palco
├── lib/storyCamera.ts                   # só usa isWallAt (altura > 0) — comportamento igual
├── components/story/raycastRenderer.ts  # onFrame(FrameResult) depois de cada desenho
├── components/story/BubbleLayer.tsx     # NOVO — balões HTML sobre o canvas, atualizados por ref a cada quadro
├── components/story/StoryView.tsx       # lê TurnContext, monta balões (lastActions + pieceKey) e liga o onFrame
├── components/ui/ImageCropper.tsx       # prop `stage`: palco quadrado fixo para recorte, imagem gravada e vazio
├── components/tokens/SpriteImageField.tsx, TokenFormFields.tsx   # grade com subgrid (título · descrição · palco · controles)
├── components/modals/MaskPreview.tsx    # prévia em tons de cinza
├── styles/app.css                       # .stm-stage*, .stm-sprite-grid, .stm-story-bubbles, .stm-story-bubble
├── i18n/locales/pt-BR.json              # tokens.stageEmpty…, raycast.maskHint (tons), story.bubble
backend/Roll6.Mcp/Roll6Guide.cs, Tools/MapModelTools.cs           # a máscara aceita tons de cinza (texto)
backend/Roll6.Tests/Mcp/McpDescriptionTests (se pinar o texto)    # ajuste, sem contagem nova
```

**Structure Decision**: aplicação web existente; nenhum projeto ou diretório novo. O que decide *o que se vê* (altura por tom, escolha
da face, posição e visibilidade do balão, geometria do palco) fica em `lib/` puro e testado; o que toca DOM fica nos componentes.

## Complexity Tracking

> Sem violações do Constitution Check — nada a justificar.
