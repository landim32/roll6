# Implementation Plan: Câmera livre e jogo completo na vista isométrica

**Branch**: `105-iso-free-camera-actions` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/105-iso-free-camera-actions/spec.md`

## Summary

A isométrica (103/104) vira uma vista de jogo completa. A câmera deixa de seguir o foco: o botão esquerdo desliza o
alvo pelo mapa ("agarrar o chão") e a luz vai junto (ela já é centrada no alvo); o botão direito gira e inclina. A
lógica de menu, "Agir sobre…", Mover e soltar cartões sai do `MapCanvas` para um hook compartilhado
(`useMapInteraction`) + `MapHexMenu`, usados pelo 2D e pela isométrica com o mesmo resultado; a isométrica fornece só as
coordenadas (`hexAt`, `floorAt`, `pieceAt`) e desenha destaques/caminho como faixas no chão. Os balões ficam sobre a
cabeça (sem o "teto" de 40 % do 3D legado) e ficam transparentes sob o mouse. "3D" vira "3D (legado)". Frontend só.

## Technical Context

**Language/Version**: TypeScript 5 + React 18 (Vite 6)
**Primary Dependencies**: `three` 0.186.1 (lazy, já usado), Bootstrap 5, i18next, sonner — nenhuma nova
**Storage**: N/A (nenhum dado novo; `roll6:view-mode` inalterado)
**Testing**: Vitest (puros: `lib/isoCamera`, `lib/storyBubbles`, `lib/mapInteraction`)
**Target Platform**: navegadores desktop e celular (WebGL; sem WebGL → volta ao 2D, como hoje)
**Project Type**: web application (só `frontend/`)
**Performance Goals**: 60 fps ao deslizar/girar; balões no mesmo quadro (já vêm do `onFrame`); overlays recriados só
quando hexes mudam
**Constraints**: `three` só em chunks lazy; `MapCanvas` sem regressão; mesmas permissões do 2D (SC-002)
**Scale/Scope**: mapas até as grids atuais; ~10 arquivos de frontend

## Constitution Check

| Princípio | Situação |
|---|---|
| I. Skills de arquitetura | N/A — nenhuma entidade nova (sem Types/Service/Context novos; um hook de interação local, não de entidade). |
| II. Stack fixa | OK — nenhuma dependência nova; Context API; Bootstrap. |
| III. Casing | OK — `hooks/useMapInteraction.ts`, `components/map/MapHexMenu.tsx`, `lib/…` minúsculos onde exigido. |
| IV. Convenções | OK — `interface`, sem `enum`, constantes UPPER_CASE, textos via i18next. |
| V. Banco | N/A. |
| VI. Auth | N/A — mesmas chamadas autenticadas; o servidor revalida o Mover. |
| VII. Grid hexagonal | OK — pixel→hex continua `pixelToHex` (fractional + `hexRound`) sobre o ponto do chão; distância/vizinhos/movimento de `lib/hexGrid`; nada de matemática nova de hex. |

Gates aprovados antes e depois do desenho.

## Project Structure

### Documentation (this feature)

```text
specs/105-iso-free-camera-actions/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # R1–R8
├── data-model.md        # estado de tela (sem banco)
├── quickstart.md
├── contracts/iso-interaction.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
frontend/src/
├── lib/
│   ├── isoCamera.ts            # + panTo, clampTarget, mapBounds, twist/tilt helpers (puros) + testes
│   ├── storyBubbles.ts         # bubblePlacement(…, { ceiling }) opcional + testes
│   └── mapInteraction.ts       # NOVO, puro: permissões (canMove/canTakeTurn/canSetPosture/isOwnPiece), shapeAt,
│                               #   menuAllowed, overlays do Mover — extraídos do MapCanvas + testes
├── hooks/
│   └── useMapInteraction.ts    # NOVO: estado do menu/alvo/hover/picked, clickAt(hex, mapPoint), moveAt, drop
├── components/map/
│   ├── MapCanvas.tsx           # passa a usar useMapInteraction + MapHexMenu (mesmo comportamento)
│   ├── MapHexMenu.tsx          # NOVO: <HexMenu> com todas as props + MovementCounter
│   └── MapControls.tsx         # ordem 2D, Isométrica, 3D (legado)
├── components/iso/
│   ├── IsoView.tsx             # gestos novos, sem seguir o foco, props do MapCanvas, menu/Mover/drop, prévia
│   ├── isoRenderer.ts          # floorAt, pieceAt, panTo/glideTo, setOverlays (hover/seleção/caminho/destino)
│   └── isoPieces.ts            # pickable(): meshes por peça para o raio do clique
├── components/story/BubbleLayer.tsx  # ceiling por prop + is-see-through sob o ponteiro
├── pages/MainPage.tsx          # IsoView recebe as mesmas props do MapCanvas
├── styles/app.css              # .stm-story-bubble.is-see-through
└── i18n/locales/pt-BR.json     # story.view3dItem = "3D (legado)"
```

**Structure Decision**: web application, mudança só em `frontend/`. `CLAUDE.md` ganha a descrição da 105 na entrada da
vista isométrica e o "3D (legado)".

## Phases

- **Phase 0** → [research.md](./research.md): R1 pan "agarrar o chão" + luz = alvo; R2 botões/toque e foco sem seguir;
  R3 clique × arraste e raio nas peças; R4 extração `useMapInteraction`/`MapHexMenu`; R5 overlays e prévia; R6 balões
  (causa: `BALLOON_CEILING`) e transparência; R7 rótulo; R8 cancelamento na troca de vista.
- **Phase 1** → [data-model.md](./data-model.md), [contracts/iso-interaction.md](./contracts/iso-interaction.md),
  [quickstart.md](./quickstart.md).
- **Ordem sugerida para as tarefas**: (1) extrair `lib/mapInteraction` + `useMapInteraction` + `MapHexMenu` e trocar o
  `MapCanvas` (testes verdes = sem regressão); (2) câmera livre na isométrica; (3) menu e clique; (4) Mover, alvo e
  drop; (5) balões; (6) rótulo e docs.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
