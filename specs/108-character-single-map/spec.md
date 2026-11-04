# Feature Specification: Personagem em um único mapa, sem mapa atual

**Feature Branch**: `108-character-single-map`
**Created**: 2026-11-03
**Status**: Draft
**Input**: User description: "Implementar um melhoria nos mapas: Um personagem só pode estar em um mapa da campanha por vez; Quando o mestre adicionar o personagem em uma mapa deve avisar que \"o personagem está no mapa X, tem certeza que deseja traze-lo para esse mapa?\"; Se o mestre confirmar, deve retirar o personagem daquele mapa, e coloca-lo no selecionado; Não existe mais uma mapa atual, os personagens só verão o mapa onde estão; Se o mestre mudar o personagem de mapa, o mapa deve mudar para o jogador daquele personagem. Mas deve aparecer um mensagem na tela \"O mestre está mudando o mapa\"; Para os NPCs continua funcionando como está"

## Contexto

Hoje a campanha tem um único **mapa atual**: o mestre o escolhe em "Tornar atual" e todos os jogadores o seguem. Um
mesmo personagem pode ter peça em vários mapas ao mesmo tempo, e o grupo não consegue se dividir: se dois personagens
descem ao porão enquanto os outros ficam na taverna, todos continuam olhando o mesmo mapa.

Esta melhoria troca a referência: **quem define o mapa que o jogador vê é o personagem dele**, não a campanha. Cada
personagem está em no máximo um mapa da campanha, o mestre o leva de um mapa a outro, e a tela do jogador acompanha. O
mapa atual deixa de existir, com tudo o que dependia dele.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Levar um personagem de um mapa para outro (Priority: P1)

Com um mapa da campanha aberto, o mestre coloca nele um personagem que já está em outro mapa. O sistema avisa onde o
personagem está e pergunta se deve trazê-lo. Confirmando, a peça sai do mapa antigo e aparece no hex escolhido.

**Why this priority**: É a regra central. Sem ela um personagem continua em dois lugares, e nada do resto faz sentido.

**Independent Test**: Com um personagem no mapa A, abrir o mapa B como mestre, arrastar o card do personagem para um hex
livre, confirmar, e verificar que ele está só no mapa B, no hex escolhido.

**Acceptance Scenarios**:

1. **Given** um personagem no mapa "Taverna" e o mestre com o mapa "Porão" aberto, **When** o mestre coloca o personagem em um hex livre, **Then** aparece o aviso "O personagem está no mapa Taverna, tem certeza que deseja trazê-lo para este mapa?" e nada muda até a resposta.
2. **Given** o aviso aberto, **When** o mestre confirma, **Then** a peça sai de "Taverna" e passa a existir em "Porão", no hex escolhido.
3. **Given** o aviso aberto, **When** o mestre cancela, **Then** o personagem continua em "Taverna", na mesma posição, e nada é criado em "Porão".
4. **Given** um personagem que não está em mapa nenhum, **When** o mestre o coloca em um mapa, **Then** a peça é colocada sem aviso.
5. **Given** um personagem já no mapa aberto, **When** o mestre o arrasta para outro hex do mesmo mapa, **Then** o comportamento é o de hoje, sem aviso.
6. **Given** o mestre confirmou o aviso, **When** o hex escolhido não comporta mais a peça, **Then** a operação é recusada com o motivo e o personagem continua no mapa de origem.

---

### User Story 2 - O jogador vê o mapa onde seu personagem está (Priority: P1)

O jogador entra na campanha e vê diretamente o mapa do seu personagem escolhido, sem ninguém ter marcado um mapa como
atual. Se o grupo estiver dividido, cada jogador vê o seu mapa. Se o personagem não estiver em nenhum mapa, o jogador vê
um aviso em vez de um mapa.

**Why this priority**: É o que substitui o mapa atual. Sem isso, os jogadores não teriam o que ver depois da mudança.

**Independent Test**: Colocar dois personagens de jogadores diferentes em mapas diferentes, entrar com cada jogador e
verificar que cada um vê apenas o mapa do seu personagem.

**Acceptance Scenarios**:

1. **Given** Ana com personagem em "Taverna" e Bruno com personagem em "Porão", **When** cada um abre a campanha, **Then** Ana vê "Taverna" e Bruno vê "Porão".
2. **Given** um jogador com personagem em "Taverna", **When** ele abre o endereço de outro mapa da campanha, **Then** é levado ao mapa "Taverna" com um aviso, como já acontece hoje para mapas não permitidos.
3. **Given** um jogador com dois personagens em mapas diferentes, **When** ele troca o personagem escolhido, **Then** a tela passa a mostrar o mapa do personagem escolhido.
4. **Given** um jogador cujo personagem escolhido não está em nenhum mapa, **When** abre a campanha, **Then** vê um aviso de que o personagem ainda não está em um mapa, e continua podendo usar o chat.
5. **Given** o mestre, **When** abre a campanha, **Then** continua podendo abrir qualquer mapa ativo, tenha ou não personagens nele.
6. **Given** um jogador no mapa "Taverna", **When** o mestre mexe nas peças de "Porão", **Then** nada chega à tela desse jogador.

---

### User Story 3 - A tela do jogador acompanha a mudança, com aviso (Priority: P1)

Quando o mestre leva o personagem para outro mapa, a tela do jogador daquele personagem muda sozinha e mostra "O mestre
está mudando o mapa" durante a troca, para que o jogador entenda por que o mapa mudou.

**Why this priority**: Sem o aviso, o mapa trocaria do nada no meio da partida, parecendo um erro.

**Independent Test**: Com o jogador na tela do mapa A, o mestre leva o personagem dele ao mapa B; a tela do jogador mostra
a mensagem e termina no mapa B sem recarregar a página.

**Acceptance Scenarios**:

1. **Given** um jogador vendo o mapa do personagem escolhido, **When** o mestre leva esse personagem a outro mapa, **Then** aparece "O mestre está mudando o mapa" e a tela passa ao novo mapa sem ação do jogador.
2. **Given** a mensagem na tela, **When** o novo mapa termina de carregar, **Then** a mensagem some sozinha, sem precisar ser fechada.
3. **Given** um jogador cujo personagem não estava em nenhum mapa, **When** o mestre coloca o personagem em um mapa, **Then** a mesma mensagem aparece e o mapa se abre.
4. **Given** dois jogadores no mesmo mapa, **When** o mestre leva só o personagem de um deles, **Then** só esse jogador muda de mapa; o outro vê a peça sair.
5. **Given** um jogador com dois personagens, vendo o personagem A, **When** o mestre leva o personagem B a outro mapa, **Then** a tela do jogador não muda.
6. **Given** um jogador desconectado durante a mudança, **When** ele volta, **Then** vê o novo mapa diretamente.
7. **Given** o mestre retira do mapa a peça de um personagem, **When** o jogador está vendo esse mapa, **Then** o mapa se fecha e aparece o aviso de que o personagem não está em um mapa.

---

### User Story 4 - O mapa atual deixa de existir (Priority: P2)

O mestre não vê mais "Tornar atual" nem o selo "Atual", e passa a ver em que mapa cada personagem está. Tudo o que
dependia do mapa atual passa a funcionar pelo mapa de cada personagem.

**Why this priority**: Sem isso sobram dois conceitos concorrentes na interface, mas as histórias P1 já entregam a regra.

**Independent Test**: Percorrer as telas de mapas e a seleção de mesa e verificar que não há menção a mapa atual; jogar um
turno com o grupo dividido e verificar que ações, movimentos, resumo e fechamento cobrem os dois mapas.

**Acceptance Scenarios**:

1. **Given** o mestre em qualquer tela de mapas, **When** consulta os mapas da campanha, **Then** não existe "Tornar atual" nem indicação de mapa atual.
2. **Given** o mestre com a lista de personagens da campanha, **When** olha um personagem, **Then** vê o nome do mapa onde ele está, ou que não está em nenhum.
3. **Given** um grupo dividido em dois mapas, **When** cada personagem age e se move no seu mapa e o mestre finaliza o turno, **Then** existe um único turno da campanha e o resumo mostra as posições separadas por mapa.
4. **Given** um grupo dividido e o processamento do turno pelo Claude do mestre, **When** ele lê os dados do turno, **Then** recebe os personagens de todos os mapas, cada um com seu mapa, e os NPCs de todos os mapas que têm personagens.
5. **Given** modo livre ligado, **When** um jogador anda com seu personagem na vista 3D, **Then** anda no mapa onde o personagem está, sem depender de mapa atual.
6. **Given** um personagem com ação repetida, **When** o turno começa, **Then** a ação é aplicada se ele estiver em qualquer mapa.
7. **Given** uma campanha que já existia, **When** a mudança entra em produção, **Then** cada personagem fica em no máximo um mapa, segundo a regra de FR-019.

---

### User Story 5 - NPCs continuam como estão (Priority: P2)

O mestre continua usando o mesmo NPC em quantos mapas quiser, com várias instâncias por mapa, sem aviso nenhum.

**Why this priority**: É um limite explícito do pedido: a regra nova vale só para personagens.

**Independent Test**: Colocar o mesmo NPC em dois mapas e duas vezes no mesmo mapa; nenhuma confirmação aparece e todas as
instâncias continuam lá.

**Acceptance Scenarios**:

1. **Given** um NPC com instância no mapa A, **When** o mestre o coloca no mapa B, **Then** a instância é criada sem aviso e a do mapa A continua.
2. **Given** um aliado comandado por um jogador, **When** o personagem desse jogador muda de mapa, **Then** o aliado continua onde está.

---

### Edge Cases

- **Duas abas do mestre levando o mesmo personagem ao mesmo tempo**: o personagem termina em um único mapa; a segunda operação é recusada ou reavaliada, nunca há duas peças.
- **Personagem muda de mapa enquanto o aviso está aberto**: a confirmação vale para o estado no momento em que é aplicada; ele nunca fica em dois mapas.
- **Mapa de origem excluído**: as peças de personagens saem junto com o mapa; o personagem fica fora de qualquer mapa e o jogador vê o aviso correspondente.
- **Arquivar mapa com personagens**: é recusado, com mensagem pedindo para levá-los a outro mapa antes (mesma proteção que o mapa atual tinha).
- **Destino arquivado ou excluído**: recusado; o personagem continua onde estava.
- **Campanha pausada ou finalizada**: levar um personagem é uma escrita no mapa e segue as regras atuais de edição; em preparação, só o mestre.
- **Movimento já feito no turno**: a troca de mapa não gasta Deslocamento, não registra movimento e não afeta a regra de um movimento por turno; quem já se moveu continua sem poder se mover nesse turno.
- **Resetar o turno depois de trocar de mapa**: as ações são canceladas, mas a peça não volta ao mapa anterior; um movimento registrado em outro mapa não é desfeito na peça.
- **Rastro do turno**: o rastro no mapa de origem desaparece com a peça.
- **Jogador no meio de um movimento ou andando no 3D quando é levado**: a operação é cancelada e a tela muda.
- **Jogador com alterações não salvas em um mapa**: nada se perde; ele é avisado, como já acontece hoje ao seguir o mapa.
- **Jogador fora da mesa (biblioteca) ou só com o chat na tela**: não vê a mensagem; ao voltar ao mapa, vê o mapa novo.
- **Falha ao carregar o novo mapa**: a mensagem não fica presa na tela; o jogador recebe o erro.
- **Participação removida**: as peças saem do mapa, como hoje.
- **Personagem transferido para outro jogador**: o novo dono passa a ver o mapa onde o personagem está.
- **Nenhum personagem em mapa na campanha**: o mestre abre a mesa normalmente e escolhe um mapa.
- **Sair do modo livre com peças sobrepostas**: a verificação continua valendo em cada mapa.

## Requirements *(mandatory)*

### Functional Requirements

**Um mapa por personagem**

- **FR-001**: Um personagem MUST ter no máximo uma peça entre todos os mapas não excluídos da campanha, mesmo com operações simultâneas.
- **FR-002**: Ao colocar em um mapa um personagem que está em outro, o sistema MUST pedir confirmação ao mestre com o texto "O personagem está no mapa {X}, tem certeza que deseja trazê-lo para este mapa?", onde {X} é o nome do mapa de origem na campanha.
- **FR-003**: Confirmada a operação, o sistema MUST retirar a peça do mapa de origem e criá-la no mapa e hex escolhidos como uma única operação: ou as duas coisas acontecem, ou nenhuma.
- **FR-004**: Cancelada a operação, o sistema MUST manter tudo como estava.
- **FR-005**: O destino MUST obedecer às regras de colocação (forma inteira dentro do mapa e livre; campanha permitindo edição) e MUST ser um mapa ativo, o que passa a valer para toda colocação de personagem; em caso de recusa, o personagem permanece na origem.
- **FR-006**: Toda via de colocação (site, API e ferramentas de agente) MUST obedecer à regra: sem a confirmação explícita, um personagem que está em outro mapa é recusado, com a resposta informando o mapa onde ele está.
- **FR-007**: Colocar personagens em mapas e trazê-los de outro mapa MUST ser exclusivo do mestre; um jogador é recusado, inclusive com o próprio personagem.
- **FR-008**: A troca de mapa MUST preservar a participação do personagem (vida, energia, status, postura, Deslocamento atual, ficha da campanha, ação do turno); ela não gasta Deslocamento nem registra movimento.
- **FR-009**: Um personagem fora de qualquer mapa MUST continuar podendo agir, como já acontece hoje.

**O que o jogador vê**

- **FR-010**: O sistema MUST mostrar a um jogador somente o mapa onde está seu personagem escolhido; endereços de outros mapas da campanha levam a esse mapa, com aviso.
- **FR-011**: Quando o personagem escolhido não estiver em nenhum mapa, o sistema MUST mostrar um aviso em vez de um mapa, sem impedir o uso do chat e dos painéis.
- **FR-012**: Trocar o personagem escolhido MUST levar a tela ao mapa desse personagem.
- **FR-013**: Quando o mestre mudar de mapa o personagem escolhido de um jogador conectado, a tela desse jogador MUST mudar sem ação dele e mostrar "O mestre está mudando o mapa" até o novo mapa estar pronto, desaparecendo sozinha.
- **FR-014**: A seleção de mesa MUST mostrar a um jogador as campanhas ativas com o mapa do seu personagem, ou a indicação de que está sem mapa.
- **FR-015**: Atualizações em tempo real das peças e da pintura de um mapa MUST chegar apenas ao mestre e aos jogadores que têm personagem naquele mapa; ao entrar em um mapa, o jogador recebe o estado completo dele.
- **FR-016**: O mestre MUST continuar podendo abrir qualquer mapa ativo da campanha.

**Fim do mapa atual**

- **FR-017**: O conceito de mapa atual MUST ser removido da interface, da API e das ferramentas de agente: "Tornar atual", selo "Atual" e a escolha de mapa atual deixam de existir, assim como as recusas que falam dele. O mapa volta a ser apenas ativo ou arquivado.
- **FR-018**: As regras que usavam o mapa atual MUST passar a usar o mapa de cada personagem: ação fora do mapa, ação repetida, andar no modo livre, resumo do turno (posições separadas por mapa), dados e processamento do turno (personagens de todos os mapas e NPCs dos mapas com personagens, cada um com seu mapa).
- **FR-019**: Na migração dos dados, cada personagem MUST manter no máximo uma peça, somente em mapa ativo: a do mapa atual, se houver; senão, a posicionada mais recentemente. As demais são removidas, inclusive as de mapas arquivados ou excluídos (mapa arquivado não guarda personagens, ver FR-022).
- **FR-020**: Ao abrir uma campanha sem mapa escolhido, o mestre MUST cair no mapa com mais personagens; em caso de empate, no mais recente; sem personagens em mapas, nenhum mapa é aberto.
- **FR-021**: O mestre MUST ver, junto a cada personagem da campanha, o nome do mapa onde ele está ou a indicação de que não está em nenhum.
- **FR-022**: Arquivar um mapa com personagens MUST ser recusado, com mensagem pedindo para levá-los a outro mapa; excluir um mapa retira as peças de personagens dele, deixando-os fora de qualquer mapa.
- **FR-023**: A prévia de link de uma campanha MUST deixar de depender de mapa atual, usando a imagem da campanha.

**NPCs**

- **FR-024**: NPCs e suas instâncias, inclusive aliados, MUST continuar funcionando como hoje, sem limite de mapas e sem confirmação.

### Key Entities

- **Personagem na campanha (participação)**: passa a estar em no máximo um mapa; é o que define o que seu dono vê.
- **Peça de personagem**: a presença do personagem em um mapa, única entre os mapas não excluídos da campanha.
- **Mapa da campanha**: ativo ou arquivado (ou excluído); deixa de existir o estado "atual".
- **Campanha**: deixa de apontar para um mapa; o turno continua único para toda a campanha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das tentativas, inclusive simultâneas, nenhum personagem fica em dois mapas da campanha.
- **SC-002**: O mestre leva um personagem de um mapa a outro em até 3 interações (arrastar, soltar, confirmar).
- **SC-003**: Em até 2 segundos após a confirmação do mestre, o jogador conectado vê a mensagem "O mestre está mudando o mapa".
- **SC-004**: Em 100% das vezes em que um jogador abre a campanha, ele vê o mapa do personagem escolhido ou o aviso de que está sem mapa, nunca o mapa de outro personagem seu ou de outro grupo.
- **SC-005**: Um turno com o grupo dividido em dois mapas é jogado e finalizado do início ao fim sem nenhuma etapa exigir um mapa único.
- **SC-006**: Depois da migração, nenhuma tela, mensagem ou ferramenta de agente menciona mapa atual.
- **SC-007**: Nenhum NPC tem seu comportamento alterado: os cenários atuais de NPC continuam passando sem mudança.

## Assumptions

- **Personagem escolhido**: para quem tem mais de um personagem na campanha, vale o "Personagem atual" já existente; só ele decide o mapa na tela.
- **Personagem por personagem**: o mestre leva um personagem de cada vez, com uma confirmação cada. Levar o grupo inteiro de uma vez fica fora desta entrega, mesmo sendo o que "Tornar atual" fazia.
- **Mostrar mapa sem peça**: deixa de ser possível mostrar um mapa aos jogadores sem colocar nele os personagens (por exemplo, um mapa-múndi); é consequência direta de "só verão o mapa onde estão". Em campanhas existentes, quem não tem peça passa a ver o aviso até o mestre colocá-la.
- **Turno e chat seguem únicos**: o grupo dividido compartilha o mesmo turno, o mesmo "Finalizar turno", as mesmas pendências de ação e o mesmo chat. Separar a conversa fica por conta dos sussurros.
- **Restrição visual**: como hoje, ver só o próprio mapa é uma regra do site e do tempo real; a leitura pela API não é bloqueada por personagem.
- **Lista do grupo**: o painel do grupo continua mostrando todos os personagens da campanha, mesmo em outros mapas. Só o mestre vê o nome do mapa de cada um.
- **Sem notificação push**: a mudança de mapa não gera notificação nem registro no turno.
- **Mensagem na tela**: "O mestre está mudando o mapa" aparece só para quem está com o mapa na tela; a mensagem não tem botão de fechar.
- **Comandante de aliado**: um jogador só vê o aliado no mapa em que seu personagem está; o aliado continua no painel do grupo.
