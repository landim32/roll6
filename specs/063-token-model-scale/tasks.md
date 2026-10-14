# Tasks: Tamanho do modelo 3D do token (063)

**Input**: Design documents from `/specs/063-token-model-scale/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/token-model-scale.md, quickstart.md

**Tests**: o projeto testa as regras puras (xUnit no domínio, Vitest em `lib/`), então cada história traz os testes das
regras que cria.

**Organization**: tarefas agrupadas por história de usuário (US1 = campo + gravação + prévia, US2 = vista 3D do mapa
+ tempo real, US3 = MCP).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: história de usuário da tarefa (US1, US2, US3)

---

## Phase 1: Setup

- [X] T001 Conferir a branch `063-token-model-scale` e rodar a base: `dotnet test` em `backend/` e `npm test` em `frontend/` (anotar as contagens para comparar no fim)

---

## Phase 2: Foundational (bloqueia todas as histórias)

**Purpose**: a coluna, a regra de validação e o campo nos DTOs/tipos, que as três histórias usam.

- [X] T002 Adicionar `Guard.ModelScale(int? value, string key)` em `backend/Roll6.Domain/Validation/Guard.cs`: constantes `MODEL_SCALE_MIN = 25`, `MODEL_SCALE_MAX = 400`, `MODEL_SCALE_STEP = 5`, `MODEL_SCALE_DEFAULT = 100`; null → 100; fora do intervalo ou não múltiplo de 5 → `DomainValidationException(key, "O tamanho do modelo deve ser de 25% a 400%, em passos de 5%.")`
- [X] T003 [P] Testes de `Guard.ModelScale` (null → 100; 25, 100, 400 aceitos; 20, 405, 42 recusados com a chave) em `backend/Roll6.Tests/Domain/Validation/GuardTests.cs`
- [X] T004 Adicionar `public int ModelScale { get; set; } = 100;` ao `Token` e o parâmetro `int? scale = null` em `Token.UpdateModel(...)` (sem `ModelFile` → 100, senão `Guard.ModelScale(scale, "modelScale")`) em `backend/Roll6.Domain/Models/Token.cs`
- [X] T005 [P] Testes do `Token.UpdateModel` com o Tamanho (guarda o valor com modelo, volta a 100 sem modelo, recusa 42) em `backend/Roll6.Tests/Domain/Models/TokenTests.cs`
- [X] T006 Mapear `ModelScale` → `model_scale` com `HasDefaultValue(100)` em `backend/Roll6.Infra/Context/Roll6Context.cs` e gerar a migração `AddTokenModelScale` (`dotnet ef migrations add AddTokenModelScale --project Roll6.Infra --startup-project Roll6.API`) em `backend/Roll6.Infra/Migrations/`
- [X] T007 [P] Escrever `database/migrations/063-token-model-scale.sql` (`ALTER TABLE tokens ADD model_scale integer NOT NULL DEFAULT 100;` idempotente, no padrão dos scripts anteriores) e regenerar `database/roll6.sql` com `dotnet ef migrations script --idempotent` mantendo o cabeçalho
- [X] T008 [P] Adicionar `modelScale` aos DTOs: `int? ModelScale` em `backend/Roll6.DTO/Token/TokenInsertInfo.cs` (omitido = 100), `int ModelScale` em `backend/Roll6.DTO/Token/TokenInfo.cs` e em `backend/Roll6.DTO/MapToken/MapTokenInfo.cs`, com `[JsonPropertyName("modelScale")]` e comentário
- [X] T009 [P] Adicionar `modelScale?: number` a `TokenInfo`/`TokenInsert` em `frontend/src/types/token.ts` e a `MapTokenInfo` em `frontend/src/types/mapToken.ts`
- [X] T010 [P] Criar `frontend/src/lib/modelScale.ts`: `MODEL_SCALE = { min: 25, max: 400, step: 5, standard: 100 }`, `modelScaleFactor(percent?: number | null)` (ausente → 1), `clampModelScale(value)` (intervalo e passo), `formatModelScale(percent)` ("120%"), `previewFraming(factor)` (multiplicador da câmera/alvo da prévia = `max(1, factor)`)
- [X] T011 [P] Testes de `lib/modelScale` em `frontend/src/lib/modelScale.test.ts`

**Checkpoint**: backend compila com a coluna; tipos e regra pura prontos.

---

## Phase 3: User Story 1 - Ajustar o tamanho no token (Priority: P1) 🎯 MVP

**Goal**: campo Tamanho na aba "3D", prévia na hora, valor salvo e relido.

**Independent Test**: editar um token com modelo, mudar para 150%, salvar, reabrir → 150% e a prévia no mesmo tamanho; sem modelo o campo não aparece.

- [X] T012 [US1] Gravar e mapear o Tamanho em `backend/Roll6.Domain/Services/TokenLibraryService.cs`: `token.UpdateModel(info.ModelFile, info.ModelIdleClip, info.ModelWalkClip, info.ModelDownClip, info.ModelScale)` no create e no update, e `ModelScale = token.ModelScale` no `MapToDto`
- [X] T013 [P] [US1] Testes do serviço (create/update gravam o Tamanho; 42 → 400 `modelScale`; sem modelo → 100) em `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs`
- [X] T014 [US1] `hooks/useModelFile.ts`: estado `scale` (seed `token.modelScale ?? 100` ao editar, 100 ao criar e ao remover o modelo, mantido ao trocar o arquivo), `setScale`, e `resolve()` devolvendo `modelScale` em `frontend/src/hooks/useModelFile.ts`
- [X] T015 [US1] `ResolvedModel.modelScale` e `toTokenInsert` enviando `modelScale` (100 sem modelo) em `frontend/src/lib/tokenForm.ts`, com os casos em `frontend/src/lib/tokenForm.test.ts`
- [X] T016 [US1] `ModelPreview` com a prop `scale` (fator): o modelo normalizado em `PREVIEW_HEIGHT` multiplicado pelo fator sobre o disco fixo; câmera e alvo multiplicados por `previewFraming(factor)`; trocar o fator reaplica no objeto carregado sem recarregar (incluindo o modelo deitado e o `sizeRef` da pose deitada) em `frontend/src/components/tokens/ModelPreview.tsx`
- [X] T017 [US1] Campo **Tamanho** na seção `model` de `ModelField` (só com modelo): `form-range` min/max/step de `MODEL_SCALE` + o valor formatado + dica, ligado a `useModelFile.scale`; passar `scale` ao `ModelPreview` nas duas seções em `frontend/src/components/tokens/ModelField.tsx`
- [X] T018 [P] [US1] Textos `tokens.model.scale`, `tokens.model.scaleHint` ("Altura do modelo na vista 3D, em relação à figura da peça. 100% = automático") e `tokens.model.scaleValue` em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: US1 funciona sozinha (o mapa ainda ignora o valor).

---

## Phase 4: User Story 2 - O mapa 3D respeita o tamanho (Priority: P1)

**Goal**: modelo multiplicado pelo Tamanho na vista 3D (em pé, andando, deitado), balões acompanhando, atualização em tempo real.

**Independent Test**: duas peças do mesmo `.glb` a 100% e 200% → a segunda com o dobro da altura, pés no chão; mudar o Tamanho em outro navegador → a peça muda sem recarregar.

- [X] T019 [US2] `MapTokenInfo.ModelScale` preenchido com o do token da peça em `backend/Roll6.Domain/Services/MapTokenService.cs` (onde já preenche `ModelFileUrl`/clips)
- [X] T020 [US2] `IMapTokenRepository.ListCampaignIdsByTokenAsync(long tokenId)` (campanhas distintas, não nulas, dos mapas com peças do token) em `backend/Roll6.Infra.Interfaces/Repository/IMapTokenRepository.cs` e `backend/Roll6.Infra/Repository/MapTokenRepository.cs`
- [X] T021 [US2] `TokenLibraryService`: `IRealtimeNotifier` como último parâmetro do construtor e, depois do update gravado, `mapTokens.changed` (mapId null, `TableEvents.Create`) por campanha de `ListCampaignIdsByTokenAsync`, em `backend/Roll6.Domain/Services/TokenLibraryService.cs`; ajustar o construtor nos testes em `backend/Roll6.Tests/Domain/Services/TokenLibraryServiceTests.cs` e cobrir "publica uma vez por campanha" e "não publica no create"
- [X] T022 [P] [US2] `fitModel`/`fitLyingModel` com `scale = 1` opcional multiplicando a escala (pés no chão, centro na peça) em `frontend/src/lib/modelFit.ts`, com casos em `frontend/src/lib/modelFit.test.ts` (fator 1 idêntico ao atual; fator 2 = escala dobrada e `position.y` = `-min.y × escala`)
- [X] T023 [P] [US2] `spriteSpec.modelScale` (fator via `modelScaleFactor(token.modelScale)`) em `frontend/src/lib/pieceDrawing.ts`, com caso em `frontend/src/lib/pieceDrawing.test.ts`
- [X] T024 [US2] `ModelSpec.scale` em `frontend/src/components/story/modelLayer.ts` (passado a `fitModel`/`fitLyingModel` no `place`; uma mudança só de escala recoloca o modelo sem recarregar)
- [X] T025 [US2] `StoryView`: passar `scale` nos `ModelSpec` e usar `width × scale` no proxy escondido (`hidden: true`) para balões e cabeça seguirem o modelo, em `frontend/src/components/story/StoryView.tsx`

**Checkpoint**: US1 + US2 entregam o valor para a mesa.

---

## Phase 5: User Story 3 - Assistentes de IA (Priority: P3)

**Goal**: `modelScale` no MCP.

**Independent Test**: `update_token` com `modelScale: 120` → o token lido traz 120; com 42 → 400 `modelScale`.

- [X] T026 [P] [US3] `McpDocs.MODEL_SCALE` em `backend/Roll6.Mcp/McpDocs.cs` e o parâmetro `int? modelScale = null` em `create_token`/`update_token` (enviado no `TokenInsertInfo`; descrições mencionam o campo e o erro `modelScale`) em `backend/Roll6.Mcp/Tools/TokenTools.cs`
- [X] T027 [P] [US3] Linha sobre `modelScale` na seção "3D view" de `backend/Roll6.Mcp/Roll6Guide.cs`

---

## Phase 6: Polish & Cross-Cutting

- [X] T028 [P] Documentar no `CLAUDE.md` (bullet "3D models (055)"/"Model animations (056)": `tokens.model_scale`, `modelScale`, fator no `fitModel`, proxy escondido, evento no update de token) e em "Recent Changes" a entrada 063
- [X] T029 Rodar `dotnet build`/`dotnet test` em `backend/` e `npm run lint`, `npm test`, `npm run build` em `frontend/`
- [X] T030 Validar o quickstart no site local (prévia, salvar e reabrir) até onde o ambiente permitir sem banco; registrar o que não pôde ser verificado

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T011)** → histórias.
- **US1** (T012–T018) depende de T004, T008, T009, T010.
- **US2** (T019–T025) depende de T004, T008–T010; independente da UI da US1 (pode usar tokens com `modelScale` vindos da API).
- **US3** (T026–T027) depende de T008.
- **Polish** depois das histórias.

### Parallel Opportunities

- T003, T005, T007, T008, T009, T010/T011 em paralelo depois de T002/T004.
- Na US2: T022 e T023 em paralelo; T020 em paralelo com o frontend.
- US3 inteira em paralelo com US1/US2.

## Implementation Strategy

1. MVP = Foundational + US1 (o dono ajusta e salva; prévia correta).
2. US2 leva o valor à mesa (o objetivo real do pedido).
3. US3 mantém o MCP completo.
4. Polish: docs e validação.
