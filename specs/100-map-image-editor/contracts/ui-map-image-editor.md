# Contract: the map image editor (100)

## Entry

- Generator page, under the stage next to "Marcar": **"Editar"** (`BrushIcon`), disabled while a request runs
  (`title` = `mapGenerator.editor.busy`) or with no version.

## Window (full screen)

```text
[Pincel][Clonar][Cortar][Girar][Mover] | cor ■ [conta-gotas] tamanho ──●── opacidade ──●── [Origem]
                                   (tool options change per tool)        [↶][↷]  [Cancelar] [Aplicar]
┌──────────────────────────── canvas (zoom ±, pan) ────────────────────────────┐
│                                                                                 │
└─────────────────────────────────────────────────────────── 1536 × 1024 px · 100% ┘
```

- Cortar: rectangle with 8 handles, "Proporção travada" switch, "Confirmar corte" / "Desfazer seleção"; under 64 × 64
  → toast `mapGenerator.editor.cropTooSmall`.
- Girar: "90° à esquerda", "90° à direita", "Espelhar horizontal", "Espelhar vertical" (each applied at once, undoable).
- Clonar: "Origem" toggle (touch) / Alt+click; a crosshair marks the source; no origin → toast `editor.noOrigin`.
- Keyboard: Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z), Esc = Cancelar, `[` / `]` size −/+, B/S/C/R tool keys.
- Aplicar: disabled without edits; → new version selected, toast `mapGenerator.editor.applied` ("Versão vN criada").
- Cancelar with edits → `ConfirmModal` "Descartar as edições?".

## Strip

- Edited version label: `v4` with small text `mapGenerator.editedFrom` "editada de v3".
