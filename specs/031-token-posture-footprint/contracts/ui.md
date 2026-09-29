# UI contract (031)

Todos os textos via i18next (`pt-BR.json`), feedback via `sonner`, ícones de `components/ui/icons.tsx`.

## Menu da peça (`HexMenu`)

- Peças de personagem (mestre ou dono) e de NPC (mestre): grupo "Postura" com "Em pé", "Caído", "Fora de combate"
  (atual marcado, desabilitado). Um clique = `MapTokenContext.setPosture` → `PUT /api/maptoken/{id}/posture`
  (SC-001: abrir menu + escolher).
- O menu do jogador passa a ter Mover/Agir/Resetar (existentes) + Postura do seu personagem.
- Objetos: sem grupo Postura.

## Mapa

- `TokenLayer`: formato inteiro (research R7); deitada; `is-out` = preto e branco.
- `HexHighlight`: com o cursor sobre qualquer hex de uma peça, destaca todos os hexes dela; sobre hex livre, só o hex.
- Arrastar cartão (personagem/NPC): destaque do formato no destino (tamanho em pé/postura atual, look 0 para novas
  peças de NPC, look da peça para personagem já no mapa); vermelho quando não cabe; drop recusado com toast
  `tokens.doesNotFit`.
- Mover (`useTokenMovement` / `MovementLayer`): campo de movimento com o tamanho; pré-visualização do formato no
  destino/direção; direções que não cabem não são selecionáveis.
- Clique em qualquer hex de uma peça abre o menu dela.
- Compartilhar (`mapSnapshot`): mesmo desenho, cinza por pixel.

## Cartões e janelas

- `PartyCard` / `NpcCard` (ocorrências): selo de postura quando ≠ Em pé; imagem em cinza quando Fora de combate.
- `CharacterFormModal` (dono/mestre, "Nesta campanha"): select "Postura", salvo no `PUT /api/campaigncharacter/{id}`
  junto com os demais campos; leitor vê o texto.
- `TokenFormFields`: "Espaço em pé" e "Espaço deitado" viram `<select>` com 1, 2, 3, 7, 10 hexes (deitado com "Sem
  estado deitado"); `lib/tokenForm.ts` valida o mesmo conjunto.
