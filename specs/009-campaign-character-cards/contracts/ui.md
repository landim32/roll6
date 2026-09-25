# UI Contracts: Cards dos Personagens da Campanha

## `PartyPanel` (`components/map/PartyPanel.tsx`)

Renderizado no `MainPage`, sobre o mapa, só quando `party.length > 0`.

```
┌──────────────────────┐  ← top: menu + 8 px, left: 8 px, largura 220 px
│ Personagens (3)   ‹  │  ← cabeçalho: título + recolher
│ (A) Aria        ✎    │
│  ▓▓▓▓▓▓▓░░░  8/12    │  ← vida (vermelha)
│  ▓▓▓▓▓▓▓▓▓░  5/6     │  ← energia (azul)
│ (B) Bram  CAÍDO ✎    │
│ …                    │  ← rolagem interna até o rodapé
└──────────────────────┘
recolhido: aba vertical de 28 px com "Personagens (3)" e ›
```

- `PartyCard`: `CharacterAvatar` 32 px, nome (ellipsis + `title`), botão lápis (`aria-label`
  "Editar {nome}") só se `canEdit`; destaque (`border-primary`) no personagem atual; classe
  `stm-party-fallen` (avatar em cinza + badge "Caído") quando `currentLife ≤ 0`.
- `VitalBar`: `progress` Bootstrap de 6 px com `role="progressbar"`, `aria-valuenow`,
  `aria-valuemax`, `aria-label` "Vida 8 de 12"; texto `atual/total` à direita.

## `CharacterFormModal` em modo edição

`{ open; onOpenChange; editing?: { characterId: number; participation: CampaignCharacterInfo } }`

- Título "Editar Personagem"; campos preenchidos a partir de `GET /api/character/{id}`.
- Imagem: mostra a atual (avatar 96 px) + "Trocar imagem" (abre o `ImageCropper`) e "Remover".
- Aba **Dados** ganha o bloco "Nesta campanha": `#character-current-life`, `#character-current-energy`
  (inteiros, podem ser negativos, `max` = total digitado).
- Salvar: valida (`validateCharacterForm` + `validateVitals`) → upload se trocou a imagem →
  `PUT /api/character/{id}` → `PUT /api/campaigncharacter/{id}/vitals` → `refreshParty` → toast
  `toast.characterUpdated` e fecha.

## Textos (pt-BR)

`party.title` "Personagens ({{count}})", `party.collapse` "Recolher", `party.expand` "Mostrar
personagens", `party.edit` "Editar {{name}}", `party.fallen` "Caído", `party.life` "Vida",
`party.energy` "Energia", `party.vital` "{{label}} {{current}} de {{total}}",
`characterForm.editTitle` "Editar Personagem", `characterForm.campaignSection` "Nesta campanha",
`characterForm.currentLife` "Vida atual", `characterForm.currentEnergy` "Energia atual",
`characterForm.changeImage` "Trocar imagem", `characterForm.errors.aboveTotal` "O valor atual não pode
passar do total.", `toast.characterUpdated` "{{name}} atualizado."
