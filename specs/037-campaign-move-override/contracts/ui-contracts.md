# UI contract (037)

## `CampaignCharacterModal` — tab "Dados", area "Nesta campanha"

- New numeric field **Deslocamento** (`characterForm.currentMove`), `id="campaign-character-current-move"`, `min=0`, on the row of
  "Vida atual"/"Energia atual" (three columns on `md+`, stacked on phones).
- Seeded from `detail.currentMove`. Modes (`participationMode`): **owner** and **master** edit it; **viewer** sees it read-only.
- Validation (`lib/campaignCharacterForm.validateCampaignArea` or a sibling): empty, non-integer or negative →
  inline error `campaignCharacter.moveInvalid`, nothing sent.
- Saved by the same single `PUT /api/campaigncharacter/{id}` (`toCampaignUpdate` gains `currentMove`).
- Help text under "Nesta campanha" (`characterForm.currentMoveHelp`): "Quanto o personagem anda no mapa por turno nesta campanha.
  Começa igual ao Movimento."
- "Ficha permanente" keeps "Movimento" read-only (`detail.characterMove`).

## Mover mode — no code change

`useTokenMovement` keeps `total: token.move`; for character pieces `move` now carries the participation's Deslocamento, so the
counter (`x/1`) and the red trail follow it.

## i18n (`pt-BR.json`)

`characterForm.currentMove` = "Deslocamento", `characterForm.currentMoveHelp`, `campaignCharacter.moveInvalid` =
"Informe um deslocamento inteiro igual ou maior que zero."
