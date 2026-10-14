# Contracts: Token 3D improvements (057)

## REST API — no new endpoint

`POST /api/token` and `PUT /api/token/{id}` (`TokenInsertInfo`) and their reads (`TokenInfo`, `MapTokenInfo`) keep their shape. `modelIdleClip` / `modelWalkClip` accept one more value:

```json
{ "modelFile": "0123456789abcdef0123456789abcdef.glb", "modelIdleClip": "roll6-guard", "modelWalkClip": null }
```

| Value | Result |
|---|---|
| `"roll6-guard"` | 200/201, stored as is |
| `"Roll6-Guard"`, `"guard"` | 400 `ValidationProblemDetails`, key `modelIdleClip` / `modelWalkClip` |

## MCP — no new tool (still 102 operations / 103 tools)

`create_token` / `update_token`: the description of `modelIdleClip` / `modelWalkClip` (`McpDocs.MODEL_CLIP`) lists `"roll6-guard"` = Roll6's guard stance; the guide (`roll6://guide`, "3D view") mentions it.

## UI — "3D" tab of the token form

Under the preview, in this order:

1. **Timeline** (`ModelTimeline`)
   - Play/pause icon button (`title`/`aria-label` "Pausar" / "Continuar"; Bootstrap Icons `pause-fill` / `play-fill`).
   - `<input type="range" class="form-range">`, `min=0`, `max=duration`, `step=duration/200`, `aria-label="Andamento da animação"`, `aria-valuetext="{t} s de {total} s"`.
   - Disabled (both) while the model loads or the shown state has no animation.
   - Dragging or clicking the bar pauses and seeks; releasing leaves it paused.
2. **Gerar imagem** — a Bootstrap `dropdown` button (Radix Dropdown like the other menus) with:
   - "Imagem em Pé" → fills the standing image field.
   - "Imagem Caído" → fills the lying image field.
   - Shown only in editable forms; enabled only while paused or with a static state. Toast on success: `tokens.model.generated.up` / `.down` ("Imagem em pé gerada — veja na aba Token."); on failure `tokens.model.generateFailed`.
3. **Animações** (056) — the two selects gain the option **"Posição defensiva (Roll6)"** (value `roll6-guard`) after "Animação do Roll6", only for a Mixamo skeleton.

### `ImageCropper` — new optional prop

```ts
interface ImageCropperProps {
  // …existing props
  /** A picture handed in by the form (057, a photo of the model): a new `key` opens the cropper on `url` as if the
   *  user had chosen that file. */
  source?: { url: string; key: number };
}
```

### `ModelPreview` — imperative handle

```ts
interface ModelPreviewHandle {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  playback: () => { time: number; duration: number; paused: boolean; hasAnimation: boolean };
  /** PNG of the current pose seen from above, framed for `size` (057, Q1 = A). */
  capture: (size: { width: number; height: number }) => Promise<Blob>;
}
```

### 3D view internals

```ts
// lib/raycastFrame
interface FrameOptions { /* … */ figureDepth?: Float32Array }
// lib/figureLayer
drawFigureLayer(target, layer, frameWidth, frameHeight, depth?: Float32Array): void
// components/story/raycastRenderer
setFigureDepthSink(sink: ((map: { data: Float32Array; width: number; height: number }) => void) | null): void
// components/story/modelLayer
setFigureDepth(map: { data: Float32Array; width: number; height: number } | null): void
```
