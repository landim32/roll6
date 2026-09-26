# Feature Specification: Sistema de Turnos

**Feature Branch**: `016-turn-system`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Crie um sistema de turnos: entidade Turn (CampaignId, MapId?, CharacterId?, NpcId?, TurnNo, TurnType Moviment/Action/ActionResult, BeforeX, BeforeY, BeforeLook, X, Y, Look, CreatedAt, Description), incluída ou excluída apenas pelo GM, guardando todas as ações com o número do turno; botão 'Finalizar turno' para o GM, que avisa se algum personagem não agiu e finaliza quando todos agiram, independente dos NPCs; indicação 'Turno N' ao lado; círculo em cada card de personagem/NPC (vermelho no início, amarelo ao mover, verde ao agir); item 'Agir' no menu do personagem/NPC com modal de texto que grava um registro Action; item 'Resetar turno' que apaga as ações e reverte o movimento (dono ou GM); cada personagem/NPC precisa de ao menos uma ação para concluir o turno; mover grava um registro Move; só pode mover uma vez por turno e agir várias vezes; ao finalizar, notificação para GM e jogadores com resumo do turno; ActionResult só pela API; rastros de movimento visíveis até o fim do turno; texto da ação como balão de história em quadrinhos sobre o personagem."

> **Termos**: **turno** é uma rodada numerada da campanha (Turno 1, 2, 3…). **Registro de turno** é cada
> coisa feita num turno: um **movimento**, uma **ação** (texto) ou um **resultado de ação** (texto, só via
> API). Os registros usam o nome "Turn" pedido, mas cada um é um evento dentro do turno de número TurnNo.

## Clarifications

### Session 2026-09-26

- Q: NPC com várias peças (ex.: três goblins) conta como um ou por peça? → A: por peça — cada ocorrência
  de NPC no mapa move uma vez e age por si; o registro guarda a ocorrência (NPC do mapa) além do NPC; o card
  do NPC resume o status das suas peças.
- Q: Quais personagens precisam agir para o turno fechar? → A: todos os personagens aprovados na campanha.
- Q: O mestre pode finalizar com gente faltando? → A: sim — a mensagem lista quem falta e oferece
  "Finalizar mesmo assim".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agir e ver o status de cada um (Priority: P1)

Durante o turno, o jogador abre o menu da peça do seu personagem e escolhe **Agir**: escreve o que o
personagem faz e confirma. A ação fica registrada no turno atual, o texto aparece num balão de história em
quadrinhos sobre a peça e o círculo de status no card do personagem fica verde. O mestre faz o mesmo com
NPCs. O círculo começa vermelho em cada turno e fica amarelo quando a peça se move sem ter agido.

**Why this priority**: é o registro básico do que cada um fez; sem ele não há turno.

**Independent Test**: no turno 1, o card da Aria está vermelho; mover a Aria → amarelo; "Agir" com "Ataco
o goblin" → verde e balão com o texto sobre a peça; outra ação → continua verde, balão com o texto novo.

**Acceptance Scenarios**:

1. **Given** um novo turno, **When** os cards são exibidos, **Then** todo personagem e NPC tem o círculo
   vermelho.
2. **Given** um personagem que se moveu e não agiu, **When** o card é exibido, **Then** o círculo fica
   amarelo.
3. **Given** um personagem que registrou pelo menos uma ação, **When** o card é exibido, **Then** o círculo
   fica verde (tendo se movido ou não).
4. **Given** o menu da peça de um personagem próprio (jogador) ou de qualquer personagem/NPC (mestre),
   **When** ele escolhe **Agir**, **Then** abre um modal com um campo de texto; ao confirmar, a ação é
   registrada no turno atual com o texto.
5. **Given** uma ação registrada, **When** o mapa é exibido, **Then** o texto da última ação daquela peça
   no turno aparece num balão de quadrinhos sobre ela, visível a todos da mesa, até o turno acabar.
6. **Given** ações vazias, **When** o usuário tenta confirmar, **Then** é recusado com aviso.
7. **Given** um personagem, **When** ele já agiu no turno, **Then** ainda pode registrar outras ações.

---

### User Story 2 - Uma movimentação por turno, com rastro (Priority: P1)

Cada personagem/NPC pode se mover uma única vez por turno. A movimentação (da feature 015) passa a ser
registrada no turno com a posição e o sentido de antes e depois, e o rastro do movimento de todas as peças
fica visível no mapa até o turno acabar.

**Why this priority**: amarra a movimentação ao turno e evita andar mais de uma vez.

**Independent Test**: mover a Aria → rastro permanece no mapa para todos; tentar "Mover" de novo no mesmo
turno → não permitido; finalizar o turno → rastros somem e a Aria pode mover de novo.

**Acceptance Scenarios**:

1. **Given** um personagem/NPC que ainda não se moveu no turno, **When** confirma uma movimentação,
   **Then** é registrado um movimento com posição e sentido de antes e depois.
2. **Given** um personagem/NPC que já se moveu no turno, **When** abre o menu da peça, **Then** "Mover" não
   está disponível (ou avisa que já se moveu neste turno); o sistema recusa uma segunda movimentação.
3. **Given** movimentos registrados no turno, **When** o mapa é exibido, **Then** o rastro de cada um (do
   ponto de partida ao de chegada) aparece para todos até o turno ser finalizado.
4. **Given** peças de objeto, **When** o mestre as move, **Then** não há registro de turno nem limite de
   uma vez (objetos não participam de turnos).

---

### User Story 3 - Resetar o turno de um personagem (Priority: P2)

No menu da peça há **Resetar turno**. O dono do personagem ou o mestre apaga tudo o que aquele
personagem/NPC fez no turno atual: as ações somem (e o balão) e o movimento é desfeito, com a peça voltando
à posição e ao sentido de antes. O círculo volta a vermelho e ele pode mover e agir de novo.

**Why this priority**: corrige erros sem precisar do mestre editar dados.

**Independent Test**: Aria moveu e agiu → Resetar turno → volta ao hex e sentido de antes, sem balão,
círculo vermelho; pode mover de novo.

**Acceptance Scenarios**:

1. **Given** um personagem com movimento e ações no turno, **When** o dono ou o mestre confirma "Resetar
   turno", **Then** os registros daquele personagem no turno atual são apagados e a peça volta à posição e
   ao sentido anteriores ao movimento.
2. **Given** um jogador, **When** tenta resetar o turno de um personagem que não é seu ou de um NPC,
   **Then** é recusado.
3. **Given** a posição de antes ocupada por outra peça, **When** o reset é pedido, **Then** o movimento não é
   revertido e um aviso informa o motivo (as ações são apagadas mesmo assim).

---

### User Story 4 - Finalizar o turno (Priority: P1)

Na barra do menu principal aparece "Turno N" para todos e, para o mestre, o botão **Finalizar turno**. Ao
clicar, se algum personagem aprovado na campanha ainda não agiu, aparece uma
mensagem listando quem falta; se todos agiram (NPCs não contam), o turno termina: o número avança, os
círculos voltam a vermelho, os rastros e balões somem e todos recebem uma notificação.

**Why this priority**: é o que faz o jogo andar de turno em turno.

**Independent Test**: turno 3 com dois personagens, um sem ação → "Finalizar turno" mostra quem falta;
depois que ele age → o turno vira 4, círculos vermelhos, rastros e balões somem, notificações aparecem.

**Acceptance Scenarios**:

1. **Given** qualquer participante, **When** está no mapa de uma campanha, **Then** vê "Turno N" no menu
   principal.
2. **Given** o mestre, **When** vê o menu principal, **Then** há o botão "Finalizar turno"; jogadores não o
   veem.
3. **Given** personagens sem ação no turno, **When** o mestre clica em "Finalizar turno", **Then** aparece
   uma mensagem com os nomes de quem ainda não agiu e o turno continua, com o botão "Finalizar mesmo assim"; se o mestre o usar, o turno
   avança como no cenário 4.
4. **Given** todos os personagens com ao menos uma ação, **When** o mestre finaliza, **Then** o turno
   avança para N+1 mesmo que NPCs não tenham agido.
5. **Given** o turno finalizado, **When** o mestre e os jogadores estão conectados, **Then** recebem uma
   notificação "Turno N finalizado" e, ao clicar, veem o resumo do turno.

---

### User Story 5 - Resumo do turno e resultados (Priority: P2)

A notificação de fim de turno abre um resumo com tudo o que foi feito, em ordem: movimentos (quem, de onde
para onde), ações (texto) e resultados de ação. Resultados de ação só são criados por integração via API
(não há tela para isso).

**Why this priority**: memória da sessão; útil mas não bloqueia o jogo.

**Independent Test**: finalizar um turno com 2 movimentos, 3 ações e 1 resultado criado pela API → o
resumo mostra os 6 itens na ordem em que aconteceram, com nomes.

**Acceptance Scenarios**:

1. **Given** um turno finalizado, **When** o participante abre o resumo, **Then** vê cada registro com o
   personagem/NPC, o tipo e o texto ou a posição, em ordem cronológica.
2. **Given** a API, **When** o mestre cria um resultado de ação num turno, **Then** ele aparece no resumo e
   não altera o status (círculo) de ninguém.
3. **Given** um jogador, **When** tenta criar ou apagar registros diretamente pela API, **Then** é
   recusado (registros diretos são só do mestre; o jogador registra apenas pelas ações Mover/Agir/Resetar
   dos próprios personagens).

---

### Edge Cases

- Campanha sem personagens aprovados: "Finalizar turno" avança direto.
- Personagem aprovado sem peça em nenhum mapa: conta para finalizar; o mestre usa "Finalizar mesmo assim"
  ou age por ele.
- Personagem removido da campanha durante o turno: deixa de contar para finalizar; seus registros ficam no
  histórico.
- NPC com várias peças no mesmo mapa (ex.: três goblins): cada peça conta separado: cada ocorrência move uma vez e age por si; o card do NPC mostra o status das
  suas peças no turno (vermelho se alguma não fez nada, amarelo se alguma só se moveu, verde se todas agiram).
- Dois mapas na mesma campanha: o número do turno é da campanha; registros guardam o mapa onde ocorreram.
- Mestre e jogador agindo ao mesmo tempo: cada registro é gravado; o círculo reflete todos.
- Turno finalizado enquanto um jogador está no modo Mover: a movimentação em andamento é cancelada.

## Requirements *(mandatory)*

### Functional Requirements

**Registros de turno**

- **FR-001**: O sistema MUST guardar cada registro de turno com campanha, mapa (opcional), personagem ou
  NPC (um dos dois; para NPC também a ocorrência no mapa), número do turno, tipo (movimento, ação, resultado de ação), posição/sentido de antes e
  depois (movimentos), texto (ações e resultados) e data.
- **FR-002**: Todo registro MUST receber o número do turno atual da campanha.
- **FR-003**: O mestre MUST poder incluir e excluir registros diretamente (inclusive resultados de ação,
  que só existem pela API); jogadores MUST NOT.
- **FR-004**: Cada campanha MUST ter um turno atual, começando em 1.

**Ações e movimentos**

- **FR-005**: "Agir" MUST registrar uma ação com texto (obrigatório, até 2.000 caracteres) para o
  personagem/NPC da peça; jogadores só nos próprios personagens, o mestre em qualquer personagem/NPC.
- **FR-006**: Cada movimentação confirmada de personagem/NPC MUST registrar um movimento; MUST ser
  permitida apenas uma movimentação por personagem/NPC por turno (a segunda é recusada). Objetos não geram
  registros nem limite.
- **FR-007**: "Resetar turno" MUST apagar os registros do personagem/NPC no turno atual e devolver a peça à
  posição/sentido de antes do movimento; permitido ao dono do personagem e ao mestre.
- **FR-008**: O status de cada personagem/NPC no turno MUST ser: vermelho (nada), amarelo (moveu, sem
  ação), verde (ao menos uma ação).

**Turno**

- **FR-009**: O menu principal MUST mostrar "Turno N" a todos os participantes e o botão "Finalizar turno"
  só ao mestre.
- **FR-010**: Finalizar MUST verificar se todos os personagens aprovados na campanha têm ao menos uma ação;
  se faltar alguém, MUST listar quem falta e oferecer "Finalizar mesmo assim" ao mestre. NPCs MUST NOT
  bloquear.
- **FR-011**: Ao finalizar, o turno MUST avançar, zerar os status, apagar rastros e balões do mapa e
  notificar mestre e jogadores; a notificação MUST abrir o resumo do turno.

**Mapa**

- **FR-012**: Os rastros dos movimentos do turno atual MUST ficar visíveis a todos até o turno acabar.
- **FR-013**: A última ação de cada peça no turno atual MUST aparecer num balão de história em quadrinhos
  sobre a peça.
- **FR-014**: Os participantes MUST ver as mudanças dos outros (status, rastros, balões, número do turno)
  sem recarregar a página, em até 15 segundos.
- **FR-015**: Avisos e erros MUST usar toast; textos em pt-BR.

### Key Entities

- **Registro de turno ("Turn")**: campanha, mapa, personagem ou NPC (e, para NPC, a ocorrência no mapa), número do turno, tipo (movimento,
  ação, resultado de ação), antes (coluna, linha, sentido), depois (coluna, linha, sentido), texto, data.
- **Campanha** (existente): ganha o **turno atual**.
- **Personagem/NPC e peças** (existentes): alvos dos registros; o status é derivado dos registros do turno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Registrar uma ação leva no máximo 3 cliques + digitação (peça → Agir → confirmar).
- **SC-002**: Mudanças de status, rastros, balões e número do turno aparecem para os demais em até 15
  segundos.
- **SC-003**: 100% das tentativas de segunda movimentação no mesmo turno e de registros por jogadores fora
  dos próprios personagens são recusadas.
- **SC-004**: O resumo de um turno lista 100% dos registros daquele turno, em ordem.
- **SC-005**: Resetar o turno de um personagem devolve a peça exatamente à posição e ao sentido anteriores
  em 100% dos casos em que o hex anterior está livre.

## Assumptions

- A movimentação continua com as regras da feature 015 (custo por passo/giro, limite do movimento); a
  diferença é o limite de uma por turno e o registro.
- O rastro exibido do turno liga a posição de antes à de depois pelo caminho mais barato calculado na hora
  (o caminho exato não é guardado).
- Status, rastros, balões e o turno atual são atualizados por consulta periódica (a cada 15 s, como o
  painel de personagens), não em tempo real.
- A notificação de fim de turno usa o sino de notificações existente.
- O balão mostra só a última ação da peça no turno e some quando o turno acaba.
