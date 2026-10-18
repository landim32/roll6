# Data Model: Melhorias das armas no token (085)

No schema, DTO or API change. Everything is frontend state:

- **Socket anchors** (`components/story/socketAnchors`, per model instance, in memory): now measured on the **idle
  pose** by the callers (`ModelPreview.applyClips`, `modelSet.animate`), re-measured (`forgetSockets` +
  `measureSockets`) whenever the idle action changes, and the attached weapons re-hung (`weaponSockets.refresh`).
- **Hand frame** (`lib/socketFrame.handFrame`): takes the hips position (`HandBones.hips?`) for the "away from the
  body" side; `up` from the model's forward, the thumb only as a fallback.
- **Preview zoom**: a number 1…4 held by `ModelField` (`zoom`, reset on `previewUrl`) and `WeaponStage` (reset on
  `url`); never stored.
- **Side layout**: CSS only (`.stm-model-layout.is-side`); `fineOpen` starts open on `md+`.
