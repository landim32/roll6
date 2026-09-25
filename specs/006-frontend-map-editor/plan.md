# Implementation Plan: Frontend — Login e Editor de Mapa

**Branch**: `006-frontend-map-editor` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-frontend-map-editor/spec.md`

## Summary

Criar o frontend em `frontend/` (React 18 + TypeScript + Vite 6 + Bootstrap 5 em tema escuro):
login/cadastro, tela principal com o mapa em SVG (imagem + grid hexagonal flat-top, zoom e pan),
menu com campanha e mapa atuais em modais com abas, botões de imagem+ e redimensionamento, rodapé
com o tamanho da grid e salvamento do mapa (novo, próprio ou cópia, entrando na campanha atual).
A geometria fica em `src/lib/hexGrid.ts`, espelho do `HexGrid` do backend. No backend, só o
parâmetro `mine=true` nas listagens de campanhas e modelos de mapa. Detalhes em
[research.md](./research.md), [data-model.md](./data-model.md) e [contracts/ui.md](./contracts/ui.md).

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x (frontend); C# 12 / .NET 8.0 (ajuste no backend)
**Primary Dependencies**: Vite 6, React Router 6, Bootstrap 5.3, i18next 25 + react-i18next, sonner (toasts), @radix-ui/react-dialog (modal base); Vitest (dev)
**Storage**: `localStorage` (sessão e campanha atual); dados via API do backend
**Testing**: Vitest (`src/lib/hexGrid.test.ts` e utilitários); xUnit no backend para o filtro `mine`
**Target Platform**: navegadores modernos de desktop
**Project Type**: web application (frontend SPA + backend existente)
**Performance Goals**: zoom/pan fluidos com grid de até 100 × 100 hexágonos (SC-004)
**Constraints**: somente tema escuro; toda janela extra em modal; alterações só gravadas ao salvar
**Scale/Scope**: 2 telas, 6 modais, 3 contexts, 5 services, 1 módulo de geometria

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | `react-architecture` para Types → Service → Context → Hook → provider (Auth, Campaign, MapEditor), com os ajustes da research R1; `dotnet-architecture` no ajuste do backend | ✅ |
| II | Stack fixa | React 18, TS 5, Vite 6, React Router 6, Bootstrap 5, i18next 25, Fetch API, Context API; sem Redux/Zustand; `sonner`/Radix vêm das skills `react-alert`/`react-modal`; Vitest como exceção (ver Complexity Tracking) | ✅ |
| III | Casing de diretórios | `src/Contexts/`, `src/Services/`, `src/hooks/`, `src/types/` (diverge da skill; constituição prevalece) | ✅ |
| IV | Convenções de código | `interface` para tipos, arrow functions, `const`, PascalCase em componentes, camelCase em funções | ✅ |
| V | Banco | Sem mudança de esquema | ➖ N/A |
| VI | Autenticação e segurança | Token em `localStorage`, nunca cookie; nada secreto no frontend; `VITE_API_URL` | ✅ |
| VII | Grid hexagonal | Flat-top, `x`/`y` odd-q, `hexGrid.ts` espelho 1:1 do backend com testes dos mesmos valores | ✅ |
| — | Respostas / erros | Services leem DTO direto e `ProblemDetails` (sem `sucesso`) | ✅ |

Re-check pós-design: sem violações além da exceção registrada.

## Project Structure

### Documentation (this feature)

```text
specs/006-frontend-map-editor/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
frontend/
├── package.json, vite.config.ts, tsconfig*.json, eslint.config.js, index.html, .env.example
└── src/
    ├── main.tsx                 providers: AuthProvider → CampaignProvider → MapEditorProvider → App
    ├── App.tsx                  rotas + <Toaster theme="dark" />
    ├── i18n/                    index.ts, locales/pt-BR.json
    ├── styles/app.css           variáveis --stm-*, layout do mapa
    ├── types/                   common, auth, campaign, mapModel, map, image
    ├── Services/                apiHelpers, authService, campaignService, mapModelService, mapService, imageService
    ├── Contexts/                AuthContext, CampaignContext, MapEditorContext
    ├── hooks/                   useAuth, useCampaign, useMapEditor
    ├── lib/                     hexGrid.ts (+ hexGrid.test.ts), draft.ts (igualdade/rascunho)
    ├── components/
    │   ├── ui/                  Modal, ConfirmModal, Tabs, FakeSelect, PagedList
    │   ├── map/                 MapCanvas, HexGridLayer, ImageLayer, ResizeHandles, MapControls, GridSizeFooter
    │   ├── menu/                TopMenu
    │   └── modals/              CampaignModal, MapModal, ImageModal, GridSizeModal, SaveMapModal, UnsavedChangesModal
    └── pages/                   LoginPage, MainPage

backend/ (ajuste)
├── SimpleTabletopMap.Infra.Interfaces/Repository/  ICampaignRepository, IMapModelRepository (+ ownerUserId?)
├── SimpleTabletopMap.Infra/Repository/             CampaignRepository, MapModelRepository
├── SimpleTabletopMap.Domain/Services/              CampaignService, MapModelService (repasse de mine)
└── SimpleTabletopMap.API/Controllers/              CampaignController, MapModelController ([FromQuery] bool mine)
```

**Structure Decision**: aplicação web com `frontend/` ao lado de `backend/`, como reservado no
plano da feature 001. A pasta `lib/` concentra código puro sem React (geometria e rascunho).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Vitest (dev) fora da tabela de stack | testar `hexGrid.ts` contra os valores de referência do backend (SC-006 da feature 002) | sem executor de testes a paridade backend/frontend não é verificável; Jest exige config extra para ESM/Vite |
| `@radix-ui/react-dialog` e `sonner` fora da tabela | exigidos pelas skills `react-modal` e `react-alert` do projeto | modal/toast do Bootstrap puro exigem manipulação imperativa do DOM e divergiriam das skills |
