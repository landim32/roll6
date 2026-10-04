---
description: "Task list for 034-raycast-3d-view"
---

# Tasks: Vista 3D por raycasting (estilo Wolfenstein 3D)

**Input**: `/specs/034-raycast-3d-view/` — plan.md, spec.md, research.md (D1–D12), data-model.md, contracts/, quickstart.md
**Tests**: incluídos para os módulos puros (`lib/raycaster.ts`, `lib/maskImage.ts`, `lib/storyCamera.ts`), para o domínio
(`MapModel`, `Token`) e para os testes de parede da 033 que precisam sair; Vitest roda com `environment: 'node'`
(sem canvas), então o renderer e os componentes são verificados no roteiro manual.
**Organization**: por história (spec.md: US1–US3 P1, US4 P2). Esta branch parte da 033 (PR #24).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Remover `three` e `@types/three`: `cd frontend && npm uninstall three @types/three` (atualiza `frontend/package.json` e `frontend/package-lock.json`)
- [X] T002 [P] Remover os ícones que só a 033 usava (`BricksIcon`, `BrushIcon`, `EraserIcon`, `CloudSunIcon`, `BoxIcon`) de `frontend/src/components/ui/icons.tsx`, mantendo `View3dIcon` e `FollowCharacterIcon`

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: esquema e DTOs da 034 (sai tipo/paredes/céu, entra máscara/fundo/"2,5D frente") ponta a ponta. Skill `dotnet-architecture` nos passos de backend.

- [X] T003 Apagar `backend/Roll6.Domain/Enums/MapKind.cs`; em `backend/Roll6.Domain/Models/MapModel.cs` remover `Kind`, `Walls`, `SkyImage`, `UpdateStory`, `ActiveWalls` (e os `using` que sobrarem) e adicionar `string? MaskImage`, `string? BackgroundImage` e `UpdateThreeD(string? maskImage, string? backgroundImage)` com `Guard.ImageFileName(..., "maskImage")` / `"backgroundImage"` e `ChangedAt = DateTime.UtcNow` (data-model.md)
- [X] T004 [P] Em `backend/Roll6.Domain/Models/Token.cs` adicionar `string? FrontImage` e o parâmetro `frontImage` em `Update(...)` com `FrontImage = Guard.ImageFileName(frontImage, "frontImage")`
- [X] T005 [P] DTOs: `backend/Roll6.DTO/MapModel/MapModelInsertInfo.cs` (− `Kind`, `Walls`, `SkyImage`; + `MaskImage` `"maskImage"`, `BackgroundImage` `"backgroundImage"`), `backend/Roll6.DTO/MapModel/MapModelInfo.cs` (− `Kind`, `Walls`, `SkyImage`, `SkyImageUrl`; + `MaskImage`, `MaskImageUrl`, `BackgroundImage`, `BackgroundImageUrl`), `backend/Roll6.DTO/Token/TokenInsertInfo.cs` (+ `FrontImage` `"frontImage"`), `backend/Roll6.DTO/Token/TokenInfo.cs` (+ `FrontImage`, `FrontImageUrl`), `backend/Roll6.DTO/MapToken/MapTokenInfo.cs` (+ `FrontImageUrl` `"frontImageUrl"`)
- [X] T006 Em `backend/Roll6.Infra/Context/Roll6Context.cs`: no bloco `MapModel` remover `Kind`/`Walls`/`SkyImage` e mapear `MaskImage` → `mask_image` e `BackgroundImage` → `background_image` (`HasMaxLength(260)`); no bloco `Token` mapear `FrontImage` → `front_image` (`HasMaxLength(260)`); se `TURN_CHANGE_JSON`/`ValueComparer` deixarem de ter outro uso além de `turns.changes`, manter só o de turns
- [X] T007 Gerar `cd backend && dotnet ef migrations add ReplaceStoryMapWithRaycast --project Roll6.Infra --startup-project Roll6.API` e **editar** a migração gerada para que `sky_image` vire `background_image` com `migrationBuilder.RenameColumn(name: "sky_image", table: "map_models", newName: "background_image")` (o EF gera drop + add, que perderia os dados — FR-024); conferir os drops de `kind` e `walls` e os adds de `mask_image` e `tokens.front_image`; o `Down` faz o inverso
- [X] T008 [P] Criar `database/migrations/034-raycast-view.sql` com `dotnet ef migrations script <id da AddStoryMap> <id da ReplaceStoryMapWithRaycast> --idempotent ...` e o cabeçalho no padrão de `database/migrations/033-story-map.sql`; regenerar `database/roll6.sql` (`dotnet ef migrations script --idempotent ... -o ../database/roll6.sql`) recolocando o cabeçalho
- [X] T009 Em `backend/Roll6.Domain/Services/MapModelService.cs`: `ApplyChanges` chama `UpdateThreeD(info.MaskImage, info.BackgroundImage)` no lugar de `UpdateStory`; `MapToDto` preenche `MaskImage`, `MaskImageUrl = _imageStorage.GetUrl(...)`, `BackgroundImage`, `BackgroundImageUrl` (sem `Kind`/`Walls`/`Sky*`)
- [X] T010 [P] Em `backend/Roll6.Domain/Services/TokenLibraryService.cs` passar `info.FrontImage` a `token.Update` (create e update) e preencher `FrontImage`/`FrontImageUrl` no `MapToDto`; em `backend/Roll6.Domain/Services/MapTokenService.cs` (`MapToDtoAsync`) preencher `FrontImageUrl` com a URL do `FrontImage` do token da peça
- [X] T011 [P] Testes: renomear `backend/Roll6.Tests/Domain/Models/MapModelStoryTests.cs` para `MapModelThreeDTests.cs` e reescrever: `UpdateThreeD` aceita nomes válidos, `null` limpa, nome inválido → 400 `maskImage`/`backgroundImage`; em `backend/Roll6.Tests/Domain/Services/MapModelServiceTests.cs` trocar os dois testes da 033 por "PUT salva e devolve máscara/fundo" e "PUT sem eles os remove"
- [X] T012 [P] Teste em `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`: create/update guardam `frontImage` e o devolvem com `frontImageUrl`; nome inválido → 400 `frontImage`; update sem `frontImage` o remove
- [X] T013 [P] Frontend tipos: `frontend/src/types/mapModel.ts` (sai `MAP_KIND`, `kind`, `walls`, `skyImage*`; entram `maskImage`, `maskImageUrl`, `backgroundImage`, `backgroundImageUrl` em `MapModelInfo` e `maskImage`, `backgroundImage` em `MapModelInsertInfo`), `frontend/src/types/token.ts` (`frontImage`, `frontImageUrl` em info; `frontImage` em insert), `frontend/src/types/mapToken.ts` (`frontImageUrl`)
- [X] T014 Em `frontend/src/lib/draft.ts` trocar `kind`/`walls`/`skyImage`/`skyImageUrl`, `isStoryMap`, `activeWalls` e o uso de `storyWalls` por `maskImage`, `maskImageUrl`, `backgroundImage`, `backgroundImageUrl` (só os nomes entram em `SAVED_FIELDS`; o insert envia `maskImage`/`backgroundImage`); atualizar `frontend/src/lib/draft.test.ts` (rascunho vazio sem máscara/fundo, nomes sujam o rascunho, URLs não, insert leva os nomes)
- [X] T015 [P] Corrigir os mocks de `MapModelInfo`/`TokenInfo`/`MapTokenInfo` nos testes de `frontend/src/lib/*.test.ts` que deixarem de compilar com os tipos novos (rodar `npx tsc -p tsconfig.app.json --noEmit` e `npm test`)

**Checkpoint**: `dotnet build` + `dotnet test` e `npm test` passam; a API devolve `maskImage`/`backgroundImage`/`frontImage`.

---

## Phase 3: User Story 1 — Máscara 3D e fundo no cadastro do mapa (P1) 🎯 MVP

**Goal**: o mestre envia/troca/remove a Máscara 3D (proporção conferida, prévia em preto e branco) e a imagem de fundo na aba "3D" do cadastro do mapa; tudo é salvo com o mapa.

**Independent Test**: enviar máscara com a proporção certa e um fundo, salvar, reabrir e ver os dois; máscara de outra proporção é recusada com as duas proporções (quickstart passo 1).

- [X] T016 [P] [US1] Testes em `frontend/src/lib/maskImage.test.ts`: `sameRatio` aceita até 1% de diferença e recusa acima; `formatRatio` (ex.: "1,14 : 1"); `thresholdPixels` deixa só 0/255 (luminosidade < 128 → preto) e preserva alfa; pixel transparente conta como branco
- [X] T017 [P] [US1] Criar `frontend/src/lib/maskImage.ts` (puro): `MASK_RATIO_TOLERANCE = 0.01`, `sameRatio(a: {width,height}, b)`, `formatRatio(size)`, `luminance(r,g,b)`, `isMaskWall(r,g,b,a)` (a < 128 → vazio; luminância < 128 → parede) e `thresholdPixels(pixels)` (para a prévia)
- [X] T018 [US1] Em `frontend/src/Contexts/MapEditorContext.tsx`: remover `setKind`, `paintWalls`, `setSkyImage`, `wallMode`/`setWallMode` e o efeito que zera o modo de paredes; adicionar `setMaskImage(fileName | null, url | null)` e `setBackgroundImage(fileName | null, url | null)`; `viewMode` passa a valer para **todo** mapa (`readViewMode` sempre, sem `isStoryMap`); em `setImage`, se há máscara e a proporção nova difere (`sameRatio`), mostrar `toast.warning(t('raycast.maskMismatch'))` mantendo a máscara
- [X] T019 [US1] Em `frontend/src/components/modals/ImageModal.tsx` adicionar a aba **"3D"** (`raycast.tab`, só quando `canEdit`) com dois blocos, Máscara 3D e Imagem de fundo, cada um com input de arquivo (tipos/tamanho de `imageService`), prévia (`<canvas>` limiarizado com `thresholdPixels` para a máscara; `<img>` para o fundo), botões Enviar e Remover:
  - máscara: sem `draft.imageUrl` → `toast.error(t('raycast.maskNeedsImage'))`; carrega o arquivo num `Image`, compara `sameRatio({naturalWidth,naturalHeight}, {draft.imageWidth, draft.imageHeight})` → diferente: `toast.error(t('raycast.maskRatio', { mask, map }))` e nada é enviado; senão `imageService.upload` → `setMaskImage`;
  - fundo: `imageService.upload` → `setBackgroundImage`; textos `raycast.maskHint`/`backgroundHint`; toast `raycast.set` ao escolher
- [X] T020 [P] [US1] Chaves `raycast.*` de `contracts/ui-contracts.md` em `frontend/src/i18n/locales/pt-BR.json` e remoção das chaves `story.menu`, `story.kind*`, `story.walls`, `story.paint`, `story.erase`, `story.wallsOff`, `story.wallBlocked`, `story.sky*`
- [X] T021 [P] [US1] MCP `backend/Roll6.Mcp/Tools/MapModelTools.cs`: em `create_map_model`/`update_map_model` trocar `kind`/`walls`/`skyImage` por `string? maskImage = null` e `string? backgroundImage = null` (descrições de `contracts/mcp-tools.md`), repassar no `MapModelInsertInfo`, atualizar `FIELDS`, `RETURNS` e o aviso do update ("omitted maskImage/backgroundImage are removed")

**Checkpoint**: US1 funciona sozinha (cadastro + salvamento + MCP).

---

## Phase 4: User Story 2 — Qualquer mapa em 3D, visual Wolfenstein (P1)

**Goal**: botão 3D em todo mapa; raycaster com paredes da máscara coloridas pela planta, chão em perspectiva, fundo em panorama; câmera só horizontal, observadora, com colisão e zoom.

**Independent Test**: num mapa com máscara, abrir o 3D, andar/girar/zoom; a câmera não atravessa paredes e não olha para cima/baixo; num mapa sem máscara, 3D sem paredes (quickstart passos 2–3).

### Testes

- [X] T022 [P] [US2] Testes em `frontend/src/lib/raycaster.test.ts`:
  - `buildMaskGrid`: reduz para ≤ 512 células no lado maior; origem `(−imageLeft, −imageTop)`; tamanho das células = `imageWidth / cols`; célula preta quando a maioria dos pixels é parede;
  - `isWallAt`: dentro/fora da área da máscara (fora = vazio);
  - `castRay`: distância perpendicular a uma parede reta à frente igual para o raio do centro e os laterais (sem olho de peixe), lado `ns`/`ew` correto, sem parede → `null` até `maxDistance`;
  - `wallColumn`: altura inversamente proporcional à distância;
  - `skyRepeats`: inteiro ≥ 1 e `skyColumn` dá a mesma coluna em `θ` e `θ + 2π`;
  - `floorPoint`: o pixel logo abaixo do horizonte fica longe, o de baixo da tela perto, e o ponto do centro inferior está à frente da câmera;
  - `projectSprite` + `columnVisible`: sprite atrás de uma parede (profundidade maior que o z-buffer) fica invisível, metade atrás de uma quina fica visível só nas colunas livres.
- [X] T023 [P] [US2] Atualizar `frontend/src/lib/storyCamera.test.ts`: sem `pitch`/`tilt` (pose `{x,z,yaw,attached}`), `stepCamera` ignora entrada vertical; `cameraBlocker` passa a receber uma `MaskGrid` (parede da máscara bloqueia, fora da grade do mapa bloqueia); manter os casos de seguir/soltar/início do GM

### Implementação

- [X] T024 [US2] Criar `frontend/src/lib/raycaster.ts` (puro, sem DOM), com as interfaces e funções de `data-model.md`:
  - DDA sobre a `MaskGrid`;
  - distância perpendicular `d · cos(ângulo do raio − yaw)`;
  - `projection = (larguraDoQuadro / 2) / tan(FOV / 2)`;
  - `wallColumn` → `{ top, bottom }` com a câmera em `EYE_HEIGHT` e parede de `WALL_HEIGHT = 3 * HEX_SIZE`;
  - `floorPoint` (floor casting por linha);
  - `skyRepeats` / `skyColumn` (research D7);
  - `projectSprite` (centro, largura e altura na tela, profundidade) e `columnVisible`.
  
  Todas as distâncias em px do mapa (research D4).
- [X] T025 [US2] Em `frontend/src/lib/storyCamera.ts` remover `pitch`, `tilt`, `PITCH_LIMIT` e `clampPitch`; `cameraBlocker(grid: MaskGrid | null, columns, rows)` usa `isWallAt` (com o raio da câmera) e os limites de `gridPixelSize`, sem `storyWalls`; `followPose`/`initialCamera`/`stepCamera` mantêm a regra de seguir/soltar
- [X] T026 [US2] Em `frontend/src/hooks/useStoryCamera.ts` remover o tilt do arrasto (só `dx` gira) e o `pitch` da pose; continua W/S/A/D/Q/E/setas, roda e pinça → FOV, joystick, "Voltar ao personagem"
- [X] T027 [US2] Criar `frontend/src/components/story/raycastRenderer.ts`: `createRaycastRenderer(canvas)` com `setMask(grid | null)`, `setFloor(imageData | null, layout)`, `setSky(imageData | null)`, `setSprites(specs, images)`, `render(pose, fov)` e `resize(w, h)`. Cada quadro:
  - é desenhado num `ImageData` de largura `min(480, larguraCSS)` e altura proporcional, depois copiado para um canvas de trabalho e ampliado no canvas da tela com `imageSmoothingEnabled = false`;
  - por coluna: lança o raio; desenha o fundo acima do horizonte (`skyColumn`, ou a cor padrão); desenha a parede com a cor da imagem do mapa no ponto atingido (cor padrão sem imagem), sombreada por `1 / (1 + d / FALLOFF)` e × 0,75 no lado `ns`; desenha o chão por floor casting (cor padrão fora da imagem); grava o z-buffer;
  - depois desenha os sprites do mais distante ao mais próximo, coluna a coluna, respeitando o z-buffer e a transparência (alfa < 128 não pinta).
  
  O renderer só redesenha quando algo mudou.
- [X] T028 [US2] Reescrever `frontend/src/components/story/StoryView.tsx` sobre o renderer, deixando de importar `three`/`storyScene`:
  - carrega `draft.imageUrl` e `draft.maskImageUrl` por `lib/mapSnapshot.loadImage` e lê os pixels num canvas fora da tela (imagem do mapa ≤ 2048 px no lado maior);
  - monta a máscara com `buildMaskGrid` sobre `{imageLeft, imageTop, imageWidth, imageHeight}`;
  - carrega o fundo de `draft.backgroundImageUrl`;
  - passa à câmera o blocker da máscara; mantém "Voltar ao personagem", joystick e `onUnsupported` (sem contexto 2D).
  
  Apagar `frontend/src/components/story/storyScene.ts`.
- [X] T029 [US2] Em `frontend/src/components/map/MapControls.tsx` voltar ao layout de antes da 033 mais **um** botão 3D/2D (`View3dIcon`/`MapIcon`, `story.view3d`/`story.view2d`) visível em **todo** mapa; no 3D os botões de zoom mudam o FOV e imagem/redimensionar ficam ocultos; remover o dropdown de tipo/paredes/céu, o input de céu e os imports que sobrarem
- [X] T030 [P] [US2] Em `frontend/src/pages/MainPage.tsx` remover qualquer dependência de `kind` (o 3D vale para todo mapa); em `frontend/src/styles/app.css` remover `.stm-walls`/`.stm-wall-editing` e ajustar `.stm-story-canvas` para `image-rendering: pixelated`

**Checkpoint**: US1 + US2 funcionam juntas.

---

## Phase 5: User Story 3 — Figuras com a imagem "2,5D frente" (P1)

**Goal**: tokens com imagem opcional "2,5D frente"; no 3D cada peça é uma figura de frente (ou com a imagem atual), cortada pelas paredes, deitada/cinza conforme a postura, em tempo real.

**Independent Test**: enviar "2,5D frente" para um token, ver a figura de pé no 3D; token sem ela usa a imagem atual; figura atrás de quina fica parcialmente oculta (quickstart passo 4).

- [X] T031 [P] [US3] Atualizar `frontend/src/lib/pieceDrawing.test.ts`: `spriteSpec` usa `frontImageUrl` quando existe (de pé), senão a imagem atual; deitada continua com a imagem deitada/`sideways`; fora de combate `grayscale`
- [X] T032 [US3] Em `frontend/src/lib/pieceDrawing.ts` (`spriteSpec`) escolher `token.frontImageUrl ?? pieceImage(token).url` para peças de pé; deitadas seguem `pieceImage`; adicionar `heightRatio` (1 de pé, 0,35 deitada) ao `SpriteSpec`
- [X] T033 [US3] Em `frontend/src/components/story/StoryView.tsx` carregar as imagens das figuras por `loadImage` (cache por URL, cópia cinza por `mapSnapshot.toGrayscale` para fora de combate), converter cada uma para pixels e chamar `renderer.setSprites` a cada mudança de `mapTokens`; altura na tela = largura do footprint × proporção da imagem × `heightRatio`, base no chão
- [X] T034 [US3] Campo **"2,5D frente"** no cadastro de token:
  - `frontend/src/lib/tokenForm.ts`: estado do arquivo/remoção e `frontImage` no insert;
  - `frontend/src/components/tokens/TokenFormFields.tsx`: input de arquivo sem recorte, prévia sobre fundo xadrez, "Remover" na edição, textos `tokens.frontImage`/`frontImageHint`/`frontImageRemove`;
  - criar e editar token (`frontend/src/components/modals/TokenModal.tsx` aba Incluir e `frontend/src/components/modals/TokenEditModal.tsx`): enviar o arquivo por `imageService.upload` e mandar `frontImage`, e na edição reenviar o atual quando não mudou (o PUT substitui).
- [X] T035 [P] [US3] Chaves `tokens.frontImage`, `tokens.frontImageHint`, `tokens.frontImageRemove` em `frontend/src/i18n/locales/pt-BR.json`; CSS do xadrez da prévia em `frontend/src/styles/app.css`
- [X] T036 [P] [US3] MCP: `backend/Roll6.Mcp/Tools/TokenTools.cs` — `create_token`/`update_token` ganham `string? frontImage = null` (descrição de `contracts/mcp-tools.md`) e os *Returns* de token citam `frontImage`/`frontImageUrl`; `backend/Roll6.Mcp/Tools/MapTokenTools.cs` — *Returns* de `list_map_tokens` cita `frontImageUrl`

**Checkpoint**: US1–US3 funcionam juntas.

---

## Phase 6: User Story 4 — Retirar o que a 033 acrescentou (P2)

**Goal**: o 2D e as regras das peças voltam às de antes da 033; sai o modo de pintar paredes e tudo que dependia de `walls`.

**Independent Test**: num mapa da 033 com paredes pintadas, peças se movem sem bloqueio; a lateral só tem o botão 3D; o céu virou fundo (quickstart passos 5–6).

- [X] T037 [US4] Backend: restaurar `backend/Roll6.Domain/Grid/Occupancy.cs`, `backend/Roll6.Domain/Services/MapOccupancyLoader.cs` e o trecho de ocupação de `backend/Roll6.Domain/Services/TurnService.Processing.cs` ao estado de `main` (`git show origin/main:<arquivo>` como referência), removendo `IsWall`, `FitResult.Wall`, `MapLayout.WALL_MESSAGE` e o uso de `ActiveWalls`
- [X] T038 [P] [US4] Testes backend: remover os casos de parede da 033 em `backend/Roll6.Tests/Domain/Grid/OccupancyTests.cs`, `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`, `backend/Roll6.Tests/Domain/Services/MapNpcServiceTests.cs` e `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs` (helpers `Walls`/`StoryWalls` incluídos)
- [X] T039 [P] [US4] MCP: tirar "a wall is on that hex" e as menções a paredes de `backend/Roll6.Mcp/Tools/MapTokenTools.cs`, `MapNpcTools.cs`, `TurnTools.cs`; reescrever a seção do guia em `backend/Roll6.Mcp/Roll6Guide.cs` como "3D view" (contracts/mcp-tools.md)
- [X] T040 [US4] Frontend: restaurar `frontend/src/lib/occupancy.ts`, `frontend/src/lib/occupancy.test.ts`, `frontend/src/lib/mapTokens.ts`, `frontend/src/lib/mapTokens.test.ts` e `frontend/src/hooks/useTokenMovement.ts` ao estado de `main` (`git show origin/main:...`); em `frontend/src/components/map/MapCanvas.tsx` remover `WallLayer`, o modo de pintura (`paintAt`, `paintedHex`, `editingWalls`), o bloqueio de menu em parede e os casos `'wall'` dos drops
- [X] T041 [P] [US4] Apagar `frontend/src/components/map/WallLayer.tsx`, `frontend/src/lib/storyWalls.ts` e `frontend/src/lib/storyWalls.test.ts`; em `frontend/src/lib/mapSnapshot.ts` remover o desenho das paredes no Share (campos `kind`/`walls` do `SnapshotDraft`, `WALL_FILL`/`WALL_STROKE`)

**Checkpoint**: todas as histórias funcionam; nada da 033 sobrou além da vista 3D e da preferência de vista.

---

## Phase 7: Polish

- [X] T042 [P] Atualizar `CLAUDE.md`: substituir os parágrafos "Story maps (feature 033)" (backend e frontend) por "3D view (feature 034)" descrevendo máscara/fundo/"2,5D frente", raycaster puro + renderer, câmera só horizontal e observadora, máscara sem efeito no 2D; ajustar a entrada da 033 em "Recent Changes" e adicionar a da 034
- [X] T043 Rodar `cd backend && dotnet build Roll6.sln && dotnet test` (inclui `McpCoverageTests` 86/87, `McpRouteParityTests`, `McpDescriptionTests`) e corrigir falhas
- [X] T044 Rodar `cd frontend && npm run lint && npm test && npm run build`; confirmar que não há chunk do `three` e que `StoryView` ficou pequeno
- [X] T045 Gerar uma máscara de teste preto e branco a partir de `C:\Users\rodri\Downloads\roll6-story-map\story-map-floor.png` (mesmo tamanho; paredes pretas) com o script do scratchpad, para o roteiro manual
- [ ] T046 Executar o roteiro manual de `specs/034-raycast-3d-view/quickstart.md` (passos 1–7, incluindo celular e FPS do SC-003)

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → histórias.
- **US1 (3)** depende só da Fase 2.
- **US2 (4)** depende da Fase 2; usa `maskImageUrl`/`backgroundImageUrl` do rascunho (pode ser testada com máscara enviada pela API mesmo sem a UI da US1); T025–T028 dependem de T024.
- **US3 (5)** depende do renderer da US2 (T027/T028); T034 e T036 podem andar em paralelo à US2.
- **US4 (6)** pode começar logo após a Fase 2 (arquivos distintos dos da US2, exceto `MapCanvas.tsx` e `MapControls.tsx` — fazer T029 antes de T040).
- **Polish (7)** por último.

### Parallel Opportunities

- Fase 2: T004, T005, T010–T013 em paralelo após T003; T008 após T007.
- US1: T016/T017, T020, T021 em paralelo; T018 → T019.
- US2: T022, T023 em paralelo com T024; T030 em paralelo.
- US3: T031, T035, T036 em paralelo; T034 independente do renderer.
- US4: T038, T039, T041 em paralelo; T037 e T040 são independentes entre si (backend × frontend).

## Parallel Example: User Story 2

```text
T022 frontend/src/lib/raycaster.test.ts
T023 frontend/src/lib/storyCamera.test.ts
T024 frontend/src/lib/raycaster.ts
T030 frontend/src/pages/MainPage.tsx + frontend/src/styles/app.css
```

## Implementation Strategy

1. **MVP**: Fases 1–3 (cadastro de máscara/fundo salvos) + Fase 4 (raycaster) — a US1 sozinha só guarda dados, então o primeiro incremento visível é US1 + US2.
2. + US3 (figuras com "2,5D frente").
3. + US4 (limpeza da 033) — pode ser feita junto da US2, já que mexe nos mesmos componentes do mapa.
4. Polish e roteiro manual.

## Notes

- A máscara **não** afeta o 2D (Clarifications Q2): nada no backend lê a máscara.
- Peças entram no mundo 3D por `hexCenter` (Princípio VII); o raycaster não tem matemática de hex.
- Não criar endpoints: `McpCoverageTests` continua em 86/87.
- Não rodar `docker` localmente.
