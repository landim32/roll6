# UI Contract: Painel de NPCs

## `SidePanel` (extraído do `PartyPanel`)

Props: `side: 'left' | 'right'`, `title`, `storageKey`, `children`, `footer?`.
Aberto: cabeçalho (título + botão recolher ‹/›), lista rolável, rodapé opcional. Recolhido: aba vertical
de 28 px encostada ao lado. Estado em localStorage (try/catch).

## `NpcPanel` (lado direito)

- Renderiza só com `isMaster` e campanha atual; título `npcs.title` "NPCs ({{count}})".
- Um `NpcCard` por NPC da campanha; vazio → `npcs.empty` discreto.
- Rodapé: botão `btn-outline-primary btn-sm w-100` "Incluir NPC" → `NpcPickerModal`.

## `NpcCard`

- `CharacterAvatar` 32 px (`imageUrl`, ou `tokenImageUrl` se não houver imagem), nome com ellipsis,
  lápis (`npcs.edit`), duas `VitalBar` (vida/energia base: `life/life`, `energy/energy`).
- `draggable` quando `canPlace`; `dataTransfer` `application/x-roll6-npc` = `npcId`.

## Drop no mapa

| Situação | Ação |
|---|---|
| Fora da grid | nada |
| Hex ocupado | toast `mapTokens.hexOccupied` |
| Hex livre | `POST /api/mapnpc` → toast `toast.npcPlaced` → recarrega as peças |

## `NpcPickerModal` ("Incluir NPC")

| Aba | Conteúdo |
|---|---|
| **Meus NPCs** | busca + lista (avatar, nome, vida/energia/movimento); os que já estão na campanha aparecem com badge "Na campanha" e desabilitados; clicar → incluir → toast `toast.npcAdded` → fecha |
| **Novo NPC** | `NpcFormFields`; Salvar → upload da imagem → `POST /api/npc` → `POST /api/campaignnpc` → toast → fecha |

## `NpcFormModal` (lápis)

- Título `npcs.editTitle`; `NpcFormFields` preenchido; rodapé: "Retirar da campanha" (`btn-outline-danger`,
  à esquerda) → `ConfirmModal` (`npcs.removeTitle`, `npcs.removeMessage`) → `DELETE /api/campaignnpc/{id}`;
  Cancelar / Salvar → `PUT /api/npc/{id}`.

## `NpcFormFields`

Nome; imagem (`ImageCropper` redondo, opcional); token (miniatura + nome ou "Sem token", botão "Escolher
token" → `TokenModal`) obrigatório; vida, energia, movimento; ficha (`MarkdownEditor`, lazy).

## Textos (pt-BR)

`npcs.title`, `npcs.empty` "Nenhum NPC na campanha.", `npcs.add` "Incluir NPC", `npcs.edit` "Editar {{name}}",
`npcs.editTitle` "Editar NPC", `npcs.pickerTitle` "Incluir NPC", `npcs.mineTab` "Meus NPCs", `npcs.newTab`
"Novo NPC", `npcs.inCampaign` "Na campanha", `npcs.mineEmpty`, `npcs.search`, `npcs.name`, `npcs.image`,
`npcs.token`, `npcs.noToken`, `npcs.chooseToken`, `npcs.life`, `npcs.energy`, `npcs.move`, `npcs.sheet`,
`npcs.remove` "Retirar da campanha", `npcs.removeTitle`, `npcs.removeMessage`, `npcs.collapse`,
`npcs.expand`, `npcs.errors.*`, `toast.npcAdded`, `toast.npcCreated`, `toast.npcUpdated`,
`toast.npcRemoved`, `toast.npcPlaced`.
