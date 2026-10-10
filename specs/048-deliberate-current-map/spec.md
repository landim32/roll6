# Feature Specification: Mapa atual escolhido deliberadamente pelo mestre

**Feature Branch**: `048-deliberate-current-map`
**Created**: 2026-10-10
**Status**: Draft
**Input**: User description: "Estou tendo um problema em montar mapas que não são o atual: atualmente quando altero um mapa, ele está marcando com o atual; às vezes preciso montar um mapa enquanto a campanha está acontecendo em outro mapa; preciso que crie um flag na lista de mapas onde o GM define qual mapa é o atual; não vai ser apenas mudar o mapa, o GM precisa marcar deliberadamente o mapa que ele quer que seja o atual; quando ele marcar, o frontend deve forçar todos os outros usuários que têm personagem na campanha para o novo mapa atual."

## Contexto

Hoje, quando o mestre abre (ou cria, ou edita) um mapa da campanha na mesa, esse mapa passa automaticamente a ser o **mapa atual** — o mapa que os jogadores seguem. Isso impede o mestre de preparar o próximo mapa (posicionar NPCs, ajustar imagem, montar a cena) enquanto a sessão continua em outro: no instante em que ele abre o mapa em preparação, todos os jogadores são arrastados para lá.

## Clarifications

### Session 2026-10-10

- Q: Ao marcar um mapa como atual, o que acontece com a tela do mestre? → A: O mestre continua no mapa que tinha aberto; só os jogadores são levados ao novo mapa atual.
- Q: "Tornar atual" pede confirmação? → A: Sim — pergunta "Levar os jogadores para o mapa X?" antes de trocar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preparar um mapa sem tirar os jogadores do mapa atual (Priority: P1)

O mestre abre, edita, salva e posiciona peças/NPCs num mapa da campanha que não é o atual. Os jogadores continuam no mapa atual, sem perceber nada.

**Why this priority**: É o problema relatado; sem isso o mestre não consegue preparar cenas durante a sessão.

**Independent Test**: Com um jogador na mesa vendo o mapa A (atual), o mestre abre o mapa B, muda a imagem, salva e coloca um NPC. O jogador continua vendo o mapa A e o marcador "Atual" continua no mapa A.

**Acceptance Scenarios**:

1. **Given** o mapa A é o atual e um jogador está na mesa, **When** o mestre abre o mapa B da mesma campanha, **Then** o mapa atual continua sendo A e o jogador continua no mapa A.
2. **Given** o mestre está no mapa B (não atual), **When** ele salva alterações, move peças ou inclui NPCs no mapa B, **Then** o mapa atual não muda e o jogador não recebe nada do mapa B.
3. **Given** o mestre cria um mapa novo na campanha, **When** o mapa é salvo, **Then** ele não vira o atual.
4. **Given** o mestre escolhe outro mapa no seletor de mesa do menu, **When** o mapa abre, **Then** o mapa atual não muda.

---

### User Story 2 - Marcar deliberadamente o mapa atual na lista de mapas (Priority: P1)

Nas listas de mapas da campanha o mestre vê qual mapa é o atual e tem, em cada outro mapa, uma ação explícita "Tornar atual". Ao confirmar, aquele mapa passa a ser o mapa atual da campanha.

**Why this priority**: Sem a Story 1 o mestre perde o único jeito que tinha de trocar o mapa dos jogadores; as duas precisam ir juntas.

**Independent Test**: O mestre abre a lista de mapas da campanha, toca em "Tornar atual" no mapa B, confirma; o marcador "Atual" passa de A para B em todas as listas e no seletor de mesa.

**Acceptance Scenarios**:

1. **Given** a lista de mapas da campanha aberta pelo mestre, **When** ela é exibida, **Then** o mapa atual aparece marcado como "Atual" e cada outro mapa ativo mostra a ação "Tornar atual".
2. **Given** o mestre toca em "Tornar atual" no mapa B, **When** confirma, **Then** B passa a ser o mapa atual, A perde a marca e uma mensagem confirma a troca.
3. **Given** o mestre toca em "Tornar atual", **When** cancela a confirmação, **Then** nada muda.
4. **Given** um jogador abre a lista de mapas, **When** ela é exibida, **Then** ele não vê a ação "Tornar atual".
5. **Given** um mapa arquivado, **When** a lista é exibida, **Then** ele não oferece "Tornar atual".
6. **Given** o mestre marca um mapa como atual, **When** a troca termina, **Then** o mestre continua no mapa que tinha aberto (marcar não abre o mapa para ele; ele pode abri-lo normalmente).

---

### User Story 3 - Jogadores levados ao novo mapa atual (Priority: P1)

Quando o mestre marca outro mapa como atual, todos os usuários com personagem aprovado na campanha que estão com a mesa aberta são levados imediatamente ao novo mapa atual; quem entrar depois já abre nele.

**Why this priority**: É o efeito que dá sentido à marca: a mesa inteira muda de cena junto.

**Independent Test**: Dois jogadores na mesa no mapa A; o mestre marca B como atual; em poucos segundos os dois veem o mapa B com um aviso de troca. Um terceiro jogador que entra depois abre direto no B.

**Acceptance Scenarios**:

1. **Given** jogadores na mesa vendo o mapa A, **When** o mestre marca o mapa B como atual, **Then** cada jogador passa a ver o mapa B sem precisar recarregar e vê um aviso curto de que o mestre trocou o mapa.
2. **Given** um jogador fora da mesa (aba fechada ou sem conexão), **When** ele volta, **Then** abre no mapa atual (B).
3. **Given** um usuário que é mestre da campanha e também tem personagem nela, **When** ele marca o mapa, **Then** ele não é forçado a mudar de mapa (o mestre nunca é forçado).

---

### Edge Cases

- **Marcar o mapa que já é o atual**: a ação não aparece para ele; nada a fazer.
- **Arquivar ou excluir o mapa atual**: o comportamento existente se mantém (excluir o mapa atual deixa a campanha sem mapa atual e os jogadores veem "O mestre ainda não escolheu um mapa"); o arquivamento não é alterado por esta feature.
- **Campanha sem mapa atual** (nova ou após excluir o atual): nenhum mapa vira atual sozinho — nem ao abrir, nem ao criar; os jogadores veem o aviso de "sem mapa" até o mestre marcar um.
- **Jogador com alterações não salvas**: jogadores não editam o mapa, então nada se perde; se por algum motivo houver um rascunho, vale a regra existente (aviso em vez de troca forçada).
- **Duas trocas seguidas**: prevalece a última; os jogadores terminam no último mapa marcado.
- **Falha ao marcar** (sem conexão, campanha removida): mensagem de erro e a marca anterior permanece.
- **Mestre com o mapa atual aberto que marca outro**: ele continua vendo o mapa que tinha aberto, agora não atual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Abrir, criar, salvar, copiar ou editar um mapa, assim como mover peças e incluir NPCs nele, NUNCA DEVE alterar qual é o mapa atual da campanha.
- **FR-002**: O mapa atual DEVE mudar somente por uma ação explícita do mestre ("Tornar atual"), seguida de uma confirmação "Levar os jogadores para o mapa X?" (com o nome do mapa); cancelar não muda nada.
- **FR-003**: A ação "Tornar atual" DEVE estar disponível nas duas listas de mapas da campanha (a janela "Mapas da campanha" e a aba "Mapas" das configurações da campanha), apenas para o mestre e apenas em mapas ativos que não sejam o atual.
- **FR-004**: As listas DEVEM indicar claramente qual mapa é o atual, para o mestre e para os jogadores.
- **FR-005**: Ao marcar um novo mapa atual, todos os usuários com personagem aprovado na campanha que estiverem com a mesa aberta DEVEM ser levados ao novo mapa atual em poucos segundos, sem recarregar, com um aviso curto da troca.
- **FR-006**: O mestre NUNCA DEVE ser levado automaticamente a outro mapa pela marcação; ele continua no mapa que está aberto (inclusive com alterações não salvas, que permanecem intactas), e só os jogadores são levados ao novo mapa atual.
- **FR-007**: Enquanto o mestre trabalha num mapa que não é o atual, os jogadores NÃO DEVEM ver nada desse mapa (regra já existente de 039, que continua valendo).
- **FR-008**: Nenhum mapa DEVE se tornar atual automaticamente, nem quando a campanha não tem mapa atual.
- **FR-009**: Assistentes de IA (MCP) DEVEM continuar podendo definir o mapa atual pela operação existente; a regra "só muda quando marcado" vale igual para eles.
- **FR-010**: Se a marcação falhar, a interface DEVE mostrar um erro e manter a marca anterior.

### Key Entities

- **Campanha**: tem no máximo um **mapa atual** (já existente). Nenhum dado novo é necessário; o que muda é quem e quando altera esse valor.
- **Mapa da campanha**: pode estar ativo, arquivado ou excluído; só um mapa ativo pode ser marcado como atual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, o mestre consegue abrir, editar e salvar um mapa não atual sem que nenhum jogador mude de mapa.
- **SC-002**: Após o mestre confirmar "Tornar atual", 100% dos jogadores com a mesa aberta e conectados estão vendo o novo mapa em até 3 segundos.
- **SC-003**: Trocar o mapa atual exige no máximo 2 toques do mestre a partir da lista de mapas (ação + confirmação).
- **SC-004**: O mapa atual nunca muda sem uma ação "Tornar atual" (zero trocas acidentais relatadas).

## Assumptions

- O "flag" pedido é a marca "Atual" nas listas mais a ação "Tornar atual" (um mapa por vez, como um botão de rádio); não há como "desmarcar" deixando a campanha sem mapa atual — para trocar, marca-se outro.
- A operação do servidor que define o mapa atual já existe e já avisa os jogadores em tempo real; a mudança principal é a interface parar de chamá-la ao abrir mapas e passar a chamá-la só pela ação explícita.
- A regra de 039 continua: jogadores só veem o mapa atual, e a troca já os segue; o aviso curto ao jogador reaproveita esse fluxo.
- "Usuários que têm personagem na campanha" = donos de personagens aprovados; o mestre nunca é forçado.
- Mapas arquivados não podem ser marcados; reativar um mapa não o torna atual.
- O seletor de mesa no menu continua abrindo mapas normalmente; para o mestre, abrir pelo seletor não troca o mapa atual.
