# Research: Painel de NPCs

## R1 — Invólucro comum aos dois painéis

- **Decision**: extrair do `PartyPanel` um `SidePanel` (`{ side: 'left' | 'right'; title; storageKey;
  children; footer? }`) com cabeçalho, botão recolher (‹ à esquerda, › à direita), aba vertical recolhida
  e estado em localStorage (`roll6:party-collapsed` / `roll6:npc-collapsed`, try/catch). Classes
  `.stm-party` ganham a variante `.stm-side-right`.
- **Rationale**: "igual à área de personagens" sem duplicar a lógica.
- **Alternatives**: copiar o `PartyPanel` — duas implementações a manter.

## R2 — Posição do painel direito

- **Decision**: `right: 8px`, mesmo `top` e largura (220 px) do esquerdo; `max-height` descontando o
  menu, o rodapé e a coluna de controles do mapa (4 botões de 48 px no canto inferior direito):
  `--stm-controls-space: 240px`. A aba recolhida fica encostada à direita, texto vertical.
- **Rationale**: FR-007/SC-004.

## R3 — Estado e dados

- **Decision**: um `NpcContext` (react-architecture) com:
  - `campaignNpcs` (`GET /api/campaign/{id}/npc`), carregados quando `isMaster` e a campanha muda; vazio
    para quem não é mestre (sem chamada);
  - `searchMyNpcs(query)` (`GET /api/npc`), `createNpc`, `updateNpc`, `addToCampaign(npcId)`,
    `removeFromCampaign(campaignNpcId)`, `placeOnMap(npcId, x, y)` (`POST /api/mapnpc` + `refresh()` do
    `MapTokenContext`);
  - Provider depois do `MapTokenProvider` (usa `useMapToken().refresh`).
- **Rationale**: tudo o que o painel e os modais usam num só lugar; os endpoints são da 013.
- **Alternatives**: três contexts (um por entidade) — mais providers sem ganho.

## R4 — "Incluir NPC"

- **Decision**: `NpcPickerModal` com abas "Meus NPCs" (lista paginada da biblioteca com busca; NPCs já na
  campanha aparecem marcados e desabilitados) e "Novo NPC" (`NpcFormFields`). Escolher → `addToCampaign`;
  salvar novo → `createNpc` + `addToCampaign`. Toasts de sucesso/erro; 409 (já na campanha) vira aviso.
- **Rationale**: FR-004 e SC-002 (3 cliques).

## R5 — Campos do NPC

- **Decision**: `NpcFormFields`: nome, imagem (`ImageCropper` redondo + `cropToFile` como o personagem),
  token obrigatório (miniatura + "Escolher token" que abre o `TokenModal` da 011/012), vida, energia,
  movimento e ficha (`MarkdownEditor` lazy). Regras puras em `lib/npcForm.ts` (nome ≤ 260, números
  inteiros ≥ 0, ficha ≤ 20 000, token obrigatório).
- **Rationale**: mesmos limites do backend; reaproveita o recorte e o modal de tokens.

## R6 — Arrastar NPC

- **Decision**: `NpcCard` arrastável (mestre + mapa de campanha, `useMapToken().canPlace`) com
  `NPC_DRAG_TYPE = 'application/x-roll6-npc'` (valor = `npcId`). No `MapCanvas`, `dragover` aceita os dois
  tipos; o drop de NPC usa `npcDropAction({ hex, tokens })` → `none` (fora da grid) | `occupied` |
  `place`; `place` chama `placeOnMap`.
- **Rationale**: FR-005; mesma mecânica da 011, regra pura testável.

## R7 — Editar e retirar

- **Decision**: lápis → `NpcFormModal` com `NpcFormFields` preenchido (`GET /api/npc/{id}`), salvar →
  `PUT /api/npc/{id}` e recarrega a lista; botão "Retirar da campanha" (vermelho) → `ConfirmModal` →
  `DELETE /api/campaignnpc/{id}` + `refresh()` das peças.
- **Rationale**: FR-006.
