# Feature Specification: Movimentação de Tokens

**Feature Branch**: `015-token-movement`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Crie um sistema de movimentação. Use o algoritmo de redblobgames para traçar o caminho; o personagem ou NPC gasta um de movimento para virar de sentido no hexágono; ao clicar no personagem ou NPC aparece o item de menu Mover; ao clicar aparece na parte inferior direita um contador de movimento (ex.: 3/6, gasto/total); ao mover o mouse cria um rastro de cor diferente até o hex do mouse, virando o token para ficar de frente e gastando os pontos pelo caminho mais curto; rastro verde enquanto não passa do máximo, vermelho depois; ao clicar muda para um modo de sentido: o token vai para o hex clicado e vira para onde aponta o mouse, continuando a contar o movimento; o GM pode mover qualquer personagem ou NPC, respeitando o máximo ou não; o usuário só move seus personagens e deve respeitar o máximo; token de objeto apenas move e muda o sentido, com rastro cinza."

> **Termos**: **peça** é um token no mapa; **sentido** (direção) é o lado do hexágono para o qual a peça
> está virada (6 lados). **Movimento** de um personagem/NPC é o total de pontos que ele pode gastar numa
> movimentação (campo "Movimento" do cadastro).

## Clarifications

### Session 2026-09-26

- Q: Os pontos gastos se acumulam entre movimentações? → A: não; cada "Mover" começa em 0/total. Rodadas
  e turnos ficam fora desta feature (o mestre controla quantas vezes cada peça se move).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Traçar o caminho e ver o custo (Priority: P1)

O usuário clica numa peça que pode mover e escolhe **Mover** no menu. Aparece no canto inferior direito o
contador "gasto/total" (ex.: 0/6). Ao passar o mouse sobre os hexes, o sistema mostra o caminho mais
barato até o hex sob o mouse, como um rastro colorido, e a peça aparece virada de frente para o próximo
passo. Cada passo para um hex vizinho custa 1 ponto e cada giro de um lado do hexágono também custa 1
ponto; o contador mostra o total do caminho. O rastro fica verde enquanto o custo cabe no movimento e
vermelho quando passa dele.

**Why this priority**: é o núcleo da regra de movimento; sem ver o custo o jogador não sabe até onde vai.

**Independent Test**: peça com movimento 6, virada para cima; apontar um hex 2 passos à frente → rastro
verde e "2/6"; apontar um hex atrás → o caminho inclui os giros e o contador soma giros + passos; apontar
longe → rastro vermelho e contador acima de 6.

**Acceptance Scenarios**:

1. **Given** uma peça de personagem/NPC que o usuário pode mover, **When** ele clica nela, **Then** o menu
   da peça mostra o item **Mover**.
2. **Given** o modo Mover ativo, **When** ele começa, **Then** o contador aparece no canto inferior direito
   com "0/{movimento}".
3. **Given** a peça virada para o lado A, **When** o mouse está num hex, **Then** o caminho mostrado é o de
   menor custo, contando 1 por passo e 1 por giro de 60°, sempre entrando em cada hex de frente para ele.
4. **Given** o custo do caminho ≤ movimento, **When** o rastro é exibido, **Then** ele e o hex de destino
   ficam verdes; **Given** custo > movimento, **Then** ficam vermelhos.
5. **Given** um hex ocupado por outra peça ou fora da grid, **When** o mouse está nele, **Then** não há
   caminho para ele (sem rastro) e o caminho para outros hexes contorna as peças.
6. **Given** o modo Mover, **When** o usuário pressiona Esc ou clica com o botão direito, **Then** o
   movimento é cancelado e a peça volta à posição e ao sentido originais.

---

### User Story 2 - Confirmar destino e sentido (Priority: P1)

Com um primeiro clique o usuário escolhe o hex de destino: a peça vai para lá e entra no **modo de
sentido**. Agora, ao mover o mouse, a peça gira para ficar de frente para onde o mouse aponta; cada giro
soma 1 ponto ao contador, e o destino/rastro continuam verdes enquanto o total não passa do movimento. Com
um segundo clique a posição e o sentido são gravados.

**Why this priority**: completa a movimentação e grava o resultado.

**Independent Test**: mover 2 hexes à frente (2/6), clicar; apontar o mouse para trás → a peça gira e o
contador vai a 5/6 (3 giros); clicar → a peça fica no novo hex virada para trás; recarregar e confirmar.

**Acceptance Scenarios**:

1. **Given** um caminho verde, **When** o usuário clica no hex de destino, **Then** a peça passa a aparecer
   no destino e o sistema entra no modo de sentido, mantendo o rastro e o custo do caminho.
2. **Given** o modo de sentido, **When** o mouse aponta para um lado do hexágono, **Then** a peça fica de
   frente para esse lado e o contador soma a menor quantidade de giros (0 a 3) a partir do sentido de
   chegada.
3. **Given** o total ≤ movimento, **When** exibido, **Then** hex e rastro ficam verdes; acima, vermelhos.
4. **Given** o modo de sentido, **When** o usuário clica, **Then** posição e sentido são gravados, o modo
   termina, o contador some e os outros participantes veem a peça na nova posição na próxima atualização.
5. **Given** o modo de sentido, **When** o usuário pressiona Esc, **Then** tudo é cancelado e a peça volta
   ao lugar e sentido originais.

---

### User Story 3 - Quem pode mover e com qual limite (Priority: P1)

O mestre pode mover qualquer peça de personagem ou NPC, dentro ou além do movimento (quando passa, o
rastro fica vermelho mas ele pode confirmar). O jogador só pode mover as peças dos próprios personagens e
nunca além do movimento.

**Why this priority**: regra de jogo e de permissão.

**Independent Test**: como jogador, o item Mover só aparece nos próprios personagens; tentar confirmar um
caminho vermelho não é aceito; como mestre, confirmar um caminho vermelho é aceito.

**Acceptance Scenarios**:

1. **Given** um jogador, **When** clica numa peça do próprio personagem, **Then** vê um menu só com
   **Mover**; em peças de outros jogadores, NPCs e objetos, nenhum menu aparece.
2. **Given** um jogador com caminho ou total vermelho, **When** clica para confirmar, **Then** nada é
   gravado e um aviso informa que o movimento passou do máximo.
3. **Given** o mestre com caminho ou total vermelho, **When** confirma, **Then** a movimentação é gravada.
4. **Given** um jogador, **When** tenta gravar por qualquer meio uma posição/sentido que custe mais que o
   movimento do personagem, ou mover peça que não é dele, **Then** o sistema recusa.
5. **Given** o mestre clicando numa peça, **When** o menu aparece, **Then** ele mostra **Mover** junto com
   "Alterar token" e "Excluir".

---

### User Story 4 - Mover objetos (Priority: P2)

Peças de objeto (nem personagem nem NPC) também podem ser movidas pelo mestre, sem custo: o rastro fica
cinza, não há contador de pontos e não há limite; o destino e o sentido são escolhidos do mesmo jeito.

**Why this priority**: útil para portas, baús e cenário, mas secundário.

**Independent Test**: mover um baú para um hex distante e girá-lo; rastro cinza, sem contador; gravado.

**Acceptance Scenarios**:

1. **Given** o mestre e uma peça de objeto, **When** escolhe Mover, **Then** o rastro até o mouse é cinza
   e o contador não aparece.
2. **Given** o destino escolhido, **When** o mestre gira e confirma, **Then** posição e sentido são
   gravados, sem verificação de custo.

---

### Edge Cases

- Peça com movimento 0: qualquer passo ou giro fica vermelho (o jogador não consegue mover; o mestre pode).
- Clicar no próprio hex da peça no primeiro passo: o destino é o hex atual (custo 0) e o modo de sentido
  começa sem sair do lugar (só girar).
- Caminhos com o mesmo custo: qualquer um deles é aceitável; o sistema escolhe de forma estável.
- Destino inalcançável (cercado por peças): sem rastro; clicar não faz nada.
- Outra pessoa move a peça ao mesmo tempo: vale a última gravação.
- Zoom/pan durante o modo Mover: o rastro continua correto; arrastar o mapa não confirma nada.
- Troca de mapa ou de campanha durante o modo Mover: o movimento é cancelado.

## Requirements *(mandatory)*

### Functional Requirements

**Regra de custo**

- **FR-001**: Cada passo para um hex vizinho MUST custar 1 ponto e cada giro de um lado (60°) MUST custar
  1 ponto; a peça MUST entrar em cada hex de frente para ele.
- **FR-002**: O caminho MUST ser o de menor custo total (passos + giros), calculado sobre a grade
  hexagonal conforme o guia de hexágonos da Red Blob Games, contornando hexes ocupados e ficando dentro da
  grid.
- **FR-003**: No modo de sentido, o giro final MUST custar o menor número de giros entre o sentido de
  chegada e o sentido escolhido.
- **FR-004**: O total disponível MUST ser o movimento do personagem (cadastro do personagem) ou do NPC
  (cadastro do NPC); cada "Mover" começa em 0/total (não há controle de rodada ou turno nesta feature).

**Interação**

- **FR-005**: Clicar numa peça que o usuário pode mover MUST mostrar o item **Mover** no menu da peça.
- **FR-006**: No modo Mover, MUST aparecer no canto inferior direito o contador "gasto/total" (só para
  personagens e NPCs).
- **FR-007**: O rastro até o hex sob o mouse MUST ser verde enquanto o custo ≤ total e vermelho acima;
  para objetos MUST ser cinza.
- **FR-008**: O primeiro clique MUST levar a peça ao hex de destino e iniciar o modo de sentido; o segundo
  clique MUST gravar posição e sentido.
- **FR-009**: Esc (ou botão direito) MUST cancelar e restaurar a posição e o sentido originais.

**Permissões e limites**

- **FR-010**: O mestre MUST poder mover qualquer peça (personagem, NPC ou objeto), podendo passar do
  movimento.
- **FR-011**: O jogador MUST poder mover apenas as peças dos próprios personagens e MUST NOT gravar uma
  movimentação cujo custo passe do movimento do personagem; o sistema MUST validar isso também ao gravar.
- **FR-012**: Objetos MUST mover e girar sem custo e sem limite.
- **FR-013**: Avisos de sucesso/erro MUST usar toast; textos em pt-BR.

### Key Entities

- **Peça do mapa** (existente): posição (coluna/linha) e **sentido** (0–5, lado do hexágono, sentido
  horário a partir do topo); tipo personagem, NPC ou objeto.
- **Movimento** (existente): pontos de movimento do personagem ou do NPC.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para qualquer destino alcançável, o custo mostrado é o mínimo possível (verificado contra
  casos de referência com giros e obstáculos em 100% dos testes).
- **SC-002**: O rastro e o contador acompanham o mouse sem atraso perceptível em grids de até 50 × 50.
- **SC-003**: Uma movimentação completa (Mover → destino → sentido) leva 3 cliques.
- **SC-004**: 100% das tentativas de jogador de mover peça alheia ou passar do movimento são recusadas.

## Assumptions

- As peças continuam ocupando um hex cada; peças maiores ficam para outra feature.
- Os outros participantes veem a nova posição quando o mapa deles recarrega as peças (sem atualização em
  tempo real nesta feature).
- O movimento do NPC é o do cadastro do NPC (não há movimento próprio por ocorrência).
- O menu da peça é o menu flutuante do hex (feature 011), que ganha o item Mover.
- Não há rodadas nem turnos: o limite de movimento vale para cada movimentação; repetir movimentações é
  controlado pelo mestre fora do sistema.
