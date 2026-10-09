# Implementation Plan: Metadados do mapa e favicon da marca

**Branch**: `040-map-page-metadata` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/040-map-page-metadata/spec.md` (issue #35 + favicon)

## Summary

1. **Prévia de link** (US1): o `index.html` ganha um bloco SSI do nginx que é substituído pelo fragmento de `GET /api/meta/head/{**path}`, um endpoint anônimo que monta as tags Open Graph e Twitter do mapa (`/map/{slug}`), da campanha (`/campaign/{slug}`) ou genéricas. A imagem vem de `GET /api/meta/image/map/{slug}.jpg`, também anônimo: um JPEG de 1200×630 gerado com SkiaSharp a partir da imagem do mapa, guardado em memória e com URL estável. Mapas inexistentes ou sem imagem usam a imagem da marca (`/brand/og-default.png`). Nada da mesa (peças, NPCs, fichas, turnos) entra.
2. **Título da aba** (US2): `lib/documentTitle` + `hooks/useDocumentTitle`, no formato "{mapa} — {campanha} | Roll6".
3. **Favicon** (US3): `favicon.ico` com 16/32/48, PNGs de 32/48, `apple-touch-icon` de 180 e `og-default` de 1200×630, gerados a partir do símbolo da logo escura e declarados no `index.html`.

O nginx de homolog ganha `ssi on;`. O de produção, que fica fora do repositório, precisa da mesma linha, e ela fica documentada.

## Technical Context

**Language/Version**: C# 12 / .NET 8 (backend); TypeScript 5 / React 18 (frontend)
**Primary Dependencies**: ASP.NET Core 8, EF Core 9, AWSSDK.S3 (existentes) · **novo: `SkiaSharp` + `SkiaSharp.NativeAssets.Linux.NoDependencies`** (só a geração do JPEG da prévia) · `Microsoft.Extensions.Caching.Memory` (shared framework) · React 18, i18next (existentes) · nginx `ngx_http_ssi_module` (já embutido na imagem `nginx`)
**Storage**: nenhuma mudança de esquema; cache em memória para os JPEGs da prévia (≈ 32 MB no máximo)
**Testing**: xUnit + FluentAssertions + Moq (`PageMetaHtmlTests`, `PageMetaServiceTests`, `PreviewImageRendererTests`, `McpCoverageTests`); Vitest (`documentTitle.test.ts`)
**Target Platform**: contêineres Linux (Debian) para a API; nginx na frente em homolog e produção; navegadores e robôs de prévia
**Project Type**: aplicação web (`backend/` + `frontend/`)
**Performance Goals**: fragmento de metadados em menos de 50 ms (uma ou duas consultas por chave); JPEG gerado uma vez por imagem e depois servido da memória; carregamento do site no máximo 10% mais lento (SC-005)
**Constraints**: sem login nos dois endpoints de meta, expondo só nome, campanha, mestre, grade e imagem (FR-005); nenhuma permissão existente muda (FR-010); todo texto passa por encoding HTML (FR-008); URL da imagem válida por 7 dias ou mais (FR-007); indexação permitida (FR-011); MCP continua com 86/87 (endpoints em `EXCLUDED`)
**Scale/Scope**: backend com `MetaController`, `PageMetaService`, `Domain/Meta/PageMetaHtml`, `IPreviewImageRenderer` + `SkiaPreviewImageRenderer`, `Site:BaseUrl` e 2 itens em `McpToolCatalog.EXCLUDED`; frontend com `index.html`, `public/` (favicon e og-default), `lib/documentTitle` e `hooks/useDocumentTitle`; `frontend/nginx.conf` com `ssi on;`; documentação da linha do nginx de produção

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura** | `dotnet-architecture` para services/DI | **PASS** | Serviço novo (`PageMetaService`, interface em `Infra.Interfaces`, DI em `Startup`) e renderer de imagem (`IPreviewImageRenderer` em `Infra.Interfaces`, implementação em `Infra`) seguem as camadas da skill. Nenhuma entidade ou tabela nova. |
| **II. Stack Tecnológica Fixa** | sem lib fora da stack sem justificativa | **PASS com justificativa** | SkiaSharp é a única dependência nova, só no backend e só para redimensionar a imagem da prévia. Está registrada em *Complexity Tracking*. Não há Docker local. |
| **III. Case Sensitivity** | `Contexts/`, `Services/`, `hooks/`, `types/` | **PASS** | `hooks/useDocumentTitle.ts`, `lib/documentTitle.ts`. |
| **IV. Convenções de Código** | DTO `[JsonPropertyName]`, `interface`, ProblemDetails | **PASS** | Os endpoints de meta devolvem HTML e imagem, não DTOs. Erros internos viram a prévia genérica ou o redirect da imagem da marca, por design: robô não lê ProblemDetails. |
| **V. Banco PostgreSQL** | — | **N/A** | Nada no banco. |
| **VI. Autenticação e Segurança** | `[Authorize]` em dados sensíveis | **PASS** | `[AllowAnonymous]` apenas nos 2 endpoints de prévia, por decisão do usuário (Clarifications, FR-005), expondo só os campos listados e com encoding HTML. Nenhuma outra rota muda. |
| **VII. Grid Hexagonal** | — | **N/A** | Nenhuma conta de grade (a descrição usa só largura×altura). |

**Resultado**: uma justificativa (SkiaSharp) em *Complexity Tracking*; nenhuma violação.

**Reavaliação pós-Fase 1**: `contracts/contracts.md` confirma que só os 2 endpoints novos são anônimos e que os contratos existentes não mudam. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/040-map-page-metadata/
├── plan.md, research.md (D1..D8), data-model.md, quickstart.md
├── contracts/contracts.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── Roll6.Domain/Meta/PageMeta.cs                    # NOVO — record do conteúdo (título, descrição, URLs, alt)
├── Roll6.Domain/Meta/PageMetaHtml.cs                # NOVO — puro: corte em palavra, encoding, fragmento de tags
├── Roll6.Domain/Services/PageMetaService.cs         # NOVO — mapa / campanha / genérica a partir dos repositórios
├── Roll6.Infra.Interfaces/AppServices/IPreviewImageRenderer.cs  # NOVO
├── Roll6.Infra.Interfaces/Services/IPageMetaService.cs          # NOVO (onde ficam as interfaces de service)
├── Roll6.Infra/AppServices/SkiaPreviewImageRenderer.cs          # NOVO — JPEG 1200×630 + IMemoryCache
├── Roll6.Application/Startup.cs                     # DI, AddMemoryCache, Site:BaseUrl
├── Roll6.API/Controllers/MetaController.cs          # NOVO — GET /api/meta/head/{**path}, GET /api/meta/image/map/{slug}.jpg
├── Roll6.API/appsettings*.json                      # Site:BaseUrl
├── Roll6.Infra/Roll6.Infra.csproj                   # SkiaSharp (+ NativeAssets.Linux.NoDependencies)
└── Roll6.Tests/{Domain/Meta,Domain/Services,Infra,Mcp}/…        # testes + EXCLUDED

frontend/
├── index.html                                       # favicons, theme-color, bloco SSI
├── nginx.conf                                       # ssi on; no location /
├── public/favicon.ico, public/brand/{favicon-32,favicon-48,apple-touch-icon,og-default}.png  # NOVOS
├── src/lib/documentTitle.ts (+ test)                # NOVO
├── src/hooks/useDocumentTitle.ts                    # NOVO
└── src/pages/MainPage.tsx, src/pages/LoginPage.tsx  # chamam o hook / voltam a "Roll6"
```

**Structure Decision**: aplicação web existente. O `CLAUDE.md` documenta os endpoints de meta, o `Site:BaseUrl`, o SSI (com a linha `ssi on;` para o nginx de produção) e o favicon, e ganha a entrada em *Recent Changes*. `.env.prod.example` e o workflow não mudam, porque `Site:BaseUrl` não é segredo e vai em `appsettings.Production.json`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Nova dependência de backend: `SkiaSharp` (+ assets nativos Linux) | A prévia precisa de uma imagem pequena (os aplicativos de mensagem descartam imagens grandes) com URL estável. As imagens de mapa chegam a 10 MB, e o .NET 8 não tem API multiplataforma para redimensionar imagens. | Servir a original: pesada demais para o WhatsApp. ImageSharp: licença Six Labors. Gerar no navegador ao salvar: precisa de coluna nova e não cobre os mapas antigos. `System.Drawing`: só Windows no .NET 8. |
