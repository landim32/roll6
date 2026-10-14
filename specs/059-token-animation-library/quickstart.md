# Quickstart: Biblioteca de animações dos tokens 3D (059)

## Build and automated checks

```bash
cd backend && dotnet build Roll6.sln && dotnet test
cd ../frontend && npm run lint && npm test && npm run build
cd /c/repos/gurps-adventure && for f in .claude/skills/criar-animacao/exemplos/*.json; do python .claude/skills/criar-animacao/scripts/validar.py "$f" || echo "FALHOU: $f"; done
python .claude/skills/criar-animacao/scripts/validar.py /c/repos/Roll6/specs/059-token-animation-library/fixtures/invalid-*.json   # every one fails, with the expected key
```

Database: apply `AddAnimations` (`dotnet ef database update …`), or run `database/migrations/059-animations.sql`. Production applies it on startup.

## Manual check

**Prerequisites**: the example orc (`orc-gordo.glb`, Mixamo) on a token placed on a campaign map with a 3D mask.

### US1: upload

1. User menu → "Animações" → Enviar → choose `exemplos/aceno.json` from the skill. Name "Aceno", type Parado → Enviar. It appears in Minhas with "Parado", "1 s · repete".
2. Send a copy with a bone renamed to `LeftElbow`. The error says the bone does not exist (track number), and nothing is saved.
3. Pencil: rename it to "Aceno alegre". The new name is shown.
4. Send `roll6-morte.json` as Derrotado and `roll6-caminhada.json` as Andando.

### US2: token

1. Edit the orc token → "3D". Parado shows the "Biblioteca" group with "Aceno alegre", Caminhando with the walk, and Caído with the death.
2. Pick "Aceno alegre". The preview waves at once and "Tocando: Biblioteca: Aceno alegre" is shown. Save.
3. Open the 3D view. The standing orc waves. Set it to Caído: the library death plays once and stays.
4. Back in "Animações", try to delete "Aceno alegre": refused, in use. Try to change its type to Atacando: refused. Change the token's Parado to Automático, save, then delete it: it is deleted.
5. Upload an animation of type Atacando. It is listed in Minhas but appears in no select.
6. With a second user: Buscar lists the first user's animations, and their own token can use "Aceno" in Parado.

### US3: MCP

1. `create_animation` with `content` = the object of `exemplos/aceno.json`, `type: "idle"` → `{ animationId, … }`.
2. `list_animations { mine: true, type: 1 }` shows it. `get_animation_content` returns the JSON.
3. `update_token` with `modelIdleClip: "animation:{id}"` succeeds. With an Atacando id it fails with 400 on `modelIdleClip`.

### US4: skill (in `C:\repos\gurps-adventure`)

1. Run `/criar-animacao um orc golpeando com o machado de cima para baixo, tipo Atacando`. The file lands in `animacoes/`, `validar.py` passes, and the skill notes that Atacando does not show on tokens yet.
2. Run `/criar-animacao` with a picture of a defensive pose, type Parado. The clip reaches and holds the pose with a light breath.
3. "envie para o Roll6" → the skill runs `enviar.py`, then prints the id and `animation:{id}`. The animation shows in the site's Minhas.
