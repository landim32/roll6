---
description: "Task list for 033-story-map-2-5d"
---

# Tasks: Mapa de história 2,5D

**Input**: Design documents from `/specs/033-story-map-2-5d/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: incluídos. O Princípio VII exige que o `Occupancy` C# e o `lib/occupancy.ts` tenham os mesmos casos de
referência, e o plano e o quickstart pedem testes para o modelo, para os serviços de posição e para os módulos
puros novos (`storyWalls`, `storyCamera`, `viewMode`). O Vitest roda com `environment: 'node'` (sem WebGL e sem
testes de componente), então só a lógica em `lib/` é testada automaticamente.

**Organization**: tarefas agrupadas por história de usuário (spec.md: US1–US3 P1, US4 P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefas incompletas)
- **[Story]**: US1–US4 conforme spec.md
- Caminhos relativos à raiz do repositório (`backend/`, `frontend/src/`, `database/`)

---

## Phase 1: Setup

**Purpose**: dependência nova e ícones

- [X] T001 Instalar `three` em dependencies e `@types/three` em devDependencies (`cd frontend && npm install three && npm install -D @types/three`), atualizando `frontend/package.json` e `frontend/package-lock.json`
- [X] T002 [P] Adicionar os ícones Bootstrap `Bricks`, `BrushFill`, `Eraser`, `CloudSun`, `Badge3d`, `Map`, `PersonBoundingBox` e `Box` em `frontend/src/components/ui/icons.tsx`, como componentes SVG com `currentColor` e prop `size`, copiando o path do SVG oficial de mesmo nome

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: campos `kind`/`walls`/`skyImage` do modelo de mapa ponta a ponta (banco → DTO → tipos TS → rascunho). Todas as histórias dependem deles.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase. Use a skill `dotnet-architecture` nos passos de backend (Princípio I).

- [X] T003 [P] Criar `backend/Roll6.Domain/Enums/MapKind.cs` com `public enum MapKind { Battle = 1, Story = 2 }` (namespace file-scoped `Roll6.Domain.Enums`)
- [X] T004 [P] Em `backend/Roll6.DTO/MapModel/MapModelInsertInfo.cs`, adicionar `int? Kind` (`[JsonPropertyName("kind")]`), `List<int[]>? Walls` (`"walls"`) e `string? SkyImage` (`"skyImage"`)
- [X] T005 [P] Em `backend/Roll6.DTO/MapModel/MapModelInfo.cs`, adicionar `int Kind` (`"kind"`), `List<int[]> Walls` (`"walls"`, nunca null: `[]` sem paredes), `string? SkyImage` (`"skyImage"`) e `string? SkyImageUrl` (`"skyImageUrl"`)
- [X] T006 Em `backend/Roll6.Domain/Models/MapModel.cs`, adicionar `MapKind Kind = MapKind.Battle`, `List<(int X, int Y)>? Walls` e `string? SkyImage`, mais o método `UpdateStory(int? kind, IEnumerable<int[]>? walls, string? skyImage)`, que deve:
  - tratar `kind` null como `Battle` e responder 400 `kind` para valor fora de {1, 2};
  - responder 400 `walls` para item sem exatamente 2 inteiros;
  - descartar células fora da grade (`HexGrid.IsInsideGrid` com `GridWidth`/`GridHeight`), remover duplicatas e ordenar por (y, x), deixando `Walls = null` quando vazio;
  - aplicar `SkyImage = Guard.ImageFileName(skyImage, "skyImage")`;
  - manter paredes e céu ao voltar a `Battle`;
  - atualizar `ChangedAt`.

  Adicionar também `ActiveWalls()`, que devolve `Kind == Story ? Walls ?? [] : []` (data-model.md)
- [X] T007 Em `backend/Roll6.Infra/Context/Roll6Context.cs` (bloco `MapModel`), configurar:
  - `Kind` → `kind`, com `HasConversion<int>()`, `HasDefaultValue(MapKind.Battle)` e `HasSentinel(0)`;
  - `Walls` → `walls` `jsonb`, com `ValueConverter` texto JSON `[[x,y],…]` ↔ lista e `ValueComparer` por conteúdo, no mesmo padrão de `turns.changes`;
  - `SkyImage` → `sky_image`, com `HasMaxLength(260)`.
- [X] T008 Em `backend/Roll6.Domain/Services/MapModelService.cs`, chamar `mapModel.UpdateStory(info.Kind, info.Walls, info.SkyImage)` em `ApplyChanges` depois de `UpdateGrid`, e preencher `Kind`, `Walls` (`[[x, y]]`), `SkyImage` e `SkyImageUrl = _imageStorage.GetUrl(mapModel.SkyImage)` em `MapToDto`
- [X] T009 Gerar a migração com `cd backend && dotnet ef migrations add AddStoryMap --project Roll6.Infra --startup-project Roll6.API` e conferir em `backend/Roll6.Infra/Migrations/*_AddStoryMap.cs` que ela cria:
  - `kind` `integer`, não nulo, com default 1;
  - `walls` `jsonb`, nulo;
  - `sky_image` `character varying(260)`, nulo.

  Não deve haver backfill.
- [X] T010 [P] Criar `database/migrations/033-story-map.sql` idempotente (`ALTER TABLE map_models ADD COLUMN IF NOT EXISTS …` + insert em `"__EFMigrationsHistory"` guardado, mesmo padrão de `database/migrations/032-campaign-sheet.sql`) e regenerar `database/roll6.sql` com `dotnet ef migrations script --idempotent --project Roll6.Infra --startup-project Roll6.API -o ../database/roll6.sql`, preservando o cabeçalho
- [X] T011 [P] Testes de domínio em `backend/Roll6.Tests/Domain/Models/MapModelStoryTests.cs` (arquivo novo ao lado do `MapModelLayoutTests.cs` existente), cobrindo `UpdateStory`:
  - null → `Battle`;
  - 3 → 400 `kind`;
  - par com 3 números → 400 `walls`;
  - duplicatas e fora da grade descartados e resultado ordenado;
  - lista vazia → `Walls` null;
  - voltar a `Battle` mantém as paredes;
  - `ActiveWalls()` vazio em `Battle`;
  - `skyImage` inválido → 400 `skyImage`.
- [X] T012 [P] Testes de serviço em `backend/Roll6.Tests/Domain/Services/MapModelServiceTests.cs`: o PUT substitui os campos novos (omitidos → `Battle`, sem paredes e sem céu), `MapToDto` devolve `walls: []` e `skyImageUrl` vindo de `GetUrl`
- [X] T013 [P] Em `frontend/src/types/mapModel.ts`, adicionar `export const MAP_KIND = { battle: 1, story: 2 } as const`, os campos `kind: number`, `walls: number[][]`, `skyImage: string | null` e `skyImageUrl: string | null` em `MapModelInfo`, e `kind`, `walls`, `skyImage` em `MapModelInsertInfo`
- [X] T014 [P] Criar `frontend/src/lib/storyWalls.ts` (arrow functions, sem `enum`) com:
  - `wallKey(x, y)` e `toWallSet(walls)`;
  - `paintWalls(walls, hexes, mode: 'paint' | 'erase')`, que devolve uma lista nova ordenada por (y, x), sem duplicatas e só com hexágonos dentro da grade recebida;
  - `trimWalls(walls, columns, rows)` e `sameWalls(a, b)`;
  - `toWallPairs` / `fromWallPairs` (`Offset[]` ↔ `number[][]`);
  - `wallsPath(walls, size)`, um único `d` SVG que reutiliza `hexCorners`/`hexCenter` de `lib/hexGrid.ts`.
- [X] T015 [P] Testes em `frontend/src/lib/storyWalls.test.ts`: pintar/apagar idempotentes, ordem estável, `trimWalls` ao reduzir a grade, `sameWalls` ignora ordem, ida e volta de `toWallPairs`/`fromWallPairs` e `wallsPath` vazio para lista vazia
- [X] T016 Em `frontend/src/lib/draft.ts`, adicionar em `MapDraft` os campos `kind`, `walls: Offset[]`, `skyImage` e `skyImageUrl`, e ajustar:
  - `createEmptyDraft`: `kind: 1`, `walls: []`, `skyImage`/`skyImageUrl` `null`;
  - `draftFromMapModel`: preencher com `fromWallPairs`;
  - `isDirty`: comparar `kind`, `walls` (com `sameWalls`) e `skyImage`, mas não `skyImageUrl`;
  - o conversor para `MapModelInsertInfo`: enviar `kind`, `walls: toWallPairs(...)` e `skyImage`;
  - ao mudar `gridWidth`/`gridHeight`: aparar `walls` com `trimWalls`.
- [X] T017 [P] Atualizar `frontend/src/lib/draft.test.ts`: o rascunho vazio é 2D sem paredes, mudar `kind`/paredes/céu deixa o rascunho sujo, `skyImageUrl` sozinho não suja, o insert leva os pares e reduzir a grade apara as paredes

**Checkpoint**: um mapa salva e relê `kind`/`walls`/`skyImage` pela API, os mapas existentes leem `kind = 1` e `dotnet test` + `npm test` passam.

---

## Phase 3: User Story 1 — Criar um mapa de história 2,5D (Priority: P1) 🎯 MVP

**Goal**: o mestre escolhe o tipo "Mapa de história (2,5D)", pinta e apaga paredes sobre a imagem, salva e reabre igual; as paredes bloqueiam peças no 2D para todos.

**Independent Test**: criar um mapa de história, pintar paredes, salvar, recarregar e ver as mesmas células; tentar colocar ou mover uma peça para uma parede e ser recusado; um mapa 2D antigo continua igual (quickstart passos 1–3 e 10).

### Testes da US1

- [X] T018 [P] [US1] Casos de referência de parede em `backend/Roll6.Tests/Domain/Grid/OccupancyTests.cs`:
  - peça de 1 hex sobre parede → `FitResult.Wall`;
  - peça de 7 hexes com um vizinho parede → `Wall`;
  - fora da grade vence parede, e parede vence peça;
  - `IsBlocked(x, y, except)` com `except` não libera parede;
  - `PieceAt` ignora parede;
  - `HexGrid.MovementCost` contornando uma parede custa o valor esperado.
- [X] T019 [P] [US1] Os mesmos casos de T018, com os mesmos números, em `frontend/src/lib/occupancy.test.ts`
- [X] T020 [P] [US1] Testes em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`, num mapa `Story` com parede:
  - `POST` objeto/personagem na parede → `ConflictException` "Há uma parede nessa posição.";
  - mover um jogador por caminho que contorna funciona;
  - destino na parede → 409, também para o mestre;
  - o mestre "pulando" peças não atravessa parede;
  - peça já sob parede sai com `MoveAsync`;
  - `PUT …/posture` nunca é recusado;
  - o mesmo mapa com `kind = Battle` e as mesmas paredes aceita tudo.
- [X] T021 [P] [US1] Testes em `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs` (`POST /api/mapnpc` em x/y de parede → 409; nota: o `POST /api/mapnpc` sempre recebe x/y, não existe busca de hex livre) e em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs` (reset não devolve a peça a um hex que virou parede; `ProcessAsync` com alvo em parede → `DomainValidationException` com chave `characters[0].x` / `npcs[0].x`)
- [X] T022 [P] [US1] Atualizar `frontend/src/lib/mapTokens.test.ts`: `characterDropAction` e `npcDropAction` devolvem `blocked` quando o hex (ou qualquer hex da forma) é parede

### Implementação da US1 — backend

- [X] T023 [US1] Em `backend/Roll6.Domain/Grid/Occupancy.cs`, fazer as mudanças abaixo, atualizando o comentário da classe:
  - `Build(IEnumerable<PieceShape> pieces, IEnumerable<(int X, int Y)>? walls = null)`, guardando as paredes num `HashSet<(int, int)>`;
  - `IsWall(x, y)` novo;
  - `IsBlocked` devolve `IsWall(x, y) || peça ≠ except`;
  - `FitResult.Wall` novo entre `OutsideGrid` e `Occupied`, com `Fits` seguindo essa ordem.
- [X] T024 [US1] Em `backend/Roll6.Domain/Services/MapOccupancyLoader.cs`, fazer as mudanças abaixo, atualizando os comentários:
  - `LoadAsync` passa `model?.ActiveWalls()` ao `Occupancy.Build`;
  - `MapLayout.MovementCost(..., ignorePieces: true)` usa o predicado `Occupancy.IsWall(hx, hy)` em vez de `(_, _) => false`;
  - `EnsureFits` traduz `FitResult.Wall` em `ConflictException("Há uma parede nessa posição.")`.
- [X] T025 [US1] Em `backend/Roll6.Domain/Services/TurnService.Processing.cs`:
  - passar `model?.ActiveWalls()` ao `Occupancy.Build` dos alvos;
  - informar parede no alvo com `Error(change.Key, "Há uma parede nessa posição.")` antes da checagem de ocupação, mantendo a ordem fora da grade → parede → ocupado;
  - no cálculo do `cost` gravado no `Turn.Movement`, usar `(hx, hy) => walls.Contains((hx, hy))` em vez de `(_, _) => false`, com fallback para `null` quando não houver caminho.
- [X] T026 [US1] Conferir que o reset de turno em `backend/Roll6.Domain/Services/TurnService.cs` e a busca de hex livre em `backend/Roll6.Domain/Services/MapNpcService.cs` usam o `MapLayout` (que já traz as paredes); onde um deles decidir "hex livre" sem `EnsureFits`/`Occupancy.Fits`, trocar pela checagem do layout para que parede conte como ocupado

### Implementação da US1 — MCP

- [X] T027 [P] [US1] Em `backend/Roll6.Mcp/Tools/MapModelTools.cs`, acrescentar ao fim de `create_map_model` e `update_map_model` os parâmetros `int? kind = null`, `int[][]? walls = null` e `string? skyImage = null`, com as descrições de `contracts/mcp-tools.md`, e repassá-los no `MapModelInsertInfo` (`Walls = walls?.ToList()`). Também:
  - na descrição de `update_map_model`, avisar que omitir `walls` apaga as paredes;
  - nos `Returns` de `get_map_model`/`list_map_models`, citar `kind`, `walls`, `skyImage` e `skyImageUrl`.
- [X] T028 [P] [US1] Nas descrições das ferramentas que chamam `POST /api/maptoken`, `POST /api/maptoken/character`, `PUT /api/maptoken/{id}/position`, `POST /api/mapnpc`, `POST /api/turn/reset` e `POST /api/campaign/{id}/turn/process` (arquivos em `backend/Roll6.Mcp/Tools/`), acrescentar em *Common errors* "409 a wall is on that hex (story maps)" (em `process_turn`: "400 … a wall is on that hex")
- [X] T029 [P] [US1] Em `backend/Roll6.Mcp/Roll6Guide.cs`, adicionar a seção "Story maps (2.5D)" conforme `contracts/mcp-tools.md` (tipos, paredes na mesma grade hexagonal bloqueando como hex ocupado para todos e só com `kind = 2`, céu, vista 3D só no app web)
- [X] T030 [US1] Rodar `cd backend && dotnet test --filter "FullyQualifiedName~Mcp"` e confirmar que `McpCoverageTests` (86/87), `McpRouteParityTests` e `McpDescriptionTests` passam sem mudar contagens

### Implementação da US1 — frontend

- [X] T031 [US1] Em `frontend/src/lib/occupancy.ts`:
  - `buildOccupancy(pieces, walls?: Offset[])`;
  - `isWall` novo;
  - `isBlocked` considera parede independentemente de `except`;
  - `fits` devolve `'wall'` entre `'outside'` e `'occupied'` (espelho exato de T023).
- [X] T032 [US1] Em `frontend/src/lib/mapTokens.ts`, aceitar `walls` em `tokenAt`/`characterDropAction`/`npcDropAction` (repassando a `buildOccupancy`) e tratar `'wall'` como `blocked`; em `frontend/src/hooks/useTokenMovement.ts`, construir o occupancy com as paredes ativas do rascunho (`draft.kind === MAP_KIND.story ? draft.walls : []`) e passá-las ao predicado `blocked` de `movementField`. Atualizar quem chama essas funções (ex.: `frontend/src/components/map/MapCanvas.tsx`, `HexHighlight.tsx`) para passar as paredes ativas
- [X] T033 [US1] Em `frontend/src/Contexts/MapEditorContext.tsx`, expor `setKind(kind)`, `paintWalls(hexes, mode)` (usa `lib/storyWalls.paintWalls` com a grade do rascunho), `setSkyImage(fileName | null, url | null)`, `wallMode: null | 'paint' | 'erase'` e `setWallMode`; sair de `wallMode` ao trocar de mapa ou ao mudar `kind` para 2D
- [X] T034 [P] [US1] Criar `frontend/src/components/map/WallLayer.tsx`, que desenha um único `<path d={wallsPath(walls, HEX_SIZE)}>` com preenchimento escuro semitransparente e contorno claro (classes em CSS existente do mapa, tema escuro) e só renderiza quando `kind === MAP_KIND.story`
- [X] T035 [US1] Em `frontend/src/components/map/MapCanvas.tsx`:
  - inserir `<WallLayer>` depois da grade e antes do `HexHighlight`;
  - quando `wallMode` estiver ativo, fazer pointerdown/pointermove com botão pressionado converterem o ponto por `useMapPointer.toMapPoint` + `pixelToHex` e chamarem `paintWalls([hex], wallMode)` para cada hex novo dentro da grade (sem repetir o mesmo hex no arrasto);
  - com `wallMode` ativo, não abrir o `HexMenu` e não iniciar pan com o botão esquerdo.
- [X] T036 [US1] Em `frontend/src/components/map/MapControls.tsx`, para quem pode salvar o mapa e só na vista 2D, adicionar:
  - um seletor "Tipo de mapa" (Radix Dropdown com classes Bootstrap `dropdown-*`, ícone `Box`) com `story.kindBattle`/`story.kindStory` → `setKind`;
  - quando `kind === story`, o botão "Paredes" (`Bricks`, alterna `wallMode`) com Pintar (`BrushFill`) e Apagar (`Eraser`), todos com `title` + `aria-label`.
- [X] T037 [US1] Ao receber 409 "Há uma parede nessa posição." em colocar ou mover peça, mostrar o toast com a mensagem do `ProblemDetails` (já feito por `handleApiResponse`; conferir em `frontend/src/Contexts/MapTokenContext.tsx` e `frontend/src/Contexts/NpcContext.tsx` que o erro não é engolido)
- [X] T038 [P] [US1] Adicionar as chaves `story.kind`, `story.kindBattle`, `story.kindStory`, `story.walls`, `story.paint`, `story.erase` e `story.wallBlocked` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: a US1 funciona sozinha — os mapas de história são criados, editados, salvos e bloqueiam peças no 2D; os mapas 2D não mudam.

---

## Phase 4: User Story 2 — Ver o mapa em 3D e navegar livremente (Priority: P1)

**Goal**: num mapa `Story`, o botão 2D/3D troca o `MapCanvas` por uma cena 3D em tela de fundo com chão, paredes, câmera em terceira pessoa presa ao personagem escolhido, navegação livre com colisão e zoom por FOV.

**Independent Test**: abrir um mapa de história com paredes, "Ver em 3D":
- como jogador, a câmera aparece atrás da própria peça;
- andar, girar e dar zoom funcionam, e a câmera não atravessa paredes;
- "Voltar ao personagem" prende a câmera de novo;
- trocar o "Personagem atual" leva a câmera ao novo personagem;
- como GM, a câmera começa solta no centro do mapa;
- "Ver em 2D" volta ao mesmo estado.

### Testes da US2

- [X] T039 [P] [US2] Testes em `frontend/src/lib/storyCamera.test.ts`:
  - `lookToYaw` 0..5 em passos de 60° a partir do norte (−Z);
  - `followPose` fica a `FOLLOW_DISTANCE` atrás da peça e a `EYE_HEIGHT` de altura;
  - `followPose` aproxima a câmera quando há parede entre ela e a peça (`segmentHitsWall`);
  - `stepCamera` anda, gira, desliza ao longo de parede (movimento por eixo), recusa entrar em parede e recusa sair da grade;
  - `clampFov` limita entre 30° e 90°;
  - `initialCamera` prende a câmera à peça do personagem escolhido, ou a deixa solta no centro olhando para o norte para o GM / sem peça.

### Implementação da US2

- [X] T040 [P] [US2] Criar `frontend/src/lib/storyCamera.ts`, puro e sem importar `three`, com:
  - as constantes `FOLLOW_DISTANCE = 4 * HEX_SIZE`, `EYE_HEIGHT = 1.6 * HEX_SIZE`, `CAMERA_RADIUS = HEX_SIZE / 3`, `FOV_MIN = 30`, `FOV_MAX = 90`, `FOV_DEFAULT = 70` e `PITCH_LIMIT = 35`;
  - `interface CameraPose { x; z; height; yaw; pitch; attached: boolean }`;
  - as funções `lookToYaw`, `segmentHitsWall`, `followPose`, `stepCamera(pose, input, walls, columns, rows)`, `clampFov` e `initialCamera`, todas usando `pixelToHex`/`hexCenter`/`isInsideGrid` de `lib/hexGrid.ts`, com qualquer deslocamento soltando a câmera (`attached = false`) — research D7.
- [X] T041 [P] [US2] Criar `frontend/src/components/story/storyScene.ts` (importa `three`), com uma classe/fábrica `createStoryScene(canvas)` que oferece:
  - `setGround(imageElement | null, layout)`: plano com a imagem em (−imageLeft, −imageTop) e tamanho `imageWidth × imageHeight` (as mesmas regras do `ImageLayer`), sobre um plano de cor padrão do tamanho `gridPixelSize`;
  - `setWalls(walls)`: um `InstancedMesh` de prisma hexagonal flat-top de raio `HEX_SIZE` e altura `3 * HEX_SIZE` em `hexCenter`, recriado só quando as paredes mudam;
  - `setCamera(pose, fov)` e `resize(w, h)`;
  - um loop `requestAnimationFrame` que desenha só quando algo mudou;
  - `dispose()`, que libera geometrias, materiais, texturas e o renderer.

  Usar 1 unidade = 1 px, X = x e Z = y do mapa (research D6). Se o WebGL falhar, lançar um erro identificável.
- [X] T042 [US2] Criar `frontend/src/hooks/useStoryCamera.ts`, que transforma teclado, mouse e toque em entradas para `stepCamera`:
  - teclado (com o canvas focado): W/S ou ↑/↓ andar, A/D passo lateral, Q/E ou ←/→ girar;
  - mouse: arrastar gira (yaw/pitch), roda muda o FOV;
  - toque: pinça muda o FOV.

  O estado de pose e de FOV fica num `useRef` com re-render controlado. O hook expõe `pose`, `fov`, `setFov`, `attachTo(pieceId)` e `isAttached`, e reaplica `followPose` quando a peça seguida muda de posição ou de look enquanto `attached`
- [X] T043 [P] [US2] Criar `frontend/src/components/story/VirtualJoystick.tsx`, um joystick de toque no canto inferior esquerdo, visível só em telas < 768 px ou com `pointer: coarse`, que emite um vetor de deslocamento para `useStoryCamera`
- [X] T044 [US2] Criar `frontend/src/components/story/StoryView.tsx` (default export, para `React.lazy`), que:
  - monta o canvas que ocupa o slot do mapa, cria `storyScene` num `useEffect` e chama `dispose` no unmount;
  - lê `draft` do `MapEditorContext` e passa ao chão a imagem carregada por `lib/mapSnapshot.loadImage(draft.imageUrl)`, além das paredes ativas;
  - define a peça seguida: a peça do personagem escolhido no `CharacterContext` (`MapTokenInfo` com o `campaignCharacterId` da participação), ou `null` para o GM;
  - leva a câmera à peça do novo personagem quando o "Personagem atual" muda e solta a câmera onde está se a peça sumir;
  - mostra o botão flutuante "Voltar ao personagem" (`PersonBoundingBox`) quando a câmera está solta e existe peça;
  - mostra `story.loading` enquanto carrega e, quando o WebGL falha, chama `onUnsupported()`.
- [X] T045 [US2] Em `frontend/src/Contexts/MapEditorContext.tsx`, adicionar o estado `viewMode: '2d' | '3d'` (em memória nesta história) e `setViewMode`; forçar `'2d'` quando o mapa aberto não é `Story` (ex.: seguir o mapa atual do mestre) e sair de `wallMode` ao entrar em 3D
- [X] T046 [US2] Em `frontend/src/pages/MainPage.tsx`:
  - carregar `StoryView` com `React.lazy(() => import('../components/story/StoryView'))`;
  - quando `draft.kind === MAP_KIND.story && viewMode === '3d'`, renderizar `<Suspense>` com `StoryView` no lugar de `<MapCanvas/>`, mantendo `TopMenu`, painéis, rodapé, console e `MapControls` por cima;
  - em `onUnsupported`, mostrar o toast `story.noWebgl` e voltar a `'2d'`.
- [X] T047 [US2] Em `frontend/src/components/map/MapControls.tsx`:
  - adicionar o botão 2D/3D (`Badge3d` / `Map`, `story.view3d` / `story.view2d`), visível para todos com acesso quando `kind === story`;
  - no 3D, os botões de zoom +/− chamam `setFov` (via callback exposto por `StoryView`/contexto) e os controles de imagem, redimensionamento, tipo e paredes ficam ocultos;
  - o Share continua igual.
- [X] T048 [P] [US2] Adicionar as chaves `story.view2d`, `story.view3d`, `story.followCharacter`, `story.noWebgl` e `story.loading` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: a vista 3D abre, navega e alterna, e as US1 e US2 funcionam juntas.

---

## Phase 5: User Story 3 — Ver personagens e NPCs em 2,5D (Priority: P1)

**Goal**: PJs, NPCs e objetos aparecem no 3D como figuras de pé com a imagem do token, ocultas atrás de paredes, refletindo postura, e se atualizam em tempo real.

**Independent Test**: com peças no mapa, abrir o 3D e conferir a posição de cada uma; mover uma peça em outra aba e ver a figura andar em ≤ 2 s; uma peça caída aparece deitada e uma fora de combate em preto e branco (quickstart passo 5).

### Testes da US3

- [X] T049 [P] [US3] Em `frontend/src/lib/pieceDrawing.test.ts`, cobrir a função nova `spriteSpec(piece, token)`:
  - em pé → imagem de pé, vertical, largura = diâmetro do `footprintLocal`;
  - caído → imagem deitada no chão;
  - fora de combate → deitada e `grayscale: true`;
  - objeto → em pé, sem postura;
  - cor do disco de base por tipo (personagem azul, NPC vermelho, objeto cinza).

### Implementação da US3

- [X] T050 [US3] Em `frontend/src/lib/pieceDrawing.ts`, adicionar `spriteSpec(piece, token)`, que devolve `{ imageUrl, standing: boolean, grayscale: boolean, width, baseColor, center }` reutilizando as regras de deitar/preto e branco e o `pieceGeometry` já existentes, com centro em `hexCenter` da posição
- [X] T051 [US3] Em `frontend/src/components/story/storyScene.ts`, adicionar `setPieces(specs)`, com reconciliação por `mapTokenId` para não recriar o que não mudou:
  - em pé: `THREE.Sprite` com a base no chão;
  - deitado: um plano horizontal no chão girado pelo look;
  - em todos os casos, um disco plano de base com `baseColor`;
  - texturas em cache por URL, carregadas por `lib/mapSnapshot.loadImage`;
  - preto e branco: converter os pixels num canvas como o `mapSnapshot` faz, sem depender de `ctx.filter`;
  - teste de profundidade ligado, para as paredes ocultarem as figuras.
- [X] T052 [US3] Em `frontend/src/components/story/StoryView.tsx`, ler as peças do `MapTokenContext` (que já aplica `mapToken.upserted`/`deleted`/`mapTokens.changed`) e os tokens necessários, montar os `spriteSpec` e chamar `setPieces` a cada mudança; a câmera presa continua seguindo a peça do personagem quando ela é movida por outra pessoa (T042)

**Checkpoint**: as US1–US3 funcionam juntas, e a vista 3D conta a história com as peças da mesa.

---

## Phase 6: User Story 4 — Alternar 2D/3D, chão e céu/horizonte (Priority: P2)

**Goal**: imagem de céu opcional atrás das paredes, chão alinhado e cores padrão para o que faltar; o modo 2D/3D é lembrado por mapa no dispositivo.

**Independent Test**: enviar, trocar e remover o céu e ver a cena mudar; recarregar com o mapa em 3D e ele reabrir em 3D; abrir um mapa 2D sem o botão 2D/3D (quickstart passos 6–7).

### Testes da US4

- [X] T053 [P] [US4] Testes em `frontend/src/lib/viewMode.test.ts`, com um stub de `localStorage` (inclusive um que lança exceção):
  - ausente → `'2d'`;
  - grava e lê por `mapModelId`;
  - JSON inválido → `'2d'`;
  - `clearViewModes` apaga;
  - exceções do storage nunca propagam.

### Implementação da US4

- [X] T054 [P] [US4] Criar `frontend/src/lib/viewMode.ts` com `VIEW_MODE_STORAGE_KEY = 'roll6:view-mode'`, `readViewMode(mapModelId)`, `writeViewMode(mapModelId, mode)` e `clearViewModes()`, tudo em try/catch
- [X] T055 [US4] Em `frontend/src/Contexts/MapEditorContext.tsx`:
  - inicializar `viewMode` com `readViewMode(draft.mapModelId)` ao abrir um mapa `Story`;
  - gravar com `writeViewMode` em `setViewMode`;
  - não apagar a preferência quando um mapa `Battle` força o 2D;
  - chamar `clearViewModes()` no logout, junto com a limpeza de `roll6:map` (em `frontend/src/Contexts/AuthContext.tsx`, onde as outras chaves `roll6:*` são apagadas).
- [X] T056 [US4] Em `frontend/src/components/map/MapControls.tsx`, para quem pode salvar o mapa, `kind === story` e vista 2D, adicionar o botão "Céu" (`CloudSun`) com as ações "Enviar imagem do céu" e "Remover céu":
  - enviar: abre o seletor de arquivo, faz o upload por `imageService.upload` (o mesmo `POST /api/image`, sem recorte) e chama `setSkyImage(fileName, url)`;
  - remover: chama `setSkyImage(null, null)`.
- [X] T057 [US4] Em `frontend/src/components/story/storyScene.ts`, adicionar `setSky(imageElement | null)`: um cilindro aberto grande centrado na grade, com a imagem repetida 2× na face interna e altura proporcional à imagem; sem imagem, usar a cor de fundo padrão do tema e névoa leve. Em `StoryView.tsx`, carregar `draft.skyImageUrl` por `loadImage` e reaplicar quando mudar (inclusive ao chegar `map.saved` com `keepView`)
- [X] T058 [US4] Em `frontend/src/components/story/StoryView.tsx`, garantir que a ausência da imagem do mapa ou do céu use as cores padrão sem erro e que uma imagem que falha ao carregar seja omitida (como no Share)
- [X] T059 [P] [US4] Adicionar as chaves `story.sky`, `story.skyUpload` e `story.skyRemove` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: todas as histórias funcionam de forma independente e em conjunto.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T060 [P] Atualizar `CLAUDE.md` com o resumo da feature 033 nas seções de backend e frontend (tipo de mapa, paredes no `Occupancy`, `StoryView`/`three` lazy, `roll6:view-mode`) e uma linha em "Recent Changes"
- [X] T061 [P] Atualizar o comentário de classe de `backend/Roll6.Domain/Grid/Occupancy.cs` e o cabeçalho de `frontend/src/lib/occupancy.ts` mencionando paredes (033), e o de `frontend/src/types/mapModel.ts`
- [X] T062 Rodar `cd backend && dotnet build Roll6.sln && dotnet test` e corrigir as falhas
- [X] T063 Rodar `cd frontend && npm run lint && npm test && npm run build` e confirmar na saída do build que o `three` está num chunk separado do bundle principal (o tamanho do chunk principal não cresce de forma relevante)
- [ ] T064 Executar o roteiro manual de `specs/033-story-map-2-5d/quickstart.md`, passos 1–10, incluindo celular (< 768 px), dispositivo sem WebGL e a regressão de mapas 2D; medir o desempenho do SC-003 (60×40 células, 50 peças) com o FPS das DevTools

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup e bloqueia todas as histórias.
- **US1 (Phase 3)**: depende da Fase 2.
- **US2 (Phase 4)**: depende da Fase 2; usa as paredes do rascunho (Fase 2), então dá para testar com paredes vindas da API mesmo sem a UI de pintura da US1. Recomenda-se fazer depois da US1.
- **US3 (Phase 5)**: depende da US2 (`storyScene`/`StoryView`).
- **US4 (Phase 6)**: o céu e a preferência dependem da US2 (`storyScene`, `viewMode`); T054 e T053 podem começar logo após a Fase 2.
- **Polish (Phase 7)**: depois das histórias desejadas.

### Dentro de cada história

- Os testes vêm antes da implementação correspondente (devem falhar primeiro).
- Backend: `Occupancy` (T023) → `MapOccupancyLoader` (T024) → serviços (T025, T026).
- Frontend: `lib/` puro → hooks/contexto → componentes → `MainPage`.

### Parallel Opportunities

- Fase 2: T003, T004, T005, T013, T014 e T015 em paralelo; T010, T011, T012 e T017 depois das suas bases.
- US1: T018–T022 (testes) em paralelo; T027, T028 e T029 (MCP) em paralelo com o frontend T031–T038; T034 e T038 em paralelo.
- US2: T039, T040, T041 e T043 em paralelo; depois T042 → T044 → T045 → T046 → T047.
- US4: T053 e T054 em paralelo com qualquer tarefa da US3.

---

## Parallel Example: User Story 1

```text
# Testes de referência de parede, juntos:
T018 backend/Roll6.Tests/Domain/Grid/OccupancyTests.cs
T019 frontend/src/lib/occupancy.test.ts
T020 backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs
T022 frontend/src/lib/mapTokens.test.ts

# MCP e frontend em paralelo após T023/T024:
T027 backend/Roll6.Mcp/Tools/MapModelTools.cs
T029 backend/Roll6.Mcp/Roll6Guide.cs
T034 frontend/src/components/map/WallLayer.tsx
```

## Parallel Example: User Story 2

```text
T039 frontend/src/lib/storyCamera.test.ts
T040 frontend/src/lib/storyCamera.ts
T041 frontend/src/components/story/storyScene.ts
T043 frontend/src/components/story/VirtualJoystick.tsx
```

---

## Implementation Strategy

### MVP (US1)

1. Fases 1 e 2.
2. Fase 3 (US1): mapas de história com paredes que bloqueiam peças no 2D — já é útil (labirintos e salas) e valida o modelo de dados.
3. Parar e validar com os passos 1–3 e 10 do quickstart.

### Entrega incremental

1. + US2 → a vista 3D navegável (o grande valor narrativo).
2. + US3 → as peças da mesa no 3D, em tempo real.
3. + US4 → céu, chão refinado e preferência de vista.
4. Polish.

---

## Notes

- `[P]` = arquivos diferentes, sem dependência pendente.
- Toda mudança em `Occupancy.cs` precisa da mesma mudança em `lib/occupancy.ts`, com os mesmos casos de teste (Princípio VII).
- Não criar endpoints: `McpCoverageTests` precisa continuar em 86/87.
- Nunca rodar `docker` localmente; a migração vale em banco acessível ou pelo SQL incremental.
- Commit ao fim de cada tarefa ou grupo lógico.
