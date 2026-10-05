---
description: "Task list for 035-token-direction-views"
---

# Tasks: Imagens 2,5D por direção do token

**Input**: `/specs/035-token-direction-views/` — plan.md, spec.md, research.md (D1–D10), data-model.md, contracts/, quickstart.md
**Tests**: incluídos (TDD nas regras puras). As funções `viewSeen` e `chooseSprite` e o desenho do quadro são puros e rodam no Vitest (`environment: 'node'`, sem DOM); os componentes e o hook de cadastro são verificados no roteiro manual.
**Organization**: por história (spec.md: US1 e US2 P1, US3 P2). Esta branch parte da 034 já mesclada, com mudanças ainda sem commit (recorte da frente com silhueta, altura da câmera, caídos fora do 3D, editar mapa).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirmar a base verde antes de mexer: `cd backend && dotnet build Roll6.sln && dotnet test` e `cd frontend && npx tsc -p tsconfig.app.json --noEmit && npm run lint && npm test` (nenhum arquivo muda; se algo falhar, corrigir antes de seguir)

---

## Phase 2: Foundational (bloqueia as histórias)

**Purpose**: as três colunas novas ponta a ponta no backend e as regras puras do 3D no frontend. Skill `dotnet-architecture` nos passos de backend (Princípio I).

### Backend

- [X] T002 Em `backend/Roll6.Domain/Models/Token.cs`: adicionar `string? RightImage`, `string? LeftImage`, `string? BackImage`; criar `UpdateSprites(string? front, string? right, string? left, string? back)` com `Guard.ImageFileName(..., "frontImage"/"rightImage"/"leftImage"/"backImage")` e `UpdatedAt = DateTime.UtcNow`; tirar o parâmetro `frontImage` (e a linha de `FrontImage`) de `Update(...)`, que volta a cuidar só de nome, descrição, tamanhos e imagens em pé/deitada
- [X] T003 [P] DTOs: `backend/Roll6.DTO/Token/TokenInsertInfo.cs` (+ `RightImage` `"rightImage"`, `LeftImage` `"leftImage"`, `BackImage` `"backImage"`), `backend/Roll6.DTO/Token/TokenInfo.cs` (+ `RightImage`/`RightImageUrl`, `LeftImage`/`LeftImageUrl`, `BackImage`/`BackImageUrl` com `[JsonPropertyName]` camelCase) e `backend/Roll6.DTO/MapToken/MapTokenInfo.cs` (+ `RightImageUrl`, `LeftImageUrl`, `BackImageUrl`)
- [X] T004 Em `backend/Roll6.Infra/Context/Roll6Context.cs` (bloco `Token`, ao lado de `front_image`): mapear `RightImage` → `right_image`, `LeftImage` → `left_image`, `BackImage` → `back_image`, todos `HasMaxLength(260)`
- [X] T005 Gerar a migração: `cd backend && dotnet ef migrations add AddTokenDirectionImages --project Roll6.Infra --startup-project Roll6.API`; conferir em `backend/Roll6.Infra/Migrations/*_AddTokenDirectionImages.cs` que ela só faz 3 `AddColumn` (`right_image`, `left_image`, `back_image`, `character varying(260)`, nulos) e que o `Down` as remove
- [X] T006 [P] Criar `database/migrations/035-token-direction-images.sql` (idempotente, gerado com `dotnet ef migrations script 20261004212901_ReplaceStoryMapWithRaycast <id da nova> --idempotent ...`, cabeçalho no padrão de `database/migrations/034-raycast-view.sql`, sem as linhas de log do `dotnet`) e regenerar `database/roll6.sql` (`dotnet ef migrations script --idempotent ... -o ../database/roll6.sql`) recolocando o cabeçalho
- [X] T007 Em `backend/Roll6.Domain/Services/TokenLibraryService.cs`: em `CreateAsync` e `UpdateAsync` chamar `token.Update(...)` (sem frente) seguido de `token.UpdateSprites(info.FrontImage, info.RightImage, info.LeftImage, info.BackImage)`; em `MapToDto` preencher as quatro imagens e as quatro URLs (`_imageStorage.GetUrl`)
- [X] T008 [P] Em `backend/Roll6.Domain/Services/MapTokenService.cs` (`MapToDtoAsync`, ao lado de `FrontImageUrl`): preencher `RightImageUrl`, `LeftImageUrl`, `BackImageUrl` com `_imageStorage.GetUrl(token?.RightImage/LeftImage/BackImage)`
- [X] T009 [P] Testes em `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`: criar com as quatro imagens guarda todas; criar sem nenhuma devolve nulos e URLs nulas; nome inválido em cada uma → 400 com a chave certa (`rightImage`, `leftImage`, `backImage`); `UpdateAsync` sem uma imagem a remove e mantém as outras que foram enviadas (PUT substitui tudo); atualizar trocando só a da direita
- [X] T010 [P] Teste em `backend/Roll6.Tests/Domain/Services/MapTokenServiceTests.cs`: a listagem de peças de um mapa cujo token tem as quatro imagens devolve `frontImageUrl`, `rightImageUrl`, `leftImageUrl` e `backImageUrl` (usar um `Mock<IImageStorageAppService>` cujo `GetUrl` devolve `"https://x/" + nome`); token sem as imagens → URLs nulas
- [X] T011 Rodar `cd backend && dotnet build Roll6.sln && dotnet test --filter "FullyQualifiedName~Token|FullyQualifiedName~Mcp"` e corrigir; o MCP ainda compila porque `TokenInsertInfo.FrontImage` não mudou de nome

### Frontend

- [X] T012 [P] Tipos: `frontend/src/types/token.ts` (`TokenInfo` + `rightImage`, `rightImageUrl`, `leftImage`, `leftImageUrl`, `backImage`, `backImageUrl`; `TokenInsertInfo` + `rightImage`, `leftImage`, `backImage`) e `frontend/src/types/mapToken.ts` (`MapTokenInfo` + `rightImageUrl`, `leftImageUrl`, `backImageUrl`); corrigir os mocks de `TokenInfo`/`MapTokenInfo` dos testes de `frontend/src/lib/*.test.ts` que deixarem de compilar (`npx tsc -p tsconfig.app.json --noEmit`)
- [X] T013 [P] Testes (escrever primeiro) em `frontend/src/lib/spriteView.test.ts`:
  - `viewSeen`: peça virada a norte (`look` 0) com a câmera a norte → `front`, a sul → `back`, a leste → `right`, a oeste → `left`;
  - a mesma conferência para os seis `look` (0–5) × as quatro posições da câmera relativas à direção da peça (rodar a câmera junto com a peça dá o mesmo lado);
  - ângulos intermediários (30°, 60°, 120°, 150° para cada lado);
  - divisas exatas a 45° e 135° (e −45°, −135°) → `front`/`back`, nunca lateral;
  - mesma entrada → mesma saída (determinístico);
  - `chooseSprite` para todos os ramos: lado visto direto; `right` sem imagem mas com `left` → `left` espelhada; `left` idem; `back` ausente → `front` (nunca espelhada); laterais sem opostas → `front`; sem `front` → fallback; genérica em `T`.
- [X] T014 Criar `frontend/src/lib/spriteView.ts` (puro, sem DOM) para passar T013: `SPRITE_VIEWS = ['front','right','left','back'] as const`, `type SpriteView`, `type ViewImages<T> = Record<SpriteView, T | null>`, `EMPTY_VIEWS`, `viewSeen(look, piece: Point, camera: Point): SpriteView` (usa `lookToYaw` de `lib/storyCamera`; `bearing = atan2(dx, −dy)`; `relative` normalizado em (−π, π]; `|rel| ≤ 45°` → front, `|rel| ≥ 135°` → back, `rel > 0` → right, senão left; tolerância 1e-9 nas divisas) e `chooseSprite<T>(images, fallback, seen): { image: T; mirrored: boolean }` (ordem: direta → lateral oposta espelhada → front → fallback; costas nunca espelhadas)

**Checkpoint**: o backend guarda, valida e devolve as quatro imagens; `npm test -- spriteView` passa.

---

## Phase 3: User Story 1 — Cadastrar as quatro imagens 2,5D numa aba própria (P1) 🎯 MVP

**Goal**: quem cria ou edita um token tem a aba "2,5D" com Frente, Direita, Esquerda e Costas, cada uma recortada em 3:4 sobre a mesma silhueta, com dica do lado a desenhar; nada se perde ao alternar abas; a frente da 034 vira o campo "Frente".

**Independent Test**: criar um token com as quatro imagens, salvar, reabrir a edição e ver as quatro; trocar a direita e remover as costas sem mexer nas outras; alternar as abas sem perder nada (quickstart passos 1–3).

### Testes da US1

- [X] T015 [P] [US1] Em `frontend/src/lib/spriteView.test.ts` acrescentar os testes de `resolveSpriteImages(saved, keep, crops, upload)`: recorte novo → sobe e devolve o nome novo; sem recorte e `keep` verdadeiro → devolve o nome salvo; sem recorte e `keep` falso → `null`; só a direita enviada devolve as outras conforme `keep`; `upload` é chamado só para as direções com recorte novo (função falsa que registra as chamadas)
- [X] T016 [P] [US1] Em `frontend/src/lib/tokenForm.test.ts`: `toTokenInsert(form, up, down, sprites)` leva `frontImage`, `rightImage`, `leftImage`, `backImage` do objeto `sprites`; sem `sprites` as quatro vão `null`; ajustar o teste da 034 que passava `frontImage` solto

### Implementação da US1

- [X] T017 [US1] Em `frontend/src/lib/spriteView.ts` acrescentar `type SpriteImages = ViewImages<string>`, `tokenSpriteNames(token)` / `tokenSpriteUrls(token)` (lêem `${view}Image` e `${view}ImageUrl` de um `TokenInfo`) e `resolveSpriteImages(saved, keep, crops, upload)` (para passar T015)
- [X] T018 [US1] Em `frontend/src/lib/tokenForm.ts`: `toTokenInsert(form, upImage, downImage, sprites: ViewImages<string> = EMPTY_VIEWS)` monta `frontImage`/`rightImage`/`leftImage`/`backImage` a partir de `sprites` (para passar T016)
- [X] T019 [US1] Renomear `frontend/src/lib/uploadFrontImage.ts` para `frontend/src/lib/uploadSpriteImage.ts` (`git mv`), exportando `uploadSpriteImage(crop)` com o arquivo gerado chamado `sprite`; ajustar o comentário de `frontend/src/lib/frontImage.ts` para dizer que o recorte, o tamanho e a silhueta valem para as quatro imagens (os nomes e valores não mudam: a altura dos olhos da câmera deriva deles)
- [X] T020 [US1] Criar `frontend/src/hooks/useSpriteImages.ts`: `useSpriteImages(token: TokenInfo | null, active: boolean)` guarda `crops: Record<SpriteView, ImageCrop | null>` e `keep: Record<SpriteView, boolean>` (iniciado com as imagens salvas do token), reinicia quando `active` ou `token` mudam, e expõe `setCrop(view, crop)`, `remove(view)`, `savedUrls` (via `tokenSpriteUrls`), `has(view)` e `resolve()` → `resolveSpriteImages(tokenSpriteNames(token), keep, crops, uploadSpriteImage)`
- [X] T021 [US1] Renomear `frontend/src/components/tokens/FrontImageField.tsx` para `SpriteImageField.tsx` (`git mv`) e generalizar: props `{ id, view: SpriteView, onChange, hasCurrent, currentUrl, currentName, onRemoveCurrent }`; rótulo `tokens.view.{view}` e um `form-text` **sempre visível** com `tokens.viewHint.{view}` (de frente / de costas / de perfil olhando para a direita da imagem / para a esquerda da imagem); `ImageCropper` com `aspect = FRONT_IMAGE_ASPECT`, `rotatable`, `cropAreaStyle = silhouetteCropStyle()` (a mesma nos quatro) e `hint = tokens.spriteCropHint`
- [X] T022 [US1] Em `frontend/src/components/tokens/TokenFormFields.tsx`: duas abas com o `Tabs` de `components/ui/Tabs.tsx` — **"Token"** (nome, descrição, imagem em pé e deitada, tamanhos) e **"2,5D"** (`tokens.spritesHelp` + os quatro `SpriteImageField` em grade 2 × 2); os dois painéis sempre montados, o inativo com `hidden`; tirar o campo de frente da aba principal; trocar as props `onFrontCrop`, `current.frontUrl/hasFront` e `onRemoveFront` por uma prop `sprites` com o retorno de `useSpriteImages`
- [X] T023 [US1] Em `frontend/src/components/modals/TokenModal.tsx` (aba "Incluir token"): trocar `frontCrop`/`uploadFrontImage` por `useSpriteImages(null, open)`; em `onCreate` usar `await sprites.resolve()` e passar o resultado a `toTokenInsert`; passar `sprites` a `TokenFormFields`
- [X] T024 [US1] Em `frontend/src/components/modals/TokenEditModal.tsx`: trocar `frontCrop`/`keepFront` por `useSpriteImages(token, open)`; em `onSubmit` usar `await sprites.resolve()` (o PUT substitui tudo: imagem não reenviada nem mantida é removida) e passar a `toTokenInsert`; passar `sprites` a `TokenFormFields`
- [X] T025 [P] [US1] Chaves em `frontend/src/i18n/locales/pt-BR.json`: `tokens.tabToken` ("Token"), `tokens.tabSprites` ("2,5D"), `tokens.spritesHelp`, `tokens.view.{front,right,left,back}`, `tokens.viewHint.{front,right,left,back}`, `tokens.spriteCropHint`, textos de `contracts/ui-contracts.md`; remover `tokens.frontImage`, `tokens.frontImageHint` e `tokens.frontCropHint`
- [X] T026 [P] [US1] CSS em `frontend/src/styles/app.css` só se a grade 2 × 2 das quatro imagens precisar (classes `stm-sprite-grid`/`stm-sprite-cell`, uma coluna no celular), sem alterar o recorte existente — **não criado**: a grade 2 × 2 sai das classes do Bootstrap (`row g-3` + `col-12 col-md-6`), uma coluna no celular
- [X] T027 [P] [US1] MCP `backend/Roll6.Mcp/Tools/TokenTools.cs`: `create_token` e `update_token` ganham `string? rightImage = null`, `leftImage = null`, `backImage = null` (descrições de `contracts/mcp-tools.md`) repassados em `TokenInsertInfo`; `FIELDS` lista as quatro imagens 2,5D e diz que cada uma é opcional e que `update_token` remove as omitidas; os *Returns* de token citam `rightImage`, `rightImageUrl`, `leftImage`, `leftImageUrl`, `backImage`, `backImageUrl`
- [X] T028 [US1] Rodar `cd frontend && npx tsc -p tsconfig.app.json --noEmit && npm run lint && npm test` e `cd backend && dotnet test --filter "FullyQualifiedName~Mcp"` (cobertura 86/87, paridade e descrições) e corrigir

**Checkpoint**: a US1 funciona sozinha — cadastro e edição com as quatro imagens, MCP e API.

---

## Phase 4: User Story 2 — Ver o lado certo do personagem no 3D (P1)

**Goal**: no 3D cada figura mostra a imagem do lado em que a câmera a vê em relação à direção da peça (frente ±45°, costas ±45° da oposta, laterais 90°); a escolha é refeita a cada quadro e por peça; o jogador vê as costas do próprio personagem.

**Independent Test**: token com quatro imagens bem diferentes, peça no mapa, 3D aberto: circular em volta dela e girar a peça no 2D; conferir o lado em cada posição e nas seis direções (quickstart passos 4–5).

### Testes da US2

- [X] T029 [P] [US2] Em `frontend/src/lib/raycastFrame.test.ts` (atualizar o helper `figure` para o novo `RenderSprite`): uma figura com quatro cores (frente vermelha, direita azul, esquerda verde, costas amarela) e a câmera a norte, sul, leste e oeste dela (peça `look` 0) mostra, em cada caso, a cor do lado certo; girar a peça (`look` 3) com a câmera parada troca a cor; duas figuras com direções diferentes mostram cores diferentes no mesmo quadro; a figura continua com o mesmo tamanho e lugar quando troca de imagem; uma figura atrás da parede continua oculta
- [X] T030 [P] [US2] Em `frontend/src/lib/pieceDrawing.test.ts`: `spriteSpec` devolve `views` com as quatro URLs do token (`frontImageUrl`, `rightImageUrl`, `leftImageUrl`, `backImageUrl`), `fallbackUrl` = `upImageUrl`, `look` da peça, `width`, `center` e `baseColor`; token sem nenhuma imagem 2,5D → as quatro `null`

### Implementação da US2

- [X] T031 [US2] Em `frontend/src/lib/pieceDrawing.ts` (`SpriteSpec`/`spriteSpec`): trocar `imageUrl` por `views: ViewImages<string>` (as quatro URLs da peça, via `tokenSpriteUrls`-equivalente para `MapTokenInfo`) e `fallbackUrl: string | null` (`upImageUrl`), e voltar a incluir `look` (para T029/T030 passarem)
- [X] T032 [US2] Em `frontend/src/lib/raycastFrame.ts`: `RenderSprite` vira `{ id, center, width, look, images: ViewImages<PixelBuffer>, fallback: PixelBuffer }`; em `drawRaycastFrame`, para cada figura, `viewSeen(sprite.look, sprite.center, { x: pose.x, y: pose.z })` + `chooseSprite(sprite.images, sprite.fallback, seen)` escolhem os pixels **a cada quadro**; a altura vem da proporção da imagem escolhida e, quando `mirrored`, a coluna de textura é invertida (`texX = pixels.width − 1 − texX`); tamanho, lugar e oclusão pelo z-buffer ficam como estão
- [X] T033 [US2] Em `frontend/src/components/story/StoryView.tsx`: para cada peça em pé montar o `RenderSprite` lendo, uma vez por URL (cache `spriteImages` existente), as quatro URLs de `spec.views` e a reserva `spec.fallbackUrl`; sem nenhuma imagem, `fallback` = `initialPixels(spec.name, spec.baseColor)`; aguardar todas as imagens da peça (uma que falhar vira `null`) antes de entregar a figura ao renderer; passar `look: spec.look`
- [X] T034 [P] [US2] MCP: em `backend/Roll6.Mcp/Tools/MapTokenTools.cs` os *Returns* citam `rightImageUrl`, `leftImageUrl`, `backImageUrl`; em `backend/Roll6.Mcp/Roll6Guide.cs` (seção "3D view") descrever as quatro imagens, que o 3D mostra a do lado em que a câmera vê o personagem em relação à direção da peça (frente a ±45°, costas a ±45° da oposta, laterais 90°), que "right"/"left" são os lados do próprio personagem (de perfil olhando para a direita/esquerda da imagem), a reserva (lateral que falta → a oposta espelhada, senão a frente, senão a imagem em pé; costas nunca espelhadas) e que `update_token` substitui todos os campos
- [X] T035 [US2] Rodar `cd frontend && npx tsc -p tsconfig.app.json --noEmit && npm run lint && npm test && npm run build` e `cd backend && dotnet test`; corrigir

**Checkpoint**: US1 + US2 funcionam juntas — o 3D troca o lado conforme a câmera e a direção da peça.

---

## Phase 5: User Story 3 — Tokens com poucas imagens continuam funcionando (P2)

**Goal**: lateral que falta usa a oposta espelhada, senão a frente, senão a imagem em pé; as costas nunca são espelhadas; tokens antigos aparecem como antes.

**Independent Test**: tokens só com a frente; com direita mas sem esquerda; com frente e costas sem laterais; sem costas; só com costas; token antigo sem nenhuma (quickstart passo 6 e 3).

- [X] T036 [P] [US3] Em `frontend/src/lib/raycastFrame.test.ts`: figura só com a imagem da direita e a câmera pelo lado esquerdo → os pixels saem **espelhados** (assimetria conhecida na imagem: uma marca no lado direito aparece no esquerdo); com as duas laterais, nenhuma espelha; sem costas, por trás aparece a frente (sem espelhar); frente e costas sem laterais → as laterais mostram a frente; sem frente e sem laterais, os lados que faltam usam a reserva (imagem em pé); só costas: de frente e dos lados usa a reserva
- [X] T037 [P] [US3] Em `frontend/src/lib/pieceDrawing.test.ts`: token antigo (só `upImageUrl`, ou só `frontImageUrl` da 034) → `views` com a frente (ou tudo `null`) e `fallbackUrl` correta, de modo que o 3D mostre exatamente o que mostrava (SC-005)
- [X] T038 [US3] Conferir em `frontend/src/components/story/StoryView.tsx` que imagens ainda não carregadas ou com falha usam a reserva sem travar o 3D e que o cache por URL não duplica leitura para peças do mesmo token; ajustar se necessário
- [X] T039 [US3] Rodar `cd frontend && npm test` e corrigir qualquer caso de reserva que T036/T037 revelem em `frontend/src/lib/spriteView.ts` ou `frontend/src/lib/raycastFrame.ts`

**Checkpoint**: as três histórias funcionam juntas.

---

## Phase 6: Polish

- [X] T040 [P] Atualizar `CLAUDE.md`: em "3D view" (backend e frontend) descrever as quatro imagens 2,5D (`tokens.right_image`/`left_image`/`back_image`, `Token.UpdateSprites`), a aba "2,5D" do cadastro (`TokenFormFields`, `SpriteImageField`, `useSpriteImages`), `lib/spriteView` (`viewSeen`, `chooseSprite`, setores de 90°, espelhamento só de lateral que falta) e a escolha por quadro em `drawRaycastFrame`; ajustar a frase de `FrontImageField`; acrescentar a entrada de "Recent Changes" da 035
- [X] T041 [P] Gerar quatro imagens de teste em `C:\Users\rodri\Downloads\roll6-story-map\` (retrato 360 × 480, silhueta a 60%, fundo transparente, uma letra grande diferente em cada: F, D, E, C) com um script no scratchpad, para o roteiro manual
- [X] T042 Rodar a verificação completa: `cd backend && dotnet build Roll6.sln && dotnet test` e `cd frontend && npx tsc -p tsconfig.app.json --noEmit && npm run lint && npm test && npm run build`
- [ ] T043 Executar o roteiro manual de `specs/035-token-direction-views/quickstart.md` (passos 1–8, incluindo as seis direções da peça, a divisa de 45° e 50 peças com quatro imagens)

---

## Dependencies & Execution Order

- **Setup (1)** → **Foundational (2)** → histórias.
- Dentro da Fase 2: T002 → (T003, T004 em paralelo) → T005 → T006; T007 depende de T002 e T003; T008 depende de T003; T009/T010 depois de T007/T008; T012 e T013 são independentes do backend; T014 depende de T013.
- **US1 (3)** depende da Fase 2 (T012, T014): T017 → T020; T019 antes de T020/T021; T021 → T022 → T023/T024; T018 → T023/T024.
- **US2 (4)** depende da Fase 2 (T014) e de T012; independe da US1 (o 3D lê tokens já cadastrados pela API/MCP), mas só se vê no app depois da US1. T031 → T032 → T033; T029/T030 antes.
- **US3 (5)** depende de T031–T033 (US2) e de `chooseSprite` (T014).
- **Polish (6)** por último.

### Parallel Opportunities

- Fase 2: T003 e T004 (após T002); T006, T008, T009, T010 em paralelo; no frontend T012 e T013 (e T014 depois).
- US1: T015 e T016 (testes); T025, T026 e T027 em paralelo com os componentes.
- US2: T029 e T030 (testes) e T034 (MCP) em paralelo.
- US3: T036 e T037 em paralelo.

## Parallel Example: User Story 2

```text
T029 frontend/src/lib/raycastFrame.test.ts
T030 frontend/src/lib/pieceDrawing.test.ts
T034 backend/Roll6.Mcp/Tools/MapTokenTools.cs + backend/Roll6.Mcp/Roll6Guide.cs
```

## Implementation Strategy

1. **MVP**: Fases 1–3 (US1) — as quatro imagens cadastradas e devolvidas pela API e pelo MCP; sozinha ainda não muda o 3D.
2. **Primeiro incremento visível**: + US2 — o 3D troca a imagem conforme o lado em que a câmera vê o personagem.
3. + US3 — reserva e espelhamento (a regra pura já nasce na Fase 2; a US3 a confere no desenho e com tokens incompletos).
4. Polish e roteiro manual.

## Notes

- A direção da peça é o `look` (0–5) que já existe; nada novo é gravado na peça.
- "Direita" e "esquerda" são os lados do próprio personagem; "Direita" = de perfil olhando para a direita da imagem.
- Não criar endpoints: `McpCoverageTests` continua em 86/87.
- Antes de começar convém commitar as mudanças da 034 que ainda estão no diretório de trabalho (recorte da frente, altura da câmera, caídos fora do 3D, editar mapa), para a 035 ter uma base limpa.
