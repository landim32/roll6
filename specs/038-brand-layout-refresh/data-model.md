# Data Model: Novo visual e logomarca do Roll6 (038)

Nenhuma entidade, tabela, coluna, endpoint ou DTO muda. O "modelo" desta feature é a **identidade visual**: tokens CSS e arquivos da marca.

## Tokens (`frontend/src/styles/theme.css`, `:root` + `[data-bs-theme="dark"]`)

| Token | Valor | Uso |
|---|---|---|
| `--stm-bg` | `#0b1220` | fundo da página, atrás do mapa, vista 3D, captura do mapa |
| `--stm-surface` | `#121b2b` | menu, cartões, janelas, painéis |
| `--stm-surface-2` | `#1a2638` | hover, campos, abas inativas |
| `--stm-border` | `#2b3d52` | bordas decorativas, divisórias |
| `--stm-border-strong` | `#5b7694` | borda de campos de formulário (≥ 3:1) |
| `--stm-accent` / `--stm-accent-rgb` | `#1fd67a` / `31, 214, 122` | destaque, botões primários, links, foco, sucesso, caminho válido |
| `--stm-accent-hover` | `#3fe08e` | hover do primário |
| `--stm-accent-2` | `#00b890` | só no degradê decorativo (faixa do cartão de login) |
| `--stm-on-accent` | `#071322` | texto e ícones sobre o verde |
| `--stm-radius` / `--stm-radius-sm` | `0.75rem` / `0.5rem` | cantos de janelas e painéis / controles |
| `--stm-shadow` | `0 8px 24px rgba(0,0,0,.35)` | janelas, menus suspensos, painéis flutuantes |

Repassados ao Bootstrap: `--bs-body-bg` = `--stm-bg`, `--bs-body-color` = `#e6edf3`, `--bs-secondary-color` = `#9fb0c3`, `--bs-secondary-bg` = `--stm-surface-2`, `--bs-tertiary-bg` = `--stm-surface`, `--bs-border-color` = `--stm-border`, `--bs-primary` = `--bs-success` = `--bs-link-color` = `--stm-accent` (com os `-rgb`). Os tokens de hoje (`--stm-grid-line`, `--stm-menu-height`, `--stm-footer-height`, `--stm-controls-space`) continuam com os mesmos valores.

**Regra**: nenhum componente usa hexadecimal de cor da marca diretamente. Todos leem esses tokens, exceto `lib/mapSnapshot.ts`, que desenha em canvas e mantém uma constante igual a `--stm-bg`.

## Arquivos da marca (`frontend/public/brand/`)

| Arquivo | Origem | Tamanho | Onde aparece |
|---|---|---|---|
| `roll6-vertical.webp` / `.png` | `docs/logomarca/roll6-vertical-escuro.png` | 320 px de largura | login |
| `roll6-horizontal.webp` / `.png` | `docs/logomarca/roll6-horizontal-escuro.png` | 80 px de altura | menu (≥ 768 px) |
| `roll6-symbol.webp` / `.png` | recorte do símbolo da horizontal | 64×64 | menu (< 768 px) |
| `favicon-32.png`, `favicon-48.png` | recorte do símbolo | 32, 48 | aba do navegador |
| `apple-touch-icon.png` | símbolo sobre `--stm-bg` | 180×180 | favoritos no iOS |

Somente as versões escuras. As claras de `docs/logomarca` não são copiadas para `frontend/`.
