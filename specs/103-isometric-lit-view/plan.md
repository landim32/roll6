# Implementation Plan: Vista isométrica iluminada

**Branch**: `103-isometric-lit-view` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/103-isometric-lit-view/spec.md`

## Summary

Uma segunda vista 3D, independente da atual (081): **isométrica**, ortográfica, de um mapa **plano** (imagem do mapa +
grid hexagonal no chão, sem máscara, paredes nem céu), com um **círculo de luz de 5 hexes** em volta do personagem em
foco — fora dele chão, grid e peças escurecem até o preto com névoa, e as peças são cortadas na borda. As peças usam o
modelo 3D parado no primeiro quadro de "Parado" (com armas), senão a figura 2,5D, senão a imagem do token no chão.
O usuário gira, inclina e dá zoom; troca o foco para outro PJ (clique ou seletor) sem recarregar nada — só a câmera e a
luz mudam. O mestre começa no primeiro PJ do grupo. Técnica: um renderizador three.js novo e lazy
(`components/iso/`), luz por `onBeforeCompile` com uniforms compartilhados (escurece o chão, `discard` nas peças fora do
raio), `modelSet` reaproveitado com uma opção `still`, e a preferência `roll6:view-mode` ganhando `'iso'`. Só frontend.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend only)
**Primary Dependencies**: existentes — `three` 0.186.1 (lazy: `OrthographicCamera`, `ShaderMaterial` patches via
`onBeforeCompile`, `LineSegments`, `Raycaster`), Radix Dropdown, i18next, sonner, Bootstrap 5.3. **Nenhuma dependência nova.**
**Storage**: browser only — `localStorage` `roll6:view-mode` aceita `'iso'`; nada no servidor
**Testing**: Vitest (módulos puros `lib/isoLight`, `lib/isoCamera`, `lib/isoFocus`, `lib/viewMode`; opção `still` do
`modelSet`); render verificado pelo quickstart
**Target Platform**: navegadores modernos com WebGL (desktop e celular); sem WebGL → volta ao 2D
**Project Type**: web application (SPA em `frontend/`)
**Performance Goals**: 60 fps girando/zoom num desktop comum, ≥ 30 fps num celular intermediário com 20 peças; abrir em
≤ 3 s; troca de foco ≤ 1 s sem recarregar
**Constraints**: `three` nunca no bundle principal; a vista 3D atual não muda (opções novas do `modelSet` são opcionais);
grid só com as funções de `lib/hexGrid` (Princípio VII)
**Scale/Scope**: ~8 arquivos novos, ~5 alterados; mapas até 60 × 60 hexes, dezenas de peças

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Nenhuma entidade nova (sem tipo/serviço/contexto de API) — o `react-architecture` não se aplica. ✅ |
| II. Stack fixa | Bootstrap 5, Context API, sem dependência nova (`three` já está no projeto, lazy). ✅ |
| III. Casing de diretórios | `components/iso/` (minúsculo, como `components/story/`), `lib/`; nada em `Contexts/`/`Services/`. ✅ |
| IV. Convenções de código | `interface`, sem `enum` (constantes), textos via i18next, ícones em `components/ui/icons.tsx`. ✅ |
| V. Banco | Sem mudança. ✅ |
| VI. Auth/segurança | Sem mudança; usa só dados que o usuário já lê. ✅ |
| VII. Grid hexagonal | Grid desenhada com `hexCenter`/`hexCorners`; pegadas com `footprint`/`footprintLocal`; o raio em px usa a distância entre centros vizinhos da mesma geometria; nenhuma fórmula nova de hex. ✅ |

Re-check após a Fase 1: sem violações. *Complexity Tracking* vazio.

## Project Structure

### Documentation (this feature)

```text
specs/103-isometric-lit-view/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/iso-view.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
frontend/src/
├── lib/
│   ├── viewMode.ts            # + 'iso' (alterado)
│   ├── isoLight.ts (+ .test)  # raio, borda, lightFactor/isLit — espelha o shader
│   ├── isoCamera.ts (+ .test) # IsoPose, limites, posição da câmera, zoom, easing do alvo
│   └── isoFocus.ts (+ .test)  # candidatos, foco inicial, resolução após mudanças
├── components/
│   ├── iso/
│   │   ├── IsoView.tsx        # lazy: canvas, entrada (girar/zoom/clique), foco local, liga contextos ao renderer
│   │   ├── isoRenderer.ts     # cena three.js: chão, grid, peças, câmera ortográfica, luz, qualidade
│   │   ├── isoLightMaterial.ts# uniforms compartilhados + patch onBeforeCompile (floor | piece)
│   │   ├── isoPieces.ts       # figura 2,5D / imagem no chão / ponte para o modelSet
│   │   └── IsoFocusSelect.tsx # dropdown "Foco: …" + "Voltar ao meu personagem"
│   ├── story/modelSet.ts      # + options { still, patchMaterial } (alterado, opcional)
│   ├── map/MapControls.tsx    # botão de vista vira dropdown 2D / Isométrica / 3D (alterado)
│   └── ui/icons.tsx           # + IsoViewIcon (Bootstrap Icon "box")
├── pages/MainPage.tsx         # monta IsoView em 'iso' (alterado)
├── i18n/locales/pt-BR.json    # textos story.view*, iso.* (alterado)
└── styles/app.css             # .stm-iso, .stm-iso-focus (alterado)
```

**Structure Decision**: só `frontend/`. Código novo em `components/iso/` (paralelo a `components/story/`, que não muda além
da opção do `modelSet`) e regras puras em `lib/`. `CLAUDE.md` ganha um parágrafo "Isometric lit view (103)" na seção do
frontend ao implementar.

## Fases

1. **Escolha da vista** (US1): `viewMode` com `'iso'`, dropdown em `MapControls`, `MainPage` lazy `IsoView`, +/− via
   `registerStoryZoom`.
2. **Cena plana + luz** (US2): `isoRenderer` (chão, imagem, grid, fundo preto), `isoLightMaterial`, `lib/isoLight`.
3. **Câmera** (US3): `lib/isoCamera` + entrada no `IsoView` (ponteiro, roda, pinça; `touch-action: none`).
4. **Peças** (US4): `isoPieces` (flat, figura), `modelSet` `still` + `patchMaterial` com materiais clonados, armas.
5. **Foco** (US5): `lib/isoFocus`, `pick`, `IsoFocusSelect`, `setFocus` animado sem recriar a cena.
6. **Acabamento**: qualidade, celular, sem WebGL, `CLAUDE.md`, quickstart.

## Complexity Tracking

Sem violações.
