# Research — 029 Slugs, combo unificado, narração na notificação e compartilhar mapa

## R1. Geração do slug (backend)

- **Decision**: função pura `Roll6.Domain/Slugs/Slug.cs` — `Slug.From(string? name, string fallback)`: `Normalize(FormD)`, remove `NonSpacingMark`, minúsculas, toda sequência fora de `[a-z0-9]` vira `-`, tira hífens das pontas, corta a base em 80 caracteres (sem hífen final); vazio → `fallback` (`campanha` / `mapa`). `Slug.WithSuffix(base, n)` = `base` para n = 1, `base-n` para n ≥ 2. Coluna `varchar(100)`.
- **Rationale**: mesma regra para campanha e mapa, testável sem banco; 80 + sufixo cabem em 100.
- **Alternatives**: pacote Slugify (dependência nova para 15 linhas); gerar no frontend (o slug é dado do servidor e precisa ser único).

## R2. Unicidade e concorrência

- **Decision**: índices únicos `ix_campaigns_slug` e `ix_maps_slug` (globais). O repositório calcula o menor sufixo livre (`ListSlugsWithPrefixAsync(base)` → slugs `base` e `base-%`, escolhe o menor n livre) e insere; em `UniqueViolation` **nesse índice** (`PostgresException.ConstraintName`) recalcula e tenta de novo — o mesmo laço de `MapRepository.InsertWithNextSequenceAsync`, que passa a tratar os dois índices (sequência e slug). Mapas apagados (soft delete) continuam na tabela, portanto reservam o slug; mapas removidos na exclusão da campanha liberam o slug junto com a campanha.
- **Rationale**: slug global porque `/map/<slug>` não traz a campanha; o retry já é o padrão do projeto.
- **Alternatives**: slug `campanha/mapa` (rota diferente da pedida); sufixo com o id (URLs feias).

## R3. Slug imutável

- **Decision**: definido só na criação (`Campaign.AssignSlug`/`Map.AssignSlug`, usados apenas pelo repositório no insert); `Rename`/`Update` não tocam no slug. Nenhum endpoint recebe slug.
- **Rationale**: links enviados ao grupo não quebram (spec FR-004).

## R4. Backfill das linhas existentes

- **Decision**: migração `AddSlugs` = coluna nula → SQL de preenchimento → `NOT NULL` + índice único. O SQL usa `translate()` para acentos do português (sem depender da extensão `unaccent`), `regexp_replace(lower(...), '[^a-z0-9]+', '-', 'g')`, `btrim(..., '-')`, `left(..., 80)`, vazio → `campanha`/`mapa`; duplicatas por `row_number() over (partition by base order by id)` recebem `-n`; uma segunda passada acrescenta `-{id}` a qualquer colisão restante (caso raro de "Teste" ×2 + "Teste 2"). Script incremental `database/migrations/029-slugs.sql` e `database/roll6.sql` regenerado.
- **Rationale**: produção aplica migrações no startup; SQL puro evita código C# rodando dentro da migração.
- **Alternatives**: preencher no startup em C# (acoplaria o startup a dados); `unaccent` (extensão pode não existir no PostgreSQL externo).

## R5. Endpoints novos

- **Decision**:
  - `GET /api/campaign/slug/{slug}` → `CampaignInfo` (mesma regra de `GET /api/campaign/{id}`: qualquer usuário logado).
  - `GET /api/map/slug/{slug}` → `MapInfo` (mestre ou aprovado; apagado → 404).
  - `GET /api/campaign/table` → `CampaignTableInfo[]` — campanhas em que o usuário é mestre ou tem personagem aprovado, ordenadas por nome, com o mapa atual (`currentMapId/Name/Slug`, nulos quando não há mapa atual **ativo**) e `isMaster`. Sem paginação (poucas campanhas por usuário).
  - `GET /api/campaign/{id}/turn/narration?turnNo=` → `TurnNarrationInfo { turnNo, narration, finishedAt }` da narração do turno pedido ou, sem `turnNo`, do turno finalizado mais recente que tenha narração; 204 quando não há. Mestre ou aprovado.
  - `CampaignInfo.slug` e `MapInfo.slug` novos.
- **Rationale**: o combo precisa do mapa atual de várias campanhas numa chamada; o compartilhamento precisa só da última narração (o `history` devolve o texto de ações, não a narração crua). A notificação usa `GET /api/campaign/{id}/turn/{turnNo}` existente e filtra `TurnType.Narration` — sem endpoint novo.
- **MCP**: cada action nova ganha sua tool (`get_campaign_by_slug`, `get_map_by_slug`, `list_my_table_campaigns`, `get_turn_narration`), exigido por `McpCoverageTests`/`McpRouteParityTests`/`McpDescriptionTests`.

## R6. Rotas e sincronização URL ↔ estado (frontend)

- **Decision**: `App.tsx` ganha `/campaign/:slug` e `/map/:slug` (mesmo `MainPage` protegido). `ProtectedRoute` passa `state.from` e o `LoginPage` volta para ele. Pure `lib/tableRoute.ts`: `parseTablePath(pathname)` → `{ kind: 'campaign'|'map'|'root', slug }` e `tablePathFor(draft, campaign)` → `/map/<draft.mapSlug>` quando há mapa de campanha aberto, `/campaign/<slug>` quando há campanha sem mapa aberto, `/` senão. Hook `hooks/useTableRoute.ts` (usado no `MainPage`):
  1. **URL → estado**: quando o `slug` do path muda (inclusive voltar/avançar), marca `pendingRef`, passa pelo `guard()` de alterações não salvas (cancelou → `navigate(tablePathFor(...), { replace: true })`), resolve por slug e aplica (`selectCampaign` e, para mapa, `loadMapModel`); erro 404/403 → toast + `navigate('/', { replace: true })`.
  2. **Estado → URL**: quando a chave `campaignId:mapId` do estado muda e não há `pendingRef`, `navigate(tablePathFor(...), { replace: true })` se diferente do path atual (seguir o mestre, salvar mapa novo, "Novo mapa", restauração).
  - As escolhas do usuário (combo, `CampaignModal`, `MapModal`, aba Mapas das configurações) fazem `navigate(path)` (push) em vez de carregar direto; carregar modelo fora de campanha continua direto e leva a `/`.
- **Restauração**: `CampaignContext` e `MapEditorContext` só restauram de `roll6:campaign`/`roll6:map` quando o path é `/`; em `/campaign|/map` marcam restaurado e deixam o hook resolver. O "seguir o mestre" (017) continua valendo depois disso; `/map/<slug>` explícito vale até a próxima troca do mestre, como abrir outro mapa hoje.
- **Rationale**: a reação só a mudanças de path (1) e só a mudanças de estado (2) evita o laço em que um lado desfaz o outro.
- **Alternatives**: estado derivado só da URL (reescreveria `MapEditorContext`/017); `useSearchParams` (rota pedida é path).
- **Infra**: `frontend/nginx.conf` já tem `try_files … /index.html`; o nginx compartilhado de produção precisa do mesmo fallback para `/campaign/*` e `/map/*` (anotar no quickstart).

## R7. Combo unificado

- **Decision**: `components/menu/TableSelect.tsx`, Radix Dropdown com classes `dropdown-*` (como `CharacterSelect`/`UserMenu`, `modal={false}`). Gatilho = mapa aberto (ou "Sem mapa") em cima e campanha embaixo (legenda). Itens: por campanha, um `DropdownMenu.Item` para a linha do mapa (ou "Sem mapa ativo", que vai para a campanha) e outro para `→ Campanha` recuado; atual com `active`. Rodapé: "Outras campanhas…" (`CampaignModal`) e "Mapas…" (`MapModal`). Lista em `CampaignContext.tableCampaigns` + `refreshTableCampaigns()` (login, abrir o combo, `campaign.changed`/`map.current`/`campaign.deleted` via `RealtimeContext`, criar campanha, salvar mapa novo). Pure `lib/tableSelect.ts` monta as entradas (texto, destino, ativo) — testado.
- **Rationale**: mesmo componente/estilo dos outros combos do menu; os modais atuais continuam para busca/criação.

## R8. Notificação só com a narração

- **Decision**: `TurnSummaryModal` passa a carregar `listTurn(turnNo)` e renderizar só as entradas `TURN_TYPE.narration` com `components/ui/MarkdownView` (saneado, lazy); nenhuma → "Este turno não teve narração". O log completo continua em `TurnLogModal`/console.

## R9. Imagem do mapa

- **Decision**: `lib/mapSnapshot.ts` desenha num `<canvas>` (não serializa o SVG, porque `<image>` externo não carrega em SVG-como-imagem): limites = união do retângulo da grade (`gridPixelSize`) e da imagem de fundo; escala para o maior lado ≤ 2048 px; fundo escuro, imagem de fundo, contorno da grade (mesma geometria de `lib/hexGrid.ts`), peças (disco com a cor do tipo, imagem em círculo girada `(look − 3) × 60°`, marca de frente, inicial quando não há imagem). Imagens carregadas com `crossOrigin = 'anonymous'`; a que falha é omitida (o canvas nunca fica "tainted"). `canvas.toBlob('image/jpeg', 0.9)`.
- **Requisito de infra**: o bucket (DigitalOcean Spaces) precisa de regra CORS `GET` para as origens do app; sem ela as imagens saem omitidas (a grade e os discos continuam). Documentado no quickstart.
- **Alternatives**: `html-to-image`/`html2canvas` (dependência nova e o mesmo problema de CORS); gerar no backend (renderização de imagem no .NET, muito mais pesado).

## R10. Texto para o WhatsApp e compartilhamento

- **Decision**: pure `lib/whatsappText.ts` — `markdownToWhatsApp(md)`: `**x**`/`__x__` → `*x*`, `*x*`/`_x_` → `_x_`, `~~x~~` → `~x~`, títulos `#…` → `*Título*`, listas `*`/`+` → `- `, numeradas mantidas, `[t](u)` → `t (u)`, imagens e HTML removidos, código inline mantido com crase, blocos com três crases mantidos, escapes `\*` desfeitos, linhas em branco múltiplas colapsadas. `buildShareText({ campaignName, mapName, turnNo, narration })` = `*Campanha — Mapa*` + `Turno N` + narração convertida (ou só o cabeçalho). `hooks/useMapShare.ts`: gera blob + texto em paralelo (`turnService.narration`), `navigator.canShare({ files })` → `navigator.share({ files, text, title })`; `AbortError` = silencioso; sem suporte → download (`<a download>`) + `navigator.clipboard.writeText` + toast.
- **Rationale**: WhatsApp aceita `*`, `_`, `~`, ``` e listas simples; a Web Share API com arquivos existe no Android/iOS (Chrome/Safari) e em alguns desktops.

## R11. Ícone

- **Decision**: `ShareIcon` (Bootstrap Icons `share`) em `components/ui/icons.tsx`; botão em `MapControls` após o zoom, visível só com `draft.mapId !== null` e campanha atual, também em telefones.
