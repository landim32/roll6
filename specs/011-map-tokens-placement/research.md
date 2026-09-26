# Research: Tokens no Mapa

## R1 — Pixel → hex

- **Decision**: `pixelToHex(point, size)` segue o guia Red Blob ("Pixel to Hex", flat-top): desfaz a
  origem do layout do projeto (hex (0,0) com centro em `(size, √3/2·size)`), calcula o hex fracionário
  `q = (2/3·px) / size`, `r = (−1/3·px + √3/3·py) / size`, arredonda com `hexRound` cúbico
  (`s = −q − r`; arredonda os três e corrige o componente de maior erro) e converte para offset odd-q
  (`axialToOffset`). `isInsideGrid(offset, columns, rows)` descarta fora da grid. Implementado em
  `lib/hexGrid.ts` e espelhado em `HexGrid.PixelToHex`/`HexRound` com os mesmos valores de referência
  nos testes dos dois lados.
- **Rationale**: Princípio VII e CLAUDE.md exigem cube rounding e o módulo puro espelhado.
- **Alternatives**: `elementFromPoint` em um `<path>` por hex — exige um elemento por hex (grids
  grandes) e foge da regra da constituição.

## R2 — Coordenadas do mouse no mapa

- **Decision**: hook `useMapPointer` converte `clientX/clientY` → ponto do mapa:
  `(client − rect.topLeft − pan) / zoom`, usando o `getBoundingClientRect()` do `<svg>` e o `view`
  do `MapEditorContext`. O mesmo cálculo serve para hover, clique e drop.
- **Rationale**: o grupo transformado é `translate(pan) scale(zoom)`; a imagem e a grid começam em
  (0,0) dentro dele.
- **Alternatives**: `getScreenCTM().inverse()` — equivalente, mas o cálculo direto é testável sem DOM.

## R3 — Destaque do hex

- **Decision**: `HexHighlight` é um `<path>` (hexágono do hex sob o mouse) dentro do grupo
  transformado, `fill` azul claro (`rgba(13,202,240,0.25)`, `--bs-info` translúcido),
  `pointer-events: none`. O hex atual fica em estado local do `MapCanvas` e só muda quando o hex muda
  (não a cada pixel).
- **Rationale**: SC-003 — um elemento só, sem re-render dos tokens.

## R4 — Clique x pan

- **Decision**: no `pointerdown` guarda a posição; no `pointerup`, se o ponteiro andou menos de 4 px e
  não está em modo de redimensionar, trata como clique no hex → abre o `HexMenu` (só mestre com mapa de
  campanha). Clique no fundo segue fazendo pan como hoje.
- **Rationale**: US3 cenário 6.

## R5 — Menu do hex

- **Decision**: `HexMenu` é um `ul.dropdown-menu.show` (Bootstrap) posicionado em absoluto no ponto do
  clique, fechado por clique fora, Esc, pan ou zoom. Um item: "Incluir token" ou "Alterar token".
- **Rationale**: Radix Dropdown precisa de um trigger; um menu posicionado é mais simples e mantém o
  visual dos outros menus.
- **Alternatives**: Radix DropdownMenu com trigger invisível posicionado — funciona, mais código.

## R6 — Arrastar o personagem

- **Decision**: HTML5 Drag and Drop. `PartyCard` fica `draggable` só para o mestre com mapa de
  campanha aberto e grava `application/x-roll6-participation` = `campaignCharacterId`. O `<svg>` trata
  `dragover` (preventDefault + atualiza o destaque) e `drop` (pixel → hex → ação). A regra da ação fica
  pura em `lib/mapTokens.characterDropAction(...)`: `outside` | `occupied` | `move` | `place` |
  `chooseToken`.
- **Rationale**: sem dependência nova; o card está fora do SVG.
- **Alternatives**: pointer events com "fantasma" próprio — mais código, sem ganho aqui.

## R7 — Colocar personagem no backend

- **Decision**: `POST /api/maptoken/character` (`MapTokenCharacterInsertInfo { mapId,
  campaignCharacterId, tokenId?, x, y }`). O service: mapa do mestre e não excluído; participação
  Approved e da campanha do mapa; sem token do mapa dessa participação no mapa (409); hex livre (409);
  token = `character.TokenId ?? info.TokenId` (400 se nenhum); se o personagem não tinha token, grava
  `character.TokenId = info.TokenId` na mesma transação (spec FR-015). Mover um personagem que já está
  no mapa usa `PUT /api/maptoken/{id}/position`.
- **Rationale**: uma chamada atômica cobre "gravar no personagem + colocar"; a exceção à regra da 010
  fica restrita a esse caso.
- **Alternatives**: `PUT /api/character/{id}/token` separado para o mestre — duas chamadas e uma
  permissão nova mais ampla.

## R8 — Dados do token do mapa de personagem

- **Decision**: para `TokenType = Character`, `MapTokenInfo` preenche `name`, `life`, `energy`,
  `status`, `sheet`, `move` a partir da participação (`CurrentLife`, `CurrentEnergy`,
  `CharacterStatus`, `Sheet`) e do personagem (`Name`, `Move`); as colunas próprias guardam o nome do
  personagem no momento da criação (`name` é obrigatório) e zeros. `campaignCharacterId`/`characterId`
  vêm no DTO.
- **Rationale**: FR-003, sem cópias divergentes.

## R9 — Integridade

- **Decision**: índice único filtrado `ix_map_tokens_map_campaign_character (map_id,
  campaign_character_id) WHERE campaign_character_id IS NOT NULL` (FR-004); `MapToken` valida
  `TokenType == Character ⇔ CampaignCharacterId != null`. `TokenLibraryService.DeleteAsync` recusa
  token usado por personagem (409, FR-006). `CampaignCharacterService.RemoveAsync` e
  `CharacterService.DeleteAsync` apagam antes os tokens do mapa ligados (FKs `ClientSetNull`). A
  exclusão de campanha já apaga os tokens dos mapas excluídos antes das participações e é bloqueada
  com mapas ativos.
- **Rationale**: constituição (sem cascade) e edge cases da spec.

## R10 — Frontend: entidades e estado

- **Decision**: pela `react-architecture`: `TokenContext` (biblioteca: `search(query)`, `create`) e
  `MapTokenContext` (tokens do mapa aberto: carrega quando `draft.mapId` muda, `addToken`,
  `placeCharacter`, `moveToken`, `changeToken`; depois de cada ação recarrega os tokens e, ao gravar o
  token de um personagem, chama `refreshParty()`/`refresh()` do `CharacterContext`). Providers:
  `… → MapEditorProvider → TokenProvider → MapTokenProvider → App`.
- **Rationale**: Princípio I; os tokens do mapa dependem do mapa aberto no editor.

## R11 — Modal de tokens

- **Decision**: `TokenModal` (`open`, `onOpenChange`, `title`, `onSelect(token)`), abas "Buscar tokens"
  (`GET /api/token?search&page&pageSize=12`, grade `row row-cols-3 g-2` de cards com imagem quadrada ou
  inicial + nome, paginação anterior/próxima) e "Incluir token" (nome, descrição, imagem em pé e imagem
  deitado via `ImageCropper` + `cropToFile` + `POST /api/image`, espaço em pé/deitado). Salvar cria o
  token e chama `onSelect` com ele. O chamador decide a ação (incluir, alterar, colocar personagem,
  escolher token do personagem).
- **Rationale**: US4 e FR-014.

## R12 — Token do personagem no cadastro (US5)

- **Decision**: `CharacterInsertInfo.tokenId` (opcional; 404 se não existe); no `CharacterFormModal`
  (inclusão e modo `owner`) uma linha "Token" com miniatura, "Escolher token" (abre o `TokenModal`) e
  "Remover". `CharacterInfo` traz `tokenId`, `tokenName`, `tokenImageUrl`.
- **Rationale**: FR-001 (o dono define e troca).
