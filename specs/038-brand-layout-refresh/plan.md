# Implementation Plan: Novo visual e logomarca do Roll6

**Branch**: `038-brand-layout-refresh` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-brand-layout-refresh/spec.md` (issue #36)

## Summary

Trocar a identidade visual do frontend pela da nova logomarca (só versões escuras), sem mudar comportamento:

1. **Paleta da marca em tokens**: um novo `styles/theme.css`, entre o Bootstrap e o `app.css`, define a paleta tirada da logo (fundo `#0b1220`, superfícies azul-ardósia e um **único verde** `#1fd67a` para destaque, sucesso e movimento válido, com texto `#071322` sobre ele) e a repassa às variáveis do Bootstrap 5.3 e às dos componentes que o CSS compilado fixa em azul. Não usa Sass nem dependência nova.
2. **Logomarca**: arquivos WebP/PNG otimizados em `public/brand/`, gerados uma vez dos PNGs escuros, e um componente `BrandLogo` (vertical, horizontal ou símbolo, com o texto "Roll6" se a imagem falhar). A vertical vai no login, a horizontal no menu do desktop e o símbolo no menu do celular e nos favicons.
3. **Login redesenhado**: fundo da marca com padrão de hexágonos em CSS, logo vertical em destaque e cartão novo. Campos e fluxo iguais.
4. **Acabamento uniforme**: cantos, sombras e títulos com tokens nas janelas, nos painéis e nos menus suspensos, os dourados restantes passam ao verde e o fundo do mapa, da vista 3D e da captura passa ao novo azul-escuro. Alturas e posições não mudam.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (só frontend)
**Primary Dependencies**: React 18, Vite 6, Bootstrap 5.3 (dark, CSS compilado), i18next, sonner. **Nenhuma dependência nova** (sem Sass, sem fonte web).
**Storage**: N/A
**Testing**: Vitest (`environment: node`) para a lógica pura que existir (`brandAsset`); o resto é visual, validado pelo `quickstart.md` (manual + Lighthouse)
**Target Platform**: navegadores desktop e celular; servido pelo nginx (homolog) e pelo nginx do servidor (produção), que entregam `public/` como está
**Project Type**: aplicação web (`frontend/` apenas)
**Performance Goals**: imagens da marca ≤ 100 KB no total; primeiro carregamento do login no máximo 10% mais lento (SC-004); nenhum custo por quadro no mapa
**Constraints**: só tema escuro; contraste ≥ 4.5:1 para texto e ≥ 3:1 para bordas de campo e ícones (FR-007); um único verde (FR-008); menu e rodapé com a mesma altura e ações no mesmo lugar (FR-010); nenhum hexadecimal da paleta fora de `theme.css`, exceto o fundo do canvas em `mapSnapshot`
**Scale/Scope**: 1 CSS novo (`theme.css`) · ajustes em `app.css` (login, menu, dourados, verdes do movimento, fundo do mapa/3D, cantos e sombras) · `BrandLogo` novo · `LoginPage`, `TopMenu`, `index.html`, `lib/mapSnapshot.ts` · ~10 arquivos em `public/brand/` · 0 mudanças em backend, MCP ou banco

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status | Como este plano atende |
|---|---|---|---|
| **I. Skills de Arquitetura** | `react-architecture` para entidades novas | **PASS** | Nenhuma entidade, service, context ou provider; só um componente de apresentação e CSS. |
| **II. Stack Tecnológica Fixa** | Bootstrap 5 (não Tailwind/shadcn), sem lib nova | **PASS** | Bootstrap 5.3 continua a base, tematizado por variáveis CSS; nenhuma dependência nova. O agent `ux-designer` (Tailwind/shadcn) não é usado. |
| **III. Case Sensitivity** | `Contexts/`, `Services/`, `hooks/`, `types/` | **PASS** | Arquivos novos em `components/ui/` e `styles/` (existentes); `public/brand/` em minúsculas. |
| **IV. Convenções de Código** | `interface`, arrow functions, sem `enum` | **PASS** | `BrandLogoProps` como `interface`; variantes como união de literais. |
| **V. Banco PostgreSQL** | — | **N/A** | Nada no banco. |
| **VI. Autenticação e Segurança** | token em localStorage | **PASS** | O login muda só o visual; `handleSubmit`, armazenamento da sessão e redirecionamentos ficam iguais. |
| **VII. Grid Hexagonal** | matemática de hex no módulo puro | **PASS** | O padrão de hexágonos do login é decorativo (SVG estático em CSS), não usa nem altera `lib/hexGrid.ts`; a grade do mapa só muda de cor onde usava o dourado. |

**Resultado**: sem violações; *Complexity Tracking* vazio.

**Reavaliação pós-Fase 1**: `data-model.md` só tem tokens e arquivos estáticos; `contracts/ui-contracts.md` não toca API nem MCP. **Gate: PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/038-brand-layout-refresh/
├── plan.md, research.md (D1..D10), data-model.md, quickstart.md
├── contracts/ui-contracts.md
├── checklists/requirements.md
└── tasks.md (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── index.html                            # favicons, apple-touch-icon, theme-color
├── public/brand/                         # NOVO — roll6-{vertical,horizontal,symbol}.{webp,png}, favicon-32/48.png, apple-touch-icon.png
└── src/
    ├── main.tsx                          # importa styles/theme.css entre o bootstrap e o app.css
    ├── styles/theme.css                  # NOVO — paleta da marca + variáveis do Bootstrap + componentes (btn, focus, nav, dropdown, pagination, form-check, progress) + sonner
    ├── styles/app.css                    # login redesenhado, .stm-menu-brand, dourado → verde, movimento ok → verde da marca, #1a1d21 → --stm-bg, cantos/sombras com tokens
    ├── components/ui/BrandLogo.tsx       # NOVO — <picture> webp/png, tamanho fixo, fallback para texto
    ├── lib/brandAsset.ts (+ test)        # NOVO — caminhos e proporção de cada variante (puro)
    ├── pages/LoginPage.tsx               # nova estrutura: fundo, logo vertical, cartão (mesma lógica)
    ├── components/menu/TopMenu.tsx       # BrandLogo horizontal (md+) / símbolo (< md) no lugar do texto
    └── lib/mapSnapshot.ts                # BACKGROUND = '#0b1220' (igual a --stm-bg)
```

**Structure Decision**: aplicação web existente; só o `frontend/` muda. O `CLAUDE.md` ganha uma linha sobre a identidade visual (tokens em `theme.css`, arquivos em `public/brand/`, um único verde) e a entrada em *Recent Changes*.

## Complexity Tracking

Sem violações da constituição.
