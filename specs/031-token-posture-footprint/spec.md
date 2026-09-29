# Feature Specification: Postura das peças e tokens de vários hexes

**Feature Branch**: `031-token-posture-footprint`
**Created**: 2026-09-29
**Status**: Draft
**Input**: User description: "Algumas alterações:
- Crie um status para o Personagens/NPC no mapa, com as seguinte opções:
    - Em pé
    - Caído
    - Fora de combate
- Esse status pode ser atualizado em todos os lugares, no frontend, API e MCP pelo GM ou dono do personagem
- Se for \"Fora de combate\" o token aparece caido e preto e branco, a imagem tb aparece preto e branco
- Se for \"Caído\" o token aparece caido
- Implemente o funcionamento do token ocupando mais de um hex:
    - 1 hex é o normal
    - 2 hex - a imagem deve ocupar 2 hex, ao mudar para o token deitado, deve ocupar o hex oposto ao qual está olhando
    - 3 hex - ocupa 3 hex adjacentes, a posicao é o hex do meio
    - 7 hex - o principal é o do meio
    - 10 hex - 4 retos, 3 de cada um dos lados, o selecionado é o segundo do meio
- Não aceita uma quantidade diferente dessas"

## Contexto

Hoje cada peça do mapa ocupa **um único hex**, qualquer que seja o token. O token da biblioteca já tem dois tamanhos
cadastrados — **espaço em pé** e **espaço deitado** (este só quando o token tem estado deitado) — e uma imagem opcional
de token deitado, mas esses valores aceitam qualquer número e não têm efeito algum no mapa. Personagens e NPCs também
não têm como indicar, na mesa, que caíram ou estão fora de combate: só existe o texto livre de "status" (condições como
"envenenado"), que continua existindo e não é substituído por esta funcionalidade.

Esta funcionalidade traz duas coisas:

1. **Postura** de personagens e NPCs no mapa — *Em pé*, *Caído*, *Fora de combate* — visível no mapa e alterável na
   tela, pela API e pelo MCP.
2. **Tamanho real das peças** — um token ocupa 1, 2, 3, 7 ou 10 hexes, com formato definido, e a ocupação passa a valer
   para desenhar, clicar, posicionar e mover.

As duas se ligam: a postura decide qual tamanho do token vale (em pé ou deitado) e como a peça é desenhada.

## Clarifications

### Session 2026-09-29

- Q: Orientação dos formatos de 3 e 10 hexes? → A: Ao longo da direção para onde a peça olha; no de 10, a posição é o
  segundo hex da linha central contado a partir da frente.
- Q: Derrubar uma peça sem espaço para o formato deitado? → A: Aceitar a mudança de postura e deixar a peça sobreposta
  até ser movida.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Marcar um personagem ou NPC como caído ou fora de combate (Priority: P1)

Durante o combate, o personagem de um jogador leva um golpe e cai. O jogador (dono do personagem) ou o mestre abre o
menu da peça no mapa e escolhe "Caído". A peça passa a aparecer deitada para todos na mesa. Mais tarde o personagem é
nocauteado: a postura vira "Fora de combate" e a peça aparece deitada **e em preto e branco**. Quando se recupera, volta
para "Em pé". O mestre faz o mesmo com as ocorrências de NPC.

**Why this priority**: é o pedido central e dá valor sozinho mesmo com todos os tokens de 1 hex — a mesa passa a ver de
relance quem está de pé, caído ou fora do jogo.

**Independent Test**: com tokens de 1 hex, alterar a postura de uma peça de personagem e de uma de NPC pela tela, pela
API e pelo MCP e conferir o desenho (deitada; deitada e sem cor) para o mestre e para outro jogador conectado.

**Acceptance Scenarios**:

1. **Given** um personagem aprovado com peça no mapa, **When** o dono escolhe "Caído" no menu da peça, **Then** a peça
   aparece deitada para todos os participantes, sem recarregar a página.
2. **Given** uma peça caída, **When** o mestre escolhe "Fora de combate", **Then** a peça aparece deitada e em preto e
   branco (imagem e disco), e o cartão do personagem mostra a mesma postura.
3. **Given** uma ocorrência de NPC no mapa, **When** o mestre altera a postura pela API ou pelo MCP, **Then** a peça muda
   na tela de todos, igual à alteração feita pela tela.
4. **Given** um jogador que não é dono do personagem nem mestre, **When** tenta alterar a postura, **Then** a operação é
   recusada (sem permissão) e nada muda.
5. **Given** qualquer alteração de postura, **When** o turno é consultado, **Then** o log do turno registra a mudança
   (antes → depois) como as demais alterações de personagem/NPC.

---

### User Story 2 - Tokens grandes ocupando vários hexes (Priority: P2)

O mestre cadastra um cavalo (2 hexes), uma carroça (3 hexes), um dragão (7 hexes) e um navio (10 hexes). Ao colocar esses
tokens no mapa, a imagem se estende pelos hexes do formato, e nenhum outro token pode ser colocado ou movido para um
desses hexes. Clicar em qualquer hex ocupado abre o menu daquela peça.

Formatos (a **posição** da peça é sempre o hex principal; a frente é o lado para onde a peça olha):

- **1 hex**: só o hex da posição.
- **2 hexes**: o hex da posição e o hex **oposto ao lado para onde olha** (atrás).
- **3 hexes**: três hexes adjacentes em linha; a posição é o **hex do meio**.
- **7 hexes**: o hex da posição no centro e os seis hexes ao redor.
- **10 hexes**: uma linha central de **4 hexes** e uma linha de **3 hexes** de cada lado, encostadas nela; a posição é o
  **segundo hex** da linha central.

**Why this priority**: sem isto, tokens grandes se sobrepõem e o posicionamento fica errado; depende da regra de
ocupação, que é a parte mais trabalhosa.

**Independent Test**: cadastrar tokens de cada tamanho, colocá-los no mapa, girar (mover mudando para onde olham) e
conferir quais hexes ficam ocupados, que outras peças não entram nesses hexes e que o clique em qualquer hex ocupado
seleciona a peça.

**Acceptance Scenarios**:

1. **Given** o formulário de token, **When** o usuário escolhe o tamanho em pé ou deitado, **Then** só pode escolher
   1, 2, 3, 7 ou 10; qualquer outro valor enviado pela API ou pelo MCP é recusado com erro de validação.
2. **Given** um token de 2 hexes olhando para o norte, **When** é colocado num hex, **Then** ocupa esse hex e o hex ao sul
   dele, e a imagem cobre os dois.
3. **Given** uma peça de 7 hexes, **When** alguém tenta colocar outra peça em qualquer um dos 7 hexes, **Then** a operação
   é recusada como hex ocupado.
4. **Given** uma peça cujo formato sairia da grade na posição escolhida, **When** alguém tenta colocá-la ou movê-la ali,
   **Then** a operação é recusada.
5. **Given** o modo "Mover" de uma peça grande, **When** o usuário escolhe destino e direção, **Then** o caminho e a
   pré-visualização mostram o formato inteiro, e só são aceitos destinos/direções em que o formato inteiro fica livre e
   dentro da grade.

---

### User Story 3 - Postura muda o tamanho da peça (Priority: P3)

Um cavaleiro de 1 hex tem, deitado, 2 hexes. Quando cai, a peça passa a ocupar também o hex atrás dela (oposto ao lado
para onde olha) e é desenhada com a imagem de token deitado, se houver. Quando se levanta, volta a ocupar só 1 hex.

**Why this priority**: junta as duas partes; só faz sentido depois de postura e ocupação existirem.

**Independent Test**: com um token de 1 hex em pé e 2 hexes deitado, alternar a postura e conferir a área ocupada e o
desenho; tentar derrubar a peça com o hex de trás ocupado.

**Acceptance Scenarios**:

1. **Given** uma peça em pé de token com tamanho deitado 2, **When** a postura muda para "Caído" ou "Fora de combate",
   **Then** a peça passa a ocupar a posição e o hex oposto ao lado para onde olha.
2. **Given** um token com imagem deitada, **When** a peça fica caída, **Then** é desenhada com a imagem deitada; sem
   imagem deitada, é desenhada com a imagem em pé virada de lado (deitada).
3. **Given** uma peça cujo formato deitado colidiria com outra peça ou sairia da grade, **When** a postura muda para
   caído/fora de combate, **Then** a mudança é aceita e a peça fica sobreposta (ou parcialmente fora da grade) até ser
   movida; o próximo movimento ou colocação dela já exige o formato inteiro livre e dentro da grade.

---

### Edge Cases

- Derrubar uma peça sem espaço para o formato deitado (hex atrás ocupado ou fora da grade): a postura muda mesmo assim
  e a peça fica sobreposta até ser movida; levantar sempre é aceito.
- Token sem estado deitado (sem imagem deitada e sem tamanho deitado): caído/fora de combate usa o tamanho em pé e a
  imagem em pé virada de lado.
- Peças do tipo **objeto** não têm postura (sempre desenhadas como hoje), mas têm tamanho e ocupam vários hexes igual às
  demais.
- Mudar a direção para onde a peça olha (no "Mover") muda os hexes ocupados de formatos de 2, 3 e 10 hexes; a nova
  direção só é aceita se o formato inteiro couber.
- Alterar o tamanho de um token já usado em peças no mapa: as peças passam a usar o novo formato; peças que ficarem
  sobrepostas ou saindo da grade são aceitas como estão e só são validadas na próxima colocação/movimento/postura.
- Dados existentes com tamanho fora de 1, 2, 3, 7 ou 10 (ex.: 0 ou 4) são normalizados: tamanho em pé vira 1 e tamanho
  deitado vira 2.
- A regra de uma peça por hex e de um personagem por mapa continua; o "hex ocupado" passa a considerar todos os hexes de
  cada peça.
- Arrastar um cartão de personagem/NPC para o mapa: o hex de destino é a posição; o drop é recusado se o formato não
  couber.
- Colocar uma peça de personagem pela primeira vez usa a postura atual do personagem na campanha.
- Personagem com peças em mais de um mapa da campanha: a postura é única na campanha e vale para todas as peças dele.
- Processamento de turno em lote (IA) pode incluir a postura junto com vida, energia, status e posição, com as mesmas
  regras de ocupação.
- A postura não limita o movimento: uma peça caída pode ser movida normalmente por quem já pode movê-la.

## Requirements *(mandatory)*

### Functional Requirements

**Postura**

- **FR-001**: Personagens aprovados numa campanha e ocorrências de NPC no mapa MUST ter uma **postura** com exatamente um
  destes valores: **Em pé** (padrão), **Caído**, **Fora de combate**.
- **FR-002**: A postura do personagem MUST ser por campanha (vale para todas as peças dele nos mapas daquela campanha);
  a postura do NPC MUST ser por ocorrência no mapa.
- **FR-003**: A postura de um personagem MUST poder ser alterada pelo dono do personagem e pelo mestre da campanha; a de
  uma ocorrência de NPC, só pelo mestre. Outros usuários MUST receber recusa por falta de permissão.
- **FR-004**: A postura MUST poder ser alterada na tela (menu da peça no mapa e janela do personagem/NPC), pela API e
  pelo MCP (incluindo o processamento de turno em lote), com as mesmas regras em todos os caminhos.
- **FR-005**: Valores de postura fora dos três permitidos MUST ser recusados com erro de validação.
- **FR-006**: Toda mudança efetiva de postura MUST ser registrada no log do turno atual como alteração de personagem/NPC
  (antes → depois), com o autor da mudança, e aparecer no resumo do turno.
- **FR-007**: A postura MUST ser enviada em tempo real a todos da mesa, como as demais alterações de peça.
- **FR-008**: Quando uma participação é criada ou aprovada (reinício dos valores da campanha), a postura MUST voltar a
  "Em pé"; nova ocorrência de NPC começa "Em pé".
- **FR-009**: A postura MUST aparecer nas leituras de peça, de participação e de ocorrência de NPC (API e MCP) e nos
  dados de turno usados por assistentes de IA.
- **FR-010**: O texto livre de status existente MUST continuar independente da postura.

**Desenho**

- **FR-011**: Peça "Caído" MUST ser desenhada deitada: com a imagem de token deitado, se o token tiver; senão, com a imagem
  em pé virada de lado.
- **FR-012**: Peça "Fora de combate" MUST ser desenhada deitada como em FR-011 **e em preto e branco** (imagem e disco da
  peça); os cartões de personagem/NPC MUST mostrar a imagem em preto e branco e a postura.
- **FR-013**: Peças "Em pé" MUST continuar desenhadas como hoje (imagem em pé, girada para onde olham).

**Tamanho e ocupação**

- **FR-014**: Os tamanhos em pé e deitado do token MUST aceitar somente 1, 2, 3, 7 ou 10 hexes; o formulário de token
  MUST oferecer apenas esses valores, e API/MCP MUST recusar qualquer outro com erro de validação.
- **FR-015**: O tamanho que vale para a peça MUST ser o tamanho em pé quando "Em pé" (e sempre para objetos) e o tamanho
  deitado quando "Caído"/"Fora de combate" (ou o em pé, se o token não tiver tamanho deitado).
- **FR-016**: Os hexes ocupados MUST seguir os formatos: 1 = posição; 2 = posição + hex oposto ao lado para onde olha;
  3 = linha de 3 com a posição no meio; 7 = posição + os 6 vizinhos; 10 = linha central de 4 com a posição no segundo
  hex + uma linha de 3 encostada de cada lado. As linhas dos formatos 3 e 10 MUST seguir a direção para onde a peça
  olha (peça comprida para a frente, como a de 2 hexes): no de 3, um hex à frente e um atrás da posição; no de 10, a
  linha central tem 1 hex à frente da posição e 2 atrás (a posição é o segundo contado a partir da frente), e as linhas
  laterais de 3 correm paralelas a ela.
- **FR-017**: Todos os hexes ocupados por uma peça MUST contar como ocupados: nenhuma outra peça pode ser colocada,
  movida ou terminar um movimento sobre eles.
- **FR-018**: Colocar, mover ou mudar a direção de uma peça MUST ser recusado quando algum hex do formato ficar fora da
  grade ou sobre outra peça (a própria peça não conta). A **mudança de postura** é a exceção: MUST ser sempre aceita,
  mesmo que o formato deitado fique sobreposto a outra peça ou saia da grade; a peça fica assim até ser movida.
- **FR-019**: O cálculo do caminho e do custo de movimento MUST considerar o formato inteiro em cada passo e giro
  (só estados em que o formato cabe), mantendo o custo atual (1 por passo à frente, 1 por giro de 60°).
- **FR-020**: A imagem da peça MUST cobrir a área do formato, girada conforme a direção para onde olha; o disco colorido
  do tipo de peça MUST contornar o formato.
- **FR-021**: Clicar ou passar o mouse em qualquer hex de uma peça MUST se referir àquela peça (menu, destaque).
- **FR-022**: A pré-visualização de movimento e de arrastar cartões MUST mostrar o formato inteiro no destino e indicar
  quando ele não cabe.
- **FR-023**: A regra de ocupação MUST ser a mesma no servidor e na tela (mesmos formatos e mesmos casos de referência),
  seguindo as fórmulas de grade hexagonal já adotadas pelo projeto.
- **FR-024**: A imagem compartilhada do mapa MUST desenhar as peças com o mesmo formato, postura e preto e branco da tela.

### Key Entities

- **Postura**: valor fixo (Em pé, Caído, Fora de combate) mantido na participação do personagem na campanha e na
  ocorrência de NPC no mapa; lido pelas peças ligadas a eles.
- **Token (biblioteca)**: já tem tamanho em pé, tamanho deitado opcional e imagem deitada opcional; os tamanhos passam a
  ser limitados a 1, 2, 3, 7 ou 10.
- **Peça do mapa**: posição (hex principal) + direção para onde olha + tamanho vigente (do token, conforme a postura)
  definem o conjunto de hexes ocupados.
- **Registro de turno (alteração)**: passa a incluir o campo postura entre as mudanças registradas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dono ou mestre altera a postura de uma peça em no máximo 2 cliques a partir do mapa.
- **SC-002**: A mudança de postura aparece para os demais participantes conectados em até 2 segundos.
- **SC-003**: Em 100% dos casos de referência (cada tamanho × cada uma das 6 direções), os hexes ocupados calculados
  pela tela e pelo servidor são idênticos.
- **SC-004**: Nenhuma operação de colocar, mover, girar ou derrubar deixa duas peças ocupando o mesmo hex (exceto a
  mudança de postura e a alteração de tamanho do token, que podem deixar sobreposição até a peça ser movida).
- **SC-005**: Qualquer valor de tamanho diferente de 1, 2, 3, 7 ou 10 e qualquer postura fora das três opções são
  recusados em 100% das tentativas pela tela, API e MCP.
- **SC-006**: Um participante identifica, só olhando o mapa, quais peças estão em pé, caídas ou fora de combate.

## Assumptions

- O tamanho vem do token da biblioteca (campos já existentes de tamanho em pé/deitado); não há tamanho próprio por peça.
- O padrão de tamanho deitado continua 2 quando o token tem imagem deitada e nenhum tamanho informado.
- Objetos não têm postura; personagens e NPCs sim.
- Mudar a postura não altera vida, energia, status nem a direção da peça, e não conta como movimento do turno.
- Postura não restringe movimento nem ações.
- O "preto e branco" é aplicado na hora de desenhar; nenhuma imagem nova é gerada ou armazenada.
- Permissões, validação, eventos em tempo real e log de turno seguem os mecanismos existentes; o MCP ganha/atualiza
  ferramentas para a postura e os novos limites de tamanho.
- A migração normaliza tamanhos inválidos existentes (em pé → 1, deitado → 2) e define "Em pé" para todas as
  participações e ocorrências existentes.
