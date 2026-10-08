# Feature Specification: Deslocamento do personagem na campanha

**Feature Branch**: `037-campaign-move-override`  
**Created**: 2026-10-08  
**Status**: Draft  
**Input**: User description: "Implemente essa issue https://github.com/landim32/roll6/issues/29" — *Incluir um campo de deslocamento que o mestre pode alterar, apenas para o mapa. Incluir um campo de deslocamento do personagem que o mestre pode alterar, apenas para o mapa. Deve usar esse número para o deslocamento.* (a imagem da issue mostra a janela "Personagem na Campanha", aba Dados, com o status "Coxo: Desl. 1 (5 −3, metade por Fadiga)" e o Movimento permanente 5)

## Contexto

Hoje o quanto um personagem anda no mapa por turno vem do **Movimento** da ficha permanente, que só o dono altera e que vale em todas as campanhas. Quando o personagem fica ferido, cansado ou "coxo", o mestre só consegue anotar isso no texto do status, e o mapa continua deixando o jogador andar o Movimento inteiro. A issue pede um valor de **deslocamento** próprio da campanha, que o mestre (e também o dono do personagem) ajusta e que o mapa passa a usar.

## Clarifications

### Session 2026-10-08

- Q: O Deslocamento é por campanha ou por mapa? → A: Por campanha — um valor na participação do personagem, usado em todos os mapas da campanha.
- Q: Quando o dono altera o Movimento da ficha, o Deslocamento acompanha? → A: Só quando estava igual ao Movimento antigo (não tinha sido ajustado); senão mantém o valor ajustado.
- Q: Quem pode alterar o Deslocamento? → A: O mestre da campanha **e** o dono do personagem (como os outros campos de "Nesta campanha"); os demais participantes só veem.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O mestre reduz o deslocamento de um personagem ferido (Priority: P1)

O mestre abre o personagem pelo card do grupo ("Personagem na Campanha" → Dados → "Nesta campanha"), vê o campo **Deslocamento**, que hoje mostra 5 (o Movimento da ficha), troca para 1 e salva. Daí em diante, no modo Mover, o jogador só consegue gastar 1 ponto de movimento por turno com esse personagem nessa campanha. A ficha permanente continua com Movimento 5.

**Why this priority**: é o pedido da issue. Sem isso a regra de deslocamento reduzido só existe no texto do status e o mapa não a respeita.

**Independent Test**: com um personagem aprovado de Movimento 5, o mestre põe Deslocamento 1. O jogador tenta mover a peça 2 hexes: o caminho aparece em vermelho, o contador mostra "x/1" e o servidor recusa o movimento. Um movimento de 1 hex é aceito.

**Acceptance Scenarios**:

1. **Given** um personagem aprovado com Movimento 5 e Deslocamento 5, **When** o mestre muda o Deslocamento para 1 e salva, **Then** a janela reabre mostrando Deslocamento 1 e a ficha permanente continua mostrando Movimento 5.
2. **Given** Deslocamento 1, **When** o jogador entra no modo Mover com a peça desse personagem, **Then** o contador mostra o total 1 e qualquer caminho de custo maior que 1 aparece como excedido.
3. **Given** Deslocamento 1, **When** o jogador tenta gravar um movimento de custo 2 por qualquer via (tela ou integração), **Then** o movimento é recusado com uma mensagem de validação e a peça fica onde estava.
4. **Given** Deslocamento 0, **When** o jogador abre o modo Mover, **Then** ele só pode ficar no mesmo hex (custo 0) e qualquer passo ou giro é recusado.
5. **Given** o mesmo personagem aprovado em outra campanha, **When** o mestre desta campanha altera o Deslocamento, **Then** o Deslocamento da outra campanha não muda.

---

### User Story 2 - O dono também ajusta o deslocamento; os outros só veem (Priority: P2)

O dono do personagem abre a mesma janela e altera o Deslocamento da campanha, como já faz com vida, energia, status e postura. Os outros participantes aprovados (modo visualização) veem o valor, mas não o alteram.

**Why this priority**: o jogador costuma aplicar ele mesmo as penalidades do próprio personagem, como já faz com vida e energia. Os outros participantes precisam enxergar o valor, mas não podem mexer em personagem alheio.

**Independent Test**: o dono abre o card do próprio personagem, muda o Deslocamento para 2 e salva, e o modo Mover passa a limitar a 2. Um participante aprovado que não é o dono vê o valor sem poder editar, e uma tentativa dele de alterar por integração é recusada.

**Acceptance Scenarios**:

1. **Given** o dono (que não é o mestre), **When** muda o Deslocamento e salva, **Then** o valor é gravado e passa a limitar o movimento dele no mapa.
2. **Given** um participante aprovado que não é dono nem mestre, **When** abre a janela do personagem, **Then** vê o Deslocamento somente leitura.
3. **Given** um usuário que não é dono nem mestre, **When** tenta alterar o Deslocamento por qualquer via, **Then** a operação é recusada como sem permissão e nada é gravado.
4. **Given** o dono ou o mestre, **When** salva vida, energia, status, postura ou ficha sem mexer no Deslocamento, **Then** o Deslocamento permanece o mesmo.

---

### User Story 3 - O deslocamento fica registrado no turno e chega aos assistentes (Priority: P3)

Quando o mestre ou o dono mudam o Deslocamento, o registro do turno guarda a mudança ("Deslocamento de 5 para 1", com o autor), como já acontece com vida, energia, status e postura. Os dados do turno lidos por assistentes de IA trazem o Deslocamento de cada personagem, e o processamento do turno em lote pode alterá-lo.

**Why this priority**: mantém o histórico e a automação dos turnos consistentes com os outros valores da campanha, mas a tela funciona sem isso.

**Independent Test**: o mestre altera o Deslocamento e o resumo do turno mostra a linha da mudança. Os dados do turno trazem o Deslocamento atual e o total (Movimento) de cada personagem. Um processamento de turno que define o Deslocamento grava o valor e registra a mudança.

**Acceptance Scenarios**:

1. **Given** o Deslocamento 5, **When** o mestre o muda para 1, **Then** o turno em andamento ganha um registro de alteração de personagem com "Deslocamento de 5 para 1".
2. **Given** o mestre salva sem alterar o Deslocamento, **When** o turno é consultado, **Then** não há registro de Deslocamento.
3. **Given** um processamento de turno que define o Deslocamento de um personagem, **When** é aplicado, **Then** o valor é gravado junto com o resto do lote, ou nada é gravado se algum item do lote for inválido.

---

### Edge Cases

- **Personagem entra na campanha ou volta a ser aprovado**: o Deslocamento começa igual ao Movimento da ficha, como vida e energia começam iguais aos totais.
- **O dono muda o Movimento da ficha**: se o Deslocamento da campanha estava igual ao Movimento antigo (ou seja, ninguém o tinha ajustado), ele acompanha o novo Movimento. Se tinha sido ajustado (valor diferente), o valor ajustado é mantido.
- **Deslocamento maior que o Movimento**: é permitido (por exemplo, por um efeito de pressa), dentro do mesmo limite máximo aceito pelo Movimento.
- **Valor negativo, vazio ou não numérico**: é recusado com erro de validação no campo Deslocamento.
- **Mestre movendo peças**: continua sem limite, como hoje. O Deslocamento limita só os movimentos feitos pelo jogador.
- **Peças de NPC e objetos**: não são afetadas. NPCs continuam usando o movimento do NPC.
- **O dono aumenta o próprio Deslocamento**: é permitido; o mestre vê a mudança no resumo do turno, com o autor, e pode corrigi-la.
- **Jogador já no meio do modo Mover quando o mestre reduz o Deslocamento**: o novo valor vale a partir da próxima vez que os dados do personagem chegarem. O servidor sempre confere o valor gravado, então um movimento já acima do novo limite é recusado.
- **Participações já existentes antes desta funcionalidade**: começam com o Deslocamento igual ao Movimento atual do personagem.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada participação de personagem em uma campanha MUST ter um valor de **Deslocamento** (inteiro ≥ 0), separado do Movimento da ficha permanente.
- **FR-002**: Quando uma participação é criada ou passa a aprovada, o Deslocamento MUST ser igual ao Movimento do personagem naquele momento. Participações já existentes MUST receber o Movimento atual do personagem.
- **FR-003**: O mestre da campanha e o dono do personagem MUST poder alterar o Deslocamento, com as mesmas permissões dos outros campos de "Nesta campanha". A alteração por qualquer outro usuário MUST ser recusada como sem permissão, e omitir o campo MUST manter o valor atual.
- **FR-004**: A janela "Personagem na Campanha", aba Dados, área "Nesta campanha", MUST mostrar o campo Deslocamento: editável para o mestre e para o dono, e somente leitura para os outros participantes.
- **FR-005**: O limite de movimento por turno do jogador no mapa MUST passar a ser o Deslocamento da participação, tanto na pré-visualização do modo Mover (contador e cor do caminho) quanto na validação do servidor. O Movimento da ficha permanente deixa de ser usado para isso.
- **FR-006**: Os movimentos feitos pelo mestre MUST continuar sem limite.
- **FR-007**: Quando o dono altera o Movimento da ficha, as participações cujo Deslocamento era igual ao Movimento antigo MUST acompanhar o novo valor. As outras MUST manter o valor ajustado.
- **FR-008**: Uma mudança efetiva de Deslocamento MUST ser registrada no turno em andamento como alteração de personagem, com o valor anterior e o novo, e MUST aparecer no resumo do turno.
- **FR-009**: Os dados do turno para assistentes MUST trazer o Deslocamento de cada personagem, e o processamento de turno em lote MUST aceitar um Deslocamento opcional por personagem, com as mesmas regras de validação e a atomicidade do lote.
- **FR-010**: Todas as operações disponíveis para assistentes de IA que leem ou alteram a participação MUST expor o Deslocamento, com descrição explicando que ele é o limite de movimento da campanha e que o mestre e o dono o alteram.
- **FR-011**: A mudança de Deslocamento MUST avisar os outros usuários da mesa em tempo real, pelo mesmo aviso que hoje recarrega o grupo.
- **FR-012**: O Deslocamento de uma campanha MUST NOT afetar outras campanhas nem a ficha permanente do personagem.

### Key Entities

- **Participação do personagem na campanha**: ganha o **Deslocamento**, ao lado da vida atual, da energia atual, do status, da postura e da ficha da campanha. É copiado do Movimento quando o personagem entra ou volta a ser aprovado, e depois só o mestre e o dono o alteram.
- **Personagem**: o **Movimento** continua sendo o valor permanente, que só o dono altera. Passa a ser só o valor inicial do Deslocamento em cada campanha.
- **Registro do turno**: a alteração de personagem ganha o campo "Deslocamento".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre ou o dono alteram o Deslocamento de um personagem em menos de 30 segundos a partir do card do grupo, sem sair do mapa.
- **SC-002**: Em 100% das tentativas, um jogador não consegue gravar um movimento de custo maior que o Deslocamento da campanha, por nenhuma via.
- **SC-006**: Em 100% das tentativas, um usuário que não é mestre nem dono não consegue alterar o Deslocamento.
- **SC-003**: Em 100% dos casos, alterar o Deslocamento em uma campanha não muda o Movimento da ficha permanente nem o Deslocamento de nenhuma outra campanha.
- **SC-004**: Toda alteração efetiva de Deslocamento aparece no resumo do turno em que foi feita.
- **SC-005**: Um personagem que nunca teve o Deslocamento alterado anda exatamente o mesmo que antes desta funcionalidade, sem nenhuma ação do mestre ou do jogador.

## Assumptions

- "Apenas para o mapa" significa que o valor só afeta o movimento no mapa (não a ficha). Ele é **por campanha** (confirmado em Clarifications): guardado na participação, não em cada peça ou mapa, então o mesmo personagem tem o mesmo Deslocamento em todos os mapas da campanha e trocar de mapa não o altera.
- O rótulo na tela é "Deslocamento". O "Movimento" da ficha permanente mantém o nome que já tem.
- O Deslocamento aceita os mesmos limites numéricos do Movimento (≥ 0 e o mesmo máximo) e pode ficar acima do Movimento.
- O status em texto livre continua existindo e não é lido para calcular nada. O exemplo "Coxo: Desl. 1" da issue passa a ser expresso pelo próprio campo.
- Os cards do grupo não precisam mostrar o Deslocamento. Ele aparece na janela do personagem e no contador do modo Mover.
- NPCs ficam de fora: a issue fala só de personagens.
