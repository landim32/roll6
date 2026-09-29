# Research: Postura das peças e tokens de vários hexes (031)

## R1. Onde guardar a postura

- **Decision**: enum `Posture` (`Standing = 1`, `Down = 2`, `OutOfCombat = 3`) em duas colunas novas:
  `campaign_characters.posture` e `map_npcs.posture` (`integer not null default 1`). A peça (`map_tokens`) **não** guarda
  postura; `MapTokenService.MapToDtoAsync` lê da participação/ocorrência, como já faz com vida/energia/status.
- **Rationale**: a spec pede postura por campanha para personagens (FR-002) e por ocorrência para NPCs — exatamente onde
  ficam os valores atuais (009/010, 026). Peças de personagem em mapas diferentes mostram a mesma postura sem cópia.
- **Alternatives**: coluna em `map_tokens` (duplicaria o estado entre mapas e contrariaria o padrão "a peça só mostra");
  reaproveitar o texto livre `character_status` (FR-010 exige independência e valores fixos).

## R2. Tamanho vigente da peça

- **Decision**: `Token.SpaceFor(posture)` = `UpSpace` quando `Standing` (e sempre para objetos, que não têm postura);
  senão `DownSpace ?? UpSpace`. Espelho `spaceFor` no frontend. `MapTokenInfo` passa a devolver `space` (vigente),
  `posture` (null para objetos) e `hasDownImage` já é inferível por `downImageUrl`.
- **Rationale**: os campos `up_space`/`down_space` já existem (001/003) e têm o significado pedido; nenhum tamanho por
  peça.
- **Alternatives**: tamanho por peça (mais flexível, mas a spec diz que o tamanho é do token).

## R3. Tamanhos permitidos e dados antigos

- **Decision**: `TokenSpace.ALLOWED = {1, 2, 3, 7, 10}` no domínio (`Guard.TokenSpace`), mensagem
  "O tamanho deve ser 1, 2, 3, 7 ou 10 hexes."; `downSpace` continua opcional (null = sem estado deitado; padrão 2 com
  imagem deitada). A migração normaliza: `up_space` fora do conjunto → 1; `down_space` não nulo fora do conjunto → 2.
  Frontend: `TOKEN_SPACES` e `<select>` no `TokenFormFields` (deitado com opção "Sem estado deitado").
- **Rationale**: FR-014 e o caso de borda de dados existentes.

## R4. Formatos (footprint) — geometria

Tudo em axial (Princípio VII): posição `c` = `OffsetToAxial(x, y)`, frente `d = LookDirections[look]`,
`e = LookDirections[(look + 1) % 6]` (lado direito-frente), resultado convertido de volta com `AxialToOffset`. A ordem
da lista é fixa (a posição sempre primeiro) para os casos de referência compartilhados.

| Tamanho | Hexes (axial) |
|---|---|
| 1 | `c` |
| 2 | `c`, `c − d` |
| 3 | `c`, `c + d`, `c − d` |
| 7 | `c`, `c + dir[0..5]` |
| 10 | linha central `c`, `c + d`, `c − d`, `c − 2d`; lado A `c + e`, `c − d + e`, `c − 2d + e`; lado B `c + d − e`, `c − e`, `c − d − e` |

Checagem do 10 (look 0, `d = (0,−1)`, `e = (1,−1)`, `c = (0,0)`): central r ∈ {−1, 0, 1, 2} na coluna 0; lado A
(1,−1), (1,0), (1,1) — cada um encosta em dois hexes consecutivos da central; lado B (−1,0), (−1,1), (−1,2) — idem. A
figura é simétrica em relação ao eixo da frente e a posição é o segundo hex da linha central a partir da frente (Q1).

- **Decision**: `HexGrid.Footprint(x, y, look, space)` (C#) e `footprint(x, y, look, space)` (TS), tamanho fora do
  conjunto → exceção/erro. Casos de referência (cada tamanho × 6 direções em uma posição de coluna par e uma ímpar)
  fixados em `HexGridTests` e `hexGrid.test.ts` com os mesmos valores (SC-003).
- **Rationale**: rotação por múltiplos de 60° em torno do centro de um hex leva a grade nela mesma, então o formato é
  uma figura só girada pela direção — o desenho no SVG usa o mesmo fato (R7).

## R5. Ocupação e validação

- **Decision**: classe pura `Domain/Grid/Occupancy` (TS: `lib/occupancy.ts`): a partir de `(mapTokenId, x, y, look,
  space)` de cada peça monta `hex → mapTokenId`; `Fits(footprint, columns, rows, except)` = todos os hexes dentro da
  grade e livres (ignorando a própria peça). No backend um `MapOccupancyLoader` (método privado compartilhado ou helper
  `IMapOccupancyService` no Domain) carrega peças do mapa + tokens + posturas das participações/ocorrências em lote.
  Substitui `IMapTokenRepository.ExistsAtAsync` em: criação de objeto, `PlaceCharacterAsync`, `UpdateAsync`,
  `MoveAsync`, `MapNpcService.CreateAsync`, reset de turno (`TurnService`: só volta se o formato couber) e validação em
  lote de `TurnService.Processing` (estado final, formatos inteiros). `ExistsAtAsync` é removido.
- **Mudança de postura (Q2)**: nunca valida ocupação; a peça pode ficar sobreposta/fora da grade até se mover. Quando
  a ocupação encontra hexes disputados, o mapa `hex → id` guarda o primeiro e `Fits` só olha "algum outro id".
- **Alteração de tamanho do token**: não revalida peças (caso de borda).
- **Rationale**: o conjunto por mapa é pequeno (dezenas de peças); carregar tudo e calcular em memória é mais simples
  que SQL geométrico e mantém a regra idêntica à do frontend.

## R6. Movimento

- **Decision**: `HexGrid.MovementCost(..., space, columns, rows, isBlocked)` / `movementField(start, columns, rows,
  isBlocked, space = 1)`: a transição (giro **ou** passo) só entra num estado cujo formato inteiro cabe (dentro da grade
  e sem hex bloqueado). O estado inicial vale mesmo sobreposto. Custo inalterado (1 por passo, 1 por giro).
  `isBlocked` = hex ocupado por outra peça (`Occupancy`). O fallback do mestre (sem caminho livre) continua ignorando
  peças, mas respeita a grade. Formato 7 é invariante ao giro; 1 idem.
- **Rationale**: FR-019; giros mudam a área de 2/3/10, então precisam ser validados como os passos.
- **Alternatives**: validar só o destino (permitiria atravessar peças com o corpo).

## R7. Desenho

- **Decision** (`TokenLayer`, `mapSnapshot`): cada peça é um grupo transladado para o centro da posição e girado
  `(look − 3) × 60°` (imagens olham para baixo); dentro dele o formato é desenhado **em coordenadas locais fixas** de
  look 3 (`footprintLocal(space)` = centros relativos em px), então o giro vale para todos os tamanhos.
  - 1 hex: como hoje (círculo 0,8 × tamanho).
  - Vários hexes: disco = união dos contornos dos hexes do formato (reduzidos a 92 %), `clipPath` do mesmo contorno, e
    a imagem cobrindo o retângulo envolvente com `preserveAspectRatio="xMidYMid slice"`; a marca de frente fica na borda
    do hex da frente.
  - Deitada (`Down`/`OutOfCombat`): `downImageUrl` se houver; senão `upImageUrl` girada 90° dentro do retângulo.
  - Fora de combate: classe `is-out` → `filter: grayscale(1)` no grupo (imagem + disco). No snapshot (canvas), a imagem
    é desaturada num canvas auxiliar por pixel (luminância), já que `ctx.filter` não existe no Safari; o disco usa cinza.
- **Rationale**: FR-011–FR-013, FR-020, FR-024; um único cálculo local serve tela e snapshot.
- **Alternatives**: gerar/armazenar versões em cinza (proibido pelas suposições); `meet` na imagem (sobraria espaço vazio).

## R8. Alterar a postura — caminhos

- **Decision**:
  - `PUT /api/maptoken/{id}/posture` `{ posture }` → `MapTokenInfo` (menu da peça): personagem = dono ou mestre;
    NPC = mestre; objeto → 400. Implementado num partial `MapTokenService.Posture.cs` que grava na participação ou
    ocorrência, registra `CharacterUpdate` com `changes [{ field: "posture", before, after }]` (valores numéricos) e
    publica: personagem → `party.changed` + `mapTokens.changed` (mapId null) + `turn.changed`; NPC →
    `mapToken.upserted` da peça + `turn.changed`. Mesma postura = no-op (sem log/evento).
  - `PUT /api/campaigncharacter/{id}` e `PUT /api/mapnpc/{id}` ganham `posture` opcional (null = mantém; o frontend
    atual e o MCP antigo continuam válidos) entrando no mesmo `Diff`.
  - `POST /api/campaign/{id}/turn/process`: `posture` opcional por item; validação em lote (`characters[i].posture`).
  - Leituras: `posture` em `MapTokenInfo`, `CampaignCharacterInfo` (lista/mine/detalhe), `MapNpcInfo`,
    `TurnDataInfo` (personagens e NPCs).
  - `TurnSummary`: rótulo "Postura", valores "Em pé"/"Caído"/"Fora de combate".
  - `ResetFrom(character)` volta para `Standing` (FR-008); `MapNpc.FromNpc` começa `Standing`.
- **Rationale**: 2 cliques no mapa (SC-001) com um endpoint por peça; demais caminhos reaproveitam as atualizações
  existentes, como FR-004 pede.

## R9. MCP

- **Decision**: ferramenta nova `set_piece_posture` (`PUT /api/maptoken/{mapTokenId}/posture`, idempotente);
  `posture` opcional em `update_participation`, `update_map_npc` e nos itens de `process_turn`; descrições de
  `create_token`/`update_token` passam a dizer "1, 2, 3, 7 ou 10"; `roll6://guide` ganha "Posture and piece size".
  `McpCoverageTests`: 85 → 86 operações, 86 → 87 ferramentas.

## R10. Tempo real e frontend

- **Decision**: nenhum tipo de evento novo. `MapTokenContext.setPosture` chama o serviço e aplica a peça devolvida;
  as outras peças do mesmo personagem chegam por `mapTokens.changed`. `lib/mapTokens.tokenAt` vira consulta à ocupação
  (qualquer hex do formato); `characterDropAction`/`npcDropAction` recebem o tamanho e devolvem `blocked` quando o
  formato não cabe; `HexHighlight` destaca o formato inteiro da peça sob o cursor e, no arraste, o formato no destino.
