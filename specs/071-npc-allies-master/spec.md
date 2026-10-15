# Feature Specification: Categoria dos NPCs e personagem-mestre dos aliados

**Feature Branch**: `071-npc-allies-master`
**Created**: 2026-10-15
**Status**: Draft
**Input**: User description: "Melhoria em NPCs: Crie uma categoria nos NPCs (Inimigo, Neutro, Aliado). Crie tb um campo personagem-mestre, um relacionamento com o personagem q pode ser nulo. Os Inimigos e Neutros ficam onde estão. Aliados ficam do lado esquerdo, em outro card logo abaixo dos personagens. Quando o personagem for aliado, só nesse caso ele pode escolher um mestre. Quando o ele tem um personagem-mestre, ele aparece com um card menor logo abaixo do mestre, e o personagem-mestre pode agir por ele"

## Clarifications

### Session 2026-10-15

- Q: A categoria e o personagem-mestre valem por campanha, por instância ou para o NPC da biblioteca? → A: **por
  campanha**. Valem para todas as instâncias desse NPC na campanha; o mesmo NPC pode ser aliado numa campanha e inimigo
  em outra.
- Q: Até onde vai "agir por ele"? → B: o dono do personagem-mestre usa "Agir", "Mover" e "Resetar turno" e também muda
  vida, fadiga, status e postura do aliado. Não fala no chat como o aliado.
- Q: Cor da peça do aliado no mapa 2D? → B: uma **cor própria para aliados**, diferente da vermelha dos NPCs e da azul
  dos personagens.

## Contexto

Hoje todo NPC é tratado da mesma forma:

- aparece no painel da direita (painel de NPCs);
- tem a peça vermelha no mapa;
- só o mestre do jogo age, move e edita por ele.

Na mesa, porém, há NPCs de lados diferentes: o guarda inimigo, o mercador neutro e o mercenário que viaja com o grupo. Esta funcionalidade:

- dá a cada NPC uma **categoria**: Inimigo, Neutro ou Aliado;
- tira os **aliados** do painel da direita e os põe no lado esquerdo, junto do grupo;
- permite ligar um aliado a um **personagem-mestre**, um personagem do grupo que passa a agir por ele.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Categorizar os NPCs (Priority: P1)

O mestre marca cada NPC como Inimigo, Neutro ou Aliado. NPCs que já existem passam a ser Inimigos, e nada muda na tela para eles. A categoria aparece no formulário do NPC e no card dele.

**Why this priority**: é a base de todo o resto. Sem a categoria não existe aliado, nem painel de aliados, nem mestre.

**Independent Test**: Editar um NPC, trocar a categoria para Neutro, salvar e reabrir: a categoria continua Neutro. Um NPC criado antes desta funcionalidade aparece como Inimigo.

**Acceptance Scenarios**:

1. **Given** um NPC numa campanha antes desta funcionalidade, **When** o mestre abre a edição dele nessa campanha, **Then** a categoria mostrada é Inimigo.
2. **Given** o formulário de um NPC, **When** o mestre escolhe Neutro e salva, **Then** o NPC passa a ser Neutro e continua no painel da direita.
3. **Given** um NPC novo, **When** o mestre o cria sem mexer na categoria, **Then** ele é Inimigo.

---

### User Story 2 - Aliados no lado esquerdo (Priority: P1)

Os NPCs Aliados saem do painel da direita e aparecem no lado esquerdo, num card próprio de aliados logo abaixo dos personagens do grupo. Lá eles mostram as mesmas informações do card de NPC de hoje: vida, fadiga, status e as instâncias no mapa aberto. Inimigos e Neutros continuam no painel da direita, como hoje.

**Why this priority**: é o efeito visível pedido. O grupo vê quem está do seu lado junto de si.

**Independent Test**: Marcar um NPC como Aliado: ele some do painel da direita e aparece no card de aliados, abaixo dos personagens. Voltar para Inimigo: ele volta para a direita.

**Acceptance Scenarios**:

1. **Given** um NPC Aliado na campanha, **When** qualquer participante abre o mapa, **Then** ele aparece no card de aliados, no lado esquerdo, abaixo dos personagens, e não aparece no painel da direita.
2. **Given** a campanha sem nenhum aliado, **When** alguém abre o mapa, **Then** o card de aliados não aparece.
3. **Given** um aliado no card de aliados, **When** o mestre arrasta o card para um hex livre do mapa, **Then** uma nova instância é posta ali, como acontece hoje no painel da direita.
4. **Given** um NPC que muda de categoria, **When** a mudança é salva, **Then** todos na mesa veem o card mudar de lado sem recarregar a página.

---

### User Story 3 - Personagem-mestre de um aliado (Priority: P2)

O mestre do jogo pode escolher um **personagem-mestre** para um aliado: um personagem aprovado da campanha. O campo só existe para aliados. Com o personagem-mestre definido:

- o aliado aparece num **card menor logo abaixo do card desse personagem**, e não no card geral de aliados;
- o dono do personagem-mestre pode **agir por ele**: usar "Agir", "Mover" e "Resetar turno" na peça do aliado, como faz com o próprio personagem.

**Why this priority**: é o ganho de jogo (o jogador conduz o seu companheiro). Depende das duas histórias anteriores.

**Independent Test**: Definir o personagem Aria como mestre do aliado "Lobo". O Lobo aparece num card pequeno abaixo da Aria. A jogadora da Aria consegue fazer o Lobo agir e mover no mapa. Outro jogador não consegue.

**Acceptance Scenarios**:

1. **Given** um NPC Inimigo ou Neutro, **When** o mestre abre o formulário, **Then** o campo personagem-mestre não aparece. Uma tentativa de gravar um mestre num não aliado é recusada.
2. **Given** um aliado, **When** o mestre escolhe a Aria como personagem-mestre e salva, **Then** o aliado aparece num card menor logo abaixo do card da Aria e sai do card geral de aliados.
3. **Given** o aliado com a Aria como mestre, **When** a jogadora dona da Aria abre o menu da peça do aliado, **Then** ela vê "Agir", "Mover", "Resetar turno" e "Postura" e consegue usá-los, com as mesmas regras de turno do próprio personagem.
7. **Given** o aliado com a Aria como mestre, **When** a jogadora dona da Aria abre o card do aliado, **Then** ela muda a vida, a fadiga e o status dele e salva; o nome e o Deslocamento ficam só de leitura.
8. **Given** um aliado numa peça do mapa, **When** qualquer um olha o mapa 2D, **Then** a peça tem a cor de aliado, não a vermelha.
4. **Given** o mesmo aliado, **When** outro jogador abre o menu da peça, **Then** não vê ações de comando sobre ele e o servidor recusa a tentativa.
5. **Given** um aliado com personagem-mestre, **When** o mestre muda a categoria dele para Neutro ou Inimigo, **Then** o personagem-mestre é removido e o NPC volta ao painel da direita.
6. **Given** um aliado com personagem-mestre, **When** o personagem deixa de estar aprovado na campanha ou é apagado, **Then** o aliado fica sem mestre e volta ao card geral de aliados.

---

### Edge Cases

- O personagem-mestre não tem peça no mapa aberto: o card pequeno do aliado continua abaixo do card dele.
- O aliado tem várias instâncias no mapa: o dono do personagem-mestre pode comandar todas, e cada instância tem o seu próprio turno, como hoje.
- O personagem-mestre é transferido para outro usuário (021): quem comanda o aliado passa a ser o novo dono, porque o comando segue o dono atual do personagem.
- A campanha não está Ativa (049): agir e mover seguem as mesmas recusas de hoje, também para quem comanda o aliado.
- O mestre do jogo continua podendo fazer tudo com qualquer NPC, aliado ou não.
- O NPC está em várias campanhas: a categoria e o personagem-mestre são de cada campanha. Ser aliado numa não muda nada nas outras.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todo NPC MUST ter, **em cada campanha em que está**, uma categoria entre Inimigo, Neutro e Aliado, que vale para todas as instâncias dele nessa campanha. NPCs existentes e novos sem escolha explícita são Inimigos.
- **FR-002**: Só o mestre do jogo MUST poder mudar a categoria e o personagem-mestre.
- **FR-003**: Inimigos e Neutros MUST continuar no painel da direita, com o comportamento de hoje. O card MUST mostrar a categoria de forma discreta.
- **FR-004**: Aliados sem personagem-mestre MUST aparecer num card de aliados no lado esquerdo, logo abaixo dos personagens do grupo, e não no painel da direita.
- **FR-005**: O card de aliados MUST ter, para o mestre do jogo, as mesmas ações do card de NPC de hoje: arrastar para o mapa, editar, instâncias com o círculo de turno. Para os jogadores, o card MUST ser só leitura, como os NPCs da direita.
- **FR-006**: O personagem-mestre MUST ser opcional (nulo) e só poder ser definido para aliados. MUST ser um personagem aprovado da campanha.
- **FR-007**: Um aliado com personagem-mestre MUST aparecer num card menor logo abaixo do card desse personagem no painel do grupo, e não no card geral de aliados.
- **FR-008**: O dono atual do personagem-mestre MUST poder, em cada instância do aliado: usar "Agir", "Mover" e "Resetar turno", e mudar vida, fadiga, status e postura (os mesmos campos que muda no próprio personagem na campanha). Nome, Deslocamento, ficha e retirada do mapa continuam só do mestre do jogo. Ele não fala no chat como o aliado.
- **FR-009**: Qualquer ação feita pelo dono do personagem-mestre em nome do aliado MUST seguir as mesmas regras de turno, de modo livre e de status da campanha que o próprio personagem segue. MUST ficar registrada no histórico do turno com o aliado como ator e o jogador como autor.
- **FR-010**: Mudar a categoria para Inimigo ou Neutro MUST remover o personagem-mestre.
- **FR-011**: Quando o personagem-mestre deixa de estar aprovado, sai da campanha ou é apagado, o aliado MUST ficar sem mestre.
- **FR-012**: Toda mudança de categoria ou de personagem-mestre MUST chegar a todos na mesa em tempo real, sem recarregar a página.
- **FR-013**: No mapa 2D (e na imagem compartilhada do mapa), as peças dos aliados MUST ter uma cor própria de aliado, diferente da vermelha dos NPCs e da azul dos personagens. Inimigos e Neutros continuam vermelhos.
- **FR-014**: Os assistentes de IA conectados (MCP) MUST conseguir ler e mudar a categoria e o personagem-mestre, com as mesmas regras.

### Key Entities

- **Categoria do NPC**: Inimigo, Neutro ou Aliado. Diz em que painel o NPC aparece e se ele pode ter um personagem-mestre.
- **Personagem-mestre**: ligação opcional entre um aliado e um personagem aprovado da campanha. Dá ao dono desse personagem o comando do aliado.
- **Card de aliados**: card no lado esquerdo, abaixo dos personagens, com os aliados sem personagem-mestre.
- **Card do aliado comandado**: card menor logo abaixo do card do personagem-mestre.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das campanhas existentes, depois da mudança, os NPCs continuam no mesmo lugar e com o mesmo comportamento de antes, até o mestre mudar a categoria de algum.
- **SC-002**: O mestre classifica um NPC e o vê mudar de painel em menos de 10 segundos, sem recarregar a página. Todos na mesa veem a mudança em até 2 segundos.
- **SC-003**: Um jogador com personagem-mestre faz o aliado agir e mover em no máximo os mesmos cliques que usa para o próprio personagem.
- **SC-004**: Nenhum jogador consegue comandar um aliado que não está ligado a um personagem seu. 100% das tentativas são recusadas.

## Assumptions

- Quem escolhe o personagem-mestre é o mestre do jogo. "Ele pode escolher um mestre" é lido como "o aliado pode ter um mestre".
- O card do aliado comandado mostra as mesmas informações do card de NPC (nome, imagem, vida, fadiga, status, instâncias), em tamanho reduzido.
- A categoria não muda as regras de movimento, ocupação de hex, postura ou modo livre.
- O "Agir" do aliado comandado usa o mesmo fluxo do menu da peça e do chat. No chat, a ação aparece com o nome do aliado.
- O modo de andar no 3D (069/070) continua só para o personagem escolhido. Andar com o aliado no 3D fica fora do escopo.
