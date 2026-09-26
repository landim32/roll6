# UI Contract: Tokens no Mapa

## Mapa (`MapCanvas`)

Dentro do grupo transformado, nesta ordem: imagem → grid → `HexHighlight` → `TokenLayer`.

| Elemento | Comportamento |
|---|---|
| `TokenLayer` | um `<g>` por token do mapa em `hexCenter(x, y)`: imagem em pé (`upImageUrl`) recortada em círculo de raio `0.8·HEX_SIZE`, ou círculo com a inicial do `name`; `<title>` com o nome; `pointer-events: none` |
| `HexHighlight` | hexágono do hex sob o mouse (hover ou `dragover`), `fill` azul claro translúcido, sem borda forte, `pointer-events: none`; some fora da grid |
| Clique (< 4 px de movimento, sem modo de redimensionar) | mestre + mapa de campanha → abre `HexMenu` no ponto do clique |
| Drop de card de personagem | ver tabela abaixo |

Tokens e interações só com `draft.mapId !== null` (mapa de campanha). Destaque sempre.

### Drop do personagem (`characterDropAction`)

| Situação | Ação |
|---|---|
| Fora da grid | nada |
| Hex ocupado por outro token | toast aviso "O hex precisa estar livre." |
| Personagem já está neste mapa | `PUT /api/maptoken/{id}/position` |
| Personagem com token (`characterTokenId`) | `POST /api/maptoken/character` sem modal |
| Personagem sem token | abre `TokenModal` ("Escolher token de {nome}") → `POST /api/maptoken/character` com o `tokenId`; atualiza party/personagens |

## `HexMenu`

- `ul.dropdown-menu.show` absoluto no ponto do clique; um item: **"Incluir token"** (hex vazio) ou
  **"Alterar token"** (hex ocupado). Fecha com clique fora, Esc, pan, zoom ou ao escolher.
- "Incluir token" → `TokenModal` → `POST /api/maptoken` (`tokenType` NPC = 2, `name` = nome do token,
  demais valores 0/null, `look` 0).
- "Alterar token" → `TokenModal` → `PUT /api/maptoken/{id}/token`.

## `PartyCard`

- `draggable` só quando `isMaster` e há mapa de campanha aberto; `dataTransfer`
  `application/x-roll6-participation` = `campaignCharacterId`; cursor `grab`.

## `TokenModal`

Props: `open`, `onOpenChange`, `title`, `onSelect(token: TokenInfo) => Promise<void> | void`.

| Aba | Conteúdo |
|---|---|
| **Buscar tokens** | campo de busca (debounce 300 ms), grade `row row-cols-3 g-2` de botões-card (imagem quadrada ou inicial + nome truncado), paginação "Anterior/Próxima" (12 por página), vazio → "Nenhum token encontrado. Cadastre um na aba Incluir token." Clicar num card → `onSelect` |
| **Incluir token** | nome (obrigatório, ≤ 260), descrição (≤ 2000), imagem em pé e imagem deitado (opcional) com `ImageCropper` quadrado (`shape="square"`) e rotacionável (botões de 90° + controle fino), salvas sempre em 240 × 240 px (`TOKEN_IMAGE_SIZE`, ampliando ou reduzindo), espaço em pé (padrão 1) e deitado (opcional); Salvar → `POST /api/image` + `POST /api/token` → toast → `onSelect(novo)` |

Enquanto `onSelect` roda, o modal fica ocupado; sucesso fecha; erro → toast e mantém aberto.

## `CharacterFormModal` (inclusão e modo `owner`)

- Linha "Token" na aba Dados: miniatura + nome do token (ou "Sem token"), botões "Escolher token"
  (abre `TokenModal`) e "Remover". Grava `tokenId` com o personagem.

## Textos (pt-BR)

`tokens.modalTitle` "Tokens", `tokens.searchTab` "Buscar tokens", `tokens.createTab` "Incluir token",
`tokens.search` "Buscar por nome", `tokens.empty`, `tokens.name`, `tokens.description`,
`tokens.upImage` "Imagem em pé", `tokens.downImage` "Imagem deitado (opcional)", `tokens.upSpace`
"Espaço em pé", `tokens.downSpace` "Espaço deitado", `tokens.errors.nameRequired`,
`tokens.errors.nameTooLong`, `tokens.errors.descriptionTooLong`, `tokens.errors.invalidSpace`,
`hexMenu.addToken` "Incluir token", `hexMenu.changeToken` "Alterar token", `mapTokens.hexOccupied`
"O hex precisa estar livre.", `mapTokens.chooseCharacterToken` "Escolher token de {{name}}",
`toast.tokenCreated`, `toast.mapTokenAdded`, `toast.mapTokenChanged`, `characterForm.token` "Token",
`characterForm.noToken` "Sem token", `characterForm.chooseToken` "Escolher token",
`characterForm.removeToken` "Remover".
