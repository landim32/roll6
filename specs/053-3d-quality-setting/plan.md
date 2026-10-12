# Implementation Plan: Qualidade da vista 3D

**Branch**: `053-3d-quality-setting` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/053-3d-quality-setting/spec.md` (issue #31)

## Summary

Três níveis de qualidade para a vista 3D — **Padrão** (a vista de hoje, byte a byte), **Alta** (quadro do mundo mais fino, imagens das figuras no tamanho em que são salvas, amostragem bilinear com cópias reduzidas por distância) e **Ultra** (as figuras saem do quadro pequeno e vão para uma camada transparente do tamanho da tela, composta por cima do quadro ampliado) — escolhidos em **"Qualidade do 3D"** no menu do usuário e lembrados neste aparelho (`localStorage`, apagado no logout). Só frontend: um módulo puro `lib/viewQuality.ts` define os níveis num só lugar; o renderizador e o `StoryView` recebem o perfil e mudam na hora; o quadro de referência de `raycastFrame.test.ts` continua passando sem alteração, o que prova FR-002.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend only)
**Primary Dependencies**: React 18, Vite 6, Bootstrap 5.3 (dark), i18next, Radix Dropdown (menu do usuário) e Radix Dialog (`components/ui/Modal`) — **nenhuma dependência nova**; Canvas 2D (`ImageData`, `putImageData`, `drawImage`) como hoje
**Storage**: browser only — `localStorage` `roll6:3d-quality` = `"standard" | "high" | "ultra"`; nada no servidor
**Testing**: Vitest (`npm test`): funções puras sem DOM (`lib/viewQuality`, `lib/mipmap`, `lib/figureLayer`, `lib/raycastFrame` com as novas opções) + o quadro de referência existente; `npm run lint`, `tsc`
**Target Platform**: navegadores desktop e celular (Chrome, Safari iOS, Firefox) — os níveis altos são opcionais justamente porque o celular médio não os aguenta
**Project Type**: web application (SPA) — apenas `frontend/`
**Performance Goals**: Padrão idêntico ao atual (mesmo tempo de quadro, mesma memória). Alta: ≤ 2× o tempo de quadro do Padrão num computador comum com 50 peças. Ultra: fluido (≥ 30 fps) num computador comum com 50 peças; sem meta em celular (é opcional e avisado). Tempos medidos e registrados no PR (FR-015)
**Constraints**: FR-002 — `drawRaycastFrame` com as opções padrão produz o mesmo `Uint8ClampedArray` de hoje (hash FNV-1a `4240962842` do teste de referência). FR-011 — no Padrão nenhuma imagem a mais é lida nem nenhuma cópia reduzida (mip) é construída. FR-005 — paredes, chão e céu continuam amostrados por vizinho mais próximo em todos os níveis; só o número de colunas muda. FR-014 — backend/API/MCP/banco intocados
**Scale/Scope**: 1 módulo puro de níveis, 2 módulos puros novos de amostragem (mip + camada), opções novas em `raycastFrame`/`raycastRenderer`, 1 modal, 1 item de menu, estado em `MapEditorContext`, ~10 chaves i18n, ~6 arquivos de teste

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|---|---|---|
| I. Skills de arquitetura | Não há entidade nova (sem Types/Service de API, sem Context novo): a preferência entra em `MapEditorContext` ao lado de `viewMode`/`fov`, como as outras preferências do 3D. `react-architecture` não se aplica a um módulo puro + modal | ✅ |
| II. Stack fixa | React 18, Vite, Bootstrap 5, i18next, Context API; nenhuma lib nova (nem WebGL, nem worker — Canvas 2D como o raycaster já usa) | ✅ |
| III. Casing de diretórios | Só `lib/`, `components/`, `Contexts/` (uppercase, existente), `hooks/` | ✅ |
| IV. Convenções de código | `interface` (não `type`) para os perfis; constantes `UPPER_CASE` (`VIEW_QUALITY`, `QUALITY_PROFILES`, `VIEW_QUALITY_STORAGE_KEY`); arrow functions; sem `enum` (`erasableSyntaxOnly`) | ✅ |
| V. Banco | Nenhuma mudança | ✅ |
| VI. Segurança | Nada sensível; `localStorage` só para a preferência, como `roll6:view-mode` | ✅ |
| VII. Grid hexagonal | O raycaster não faz matemática de hex (as figuras ficam em `hexCenter` já calculado) — não muda | ✅ |
| CLAUDE.md: ícones só Bootstrap Icons inline; textos só via i18next; dark theme; toasts `sonner` | O modal usa `Modal` + radios Bootstrap; textos em `pt-BR.json` (o `keys.test.ts` cobra); sem ícone novo no menu (como "Notificações") | ✅ |

**Gate inicial: PASS.** Sem violações, "Complexity Tracking" vazio.

## Project Structure

### Documentation (this feature)

```text
specs/053-3d-quality-setting/
├── plan.md              # este arquivo
├── research.md          # Fase 0: decisões (níveis, amostragem, camada, onde fica o estado)
├── data-model.md        # Fase 1: a preferência e os perfis
├── quickstart.md        # Fase 1: como testar à mão e como medir o desempenho
├── contracts/
│   └── view-quality.md  # Fase 1: contratos dos módulos puros, do renderizador e do modal (sem API HTTP)
└── tasks.md             # Fase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── lib/
│   ├── viewQuality.ts            # NOVO: níveis, perfis, leitura/gravação segura de roll6:3d-quality
│   ├── viewQuality.test.ts       # NOVO
│   ├── mipmap.ts                 # NOVO: cadeia de cópias reduzidas (alpha premultiplicado), bilinear, escolha do nível
│   ├── mipmap.test.ts            # NOVO
│   ├── figureLayer.ts            # NOVO: desenha as figuras numa camada do tamanho da tela, ocluída pelas paredes do quadro
│   ├── figureLayer.test.ts       # NOVO
│   ├── raycastFrame.ts           # opções `FrameOptions { spriteSampling, figures }`; expõe o que a camada precisa
│   └── raycastFrame.test.ts      # referência intacta + testes das opções
├── components/
│   ├── story/
│   │   ├── raycastRenderer.ts    # `setQuality(profile)`: colunas, amostragem, camada de figuras (2º canvas transparente)
│   │   ├── StoryView.tsx         # lê `viewQuality`, cache de imagens por (tamanho, URL), repassa o perfil
│   │   └── ViewQualityModal.tsx  # NOVO: "Qualidade do 3D" — 3 radios + aviso (+ bateria no celular)
│   └── menu/
│       ├── UserMenu.tsx          # item "Qualidade do 3D" (onViewQuality)
│       └── TopMenu.tsx           # estado `qualityOpen` + <ViewQualityModal/>
├── Contexts/
│   ├── MapEditorContext.tsx      # `viewQuality` / `setViewQuality` ao lado de viewMode/fov
│   └── AuthContext.tsx           # logout: clearViewQuality()
└── i18n/locales/pt-BR.json       # userMenu.viewQuality, viewQuality.* (título, níveis, descrições, avisos)
```

**Structure Decision**: só `frontend/` muda. A regra dos níveis fica em `lib/` (puro, testável sem DOM, como `viewMode.ts`/`layoutMode.ts`); o que toca canvas fica em `components/story/`. Nada em `backend/`.

## Phase 0 — Research

Decisões em [research.md](research.md): R1 valores dos níveis; R2 amostragem bilinear com mips (alpha premultiplicado) para as figuras; R3 camada de figuras do Ultra como segundo canvas transparente composto por `drawImage`; R4 oclusão da camada pelas paredes do quadro (mapa coluna→coluna do quadro); R5 onde fica o estado (`MapEditorContext`) e como o `StoryView` reage; R6 cache de imagens por tamanho e troca sem buraco; R7 como manter o quadro de referência byte a byte; R8 detecção de celular para o aviso de bateria; R9 como medir o desempenho (FR-015).

## Phase 1 — Design

- [data-model.md](data-model.md): `ViewQuality`, `QualityProfile`, a preferência no `localStorage` e a ordem dos níveis.
- [contracts/view-quality.md](contracts/view-quality.md): assinaturas de `lib/viewQuality`, `lib/mipmap`, `lib/figureLayer`, as opções de `drawRaycastFrame`, `RaycastRenderer.setQuality`, o contrato do modal e do item de menu, e as chaves i18n.
- [quickstart.md](quickstart.md): roteiro de teste manual (3 níveis, memória, logout, celular) e o procedimento de medição.

### Fluxo de uma troca de nível

1. Usuário escolhe no modal → `setViewQuality(level)` em `MapEditorContext` → `writeViewQuality(level)`.
2. `StoryView` (se montado) recebe `viewQuality` → `renderer.setQuality(QUALITY_PROFILES[level])`: o renderizador refaz `resize` com a última medida (novo número de colunas), guarda a amostragem e liga/desliga a camada; `dirty = true`.
3. O efeito das figuras roda de novo com `spriteMaxSide` do perfil: o cache é consultado por `${maxSide}|${url}`; `setSprites` só é chamado quando todas as imagens do novo tamanho chegaram — até lá o renderizador desenha com as figuras que já tinha (FR-012). Com `smoothSprites`, a cadeia de mips de cada `PixelBuffer` é construída uma vez (`WeakMap`) na primeira amostragem; no Padrão nunca é construída (FR-011).
4. Câmera, FOV e balões não são tocados (FR-006, FR-013).

### Constitution Check pós-design

Reavaliado após a Fase 1: nenhuma mudança nas respostas acima. Nenhuma dependência, nenhum contexto novo, nenhuma rota. **PASS.**

## Complexity Tracking

Sem violações — tabela vazia.
