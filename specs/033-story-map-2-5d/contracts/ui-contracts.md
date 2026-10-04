# Contract: UI (033)

Tema escuro, textos por i18next (`pt-BR.json`), avisos por `sonner`, ícones só de `components/ui/icons.tsx`
(Bootstrap Icons copiados como componentes; botões só-ícone com `title` + `aria-label`).

## `MapControls` (existente)

| Controle | Quem vê | Quando | Ação |
|---|---|---|---|
| **Tipo de mapa** (2D / História 2,5D) | quem pode salvar o mapa | vista 2D | muda `draft.kind` (rascunho sujo) |
| **Paredes** (alterna o modo) + Pintar / Apagar | quem pode salvar o mapa | `kind = Story`, vista 2D | clique/arrasto pinta ou apaga hexágonos; `HexMenu` desligado no modo |
| **Céu** (enviar / remover) | quem pode salvar o mapa | `kind = Story`, vista 2D | `POST /api/image` sem recorte → `draft.skyImage`/`skyImageUrl` |
| **2D / 3D** | todos com acesso ao mapa | `kind = Story` | alterna a vista; grava `roll6:view-mode` |
| Zoom +/− | todos | sempre | no 3D, muda o FOV |
| Share | como hoje | mapa de campanha aberto | inalterado (JPEG do 2D) |
| Imagem / redimensionar | como hoje | só vista 2D | — |

Ícones (Bootstrap Icons): `Bricks` (paredes), `BrushFill` (pintar), `Eraser` (apagar), `CloudSun` (céu),
`Badge3d` / `Map` (alternar 3D/2D), `PersonBoundingBox` (voltar ao personagem), `Box` (tipo).

## SVG do mapa (vista 2D)

Ordem dentro do `<g transform>`: imagem → grade → **`WallLayer`** (novo, um `<path>` com `wallsPath`) →
`HexHighlight` → `TurnTrailLayer` → `TokenLayer` → `MovementLayer` → `SpeechBubbleLayer`. `WallLayer` só desenha
em mapas `Story`. Hover sobre parede no modo Mover mostra o hex como bloqueado.

## `components/story/StoryView.tsx` (novo, `React.lazy`)

Props: `draft` (imagem, layout, grade, `walls`, `skyImageUrl`), `pieces` (`MapTokenInfo[]` do
`MapTokenContext`), `followedPieceId` (peça do personagem escolhido ou `null`), `fov` / `onFovChange`.

- Ocupa o mesmo espaço do `MapCanvas`; painéis, menu, rodapé, console e `MapControls` ficam por cima.
- Teclado (com foco no canvas): W/S ou ↑/↓ andar, A/D passo lateral, Q/E ou ←/→ girar; mouse: arrastar gira,
  roda = FOV. Toque: joystick virtual (canto inferior esquerdo), arrastar gira, pinça = FOV.
- Botão flutuante **"Voltar ao personagem"** visível quando a câmera está solta e há peça do personagem.
- Sem WebGL → toast `story.noWebgl` e a página volta ao 2D.
- Libera geometrias, texturas e o renderer no unmount.

## `MainPage` (existente)

`draft.kind === Story && viewMode === '3d'` → `<Suspense><StoryView …/></Suspense>` no lugar de `<MapCanvas/>`.
Trocar para um mapa `Battle` (ex.: seguir o mapa atual do mestre) força a vista 2D sem apagar a preferência
guardada.

## i18n (`pt-BR.json`, chaves novas)

```json
"story": {
  "kind": "Tipo de mapa",
  "kindBattle": "Mapa 2D",
  "kindStory": "Mapa de história (2,5D)",
  "walls": "Paredes",
  "paint": "Pintar parede",
  "erase": "Apagar parede",
  "sky": "Céu/horizonte",
  "skyUpload": "Enviar imagem do céu",
  "skyRemove": "Remover céu",
  "view2d": "Ver em 2D",
  "view3d": "Ver em 3D",
  "followCharacter": "Voltar ao personagem",
  "noWebgl": "Este dispositivo não consegue exibir a vista 3D.",
  "loading": "Carregando cena 3D…",
  "wallBlocked": "Há uma parede nessa posição."
}
```
