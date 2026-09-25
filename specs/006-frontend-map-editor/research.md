# Research: Frontend — Login e Editor de Mapa

**Feature**: 006-frontend-map-editor | **Date**: 2026-09-25

Ambiente: Node 22.19.0 / npm 11.6.3. Backend das features 001–005 (constituição v4.0.0).

## R1. Stack e conflitos entre skills e constituição

A constituição (Princípio II) fixa React 18, TypeScript 5, Vite 6, React Router 6, Bootstrap 5,
i18next 25, Fetch API e Context API. As skills do repositório usam algumas convenções diferentes;
**a constituição prevalece** (seção Governance):

| Tema | Skill | Decisão |
|---|---|---|
| Pastas | `react-architecture`: `src/services`, `src/contexts` | `src/Services/`, `src/Contexts/` (Princípio III, inviolável); `src/hooks/`, `src/types/` |
| Formato de resposta | `react-architecture`: `sucesso`/`mensagem`/`erros` | DTO direto; erros em `ProblemDetails` (Princípio IV, v3.0.0) |
| Variável de ambiente | `VITE_GOBLIN_API_URL` | `VITE_API_URL` (seção de variáveis) |
| Estilo do modal | `react-modal`: Radix Dialog + Tailwind | Radix Dialog (mantido: acessibilidade, foco) estilizado com Bootstrap 5 (`modal-content`, tema escuro) — sem Tailwind |
| Toasts | `react-alert`: `sonner` | mantido: `sonner` com `theme="dark"` |

O restante da skill `react-architecture` é seguido: Types → Service (classe com `handleResponse`,
`getHeaders(true)`, `onUnauthorized`) → Context (`loading`, `error`, `useCallback`,
`handleError`/`clearError`) → Hook → registro no `main.tsx`.

## R2. Tema escuro fixo

- **Decision**: Bootstrap 5.3 com `data-bs-theme="dark"` no `<html>`; sem seletor de tema. Cores
  próprias só em variáveis CSS (`--stm-*`) num único `src/styles/app.css`.
- **Rationale**: FR-001; o modo escuro nativo do Bootstrap cobre formulários, abas, botões.

## R3. Desenho do mapa

- **Decision**: um `<svg>` ocupando a tela com um `<g transform="translate(panX,panY) scale(zoom)">`
  contendo a `<image>` do cenário e a grid como **um único `<path>`** com o contorno de todos os
  hexágonos. Zoom de 0,1 a 4,0 (passo ×1,25) centralizado na tela; arrastar o fundo altera
  `panX/panY`.
- **Rationale**: SVG escala sem perder nitidez e facilita alças de redimensionamento; um único
  `path` mantém 100 × 100 hexágonos (10.000) fluido (SC-004). Para 500 × 500 o path é gerado uma
  vez por mudança de grid (memoizado).
- **Alternatives considered**: `<canvas>` — melhor para grids gigantes, mas exige redesenho manual
  a cada zoom e dificulta alças; biblioteca de mapas (Konva/Pixi) — dependência fora da stack.

## R4. Geometria (Princípio VII)

- **Decision**: módulo puro `src/lib/hexGrid.ts`, espelho 1:1 de `Domain/Grid/HexGrid.cs`:
  `calculateHexSize`, `offsetToAxial`, `axialToOffset`, mais `hexCenter(x, y, size)` (odd-q,
  flat-top: `cx = size + x·1,5·size`, `cy = size·√3/2 + y·√3·size + (x ímpar ? √3·size/2 : 0)`) e
  `hexCorners`. Testes com **Vitest** reproduzem os valores de referência do backend (95.093,
  101.0363, 32.7869; conversões (3,1)↔(3,2) etc.).
- **Rationale**: SC-006 da feature 002 (mesmo `hexSize` no backend e no frontend); origem da grid
  compatível com a fórmula de tamanho (`1,5·colunas + 0,5` de largura).
- **Vitest**: única dependência de desenvolvimento fora da tabela da constituição; é o executor de
  testes nativo do Vite (Princípio II exige Vite). Registrado em Complexity Tracking.

## R5. Imagem, ajuste e redimensionamento

- **Decision**: no espaço do mapa, a grid começa em (0, 0); a imagem é desenhada em
  (−left, −top) com `width × height`. A área visível é `(width − left) × (height − top)` e o
  `hexSize` sai dela — mesma regra do backend. No modo de redimensionamento:
  - arrastar a imagem altera `left/top` (limitados a ≥ 0 e < tamanho, como o backend exige);
  - alça do canto inferior direito altera `width/height` mantendo a proporção (Shift libera);
  - movimentos do ponteiro são divididos pelo zoom para ficarem em unidades do mapa.
  Ao carregar uma imagem sem tamanho de exibição salvo, `width/height` recebem o tamanho natural
  da imagem (sem marcar "não salvo").
- **Rationale**: FR-008/FR-011 respeitando as validações da feature 002 (recorte ≥ 0).
- **Consequência**: a imagem só pode ser deslocada para cima/esquerda em relação à grid; para o
  outro lado, aumenta-se a grid ou reduz-se o recorte. Documentado no quickstart.

## R6. Rascunho do mapa e "não salvo"

- **Decision**: `MapEditorContext` guarda o **rascunho** (`MapDraft`: `mapModelId?`, `mapId?`,
  `ownerUserId?`, `name`, `description`, `image`, `imageUrl`, `gridWidth`, `gridHeight`,
  `imageWidth`, `imageHeight`, `imageTop`, `imageLeft`) e o **snapshot** do último estado gravado;
  `isDirty = !equal(draft, snapshot)` (mapa novo sem `mapModelId` é sempre "não salvo" depois de
  qualquer alteração). Zoom/pan ficam fora do rascunho.
- **Salvar** (FR-017/FR-020):
  1. mapa próprio existente → `PUT /api/mapmodel/{id}`;
  2. mapa novo ou de outro usuário → modal de nome → `POST /api/mapmodel`; se a campanha atual é
     do usuário → `POST /api/map` e o rascunho passa a apontar para o novo `mapId`.
- **Guarda**: trocar de mapa, abrir "imagem+" ou sair com rascunho sujo abre `UnsavedChangesModal`
  (Salvar / Descartar / Cancelar); `beforeunload` cobre fechar/recarregar a aba.

## R7. Filtros "minhas campanhas" e "meus mapas" (ajuste no backend)

- **Finding**: após a feature 005, `GET /api/campaign` e `GET /api/mapmodel` listam os itens de
  todos os usuários, sem filtro por dono.
- **Decision**: acrescentar o parâmetro opcional `mine=true` a esses dois endpoints (repositórios
  ganham `ownerUserId` opcional; `PageQuery` não muda). Sem o parâmetro, o comportamento atual
  continua.
- **Alternatives considered**: filtrar no frontend — quebraria a paginação.

## R8. Sessão, estado e rotas

- **Decision**: `AuthContext` guarda `{ token, expiresAt, user }` em `localStorage`
  (`simple-tabletop-map:auth`, Princípio VI); `onUnauthorized` dos services faz logout + toast.
  Campanha atual em `localStorage` (`simple-tabletop-map:campaign`). React Router 6: `/login` e `/`
  (protegida). Context API apenas (sem libs de estado).

## R9. Textos

- **Decision**: `i18next` + `react-i18next`, recurso único `pt-BR` em `src/i18n/locales/pt-BR.json`;
  todos os textos e toasts via `t()` (FR-004).
