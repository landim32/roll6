# UI contract: Vista isométrica iluminada (103)

Sem contrato de API: a vista usa só dados que o site já recebe. Os contratos abaixo são entre módulos do frontend.

## Escolha da vista (`MapControls`)

- O botão de vista é um dropdown (Radix, `modal={false}`) com três itens, o atual marcado (`aria-checked`):
  - "Mapa 2D" (`MapIcon`), "Isométrica" (`IsoViewIcon`, novo em `components/ui/icons.tsx`, path copiado do Bootstrap Icon
    `box`), "3D" (`View3dIcon`).
  - Ícone do botão = o da vista atual; `title`/`aria-label` = `story.viewChoose`.
- `setViewMode('iso')` grava `roll6:view-mode` e `MainPage` monta `IsoView` (lazy) no lugar do `MapCanvas`.
- Em `'iso'` os +/− chamam o handler registrado em `registerStoryZoom` (+ = aproxima); os botões de imagem/redimensionar
  ficam ocultos como no 3D.

## `IsoView` (`components/iso/IsoView.tsx`, default export, lazy)

```ts
interface IsoViewProps {
  onUnsupported: () => void; // sem WebGL: MainPage avisa e volta ao 2D
}
```

Lê `useMapEditor()` (draft: imagem, posição, grid, `viewQuality`, `registerStoryZoom`), `useMapToken().tokens`,
`useCharacter()` (`party`, personagem escolhido). Desenha o canvas, `IsoFocusSelect` no canto superior e nada mais
(sem balões, sem joystick). Arrastar gira; roda/pinça dão zoom; clique (< 4 px de movimento) numa peça de personagem
visível troca o foco.

## `isoRenderer` (`components/iso/isoRenderer.ts`)

```ts
interface IsoRenderer {
  setMap: (map: { imageUrl: string | null; imageRect: Rect; columns: number; rows: number }) => void;
  setPieces: (pieces: readonly IsoPiece[]) => void; // diff por id; não recarrega o que não mudou
  setFocus: (center: Point, animate: boolean) => void; // move alvo da câmera + centro da luz, nada mais
  setPose: (pose: IsoPose) => void;
  setQuality: (profile: ViewQualityProfile) => void;
  pick: (clientX: number, clientY: number) => number | null; // mapTokenId de personagem visível sob o ponto
  resize: (width: number, height: number) => void;
  dispose: () => void;
}
```

## `modelSet` (extensão)

`createModelSet(scene, events, options?: { still?: boolean; patchMaterial?: (m: Material) => void })`:
- `still`: o modelo fica no primeiro quadro da animação de "Parado" (ou no bind pose sem ela); `update` não o avança.
- `patchMaterial`: chamado com o material **clonado** de cada malha da instância (e das armas), para o patch de luz.
- Sem `options`, o comportamento é exatamente o atual (a vista 3D não muda).

## Textos (`pt-BR.json`)

`story.viewChoose` "Escolher vista", `story.view2dItem` "Mapa 2D", `story.viewIso` "Isométrica", `story.view3dItem` "3D",
`iso.focus` "Foco: {{name}}", `iso.focusMine` "Voltar ao meu personagem", `iso.noFocus` "Sem personagem no mapa",
`iso.loading` "Carregando a vista isométrica…".
