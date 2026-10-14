# Contracts: Token 3D — posição defensiva visível e animação de morte (058)

## REST API — no new endpoint

`POST /api/token`, `PUT /api/token/{id}` (`TokenInsertInfo`) gain `modelDownClip`; `TokenInfo` and `MapTokenInfo` return it.

```json
{ "modelFile": "0123456789abcdef0123456789abcdef.glb", "modelIdleClip": "roll6-guard", "modelWalkClip": null, "modelDownClip": "roll6" }
```

| Request | Result |
|---|---|
| `modelDownClip` omitted / null / `""` | stored null (automatic) |
| `"roll6"`, `"none"`, `"clip:Death"`, `"roll6-guard"` | stored as is |
| `"Roll6"`, `"death"` | 400 `ValidationProblemDetails`, key `modelDownClip` |
| any value without `modelFile` | stored null |

## MCP — no new tool (still 102 operations / 103 tools)

- `create_token` / `update_token`: new optional parameter `modelDownClip`, with the description "Animation the 3D view plays once when the piece is down or out of combat, holding its last frame. " + `McpDocs.MODEL_CLIP`.
- `McpDocs.MODEL_CLIP`: names the death patterns ("death"/"die"/"dead"/"morte") for automatic, and "roll6" = Roll6's death in that state.
- `roll6://guide`, section "3D view":
  - Pieces with a model that are down or out of combat lie in the 3D view, at the last frame of the death, or tipped on their back without one.
  - The guard and the death play in full even on rigs that hold limbs still, and may deform them.

## UI — "3D" tab of the token form

1. **State selector** above the preview, replacing "Caminhar / Parar": `btn-group` with **Parado | Caminhando | Caído** (`aria-pressed`).
   - "Caminhando" is disabled when its source is `static`. "Caído" is always enabled: without animation it shows the tipped model.
2. **Timeline** (057): unchanged.
   - On Caído it runs the death once and stops at the end (bar at the right, the button shows "Continuar"). "Continuar" there restarts from 0.
3. **Gerar imagem** (057): unchanged rules (paused or static). On Caído at the end, "Imagem Caído" photographs the lying pose from above.
4. **Animações**: three selects, Parado / Caminhando / **Caído**.
   - Options of Caído: "Automático (…)", the file's clips, **"Morte (Roll6)"** (Mixamo only), "Sem animação". No guard option.
   - Changing a select shows that state in the preview.
5. **Warnings**:
   - `tokens.model.reduced` (idle/walk fitted, as today).
   - **`tokens.model.deforms`** when a chosen guard or death deforms this model.

### Texts (pt-BR)

| Key | Text |
|---|---|
| `tokens.model.state.down` | Caído |
| `tokens.model.option.death` | Morte (Roll6) |
| `tokens.model.deforms` | Esta animação pode deformar este modelo: o esqueleto dele prende braços e pernas ao quadril. |
| `tokens.model.auto.death` (or the existing auto pattern) | Automático (morte do Roll6) |

## Internal contracts

```ts
// lib/modelAnimations
type AnimationState = 'idle' | 'walk' | 'down';
interface ModelClipChoices { idle: ModelClipChoice; walk: ModelClipChoice; down: ModelClipChoice }
type ResolvedAnimation = { source: 'file'; index: number } | { source: 'roll6'; clip: 'idle' | 'walk' | 'guard' | 'death' } | { source: 'static' };

// lib/modelFit
fitLyingModel(bounds: ModelBounds, width: number, center: Point, yaw: number): ModelPlacement & { tilt: number } // tilt = −π/2

// lib/pieceDrawing
isModelShownIn3d(token: Pick<MapTokenInfo, 'modelFileUrl'>): boolean

// components/story/modelLayer
interface ModelSpec { id; url; width; center; yaw; clips: ModelClipChoices; lying: boolean }

// components/story/threeClips
interface ModelClips { idle; walk; down: AnimationClip | null; sources: Record<AnimationState, AnimationSource>; reduced: boolean; deforms: boolean }

// components/tokens/ModelPreview
interface ModelPreviewProps { /* … */ shown: AnimationState; onClips: (sources, reduced: boolean, deforms: boolean) => void }
```
