# Implementation Plan: Painel de NPCs

**Branch**: `014-npc-panel` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-npc-panel/spec.md`

## Summary

Painel de NPCs à direita do mapa, espelho do painel de personagens e visível só ao mestre: um card por
NPC da campanha (imagem redonda ou inicial, nome, barras de vida/energia base), recolhível, com o botão
"Incluir NPC" no fim da lista. "Incluir NPC" abre `NpcPickerModal` (abas "Meus NPCs" e "Novo NPC"); o
lápis abre `NpcFormModal` (editar + "Retirar da campanha"). Arrastar um card para um hex livre cria uma
ocorrência com peça (`POST /api/mapnpc`). Só frontend, sobre os endpoints da feature 013. O invólucro do
painel (cabeçalho, recolher, rolagem, estado salvo) é extraído do `PartyPanel` para um `SidePanel`
reaproveitado pelos dois lados.

## Technical Context

**Language/Version**: TypeScript 5 + React 18
**Primary Dependencies**: Vite 6, Bootstrap 5.3, i18next, sonner, Radix Dialog, react-easy-crop,
@uiw/react-md-editor (existentes; nada novo). Arraste com HTML5 Drag and Drop (como a 011).
**Storage**: localStorage `roll6:npc-collapsed` (painel recolhido)
**Testing**: Vitest — `lib/npcForm.ts` (validação/payload), `lib/mapTokens.npcDropAction`
**Target Platform**: navegadores desktop atuais
**Project Type**: web app (só `frontend/`)
**Performance Goals**: lista de NPCs da campanha carregada ao trocar de campanha e após cada ação (sem
polling: só o mestre a altera)
**Constraints**: painel direito não cobre menu, controles do mapa (canto inferior direito) nem rodapé;
largura 220 px como o da esquerda (SC-004)
**Scale/Scope**: 3 entidades no frontend (`npc`, `campaignNpc`, `mapNpc`) com Types/Services e um
`NpcContext`; 1 painel + card; 2 modais; ajuste no `MapCanvas` para o drop de NPC

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princípio | Como o plano atende | Status |
|---|---|---|---|
| I | Skills obrigatórias | `npc`/`campaignNpc`/`mapNpc` pela skill `react-architecture` (Types → Services → `Contexts/NpcContext.tsx` → `hooks/useNpc.ts` → provider no `main.tsx`), ajustada à constituição (DTO direto, sem envelope) | ✅ |
| II | Stack fixa | Nada novo; Fetch; Context API; Bootstrap | ✅ |
| III | Casing | `Contexts/NpcContext.tsx`, `Services/npcService.ts`, `Services/campaignNpcService.ts`, `Services/mapNpcService.ts`, `hooks/useNpc.ts`, `types/npc.ts` | ✅ |
| IV | Convenções | `interface`, arrow functions, constantes (sem `enum`), textos i18n pt-BR | ✅ |
| V | Banco | Não afetado | ➖ N/A |
| VI | Segurança | Painel e botão só para `isMaster`; o backend continua sendo a barreira (403) | ✅ |
| VII | Grid hexagonal | Drop usa `useMapPointer` (`pixelToHex` + `isInsideGrid`); posição enviada como `x`/`y` | ✅ |

Re-check pós-design: sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/014-npc-panel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ui.md
├── checklists/requirements.md
└── tasks.md             # /speckit.tasks
```

### Source Code (repository root)

```text
frontend/src/
├── types/npc.ts                                   # NpcInfo, NpcInsertInfo, CampaignNpcInfo, CampaignNpcInsertInfo, MapNpcInfo, MapNpcInsertInfo
├── Services/npcService.ts, campaignNpcService.ts, mapNpcService.ts
├── Contexts/NpcContext.tsx + hooks/useNpc.ts      # biblioteca, NPCs da campanha, colocar no mapa
├── lib/npcForm.ts (+ test)                        # formulário do NPC (mesmos limites do backend)
├── lib/mapTokens.ts (+ test)                      # NPC_DRAG_TYPE, npcDropAction
├── components/map/SidePanel.tsx                   # invólucro extraído do PartyPanel (lado, título, recolher, storage key)
├── components/map/PartyPanel.tsx                  # passa a usar SidePanel
├── components/map/NpcPanel.tsx, NpcCard.tsx       # novos
├── components/map/MapCanvas.tsx                   # drop de NPC
├── components/npcs/NpcFormFields.tsx              # campos do NPC (imagem, token, números, ficha)
├── components/modals/NpcPickerModal.tsx           # "Incluir NPC": Meus NPCs / Novo NPC
├── components/modals/NpcFormModal.tsx             # editar + Retirar da campanha
├── pages/MainPage.tsx, main.tsx, styles/app.css
└── i18n/locales/pt-BR.json
```

**Structure Decision**: web app existente; nova pasta `components/npcs/` para os campos compartilhados.

## Complexity Tracking

Sem violações.
