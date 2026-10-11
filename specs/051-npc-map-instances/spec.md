# Feature Specification: Instâncias de NPC no mapa

**Feature Branch**: `051-npc-map-instances`
**Created**: 2026-10-11
**Status**: Draft
**Input**: User description: "hoje não está tendo uma forma de retirar um NPC do mapa, apenas retirando da campanha. O NPC deve ter um relacionamento com a campanha e outro com o mapa. Eu posso criar mais de uma instância do mesmo NPC no mapa. Ex: tenho um NPC "Guarda" na campanha, quando adicionar o primeiro vai chamar "Guarda", o segundo chamará "Guarda 2". Posso mudar o nome da instância do NPC. A vida, energia, deslocamento e status de cada instância devem ser independentes. O que exibe no mapa são as instâncias de NPCs."

## Contexto

Hoje o NPC tem três camadas: o **cadastro** do mestre (nome, ficha, token, vida, energia e deslocamento totais), o **NPC da campanha** (o cadastro posto à disposição de uma mesa) e a **instância** (uma ocorrência dele colocada num mapa, com vida, energia, status e postura próprios). As peças do mapa já mostram as instâncias. O que falta na mesa:

- Não há como **retirar uma instância do mapa**: o único caminho é "Retirar da campanha", que apaga todas as instâncias em todos os mapas.
- Não há como **editar uma instância** (nome, vida, energia, status) pela tela; só o cadastro do NPC é editável.
- As instâncias nascem **com o mesmo nome** ("Guarda", "Guarda", "Guarda"), o que confunde a mesa no chat, nos balões e no painel.
- O **deslocamento** não é por instância: todas usam o do cadastro.

## Clarifications

### Session 2026-10-11

- Q: A numeração dos nomes ("Guarda", "Guarda 2") vale por mapa ou pela campanha inteira? → A: Por mapa. Cada mapa começa em "Guarda"; mapas diferentes podem ter cada um o seu "Guarda" e "Guarda 2".
- Q: Ao retirar uma instância do mapa, o que acontece com o que ela fez no chat (movimentos, ações, alterações)? → A: O histórico fica. As linhas do chat e o resumo do turno continuam mostrando o que a instância fez, com o nome que ela tinha; só a peça sai do mapa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retirar uma instância do mapa (Priority: P1)

O mestre tira um NPC do mapa sem tirá-lo da campanha. O NPC continua disponível no painel para ser colocado de novo; as outras instâncias dele, neste e em outros mapas, ficam onde estão.

**Why this priority**: É o problema relatado: hoje o mestre só consegue remover um guarda derrotado apagando todos os guardas da campanha.

**Independent Test**: Com dois "Guarda" no mapa, o mestre retira um deles pelo menu da peça. Sobra um guarda no mapa, e o NPC "Guarda" continua no painel da campanha.

**Acceptance Scenarios**:

1. **Given** uma instância de NPC no mapa, **When** o mestre escolhe "Retirar do mapa" no menu da peça e confirma, **Then** a peça some do mapa para todos os participantes e o NPC continua na campanha.
2. **Given** duas instâncias do mesmo NPC no mapa, **When** o mestre retira uma, **Then** a outra continua no mapa com seus próprios valores.
3. **Given** uma instância do NPC em outro mapa da campanha, **When** o mestre retira a instância deste mapa, **Then** a do outro mapa não muda.
4. **Given** um jogador na mesa, **When** ele abre o menu de uma peça de NPC, **Then** não vê "Retirar do mapa".
5. **Given** um NPC com instâncias em mapas, **When** o mestre escolhe "Retirar da campanha", **Then** a confirmação informa quantas instâncias serão removidas e, ao confirmar, todas saem como hoje.

---

### User Story 2 - Instâncias com nomes numerados (Priority: P1)

Ao colocar um NPC no mapa, a primeira instância recebe o nome do NPC e as seguintes recebem um número: "Guarda", "Guarda 2", "Guarda 3". Assim o chat, os balões, o painel e o resumo do turno distinguem cada uma.

**Why this priority**: Sem nomes distintos, três guardas iguais tornam o registro do turno ilegível.

**Independent Test**: O mestre arrasta o card "Guarda" três vezes para o mapa e as peças se chamam "Guarda", "Guarda 2" e "Guarda 3".

**Acceptance Scenarios**:

1. **Given** nenhuma instância de "Guarda" neste mapa, **When** o mestre coloca uma, **Then** ela se chama "Guarda", mesmo que outro mapa da campanha já tenha um "Guarda".
2. **Given** uma instância "Guarda", **When** o mestre coloca outra, **Then** ela se chama "Guarda 2"; a próxima, "Guarda 3".
3. **Given** "Guarda" e "Guarda 3" no mesmo mapa (a "Guarda 2" foi retirada), **When** o mestre coloca outra, **Then** ela recebe o menor número livre: "Guarda 2".
4. **Given** uma instância renomeada para "Sargento", **When** o mestre coloca outra do mesmo NPC, **Then** a numeração considera apenas os nomes atuais das instâncias desse NPC (o nome "Guarda" ficou livre, então a nova é "Guarda").
5. **Given** instâncias já existentes antes desta mudança com nomes iguais, **When** nada é feito, **Then** elas mantêm seus nomes; só as novas recebem número.

---

### User Story 3 - Editar a instância: nome, vida, energia, deslocamento e status (Priority: P2)

O mestre edita uma instância pela peça ou pelo painel: nome, vida e energia atuais, deslocamento, status e postura. Cada instância tem seus próprios valores; mudar uma não muda as outras nem o cadastro do NPC.

**Why this priority**: Completa o controle por instância; o nome e os valores já existem por instância, mas não há tela para mexer neles.

**Independent Test**: Com "Guarda" e "Guarda 2" no mapa, o mestre renomeia o segundo para "Capitão", baixa sua vida para 3 e seu deslocamento para 2. O primeiro continua "Guarda" com os valores do cadastro.

**Acceptance Scenarios**:

1. **Given** uma instância no mapa, **When** o mestre abre "Editar" na peça (ou no card do painel) e muda o nome, **Then** o novo nome aparece na peça, no painel, nos balões e nas próximas linhas do chat; o cadastro do NPC não muda.
2. **Given** duas instâncias do mesmo NPC, **When** o mestre muda a vida de uma, **Then** a outra permanece igual.
3. **Given** uma instância com deslocamento 6 (do cadastro), **When** o mestre muda para 2, **Then** essa instância passa a mover até 2 pontos por turno e as demais seguem com 6.
4. **Given** o mestre altera o deslocamento do NPC no cadastro de 6 para 8, **When** as instâncias são vistas, **Then** as que ainda estavam com 6 passam a 8 e as que o mestre tinha ajustado (ex.: 2) ficam como estavam.
5. **Given** uma alteração de nome, vida, energia, deslocamento, status ou postura, **When** ela é salva, **Then** o chat registra a mudança no turno como já faz para vida, energia, status e postura.
6. **Given** um jogador na mesa, **When** ele vê a instância, **Then** lê os valores dela e não pode editá-los.

---

### User Story 4 - Painel e mapa mostram as instâncias (Priority: P3)

O card do NPC no painel lista cada instância presente no mapa aberto pelo nome dela, com seus próprios valores, e dá acesso a editar e retirar cada uma. O NPC sem instância no mapa aparece com os valores do cadastro, pronto para ser arrastado.

**Why this priority**: Deixa visível que "o que está no mapa são as instâncias"; o mapa já se comporta assim.

**Independent Test**: Com "Guarda" e "Guarda 2" no mapa, o card "Guarda" mostra as duas linhas, cada uma com sua vida e um botão de retirar.

**Acceptance Scenarios**:

1. **Given** três instâncias de um NPC no mapa aberto, **When** o mestre vê o painel, **Then** o card mostra as três pelo nome com seus valores, e cada uma pode ser editada ou retirada dali.
2. **Given** instâncias em outro mapa, **When** o mestre vê o painel deste mapa, **Then** só as deste mapa aparecem no card.
3. **Given** uma instância retirada, **When** o painel atualiza, **Then** a linha dela some para todos.

---

### Edge Cases

- Retirar a instância que tem a peça selecionada no modo Mover: o modo é cancelado.
- Retirar uma instância que já agiu neste turno: a ação e os movimentos dela continuam no chat e no resumo do turno com o nome que ela tinha; ela deixa de contar como pendente e não aparece mais nos dados do turno.
- Nome da instância em branco: não é aceito; o limite de tamanho é o mesmo do nome do NPC.
- Renomear uma instância para um nome já usado por outra: permitido; a numeração automática só vale para nomes gerados.
- Deslocamento da instância: zero ou mais, sem máximo (como o Deslocamento dos personagens).
- Vida e energia atuais da instância podem ir a zero ou abaixo, mas não acima dos totais do cadastro, como hoje.
- Apagar o NPC do cadastro continua bloqueado enquanto ele estiver em uma campanha.
- Retirar o NPC da campanha continua removendo todas as instâncias em todos os mapas da campanha, com aviso de quantas são.
- Mapas arquivados: as instâncias ficam onde estão; ao reativar o mapa, voltam a aparecer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O mestre MUST poder retirar uma instância de NPC do mapa pelo menu da peça e pelo card do painel, com confirmação, sem afetar o NPC da campanha nem as outras instâncias.
- **FR-002**: Jogadores MUST NOT poder retirar, editar ou criar instâncias; eles veem as instâncias e seus valores.
- **FR-003**: Ao criar uma instância, o sistema MUST dar a ela o nome do NPC quando for a única desse NPC no mapa, e "{nome} {N}" com o menor N ≥ 2 que não esteja em uso por outra instância desse NPC no escopo, considerando os nomes atuais das instâncias.
- **FR-004**: O escopo da numeração é o **mapa**: a contagem considera só as instâncias desse NPC no mesmo mapa.
- **FR-005**: O mestre MUST poder alterar o nome, a vida atual, a energia atual, o deslocamento, o status e a postura de cada instância, independentemente das demais e do cadastro do NPC.
- **FR-006**: Cada instância MUST ter seu próprio deslocamento, que começa igual ao do cadastro ao ser criada; alterar o deslocamento no cadastro MUST atualizar apenas as instâncias que ainda estavam com o valor antigo.
- **FR-007**: O deslocamento da instância é informativo para o mestre (ele move qualquer peça sem limite, como hoje) e é o valor exibido na peça e no contador do modo Mover.
- **FR-008**: Alterações na instância MUST ser registradas no turno e no chat como já ocorre com vida, energia, status e postura, incluindo nome e deslocamento.
- **FR-009**: O card do NPC no painel MUST listar as instâncias presentes no mapa aberto, cada uma pelo seu nome e com seus valores, com acesso a editar e retirar.
- **FR-010**: Retirar o NPC da campanha MUST continuar removendo todas as suas instâncias, e a confirmação MUST informar quantas serão removidas.
- **FR-011**: Instâncias existentes antes desta mudança MUST manter seus nomes e valores; só passam a ter deslocamento próprio igual ao do cadastro.
- **FR-012**: Ao retirar uma instância do mapa, tudo o que ela fez (movimentos, ações, alterações) MUST continuar no chat, no resumo e na narração do turno, com o nome que ela tinha ao agir; retirar o NPC da campanha segue a mesma regra.

### Key Entities

- **NPC (cadastro)**: pertence ao mestre; nome, ficha, token, vida, energia e deslocamento totais, status e postura iniciais.
- **NPC da campanha**: o cadastro disponível numa campanha; retirá-lo apaga as instâncias.
- **Instância de NPC**: uma ocorrência do NPC num mapa, com a peça que a representa; nome próprio (gerado com número e editável), vida e energia atuais, **deslocamento próprio** (novo), status e postura próprios. É o que aparece no mapa, nos balões, no painel e no chat.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre retira uma instância do mapa em no máximo 3 toques (menu da peça → Retirar do mapa → confirmar), e os demais participantes veem a peça sumir em até 3 segundos.
- **SC-002**: Ao colocar o mesmo NPC três vezes, 100% das instâncias têm nomes distintos sem nenhuma ação do mestre.
- **SC-003**: Mudar nome, vida, energia, deslocamento ou status de uma instância nunca altera outra instância nem o cadastro (0 efeitos colaterais nos testes de aceitação).
- **SC-004**: Após a mudança, nenhuma instância existente perde nome ou valores.

## Assumptions

- Só o mestre cria, edita e retira instâncias, como já ocorre com todo o resto dos NPCs.
- A numeração usa os nomes atuais das instâncias do mesmo NPC: um nome liberado por retirada ou renome volta a ser usado.
- Não há exigência de nomes únicos ao renomear à mão.
- O deslocamento da instância segue a regra do Deslocamento dos personagens: começa igual ao do cadastro e acompanha mudanças do cadastro só enquanto não tiver sido ajustado.
- Retirar um NPC da campanha continua a ser a única forma de remover todas as instâncias de uma vez.
- O assistente de IA (MCP) passa a ver o deslocamento da instância e o nome gerado, sem ferramentas novas além de retirar e editar instâncias, que já existem.
