# Contract: Map controls and paint UI (107)

## MapControls (bar next to the zoom)

| State | Buttons shown (desktop, md+) |
|---|---|
| Cannot edit (player, frozen campaign) | zoom ±, share, view — no "Editar mapa" |
| Can edit, edit mode off | zoom ±, share, view, **Editar mapa** (`PencilSquareIcon`, `map.editMode`) |
| Edit mode on, 2D | … Editar mapa (`btn-warning`, `aria-pressed`), Imagem, Ajustar imagem, **Pintar** (`BrushIcon`, `map.paint`) |
| Edit mode on, iso/3D | … Editar mapa only (image tools stay 2D-only as before; no Pintar). The isometric floor still **shows** the paint |
| Map is a loose model (no campaign map) | Pintar disabled, `title` = `paint.campaignOnly` |

Phones: "Editar mapa" hidden like the image tools today (`d-none d-md-inline-flex`).
Turning edit mode off, switching map/view or losing `canEdit` → resize off, paint off, gesture discarded.

## PaintToolbar (opens to the left of "Pintar")

`role="toolbar"`, `aria-label` `paint.tools`; icon buttons with `title` + `aria-label`, active = `btn-primary` +
`aria-pressed`:

| Tool | Icon | Options row |
|---|---|---|
| Preencher (`fill`) | `PaintBucketIcon` | kind select: Parede, Pedra, Buraco, Água, Fogo, Entrada, Marcação, Nenhum (apagar); text input (≤ 100) when Marcação |
| Quadrado (`rect`) | `SquareIcon` | color, espessura, opacidade |
| Circunferência (`circle`) | `CircleIcon` | color, espessura, opacidade |
| Lápis (`pencil`) | `PencilIcon` | color, espessura, opacidade |
| Linha (`line`) | `SlashLgIcon` | color, espessura, opacidade |
| Seta (`arrow`) | `ArrowUpRightIcon` | color, espessura, opacidade |
| Apagar (`erase`) | `EraserIcon` | — (click a drawing removes it; click a marked hex removes the mark) |
| Limpar | `TrashIcon` | `ConfirmModal` "Limpar toda a pintura deste mapa?" |

Defaults: fill = Parede, color `#e03131`, width 4, opacity 100 %. Tool/options remembered only in memory.

## Gestures (2D, paint mode on)

- Fill: pointer down starts, every hex crossed is collected (preview tinted); pointer up sends one `PUT hex-marks`.
  Click on a Mark hex with the Mark kind and another text → updates the text.
- Rect/Circle/Line/Arrow: drag from A to B with a live preview; release sends `POST drawing`; a click without drag
  (< 4 px) does nothing.
- Pencil: free stroke, simplified on release, then `POST drawing`.
- Esc / right click during a gesture → discarded (FR-010). Hex menu, Mover, card drops and piece drags are off.
- Wheel zoom still works; panning with the map's pan gesture is unchanged outside the pointer gesture.
- Failed writes → `sonner` toast with the ProblemDetails message; the preview is dropped (no optimistic paint).

## Rendering

`PaintLayer` inside the map `<g>`: grid → **PaintLayer (marks, then drawings by id)** → `HexHighlight` →
`TokenLayer` → balloons. Mark art = per-kind vector `<symbol>` scaled to the hex; Mark = red X + its text below the
X (`.stm-hex-mark-text`, max 2 lines, ellipsis). Shared snapshot (`mapSnapshot`) draws the same in the same order.

## i18n keys (pt-BR)

`map.editMode` "Editar mapa", `map.paint` "Pintar", `paint.tools`, `paint.fill`, `paint.rect`, `paint.circle`,
`paint.pencil`, `paint.line`, `paint.arrow`, `paint.erase`, `paint.clear`, `paint.clearConfirm`, `paint.color`,
`paint.width`, `paint.opacity`, `paint.markText`, `paint.campaignOnly`, `paint.kind.{wall,stone,hole,water,fire,
entrance,mark,none}`.
