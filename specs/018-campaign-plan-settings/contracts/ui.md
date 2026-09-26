# UI Contract: configuração da campanha (018)

## Botão (TopMenu)

Engrenagem logo à direita do seletor "Campanha atual", só para `isMaster && currentCampaign`;
`title`/`aria-label` `campaignSettings.open`. Abre `CampaignSettingsModal`.

## `CampaignSettingsModal` (`components/modals/CampaignSettingsModal.tsx`)

- Título `campaignSettings.title` ("Configuração da campanha — {{name}}"), modal grande.
- Abas (`Tabs`): `characters` Personagens, `npcs` NPCs, `maps` Mapas, `plan` Plano; aba lembrada em
  localStorage `roll6:settings-tab`. Troca de campanha fecha o modal.

### Personagens

`components/campaign/ManageCharactersPanel` (conteúdo extraído do `ManageCharactersModal`: "Na campanha"
com aprovar/negar/remover e "Convidar" com a busca). `ManageCharactersModal` passa a usar o painel.

### NPCs

Lista dos NPCs da campanha (imagem, nome, vida/energia base) com lápis → `NpcFormModal` (editar / "Retirar
da campanha") e botão "Incluir NPC" → `NpcPickerModal`. Vazio → `npcs.empty`.

### Mapas

Lista paginada (10) dos mapas da campanha: miniatura, nome, grade, situação (Ativo/Arquivado) e selo
`campaignSettings.currentMap` no mapa atual. Ações: **Abrir** (guard de não salvo → fecha → abre),
**Arquivar**/**Reativar**, **Excluir** (`ConfirmModal`, perigo). Vazio → `campaignSettings.noMaps`.

### Plano

Duas colunas (empilha em telas estreitas): à esquerda a lista de planos (título + "alterado em …") e
"Novo plano"; à direita o editor: título (obrigatório, 260), botão "Inserir imagem" (upload → insere
`![](roll6-image:…)`), `MarkdownEditor` (50 000, pré-visualização resolvendo as imagens), "Salvar" e
"Excluir" (`ConfirmModal`). Rascunho alterado + trocar de plano/aba/fechar → `ConfirmModal`
`campaignSettings.discardPlan`. Vazio → `campaignSettings.noPlans`.

## Textos (pt-BR)

`campaignSettings.open` "Configuração da campanha", `title`, `tabCharacters`, `tabNpcs`, `tabMaps`,
`tabPlan`, `currentMap` "Atual", `noMaps`, `openMap` "Abrir", `archiveMap` "Arquivar", `restoreMap`
"Reativar", `deleteMap`, `deleteMapMessage`, `mapActive` "Ativo", `mapArchived` "Arquivado", `noPlans`,
`newPlan` "Novo plano", `planTitle` "Título", `planDescription` "Descrição", `insertImage` "Inserir
imagem", `changedAt` "Alterado em {{date}}", `deletePlan`, `deletePlanMessage`, `discardPlan`,
`discardPlanMessage`, `titleRequired`; toasts `toast.planSaved`, `toast.planDeleted`, `toast.mapArchived`,
`toast.mapRestored`, `toast.mapDeleted`.
