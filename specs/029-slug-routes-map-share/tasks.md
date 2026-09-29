# Tasks: Slugs, combo unificado campanha/mapa, narração na notificação e compartilhar mapa

**Input**: Design documents from `specs/029-slug-routes-map-share/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: incluídos, como nas features anteriores — regras puras do backend (`Slug`) e dos services (`Roll6.Tests`), cobertura/paridade do MCP, e regras puras do frontend (Vitest em `lib/*.test.ts`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: US1 = combo unificado; US2 = slugs e rotas; US3 = notificação só com a narração; US4 = compartilhar mapa
- US1 e US2 são ambas P1; US2 vem antes porque o combo navega para as rotas.

---

## Phase 1: Setup

Nada a configurar (nenhuma dependência nova).

---

## Phase 2: Foundational (slug no backend + tipos — bloqueia US1 e US2)

- [X] T001 [P] Função pura `Slug` em `backend/Roll6.Domain/Slugs/Slug.cs`: `MAX_BASE_LENGTH = 80`, `MAX_LENGTH = 100`, `From(string? name, string fallback)` (Normalize FormD, remove `UnicodeCategory.NonSpacingMark`, `ToLowerInvariant`, toda sequência fora de `[a-z0-9]` → `-`, `Trim('-')`, corta em 80 e remove hífen final; vazio → `fallback`), `WithSuffix(string baseSlug, int n)` (n ≤ 1 → base; senão `base-n`) e `NextFree(string baseSlug, IEnumerable<string> taken)` (menor n ≥ 1 cujo `WithSuffix` não está em `taken`)
- [X] T002 [P] Testes em `backend/Roll6.Tests/Domain/Validation/SlugTests.cs`: "Tormento Vil" → `tormento-vil`; "Ação & Reação" → `acao-reacao`; "  --Teste--  " → `teste`; "🐉🐉" → fallback; nome de 200 letras → 80 chars sem hífen final; `NextFree("teste", ["teste","teste-2"])` → `teste-3`; `NextFree("teste", [])` → `teste`; `NextFree("teste", ["teste-2"])` → `teste`
- [X] T003 `Slug` + `AssignSlug(string slug)` em `backend/Roll6.Domain/Models/Campaign.cs` e `backend/Roll6.Domain/Models/Map.cs` (doc: definido só na inserção, nunca muda em `Rename`/`Update`)
- [X] T004 `backend/Roll6.Infra/Context/Roll6Context.cs`: `slug` `varchar(100)` required em `campaigns` e `maps`, índices únicos `ix_campaigns_slug` e `ix_maps_slug` (depende de T003)
- [X] T005 Migração `AddSlugs` (`dotnet ef migrations add AddSlugs --project Roll6.Infra --startup-project Roll6.API`) em `backend/Roll6.Infra/Migrations/`, editada para: adicionar `slug` nulo → `migrationBuilder.Sql(...)` com o backfill do research R4 (translate de acentos pt-BR, `regexp_replace(lower(...),'[^a-z0-9]+','-','g')`, `btrim(...,'-')`, `left(...,80)` + `rtrim('-')`, vazio → `campanha`/`mapa`, duplicatas `-n` por `row_number() over (partition by base order by id)`, segunda passada acrescentando `-{id}` a colisões restantes) → `AlterColumn` not null → criar os índices únicos; `Down` remove índices e colunas (depende de T004)
- [X] T006 [P] Script incremental `database/migrations/029-slugs.sql` (mesmo SQL de T005, idempotente como os scripts 024–027) e `database/roll6.sql` regenerado com `dotnet ef migrations script --idempotent … -o ../database/roll6.sql` mantendo o cabeçalho (depende de T005)
- [X] T007 `backend/Roll6.Infra.Interfaces/Repository/ICampaignRepository.cs` + `backend/Roll6.Infra/Repository/CampaignRepository.cs`: `GetBySlugAsync(string slug)`, `ListSlugsWithPrefixAsync(string baseSlug)` (slug = base ou `LIKE base-%`), e `InsertAsync` passa a atribuir `Slug.NextFree(Slug.From(entity.Name,"campanha"), taken)` e repetir (até `MAX_INSERT_ATTEMPTS`) em `UniqueViolation` com `ConstraintName == "ix_campaigns_slug"`, desanexando a entidade como em `MapRepository` (depende de T001, T004)
- [X] T008 `backend/Roll6.Infra.Interfaces/Repository/IMapRepository.cs` + `backend/Roll6.Infra/Repository/MapRepository.cs`: `GetBySlugAsync(string slug)` (inclui Deleted; o service decide), `ListSlugsWithPrefixAsync`, e `InsertWithNextSequenceAsync` calcula o slug depois do nome (`Slug.From(entity.Name,"mapa")` + `NextFree`) e trata no mesmo retry violação de `ix_maps_campaign_model_sequence` **ou** `ix_maps_slug` (depende de T001, T004)
- [X] T009 [P] `slug` (`[JsonPropertyName("slug")]`) em `backend/Roll6.DTO/Campaign/CampaignInfo.cs` e `backend/Roll6.DTO/Map/MapInfo.cs`; preencher em `MapToDtoAsync`/`MapToDto` de `backend/Roll6.Domain/Services/CampaignService.cs` e `backend/Roll6.Domain/Services/MapService.cs` (depende de T003)
- [X] T010 [P] Frontend: `slug: string` em `CampaignInfo` (`frontend/src/types/campaign.ts`) e `MapInfo` (`frontend/src/types/map.ts`); `mapSlug: string | null` em `MapDraft` e em `draftFromMapModel`/`createEmptyDraft` de `frontend/src/lib/draft.ts` (não entra em `isDirty`), com ajuste em `frontend/src/lib/draft.test.ts`
- [X] T011 Testes em `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs` e `MapServiceTests.cs`: `CreateAsync` devolve o `slug` gravado pelo repositório; `RenameAsync`/`UpdateAsync` não alteram o slug

**Checkpoint**: `dotnet build`, `dotnet test`, migração gerada; `npm test` verde.

---

## Phase 3: User Story 2 - Slugs e rotas de campanha e mapa (Priority: P1)

**Goal**: `/campaign/<slug>` e `/map/<slug>` abrem a mesa; a URL acompanha o que está aberto.

**Independent Test**: abrir `/campaign/tormento-vil` e `/map/estrada-1` numa aba nova (logado e deslogado), recarregar, voltar/avançar, slug inválido → aviso e `/`.

### Backend

- [X] T012 [US2] `GetBySlugAsync(string slug)` em `backend/Roll6.Domain/Interfaces/ICampaignService.cs` + `backend/Roll6.Domain/Services/CampaignService.cs` (404 `Campanha não encontrada.`; mesma regra de `GetByIdAsync`) e `GetBySlugAsync(long userId, string slug)` em `backend/Roll6.Domain/Interfaces/IMapService.cs` + `backend/Roll6.Domain/Services/MapService.cs` (Deleted → 404 `Mapa não encontrado.`; `EnsureCanReadCampaignAsync`)
- [X] T013 [US2] Endpoints `[HttpGet("slug/{slug}")]` em `backend/Roll6.API/Controllers/CampaignController.cs` e `backend/Roll6.API/Controllers/MapController.cs` (try/catch + `HandleException`, `ProducesResponseType` como os vizinhos) (depende de T012)
- [X] T014 [P] [US2] Testes em `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs` e `MapServiceTests.cs`: slug existente → DTO; inexistente → `KeyNotFoundException`; mapa Deleted → 404; usuário sem acesso ao mapa → `UnauthorizedAccessException`; participante aprovado → ok
- [X] T015 [US2] MCP `get_campaign_by_slug` em `backend/Roll6.Mcp/Tools/CampaignTools.cs` e `get_map_by_slug` em `backend/Roll6.Mcp/Tools/MapTools.cs` (`[ApiOperation]`, ReadOnly/Idempotent, descrição com as seções padrão, parâmetro `slug` documentado via `McpDocs`); contagens +2 em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (depende de T013)

### Frontend

- [X] T016 [P] [US2] `getBySlug(slug)` em `frontend/src/Services/campaignService.ts` e `frontend/src/Services/mapService.ts` (`encodeURIComponent`, `handleResponse`)
- [X] T017 [P] [US2] `frontend/src/lib/tableRoute.ts` + `tableRoute.test.ts`: `interface TablePath { kind: 'root' | 'campaign' | 'map'; slug: string | null }`, `parseTablePath(pathname)` (`/campaign/x`, `/map/x`, com/sem barra final, decodifica; qualquer outro → root), `tablePathFor({ campaignSlug, mapSlug, mapCampaignId, campaignId })` → `/map/<mapSlug>` quando há mapa de campanha aberto da campanha atual, `/campaign/<slug>` quando há campanha, `/` senão; `isTablePath(pathname)`
- [X] T018 [US2] `frontend/src/App.tsx`: rotas `/campaign/:slug` e `/map/:slug` com `<ProtectedRoute><MainPage /></ProtectedRoute>`; `frontend/src/components/ProtectedRoute.tsx` redireciona com `state={{ from: location.pathname }}`; `frontend/src/pages/LoginPage.tsx` navega para `state.from` (se `isTablePath`) ou `/` após login/cadastro
- [X] T019 [US2] `frontend/src/Contexts/CampaignContext.tsx`: restaurar `roll6:campaign` só quando `parseTablePath(window.location.pathname).kind === 'root'`; expor `getCampaignBySlug(slug)` (via service) (depende de T016, T017)
- [X] T020 [US2] `frontend/src/Contexts/MapEditorContext.tsx`: restaurar `roll6:map` só no path `/` (senão `markRestored(true)` direto); expor `openCampaignMapBySlug(slug)` (`mapService.getBySlug` → `loadMapModel(map.mapModelId, map)`, devolve o `MapInfo`) no `MapEditorContextType` (depende de T010, T016, T017)
- [X] T021 [US2] `frontend/src/hooks/useTableRoute.ts` (usado em `frontend/src/pages/MainPage.tsx` com o `guard` de `useUnsavedGuard`): (1) URL → estado quando `useParams().slug`/tipo mudam: `pendingRef = true`; se já é o que está aberto, nada; `await guard()` (false → `navigate(tablePathFor(estado), { replace: true })`); campanha: `getCampaignBySlug` → `selectCampaign` (o seguir-o-mestre de 017 abre o mapa atual); mapa: `openCampaignMapBySlug` → `selectCampaign(getById(map.campaignId))` se outra campanha; 404 → `toast.error(t('route.notFound'))`, 403 → `t('route.forbidden')`, ambos `navigate('/', { replace: true })`; `finally pendingRef = false`. (2) estado → URL quando a chave `campaignId:mapId:mapSlug` muda e não há pendência: `navigate(tablePathFor(...), { replace: true })` se diferente de `location.pathname` (depende de T018–T020)
- [X] T022 [US2] Escolhas do usuário passam a navegar (push): `frontend/src/components/modals/CampaignModal.tsx` (selecionar/criar campanha → `navigate('/campaign/' + slug)`), `frontend/src/components/modals/MapModal.tsx` (abrir mapa de campanha → `navigate('/map/' + slug)`; modelo fora de campanha continua `loadMapModel` direto) e `openMapFromSettings` em `frontend/src/components/menu/TopMenu.tsx` (aba Mapas → `navigate('/map/' + map.slug)`) — o guard fica no `useTableRoute` (depende de T021)
- [X] T023 [P] [US2] Chaves `route.notFound` ("Campanha ou mapa não encontrado.") e `route.forbidden` ("Você não tem acesso a este mapa.") em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: rotas funcionando com os seletores antigos; seguir o mestre atualiza a URL do jogador.

---

## Phase 4: User Story 1 - Combo único de campanha e mapa (Priority: P1) 🎯 MVP (junto com US2)

**Goal**: um combo com uma entrada por campanha (mapa ativo em cima, `→ campanha` embaixo) no lugar dos dois seletores.

**Independent Test**: mestre de "Tormento Vil" (mapa ativo "Estrada 1") e aprovado em "Teste 2" (sem mapa): abrir o combo, conferir as entradas, clicar em "Estrada 1" → `/map/estrada-1`.

### Backend

- [X] T024 [P] [US1] DTO `backend/Roll6.DTO/Campaign/CampaignTableInfo.cs` (`campaignId`, `name`, `slug`, `isMaster`, `currentMapId?`, `currentMapName?`, `currentMapSlug?`, camelCase, doc comments)
- [X] T025 [US1] Repositório: `ListTableAsync(long userId)` em `ICampaignRepository`/`CampaignRepository` — campanhas com `user_id = userId` ∪ campanhas com `campaign_characters.status = Approved` cujo personagem tem `characters.user_id = userId`, left join no mapa atual só se `status = Active`, ordenadas por `lower(name)`, `campaign_id` (uma consulta, `AsNoTracking`) (depende de T024)
- [X] T026 [US1] `ListTableAsync(long userId)` em `backend/Roll6.Domain/Interfaces/ICampaignService.cs` + `backend/Roll6.Domain/Services/CampaignService.cs` (`isMaster = campaign.UserId == userId`) e `[HttpGet("table")]` em `backend/Roll6.API/Controllers/CampaignController.cs` (depende de T025)
- [X] T027 [P] [US1] Testes em `backend/Roll6.Tests/Domain/Services/CampaignServiceTests.cs`: `isMaster` correto; mapa atual nulo propagado
- [X] T028 [US1] MCP `list_my_table_campaigns` em `backend/Roll6.Mcp/Tools/CampaignTools.cs` + contagens +1 em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs` (depende de T026)

### Frontend

- [X] T029 [P] [US1] `CampaignTableInfo` em `frontend/src/types/campaign.ts` e `listTable()` em `frontend/src/Services/campaignService.ts`
- [X] T030 [P] [US1] `frontend/src/lib/tableSelect.ts` + `tableSelect.test.ts`: `tableEntries(campaigns, { campaignId, mapId })` → por campanha `{ key, mapLabel: string | null, mapPath, campaignLabel, campaignPath, mapActive, campaignActive }` (sem mapa ativo → `mapLabel` null e `mapPath = campaignPath`); `triggerLabels(draftName, campaignName)`
- [X] T031 [US1] `frontend/src/Contexts/CampaignContext.tsx`: `tableCampaigns: CampaignTableInfo[]` + `refreshTableCampaigns()` (carrega no login, limpa no logout; chamado depois de `createCampaign`, `selectCampaign` com `currentMapId` diferente e em erro silencioso mantém a lista anterior) (depende de T029)
- [X] T032 [US1] `frontend/src/Contexts/RealtimeContext.tsx`: em `campaign.changed`, `map.current` e `campaign.deleted` chamar `refreshTableCampaigns()`; `frontend/src/Contexts/MapEditorContext.tsx`: depois de `saveMap` criar um mapa de campanha, `refreshTableCampaigns()` (depende de T031)
- [X] T033 [US1] `frontend/src/components/menu/TableSelect.tsx`: Radix `DropdownMenu` (`modal={false}`, classes `dropdown-menu`/`dropdown-item`, como `CharacterSelect.tsx`); gatilho com legenda (`menu.tableSelect`), mapa aberto (`draft.name` ou `menu.noMapOpen`) e campanha; ao abrir chama `refreshTableCampaigns()`; itens de `tableEntries` — linha do mapa (itálico quando `menu.noActiveMap`) e linha recuada `→ campanha` (`ArrowRight`/texto `→`), `active` + `aria-current`; ao selecionar `navigate(path)`; separador + "Outras campanhas…" (`onOpenCampaign`) e "Mapas…" (`onOpenMap`); lista vazia mostra só as ações (depende de T030, T031)
- [X] T034 [US1] `frontend/src/components/menu/TopMenu.tsx`: trocar os dois `FakeSelect` por `<TableSelect onOpenCampaign onOpenMap />`, mantendo a engrenagem do mestre logo depois; ajustar `.stm-menu-break`/ordem mobile em `frontend/src/styles/app.css` e estilos `.stm-table-select` (linha recuada, texto secundário, largura máxima com ellipsis) (depende de T033)
- [X] T035 [P] [US1] Chaves `menu.tableSelect` ("Mesa"), `menu.noActiveMap` ("Sem mapa ativo"), `menu.noMapOpen` ("Sem mapa"), `menu.otherCampaigns` ("Outras campanhas…"), `menu.maps` ("Mapas…") em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: combo navega pelas rotas; guard de alterações não salvas funciona ao trocar pelo combo.

---

## Phase 5: User Story 3 - Notificação mostra só a narração (Priority: P2)

**Goal**: "Turno N finalizado" abre só a narração em markdown saneado.

**Independent Test**: processar um turno com narração `**negrito**` + lista → notificação → texto formatado, nada do log.

- [X] T036 [US3] `frontend/src/components/modals/TurnSummaryModal.tsx`: manter `listTurn(turnNo)`, filtrar `TURN_TYPE.narration`, renderizar cada `description` com `components/ui/MarkdownView` (saneado, lazy com `Suspense`); título `turn.summaryTitle`; sem narração → `turn.noNarration`; remover o `describe`/lista de entradas que ficaram sem uso
- [X] T037 [P] [US3] Chave `turn.noNarration` ("Este turno não teve narração.") em `frontend/src/i18n/locales/pt-BR.json` e estilo `.stm-turn-narration` em `frontend/src/styles/app.css`

**Checkpoint**: notificação mostra só a narração.

---

## Phase 6: User Story 4 - Compartilhar o mapa com a última narração (Priority: P3)

**Goal**: botão junto do zoom que compartilha imagem do mapa + narração formatada para WhatsApp.

**Independent Test**: no celular, Compartilhar → WhatsApp recebe imagem + texto; no desktop, download + texto copiado.

### Backend

- [X] T038 [P] [US4] DTO `backend/Roll6.DTO/Turn/TurnNarrationInfo.cs` (`turnNo`, `narration`, `finishedAt?`)
- [X] T039 [US4] `ListNarrationsAsync(long campaignId, int? turnNo, int beforeTurn)` em `backend/Roll6.Infra.Interfaces/Repository/ITurnRepository.cs` + `backend/Roll6.Infra/Repository/TurnRepository.cs`: entradas `TurnType.Narration` do turno pedido, ou do maior `turn_no < beforeTurn` que tenha narração, ordenadas por `created_at`, `turn_id` (depende de T038)
- [X] T040 [US4] `GetNarrationAsync(long userId, long campaignId, int? turnNo)` em `backend/Roll6.Domain/Interfaces/ITurnService.cs` + `backend/Roll6.Domain/Services/TurnService.cs` (leitura = mestre ou aprovado; une as descrições com `\n\n`; `finishedAt` = `created_at` da última; nenhuma → null) e `[HttpGet("{id:long}/turn/narration")]` em `backend/Roll6.API/Controllers/CampaignController.cs` (null → `NoContent()`) (depende de T039)
- [X] T041 [P] [US4] Testes em `backend/Roll6.Tests/Domain/Services/TurnServiceTests.cs`: sem `turnNo` pega o turno finalizado mais recente com narração (pula turnos sem); duas narrações no mesmo turno são unidas; sem narração → null; estranho → 403
- [X] T042 [US4] MCP `get_turn_narration` em `backend/Roll6.Mcp/Tools/TurnTools.cs` (parâmetro opcional `turnNo`; 204 → `{ ok: true }` documentado) + contagens +1 em `backend/Roll6.Tests/Mcp/McpCoverageTests.cs`; menção a slugs, `list_my_table_campaigns` e `get_turn_narration` em `backend/Roll6.Mcp/Roll6Guide.cs` (depende de T040)

### Frontend

- [X] T043 [P] [US4] `TurnNarrationInfo` em `frontend/src/types/turn.ts` e `narration(campaignId, turnNo?)` em `frontend/src/Services/turnService.ts` (204 → `null`)
- [X] T044 [P] [US4] `frontend/src/lib/whatsappText.ts` + `whatsappText.test.ts`: `markdownToWhatsApp(md)` (research R10: negrito, itálico, tachado, títulos → `*…*`, listas `*`/`+` → `- `, numeradas mantidas, links → `texto (url)`, imagens/HTML removidos, blocos de código preservados sem conversão interna, escapes desfeitos, 3+ linhas em branco → 1) e `buildShareText({ campaignName, mapName, turnNo, narration })`; casos: `**a** e *b*` → `*a* e _b_`; `## Título` → `*Título*`; `![x](u)` some; `<b>x</b>` → `x`; narração nula → só cabeçalho
- [X] T045 [P] [US4] `frontend/src/lib/mapSnapshot.ts` + `mapSnapshot.test.ts`: `snapshotBounds(draft, gridSize, hexSize)` (união da grade e da imagem de fundo, pura, testada) e `snapshotScale(bounds, maxSide = 2048)`; `renderMapSnapshot({ draft, tokens, hexSize }): Promise<Blob>` desenha num canvas (fundo `#1a1d21`, imagem de fundo em `(−imageLeft, −imageTop)` com o tamanho de exibição, contorno da grade com os cantos de `lib/hexGrid.ts`, peças como em `TokenLayer`: disco na cor do tipo, imagem recortada em círculo girada `(look − 3) × 60°`, marca de frente, inicial sem imagem); `loadImage(url)` com `crossOrigin = 'anonymous'` que resolve `null` em erro (imagem omitida); `toBlob('image/jpeg', 0.9)`
- [X] T046 [US4] `frontend/src/hooks/useMapShare.ts`: `share()` — exige `draft.mapId` e `currentCampaign`; `Promise.all([renderMapSnapshot(...), turnService.narration(campaignId)])`; arquivo `roll6-${draft.mapSlug}.jpg`; `navigator.canShare?.({ files })` → `navigator.share({ files, text, title })` (`AbortError` silencioso); senão download via `<a download>` + `navigator.clipboard.writeText(text)` + `toast.info(t('share.fallback'))`; erro → `toast.error(t('share.error'))`; estado `sharing` (depende de T043–T045)
- [X] T047 [US4] `ShareIcon` (Bootstrap Icons `share`, `currentColor`, `size`) em `frontend/src/components/ui/icons.tsx` e botão em `frontend/src/components/map/MapControls.tsx` depois do zoom (`title`/`aria-label` `map.share`, visível só com mapa de campanha aberto — inclusive em telefones —, desabilitado com spinner enquanto `sharing`) (depende de T046)
- [X] T048 [P] [US4] Chaves `map.share` ("Compartilhar"), `share.fallback` ("Imagem baixada e texto copiado — cole no WhatsApp."), `share.error` ("Não foi possível gerar a imagem do mapa."), `share.turn` ("Turno {{no}}") em `frontend/src/i18n/locales/pt-BR.json`

**Checkpoint**: compartilhamento funcionando no celular e com fallback no desktop.

---

## Phase 7: Polish & Cross-Cutting

- [X] T049 [P] `CLAUDE.md`: backend (slugs imutáveis e globais, retry nos índices, endpoints `slug/{slug}`, `table`, `turn/narration` e tools MCP; contagem de tools) e frontend (rotas `/campaign/:slug`/`/map/:slug`, `useTableRoute` como único ponto estado→URL, restauração só em `/`, `TableSelect`, notificação só com a narração, `useMapShare`/`mapSnapshot`/`whatsappText`, CORS do bucket e `try_files` no nginx de produção); entrada em "Recent Changes"
- [X] T050 Rodar `cd backend && dotnet build Roll6.sln && dotnet test` e `cd frontend && npm run lint && npm test && npm run build`; corrigir falhas
- [ ] T051 Validar manualmente os passos de `specs/029-slug-routes-map-share/quickstart.md` (combo, rotas, deep link com login, seguir o mestre, notificação, compartilhar no celular e no desktop)

---

## Dependencies & Execution Order

- **Phase 2** bloqueia tudo que usa slug (US1, US2, e o nome do arquivo em US4).
- **US2 (Phase 3)** antes de **US1 (Phase 4)**: o combo navega pelas rotas e depende de `useTableRoute`.
- **US3 (Phase 5)** é independente de tudo (só frontend) — pode ser feita a qualquer momento.
- **US4 (Phase 6)**: backend independente; frontend usa `draft.mapSlug` (T010).
- Dentro de cada fase: DTO/repositório → service → controller → MCP (contagem de tools muda a cada tool: T015, T028, T042 editam o mesmo arquivo de teste, em sequência).

### Parallel Opportunities

- Phase 2: T001, T002, T009, T010 juntos; T006 depois de T005.
- US2: T014, T016, T017, T023 em paralelo com o backend T012–T013.
- US1: T024, T027, T029, T030, T035 em paralelo.
- US3 inteira em paralelo com US1/US2.
- US4: T038, T043, T044, T045, T048 em paralelo; T041 junto com T040.

## Implementation Strategy

1. **MVP**: Phase 2 + US2 + US1 — slugs, rotas e o combo (navegação principal da mesa).
2. **Incremento 2**: US3 (pequena, só frontend).
3. **Incremento 3**: US4 (compartilhar), depois de configurar o CORS do bucket.
4. Polish: `CLAUDE.md`, build/testes completos e roteiro do quickstart.
