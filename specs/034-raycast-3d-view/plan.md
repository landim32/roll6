# Implementation Plan: Vista 3D por raycasting (estilo Wolfenstein 3D)

**Branch**: `034-raycast-3d-view` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/034-raycast-3d-view/spec.md`

## Summary

Refaz a vista 3D da 033 como o **raycasting do Wolfenstein 3D** (um raio por coluna da tela), disponível em **todo
mapa**. As paredes vêm de uma **Máscara 3D** em preto e branco enviada no cadastro do mapa (mesma proporção da imagem
do mapa, cobrindo a mesma área), com a face colorida pela própria imagem do mapa; o chão é a planta em perspectiva e o
**fundo** é um panorama de 360°. As peças são figuras de frente, com a nova imagem opcional **"2,5D frente"** do token,
cortadas pelas paredes. A câmera só gira na horizontal, em terceira pessoa, e o usuário é apenas observador.

Desfaz da 033: tipo de mapa, paredes por hex, bloqueio de peças por parede (a máscara **não** afeta o 2D), o menu da
lateral e a dependência `three` — o raycaster é TypeScript puro em Canvas 2D (research D3). Dados: uma migração que
remove `kind`/`walls`, renomeia `sky_image` → `background_image` e adiciona `map_models.mask_image` e
`tokens.front_image`. Nenhum endpoint novo.

## Technical Context

**Language/Version**: C# 12 / .NET 8.0; TypeScript 5 / React 18
**Primary Dependencies**: ASP.NET Core 8, EF Core 9 + Npgsql, SignalR (017), `ModelContextProtocol.AspNetCore` 2.x (020) · React 18, Vite 6, Bootstrap 5.3, i18next, sonner, Radix Dialog/Dropdown. **Remove `three` e `@types/three`** (033); nenhuma dependência nova — raycaster em Canvas 2D
**Storage**: PostgreSQL — `map_models`: − `kind`, − `walls`, `sky_image` → `background_image`, + `mask_image varchar(260) null`; `tokens`: + `front_image varchar(260) null`; imagens no bucket via `POST /api/image`
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`); Vitest `environment: 'node'` — o núcleo do raycaster (`lib/raycaster.ts`) e a câmera (`lib/storyCamera.ts`) são puros e testados sem DOM
**Target Platform**: navegadores desktop e celular (Canvas 2D); contêineres Linux em homolog/produção; sem Docker na máquina de dev
**Project Type**: aplicação web (`backend/` + `Roll6.Mcp` + `Roll6.Tests`; `frontend/`)
**Performance Goals**: SC-003 — ≥ 30 fps com máscara 2000 × 2000 e 50 peças: grade da máscara reduzida a ≤ 512 células no lado maior, quadro em ≤ 480 colunas ampliado sem suavização, imagens pré-lidas para `ImageData` (mapa ≤ 2048 px); SC-004 troca 2D↔3D < 2 s; SC-005 peças em ≤ 2 s pelos eventos existentes
**Constraints**: Princípio VII — peças posicionadas por `hexCenter`, sem matemática de hex nova; bucket sem CORS → pixels lidos via `GET /api/image/file/{fileName}` (`mapSnapshot.loadImage`); `McpCoverageTests` fixo em 86/87; parâmetros MCP novos com default; o 2D e as regras de peças voltam às de antes da 033
**Scale/Scope**: 1 migração + 1 SQL incremental · 0 endpoints · campos em 5 DTOs · reverter `Occupancy` (C#/TS) e consumidores · remover `storyScene.ts`, `WallLayer`, `storyWalls`, menu da lateral · 1 módulo puro novo (`raycaster.ts`) + renderer · 2 formulários alterados (cadastro do mapa, token) · ~20 chaves i18n · 6 ferramentas MCP com descrição/parâmetros alterados + guia

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura** | `dotnet-architecture` / `react-architecture` para entidades novas | **PASS** | Nenhuma entidade nova: campos em `MapModel` e `Token` (DTO → Domain → Context → migração, pela skill `dotnet-architecture`); nenhum context/service/provider novo no frontend. Respostas DTO + `ProblemDetails`. |
| **II. Stack Tecnológica Fixa** | Sem libs fora da stack sem justificativa | **PASS** | Remove a única dependência que a 033 tinha acrescentado (`three`); o raycaster usa só Canvas 2D nativo. Fetch API existente (`imageService`). |
| **III. Case Sensitivity** | `Contexts/`, `Services/`, `hooks/`, `types/` | **PASS** | Arquivos novos em `lib/` e `components/story/`; nenhum diretório novo. |
| **IV. Convenções de Código** | PascalCase/camelCase, `[JsonPropertyName]`, `interface`, sem `enum` TS | **PASS** | `MaskImage`, `BackgroundImage`, `FrontImage`, `UpdateThreeD`; JSON `maskImage`/`backgroundImage`/`frontImage`/`*Url`; o enum C# `MapKind` sai; TS com `interface` e constantes. |
| **V. Banco PostgreSQL** | snake_case, `varchar` com tamanho, sem Cascade | **PASS** | `mask_image`, `background_image`, `front_image` `varchar(260)` nulos; `RenameColumn` preserva dados; nenhuma FK. |
| **VI. Autenticação e Segurança** | `[Authorize]`, token em localStorage | **PASS** | Nenhum endpoint novo; escrita continua do dono do mapa/token; leitura dos pixels pelo `GET /api/image/file` já `[Authorize]`. |
| **VII. Grid Hexagonal** | Matemática de hex só no módulo puro, x/y persistidos | **PASS** | A máscara é uma grade **de pixels** sobre a imagem, independente dos hexes (não persiste coordenada nenhuma); peças vão ao mundo 3D por `hexCenter` de `lib/hexGrid.ts`. O `Occupancy` volta a ser exatamente o espelho anterior à 033. |

**Resultado**: sem violações; *Complexity Tracking* vazio.

**Reavaliação pós-Fase 1**: `data-model.md` e `contracts/` não criaram endpoint, tabela, FK, provider nem dependência;
a remoção do `three` simplifica o Princípio II. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/034-raycast-3d-view/
├── plan.md, research.md (D1..D12), data-model.md, quickstart.md
├── contracts/ api.md · mcp-tools.md · ui-contracts.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Enums/MapKind.cs                       # REMOVIDO
├── Roll6.Domain/Models/MapModel.cs                     # − Kind/Walls/SkyImage/UpdateStory/ActiveWalls; + MaskImage, BackgroundImage, UpdateThreeD
├── Roll6.Domain/Models/Token.cs                        # + FrontImage (Update)
├── Roll6.Domain/Grid/Occupancy.cs                      # volta ao anterior à 033
├── Roll6.Domain/Services/MapModelService.cs            # ApplyChanges/MapToDto com os campos novos
├── Roll6.Domain/Services/MapOccupancyLoader.cs         # volta ao anterior à 033
├── Roll6.Domain/Services/TurnService.Processing.cs     # volta ao anterior à 033
├── Roll6.Domain/Services/TokenLibraryService.cs        # frontImage + frontImageUrl
├── Roll6.Domain/Services/MapTokenService.cs            # MapToDtoAsync → frontImageUrl
├── Roll6.DTO/MapModel/*, Token/*, MapToken/MapTokenInfo.cs
├── Roll6.Infra/Context/Roll6Context.cs + Migrations/<ts>_ReplaceStoryMapWithRaycast.cs
├── Roll6.Mcp/Tools/MapModelTools.cs, TokenTools.cs, MapTokenTools.cs, MapNpcTools.cs, TurnTools.cs, Roll6Guide.cs
└── Roll6.Tests/  MapModelStoryTests → MapModelThreeDTests; OccupancyTests/MapToken/MapNpc/TurnService sem casos de parede; TokenLibraryServiceTests (frontImage)
database/migrations/034-raycast-view.sql, database/roll6.sql

frontend/src/
├── types/mapModel.ts, types/token.ts, types/mapToken.ts      # campos novos; sai MAP_KIND
├── lib/draft.ts (+test)                                     # mask/background no lugar de kind/walls/sky
├── lib/storyWalls.ts (+test)                                # REMOVIDO
├── lib/occupancy.ts (+test), lib/mapTokens.ts (+test)       # voltam ao anterior à 033
├── lib/mapSnapshot.ts                                       # sem paredes no Share
├── lib/raycaster.ts (+test)                                 # NOVO — núcleo puro
├── lib/maskImage.ts (+test)                                 # NOVO — proporção, limiar, prévia
├── lib/storyCamera.ts (+test)                               # sem pitch; bloqueio pela grade da máscara
├── lib/pieceDrawing.ts (+test)                              # spriteSpec usa frontImageUrl
├── hooks/useTokenMovement.ts, hooks/useStoryCamera.ts       # sem paredes / sem tilt
├── Contexts/MapEditorContext.tsx                            # setMaskImage/setBackgroundImage; sai setKind/paintWalls/wallMode
├── components/map/MapCanvas.tsx, MapControls.tsx            # sem modo paredes; só o botão 3D
├── components/map/WallLayer.tsx                             # REMOVIDO
├── components/modals/ImageModal.tsx                         # aba 3D (máscara + fundo)
├── components/tokens/TokenFormFields.tsx (+ TokenModal/TokenEditModal, lib/tokenForm.ts)  # "2,5D frente"
├── components/story/storyScene.ts                           # REMOVIDO (three)
├── components/story/raycastRenderer.ts                      # NOVO — ImageData de baixa resolução
├── components/story/StoryView.tsx                           # usa o renderer
├── components/ui/icons.tsx                                  # saem Bricks/Brush/Eraser/CloudSun/Box
└── i18n/locales/pt-BR.json, styles/app.css
```

**Structure Decision**: aplicação web existente; nenhum projeto ou diretório novo. O núcleo do raycaster fica em
`lib/` (puro, testável); o que toca canvas/DOM fica em `components/story/`.

## Complexity Tracking

> Sem violações do Constitution Check — nada a justificar.
