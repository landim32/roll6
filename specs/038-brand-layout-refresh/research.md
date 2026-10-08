# Research: Novo visual e logomarca do Roll6 (038)

Nenhum `NEEDS CLARIFICATION` ficou aberto. As decisões abaixo partem do código atual (`frontend/src/styles/app.css`, 1679 linhas, Bootstrap 5.3 compilado importado em `main.tsx`, tema escuro fixo) e das logomarcas escuras de `docs/logomarca`.

## D1 — Paleta tirada da logomarca

Amostragem dos pixels opacos de `roll6-horizontal-escuro.png` (cores agrupadas):

| Papel | Na logo | Token | Valor |
|---|---|---|---|
| Fundo da página | contorno azul-escuro (`#000818`–`#001020`) | `--stm-bg` | `#0b1220` |
| Superfície (menu, cartões, janelas) | — (um passo acima do fundo) | `--stm-surface` | `#121b2b` |
| Superfície 2 (hover, campos, abas) | — | `--stm-surface-2` | `#1a2638` |
| Borda decorativa | hexágonos ardósia (`#283850`–`#284058`) | `--stm-border` | `#2b3d52` |
| Borda de campo (precisa de 3:1) | ardósia clareado | `--stm-border-strong` | `#5b7694` |
| Destaque = sucesso = movimento válido | verde do "6" e dos hexágonos (`#08d078`–`#28e078`) | `--stm-accent` | `#1fd67a` |
| Fim do degradê (só decoração) | verde-água (`#00b890`–`#00c090`) | `--stm-accent-2` | `#00b890` |
| Texto | branco da logo (`#f0f0f0`–`#f8f8f8`) | `--bs-body-color` | `#e6edf3` |
| Texto secundário | ardósia claro (`#b8c8d0`) | `--bs-secondary-color` | `#9fb0c3` |
| Texto sobre o verde | contorno azul-escuro | `--stm-on-accent` | `#071322` |

Contraste medido (WCAG): texto/fundo 15.9:1; texto/superfície 14.6:1; texto/superfície 2 12.9:1; secundário/superfície 7.8:1; verde/fundo 9.8:1; **texto escuro sobre o verde 9.7:1**; borda de campo/superfície 3.7:1 (≥ 3:1, WCAG 1.4.11).

- **Decision**: os valores acima, definidos uma vez em `:root` e repassados ao Bootstrap.
- **Rationale**: FR-006 (tons derivados da logo) e FR-007 (contraste). **Texto branco sobre o verde dá só 1.9:1**, então botões e badges verdes usam texto azul-escuro, como o contorno da própria logo.
- **Alternatives considered**: verde mais escuro (`#198754`, o do Bootstrap) com texto branco, rejeitado porque não é o verde da marca; degradê nos botões, rejeitado por ser pesado e por o texto não ter contraste em toda a faixa.

## D2 — Como aplicar no Bootstrap sem Sass

- **Decision**: novo `frontend/src/styles/theme.css`, importado **entre** `bootstrap.min.css` e `app.css` em `main.tsx`. Ele redefine as variáveis do Bootstrap 5.3 em `[data-bs-theme="dark"]` (`--bs-body-bg`, `--bs-body-color`, `--bs-secondary-color`, `--bs-secondary-bg`, `--bs-tertiary-bg`, `--bs-border-color`, `--bs-primary`/`-rgb`, `--bs-success`/`-rgb`, `--bs-link-color`/`-rgb`/`-hover`, `--bs-primary-text-emphasis`, `--bs-primary-bg-subtle`, `--bs-primary-border-subtle`, os equivalentes de success, `--bs-focus-ring-color`) e as variáveis locais dos componentes que o CSS compilado fixa em `#0d6efd`: `.btn-primary`, `.btn-outline-primary`, `.btn-success`, `.btn-outline-success` (`--bs-btn-*`), `.form-control:focus`/`.form-select:focus`/`.form-check-input:focus` (borda + `box-shadow`), `.form-check-input:checked`, `.nav-pills`/`.nav-tabs` ativos, `.dropdown-menu` (`--bs-dropdown-link-active-bg`/`-color`), `.pagination` (`--bs-pagination-active-*`, `--bs-pagination-focus-box-shadow`), `.progress` (`--bs-progress-bar-bg`) e `.form-range`.
- **Rationale**: o Bootstrap 5.3 lê quase tudo de variáveis CSS; trocar a cor não exige recompilar o Bootstrap nem adicionar o `sass`, e mantém a stack fixa (Princípio II).
- **Alternatives considered**: compilar o Bootstrap com Sass e `$primary` (nova dependência de build); sobrescrever classe por classe em `app.css` (espalha a paleta).

## D3 — Um único verde (Clarification Q2)

- **Decision**: `--bs-success` = `--bs-primary` = `--stm-accent`. O caminho válido do modo Mover (`.stm-move-trail.is-ok`, `.stm-move-target.is-ok`, hoje `rgba(25,135,84,…)`) passa a `rgba(var(--stm-accent-rgb), …)`. Os toasts do `sonner` (`richColors`) recebem `--success-bg`/`--success-border`/`--success-text` no seletor `[data-sonner-toaster][data-theme="dark"]`.
- **Rationale**: FR-008. O vermelho de "excedido" (`--bs-danger`) e o cinza dos objetos ficam como estão; o verde da marca (9.8:1 sobre o fundo) é mais claro que o verde antigo e continua bem diferente do vermelho, inclusive para daltônicos protan/deutan, pela diferença de luminosidade.

## D4 — Logomarca: arquivos otimizados

- **Decision**: gerar uma vez, a partir dos PNGs escuros de `docs/logomarca`, e commitar em `frontend/public/brand/`:
  - `roll6-vertical.webp` com 320 px de largura (exibida a 160 px, 2×) e `roll6-vertical.png` como fallback;
  - `roll6-horizontal.webp` com 80 px de altura (exibida a 40 px, 2×) e `roll6-horizontal.png`;
  - `roll6-symbol.webp` e `roll6-symbol.png` com 64 px (exibido a 32 px, 2×), recortado do símbolo da logo horizontal (o hexágono, até o fim do contorno, antes do "r");
  - favicons `favicon-32.png`, `favicon-48.png`, `apple-touch-icon.png` (180 px, com fundo `--stm-bg`, porque o iOS não aceita transparência).
  O total fica em torno de 60–80 KB (SC-004 ≤ 100 KB). O recorte e os tamanhos ficam documentados em `quickstart.md`.
  - **Atualização na implementação**: PNG com paleta de 256 cores (quantização + Floyd–Steinberg) saiu **menor que o WebP q90** (a vertical tem 12,9 KB em PNG contra 20,8 KB em WebP) e sem perda visível, porque a logo tem poucas cores chapadas. Por isso o site usa **só PNG**: sem WebP e sem `<picture>`, com 7 arquivos e cerca de 32 KB no total.
- **Rationale**: FR-011 (proporção, nitidez 2×, peso). `public/` é servido como está pelo Vite e pelo nginx, sem hash, o que serve aos favicons e às `<link>` do `index.html`.
- **Alternatives considered**: importar os PNGs originais (≈ 1 MB cada); SVG (não existe vetor da marca e vetorizar seria arte nova, fora do escopo).

## D5 — Componente da marca

- **Decision**: `components/ui/BrandLogo.tsx` com `variant: 'vertical' | 'horizontal' | 'symbol'`, `<picture>` com `<source type="image/webp">` + `<img>` PNG, `width`/`height` explícitos (sem layout shift), `alt="Roll6"` e `decoding="async"`. Em `onError` troca para o texto `common.appName` com a classe `.stm-brand-text` (FR-012). O menu renderiza a horizontal com `d-none d-md-inline-flex` e o símbolo com `d-md-none` (Clarification Q3).
- **Rationale**: um só lugar decide arquivo, tamanho e fallback.

## D6 — Tela de login redesenhada (Clarification Q1)

- **Decision**: fundo `--stm-bg` com (a) um brilho radial verde muito suave atrás da logo e (b) um padrão de hexágonos *flat-top* em contorno, desenhado por um SVG em data URI repetido (`background-image`), na cor da borda com opacidade baixa. Tudo em CSS, sem imagem baixada. A logo vertical (160 px) fica acima de um cartão novo: `--stm-surface` com borda `--stm-border`, cantos de 1rem, sombra discreta e uma faixa superior de 3 px com o degradê verde → verde-água da logo. As abas Entrar/Criar conta, os campos, as mensagens e o botão continuam os mesmos, e o botão é o primário verde. No celular: logo de 120 px, cartão com largura total menos 1rem de margem e `min-height: 100dvh` para o teclado não esconder o botão.
- **Rationale**: FR-001 e a Clarification Q1, sem peso (SC-004) e coerente com o hexágono da marca.

## D7 — Acabamento das outras telas (US3)

- **Decision**: tokens de forma em `:root` (`--stm-radius: 0.75rem`, `--stm-radius-sm: 0.5rem`, `--stm-shadow: 0 8px 24px rgba(0,0,0,.35)`), aplicados a `.modal-content` do `components/ui/Modal`, aos `SidePanel`, aos menus suspensos e aos controles do mapa. Títulos de janela com `font-weight: 600`. Abas (`components/ui/Tabs`) com sublinhado verde no item ativo. Menu superior com `--stm-surface` translúcido sobre o mapa e borda inferior `--stm-border`, **mesma altura** (`--stm-menu-height` 56/100 px). Os dourados restantes (`--stm-accent` no quadro de redimensionar) passam ao verde.
- **Rationale**: FR-009 e FR-010 (nenhuma estrutura nem altura muda).

## D8 — Fonte

- **Decision**: nenhuma fonte nova. Continua a pilha do sistema do Bootstrap.
- **Rationale**: SC-004. O "roll6" já vem desenhado na logo, e uma fonte web arredondada só adicionaria download.

## D9 — Fundo do mapa e captura (FR-013)

- **Decision**: o fundo atrás do mapa e da vista 3D (`#1a1d21` em `app.css` e `BACKGROUND` em `lib/mapSnapshot.ts`) passa a `#0b1220` (`--stm-bg`). `mapSnapshot` mantém a constante em TS (o canvas não lê variáveis CSS), e um comentário aponta para o token.
- **Rationale**: a captura e a tela ficam com a mesma cor.

## D10 — `index.html`

- **Decision**: `<title>Roll6</title>` (já está assim), `<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png">`, o de 48 px, `<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">` e `<meta name="theme-color" content="#0b1220">`. O `<html data-bs-theme="dark">` continua fixo, ignorando a preferência do sistema.
