# Implementation Plan: Miniaturas de mesa na vista isométrica

**Branch**: `104-iso-tabletop-miniatures` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/104-iso-tabletop-miniatures/spec.md`

## Summary

Na vista isométrica (103), as peças com **modelo 3D** e com **figura 2,5D** passam a ser **miniaturas de mesa**: o
modelo imóvel no primeiro quadro de "Parado" (como hoje) ou a figura virada para a câmera, de pé sobre uma **base
circular** fina, escura, com a borda na cor da peça. **Caída ou fora de combate**, a miniatura inteira (modelo/figura,
armas e base) **tomba para trás** em relação ao `look`, girando em volta da borda de trás da base, e fica deitada no chão;
**fora de combate** ainda fica em **preto e branco** (a base mantém a cor). Tokens só com imagem continuam no chão, sem
base, trocando para a imagem de "Caído" quando houver. A postura muda só transformações e um uniform — nada é recarregado.

Técnica: um módulo puro `lib/isoMiniature` (raio da base, estado de pé/tombada/cinza, pivô e eixo do tombo, imagem do
chão), um `THREE.Group` por miniatura em `components/iso/isoPieces` (base + figura + o objeto do modelo, com um grupo
"pivô" que tomba), duas opções novas e opcionais do `modelSet` (`mount` para pôr o modelo dentro do grupo, `id` no
`patchMaterial`) e um uniform `isoGray` por peça em `isoLightMaterial`. Só frontend; a vista 3D atual não muda.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 (frontend only)
**Primary Dependencies**: existentes — `three` 0.186.1 (lazy: `Group`, `CylinderGeometry`, `RingGeometry`,
`onBeforeCompile`), Vitest. **Nenhuma dependência nova.**
**Storage**: N/A — nada novo no servidor nem no navegador
**Testing**: Vitest para o módulo puro `lib/isoMiniature` e para as opções novas do `modelSet`; render verificado pelo
quickstart
**Target Platform**: navegadores modernos com WebGL (desktop e celular)
**Project Type**: web application (SPA em `frontend/`)
**Performance Goals**: os mesmos da 103 (60 fps desktop, ≥ 30 fps celular com 20 peças); a base acrescenta 2 malhas
pequenas por peça (geometria compartilhada); mudar a postura ≤ 1 quadro, sem recarregar modelo nem imagem
**Constraints**: `three` só em chunks lazy; a vista 3D atual (`StoryView`) não muda — as opções novas do `modelSet` são
opcionais e sem efeito quando ausentes; sem fórmula nova de hex (Princípio VII)
**Scale/Scope**: 2 arquivos novos (`lib/isoMiniature.ts` + teste), 3 alterados (`isoPieces.ts`, `modelSet.ts`,
`isoLightMaterial.ts`) e o teste do `modelSet`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | Nenhuma entidade nova (sem tipo/serviço/contexto de API) — `react-architecture` não se aplica. ✅ |
| II. Stack fixa | Sem dependência nova; `three` já está no projeto, só em chunks lazy. ✅ |
| III. Casing de diretórios | `lib/` e `components/iso/`, como na 103. ✅ |
| IV. Convenções de código | `interface`, constantes no lugar de `enum`; nenhum texto novo na tela (sem chave i18n). ✅ |
| V. Banco | Sem mudança. ✅ |
| VI. Auth/segurança | Sem mudança; só dados que o usuário já lê (`MapTokenInfo.posture`, imagens do token). ✅ |
| VII. Grid hexagonal | O raio da base vem da caixa de `pieceGeometry` (que usa `footprintLocal`/`hexCorners`); a direção do tombo vem do `yaw` já usado pelo `spriteSpec` (`look × 60°`); nenhuma fórmula nova de hex. ✅ |

Re-check após a Fase 1: sem violações. *Complexity Tracking* vazio.

## Project Structure

### Documentation (this feature)

```text
specs/104-iso-tabletop-miniatures/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/iso-miniature.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
frontend/src/
├── lib/
│   ├── isoMiniature.ts          # NOVO — puro: raio/altura da base, estado (de pé/tombada/cinza), pivô do tombo, imagem do chão
│   └── isoMiniature.test.ts     # NOVO
└── components/
    ├── iso/
    │   ├── isoPieces.ts         # miniaturas: Group por peça (base + figura + modelo), tombo e cinza sem recarregar
    │   └── isoLightMaterial.ts  # applyLight(..., { gray }) — uniform isoGray por peça (preto e branco)
    └── story/
        ├── modelSet.ts          # opções novas: mount(id) → Object3D pai; patchMaterial(material, id)
        └── modelSet.test.ts     # cobre as opções novas (ausentes = comportamento atual)
```

**Structure Decision**: SPA existente em `frontend/`. A regra (o que desenhar, em que tamanho, para onde tomba) fica no
módulo puro testável; `isoPieces` só monta a cena três.js a partir dele.

## Complexity Tracking

Vazio — nenhuma violação.
