# Implementation Plan: Mapa de história 2,5D

**Branch**: `033-story-map-2-5d` | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/033-story-map-2-5d/spec.md`

## Summary

O modelo de mapa ganha um **tipo** (`Battle` 2D, como hoje, ou `Story` 2,5D), uma lista de **paredes** (células
da mesma grade hexagonal, Q1) e uma imagem opcional de **céu/horizonte** (Q4) — três colunas em `map_models`, sem
endpoint novo: tudo viaja no `MapModelInsertInfo`/`MapModelInfo` e no fluxo rascunho/salvo do editor. Em mapas
`Story`, paredes bloqueiam peças como um hex ocupado para todos (Q5); a regra entra uma vez no `Occupancy`
espelhado (031) e assim cobre colocar, mover, girar, NPCs, reset e processamento de turno.

No frontend, o mapa `Story` continua sendo o mapa 2D normal (mais a camada e o modo de edição de paredes) e ganha
um botão 2D/3D. A vista 3D (`StoryView`, chunk separado) usa **`three`** — única dependência nova (research D5) —
com o chão = imagem do mapa, paredes = prismas hexagonais instanciados, céu = cilindro, peças = sprites com a
imagem do token, e uma câmera em terceira pessoa presa ao personagem escolhido, solta ao navegar, com colisão e
zoom por FOV (Q2/Q3). As regras de câmera e paredes ficam em módulos puros testáveis (`lib/storyCamera.ts`,
`lib/storyWalls.ts`). A vista só lê os contexts existentes, então o tempo real (017) vale sem mudanças.

## Technical Context

**Language/Version**: C# 12 / .NET 8.0 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8 Web API, EF Core 9 + Npgsql (coluna `jsonb` via conversão para texto JSON, como `turns.changes`), SignalR (017), `ModelContextProtocol.AspNetCore` 2.x (020) · React 18, Vite 6, Bootstrap 5.3 (dark), i18next, sonner, Radix Dropdown/Dialog · **novo: `three` (+ `@types/three` dev)**, carregado só pela vista 3D via `React.lazy`
**Storage**: PostgreSQL — `map_models.kind integer not null default 1`, `map_models.walls jsonb null`, `map_models.sky_image varchar(260) null`; imagem do céu no bucket existente via `POST /api/image`
**Testing**: xUnit + Moq + FluentAssertions (`Roll6.Tests`: modelo, `Occupancy`, serviços de peça/NPC/turno, MCP); Vitest `environment: 'node'` em `src/**/*.test.ts` — sem WebGL nem testes de componente, por isso a lógica 3D testável fica em `lib/`
**Target Platform**: navegadores desktop e celular com WebGL 1/2; servidores Linux em contêiner (homolog/prod). Docker não roda na máquina de dev
**Project Type**: aplicação web (`backend/` Clean Architecture + `Roll6.Mcp` + `Roll6.Tests`; `frontend/` SPA)
**Performance Goals**: SC-003 — ≥ 30 fps com 60×40 células e 50 peças em computador comum (1 draw call de paredes por `InstancedMesh`, sprites com textura compartilhada por token); SC-002 — troca 2D↔3D < 2 s (chunk em cache após a primeira carga, texturas cacheadas por URL); SC-004 — figura atualizada em ≤ 2 s (mesmo caminho dos eventos `mapToken.*`)
**Constraints**: hexágonos flat-top odd-q e matemática só no módulo puro (Princípio VII) — o 3D usa `hexCenter`/`pixelToHex`/`footprintLocal` de `lib/hexGrid.ts`; WebGL exige imagens com CORS e o bucket não envia cabeçalhos → texturas via `GET /api/image/file/{fileName}` (`lib/mapSnapshot.loadImage`); `McpCoverageTests` fixo em 86/87 → nenhum endpoint novo; parâmetros MCP novos com default; bundle principal não pode crescer com o `three`
**Scale/Scope**: 3 colunas · 1 enum · 1 migration + 1 SQL incremental · 0 endpoints · 3 campos em 2 DTOs (+ `skyImageUrl`) · `Occupancy` C#/TS com paredes · ~6 serviços tocados por consequência · 1 componente 3D novo + `WallLayer` + controles · 3 módulos puros novos · ~16 chaves i18n · 2 ferramentas MCP com parâmetros novos + guide

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura** | `dotnet-architecture` / `react-architecture` para entidades novas | **PASS** | Nenhuma entidade, repositório, service, context ou provider novo: campos novos em `MapModel` (via skill `dotnet-architecture` para DTO + Domain + Context + migration) e campos novos no `MapEditorContext`/rascunho existentes. A vista 3D é um componente, não uma entidade. Respostas seguem DTO + `ProblemDetails` (constituição v3), não o envelope da skill React. |
| **II. Stack Tecnológica Fixa** | Sem libs fora da stack sem justificativa; Vite; Context API; Fetch; sem Docker local | **PASS (com justificativa)** | Adiciona `three`, uma biblioteca de renderização que não concorre com nenhum item da tabela (não é UI kit, estado, HTTP nem bundler) — registrada em *Complexity Tracking*. Estado continua em Context API; nenhum serviço HTTP novo (`imageService.upload`/`fetchStored` e `mapModelService` reutilizados); nenhuma variável de ambiente nova. |
| **III. Case Sensitivity** | `Contexts/`, `Services/`, `hooks/`, `types/` | **PASS** | Arquivos novos em `components/story/`, `components/map/WallLayer.tsx`, `lib/` e `hooks/useStoryCamera.ts` (minúsculo). Nenhum diretório novo com casing especial. |
| **IV. Convenções de Código** | PascalCase/camelCase; `[JsonPropertyName]`; `interface`; arrow functions; sem `enum` TS | **PASS** | `MapKind`, `UpdateStory`, `ActiveWalls`, `IsWall`, `FitResult.Wall` em PascalCase; `kind`/`walls`/`skyImage`/`skyImageUrl` com `[JsonPropertyName]`. TS: `MAP_KIND` constante (`erasableSyntaxOnly`), `interface` para props e poses de câmera. Erros por `DomainValidationException`/`ConflictException` → `HandleException`. |
| **V. Banco PostgreSQL** | snake_case; varchar com tamanho; enum como integer com default; sem Cascade | **PASS** | `kind integer not null default 1` (+ `HasSentinel`), `walls jsonb null` (precedente `turns.changes`), `sky_image varchar(260) null`. Nenhuma FK nova. Linhas existentes viram `Battle` pelo default, sem backfill. |
| **VI. Autenticação e Segurança** | `[Authorize]`; token em localStorage | **PASS** | Nenhum endpoint novo; `MapModelController` e `GET /api/image/file/{fileName}` já `[Authorize]`; escrita de paredes/céu continua só do dono (`GetOwnedAsync`). `roll6:view-mode` guarda só preferência de vista. |
| **VII. Grid Hexagonal** | flat-top odd-q; x/y persistidos; módulo puro espelhado | **PASS** | Paredes persistidas como `[x, y]` odd-q; nenhuma outra coordenada gravada. Bloqueio implementado em `Occupancy.cs` ↔ `lib/occupancy.ts` com os mesmos casos de referência nos dois testes. A cena 3D só converte por `hexCenter`/`pixelToHex` (cube rounding) — nenhuma fórmula ad hoc; o mapeamento px→unidade 3D é a identidade. |

**Resultado do gate**: uma adição de dependência justificada; nenhuma violação. Fase 0 liberada.

**Reavaliação pós-Fase 1**: `data-model.md` e `contracts/` não criaram endpoint, tabela, FK ou provider. A única
mudança de forma no `Occupancy` (novo `FitResult.Wall`) é espelhada no TS. `McpCoverageTests` (86/87) e
`McpRouteParityTests` continuam válidos. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/033-story-map-2-5d/
├── plan.md              # este arquivo
├── research.md          # D1..D10
├── data-model.md        # MapModel + Occupancy + rascunho + módulos puros + migração
├── quickstart.md        # como rodar e verificar
├── contracts/
│   ├── map-model-api.md # MapModelInsertInfo/Info e efeito nas escritas de posição
│   ├── mcp-tools.md     # create/update_map_model + guide
│   └── ui-contracts.md  # controles, WallLayer, StoryView, i18n
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/
│   ├── Enums/MapKind.cs                        # NOVO
│   ├── Models/MapModel.cs                      # + Kind, Walls, SkyImage; UpdateStory; ActiveWalls
│   ├── Grid/Occupancy.cs                       # + walls; IsWall; FitResult.Wall
│   ├── Services/MapModelService.cs             # ApplyChanges + UpdateStory; MapToDto + campos/skyImageUrl
│   ├── Services/MapOccupancyLoader.cs          # MapLayout.Walls; MovementCost respeita parede com ignorePieces; EnsureFits 409
│   └── Services/TurnService.Processing.cs      # Occupancy com paredes; erro por item
├── Roll6.DTO/MapModel/MapModelInsertInfo.cs, MapModelInfo.cs   # + kind, walls, skyImage (+ skyImageUrl)
├── Roll6.Infra/Context/Roll6Context.cs        # 3 propriedades (jsonb com converter/comparer)
├── Roll6.Infra/Migrations/<ts>_AddStoryMap.cs  # gerado
├── Roll6.Mcp/Tools/MapModelTools.cs           # kind/walls/skyImage; erros de parede nas tools de posição
├── Roll6.Mcp/Roll6Guide.cs                    # seção "Story maps (2.5D)"
└── Roll6.Tests/
    ├── Domain/Models/MapModelTests.cs          # UpdateStory: normaliza, poda, mantém ao voltar a Battle, 400s
    ├── Domain/Grid/OccupancyTests.cs           # casos de referência de parede (espelho TS)
    ├── Domain/Services/MapTokenServiceTests.cs # place/move/master/reset com parede; Battle ignora
    ├── Domain/Services/MapNpcServiceTests.cs   # hex livre pula parede
    ├── Domain/Services/TurnServiceTests.cs     # process_turn com parede
    └── Domain/Services/MapModelServiceTests.cs # PUT substitui/omite campos novos

database/migrations/033-story-map.sql           # NOVO, idempotente
database/roll6.sql                              # regenerado

frontend/src/
├── types/mapModel.ts                           # + kind, walls, skyImage, skyImageUrl; MAP_KIND
├── lib/draft.ts (+ test)                       # campos novos, isDirty, trimWalls ao mudar grade, draftToInsert
├── lib/occupancy.ts (+ test)                   # walls, isWall, fits 'wall'
├── lib/mapTokens.ts (+ test)                   # drops tratam 'wall' como blocked
├── lib/storyWalls.ts (+ test)                  # NOVO
├── lib/storyCamera.ts (+ test)                 # NOVO
├── lib/viewMode.ts (+ test)                    # NOVO (roll6:view-mode)
├── hooks/useTokenMovement.ts                   # passa paredes ao occupancy/movementField
├── hooks/useStoryCamera.ts                     # NOVO — teclado/ponteiro/pinça/joystick → storyCamera
├── Contexts/MapEditorContext.tsx               # setKind / paintWalls / setSkyImage; viewMode; limpa no logout
├── components/map/WallLayer.tsx                # NOVO
├── components/map/MapCanvas.tsx                # modo Paredes (pintar/apagar por arrasto), desliga HexMenu
├── components/map/MapControls.tsx              # Tipo, Paredes, Céu, 2D/3D; zoom → FOV no 3D
├── components/story/StoryView.tsx              # NOVO (lazy) — cena three
├── components/story/storyScene.ts              # NOVO — monta/atualiza chão, paredes, céu, sprites; dispose
├── components/story/VirtualJoystick.tsx        # NOVO — toque
├── components/ui/icons.tsx                     # ícones novos
├── pages/MainPage.tsx                          # StoryView no lugar do MapCanvas
└── i18n/locales/pt-BR.json                     # chaves story.*
```

**Structure Decision**: aplicação web existente (`backend/` + `frontend/`), sem projeto novo. Backend: só campos
novos em entidade existente e a regra de parede no `Occupancy`. Frontend: a única pasta nova é
`components/story/` (o código que importa `three`, isolado num chunk); toda regra testável fica em `lib/`.
Nenhum provider novo — a vista 3D lê `MapEditorContext`, `MapTokenContext` e `CharacterContext`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Dependência nova `three` (fora da tabela do Princípio II) | Renderizar paredes hexagonais em perspectiva com oclusão correta dos sprites, chão texturizado e céu, a ≥ 30 fps (FR-009, FR-012, SC-003) | Raycaster próprio em canvas 2D: interseção raio×hexágono, floor casting e oclusão por coluna seriam muito código novo e lento; `react-three-fiber` adicionaria mais 2 dependências sem ganho. `three` é isolado em chunk lazy e não afeta mapas 2D. |
