# Feature Specification: Andar compartilhado no 3D (modo livre)

**Feature Branch**: `069-shared-3d-walk`
**Created**: 2026-10-15
**Status**: Draft
**Input**: User description: "Sim, preciso que o movimento agora passe a ser compartilhado. Andar no 3D deve refletir no 2D, os outros personagens deve ver o movimento e animação dos outros. Não deve haver colisão. Se dois personagens estiverem ocupando o mesmo hex, deve dar erro ao sair do modo livre e não deve deixar"

## Clarifications

### Session 2026-10-15

- Q: "Sem colisão" vale também para paredes da vista 3D e para a borda do mapa? → A: não. Só as peças deixam de
  bloquear; paredes e borda continuam bloqueando o andar, como hoje.
- Q: No modo livre, o "Mover" do 2D também pode parar num hex ocupado? → B: não. Só o andar no 3D sobrepõe peças; o
  "Mover" do 2D continua recusando hex ocupado.

## Contexto

No modo livre (054), o jogador anda com o próprio personagem na vista 3D (055). Hoje esse andar é **só local**:

- nada é enviado;
- a peça não sai do lugar no mapa;
- os outros continuam vendo o personagem parado onde a peça está;
- o próprio jogador, ao recarregar, volta para a peça.

O andar também esbarra em paredes, na borda do mapa e nas peças dos outros. Fora do 3D, o mapa 2D nunca deixa duas peças ocuparem o mesmo hex.

Esta funcionalidade torna o andar **da mesa inteira**:

- o que um jogador anda aparece ao vivo para os outros, no 3D (com a animação de andar) e no 2D (a peça muda de hex);
- no modo livre os personagens passam uns pelos outros;
- sair do modo livre com duas peças no mesmo hex é recusado com um aviso, até que alguém as separe.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver os outros andando no 3D (Priority: P1)

Com o modo livre ligado, quando um jogador anda com o personagem no 3D, os outros que estão no 3D veem a figura dele andando em tempo real. A animação de andar toca (no modelo 3D) e o lado visto da figura 2,5D acompanha a direção.

**Why this priority**: é o pedido central. Sem ele, cada jogador anda sozinho num mundo que os outros não veem.

**Independent Test**: dois navegadores no mesmo mapa e no 3D, modo livre ligado. O jogador A anda e o B vê a figura de A se deslocar suavemente, virar e animar. Quando A para, a figura para no mesmo lugar nos dois.

**Acceptance Scenarios**:

1. **Given** o modo livre ligado e A e B no 3D do mapa atual, **When** A anda com o personagem, **Then** B vê a figura de A se mover no mesmo caminho em até meio segundo, sem saltos.
2. **Given** o personagem de A tem modelo 3D com animação de andar, **When** A anda, **Then** B vê a animação de andar tocar enquanto A se move e a de parado quando A para.
3. **Given** o personagem de A é uma figura 2,5D, **When** A vira enquanto anda, **Then** B vê o lado da figura que corresponde à nova direção (frente, costas, lados), como já acontece com as peças paradas.
4. **Given** A falou no chat (068), **When** A anda, **Then** o balão acompanha a figura de A também na tela de B.
5. **Given** A parou de andar, **When** B abre o 3D ou recarrega a página, **Then** vê o personagem de A no hex e na direção em que A parou.

---

### User Story 2 - O andar no 3D move a peça no 2D (Priority: P1)

O que o jogador anda no 3D é o movimento da peça dele no mapa. No 2D, a peça muda de hex e de direção conforme o personagem anda, para todos, sem precisar usar "Mover".

**Why this priority**: o mapa 2D é a referência da mesa (mestre, posições, compartilhar). Se o 3D e o 2D discordam, a mesa perde a verdade das posições.

**Independent Test**: A anda no 3D enquanto B olha o mapa 2D. A peça de A troca de hex e de direção acompanhando o caminho. Depois de recarregar, a peça está onde A parou.

**Acceptance Scenarios**:

1. **Given** o modo livre ligado, **When** o personagem de A atravessa para outro hex no 3D, **Then** a peça de A passa para esse hex no 2D de todos, em até 1 segundo.
2. **Given** A virou o personagem no 3D, **When** a direção mais próxima muda para outro lado do hex, **Then** a peça de A no 2D passa a olhar para esse lado.
3. **Given** A parou de andar, **When** qualquer um recarrega a página ou entra na mesa, **Then** a peça de A está no último hex e direção em que A ficou.
4. **Given** o modo livre, **When** a peça se move andando no 3D, **Then** nada é registrado no turno (como os movimentos do modo livre de hoje) e não há custo de Deslocamento.
5. **Given** A está andando, **When** o mestre move a peça de A pelo 2D, **Then** a caminhada de A recomeça da nova posição.

---

### User Story 3 - Sem colisão no modo livre e saída bloqueada com sobreposição (Priority: P2)

No modo livre os personagens não se bloqueiam: um pode atravessar o outro e parar no mesmo hex. Quando o mestre tenta desligar o modo livre e há duas ou mais peças ocupando o mesmo hex, o sistema recusa, diz quais peças estão sobrepostas e mantém o modo livre ligado. Depois que alguém as separa, o mestre consegue desligar.

**Why this priority**: sem colisão, andar em grupo fica fluido. A trava na saída garante que a mesa volte ao jogo por turnos sem duas peças no mesmo lugar, que é a regra fora do modo livre.

**Independent Test**: A anda e para em cima do personagem de B. O mestre tenta desligar o modo livre e recebe o erro com os nomes de A e B. A sai do hex, o mestre desliga e consegue.

**Acceptance Scenarios**:

1. **Given** o modo livre ligado, **When** A anda na direção do personagem de B, **Then** A atravessa B sem ser parado e pode ficar no mesmo hex.
2. **Given** duas peças ocupam pelo menos um hex em comum, **When** o mestre tenta desligar o modo livre, **Then** recebe um erro que nomeia as peças sobrepostas (por exemplo "Não é possível sair do modo livre: Aria e Borin estão no mesmo hex.") e o modo livre continua ligado.
3. **Given** o erro do cenário 2, **When** uma das peças sai do hex em comum e o mestre tenta de novo, **Then** o modo livre é desligado.
4. **Given** o modo livre ligado e nenhuma sobreposição, **When** o mestre desliga, **Then** desliga como hoje, sem confirmação.
5. **Given** o modo livre, **When** o jogador anda contra uma parede da vista 3D ou a borda do mapa, **Then** o personagem para na parede ou na borda e desliza ao longo dela, como hoje (só as peças deixaram de
   bloquear).

---

### Edge Cases

- **Peça maior que 1 hex** (2, 3, 7 ou 10 hexes): a sobreposição conta qualquer hex da forma inteira, como já é a regra de ocupação. Ao andar, a forma acompanha a posição e a direção.
- **NPCs e objetos**: o personagem atravessa também NPCs e objetos no modo livre, e uma sobreposição com eles também impede sair do modo livre.
- **Caído ou fora de combate**: não anda (como hoje). Se alguém o deita enquanto anda, a caminhada para onde ele está.
- **Perda de conexão no meio do andar**: os outros veem a figura parar no último ponto recebido. A peça fica no último hex gravado e, ao reconectar, a caminhada recomeça dali.
- **Dois jogadores com o mesmo personagem aberto** (duas abas): o andar mais recente vale e as duas abas acompanham a peça.
- **Mapa que não é o atual**: o andar só existe no mapa atual da campanha, onde os jogadores estão (039).
- **Sair do modo livre por outros caminhos**: qualquer forma de desligar o modo livre (tela, API, assistente de IA) obedece à mesma trava.
- **"Mover" no 2D durante o modo livre**: continua recusando hex ocupado. Só o andar no 3D sobrepõe peças. Uma peça
  já sobreposta pode ser movida pelo 2D para um hex livre, que é como o mestre ou o dono a separa.
- **Mestre**: o mestre sem personagem não anda. Ele vê todos andando, no 3D e no 2D, e pode mover qualquer peça pelo 2D, o que recomeça a caminhada daquele personagem.
- **Turno e movimento**: no modo livre o andar não gasta Deslocamento e não grava movimento no turno, como já é hoje.

## Requirements *(mandatory)*

### Functional Requirements

**Andar visto por todos**

- **FR-001**: Com o modo livre ligado, a posição e a direção de um personagem que anda no 3D MUST chegar aos outros participantes que estão na mesma campanha e no mesmo mapa enquanto ele anda, com atraso de até meio segundo.
- **FR-002**: Os outros MUST ver a figura se deslocar de forma contínua entre as posições recebidas, sem saltos visíveis a cada atualização.
- **FR-003**: Enquanto o personagem anda, os outros MUST ver a animação de andar do modelo 3D (quando o token tem modelo) e, quando para, a de parado. A figura 2,5D MUST mostrar o lado correspondente à direção.
- **FR-004**: O balão de fala do modo livre (068) MUST acompanhar a figura em movimento em todas as telas.

**Reflexo no 2D e posição gravada**

- **FR-005**: Quando o personagem que anda passa para outro hex, ou a direção mais próxima muda para outro lado, a peça MUST passar para aquele hex e direção no mapa, para todos, em até 1 segundo.
- **FR-006**: A posição gravada da peça MUST ser o último hex e a última direção do andar, de modo que recarregar a página ou entrar depois mostre o personagem onde ele parou.
- **FR-007**: O andar no modo livre MUST NOT gravar movimento no turno nem descontar Deslocamento, como os movimentos do modo livre de hoje.
- **FR-008**: Só o dono do personagem aprovado MUST poder andar com ele, como no "Mover" de hoje. Ninguém pode mover a peça de outra pessoa andando.
- **FR-009**: Uma mudança da peça feita por outra pessoa (mover pelo 2D, mudar postura, trocar de mapa) MUST recomeçar a caminhada do dono a partir da nova situação.

**Sem colisão e saída do modo livre**

- **FR-010**: No modo livre, o personagem que anda MUST atravessar as outras peças (personagens, NPCs e objetos) e MAY parar em hexes ocupados por elas.
- **FR-011**: Paredes da vista 3D (de qualquer altura) e a borda do mapa MUST continuar bloqueando o andar, como
  hoje.
- **FR-011a**: O "Mover" do 2D, inclusive no modo livre, MUST continuar recusando um destino ocupado. Uma peça que já
  está sobreposta MUST poder ser movida para um hex livre.
- **FR-012**: Desligar o modo livre MUST ser recusado enquanto duas ou mais peças do mapa atual da campanha ocuparem ao menos um hex em comum, considerando a forma inteira de cada peça. O modo livre MUST continuar ligado.
- **FR-013**: A recusa MUST dizer quais peças estão sobrepostas, pelos nomes, para o mestre saber quem mover.
- **FR-014**: A trava da saída MUST valer para qualquer forma de desligar o modo livre (tela, API, assistente de IA).
- **FR-015**: Fora do modo livre todas as regras de ocupação, colisão e turno de hoje MUST continuar iguais.

### Key Entities

- **Peça do personagem**: o hex e a direção que já existem no mapa passam a ser atualizados também pelo andar do modo livre, e podem coincidir com os de outra peça enquanto o modo livre está ligado.
- **Andar em curso** (não guardado): a posição exata e a direção de quem está andando agora, e se está em movimento. É transmitida aos outros participantes enquanto acontece e serve para desenhar a figura e a animação; não é guardada.
- **Sobreposição**: um par (ou grupo) de peças do mapa atual que ocupam ao menos um hex em comum. É calculada na hora de sair do modo livre.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador vê o personagem de outro andar no 3D com atraso de no máximo meio segundo, de forma contínua.
- **SC-002**: A peça no 2D acompanha o andar no 3D em até 1 segundo depois de o personagem trocar de hex.
- **SC-003**: Depois de recarregar a página, 100% dos personagens aparecem no hex e na direção em que pararam de andar.
- **SC-004**: Em 100% das tentativas de desligar o modo livre com peças sobrepostas, a saída é recusada com os nomes das peças. Sem sobreposição, desliga na primeira tentativa.
- **SC-005**: Com até 6 jogadores andando ao mesmo tempo no mesmo mapa, o 3D continua fluido para todos.

## Assumptions

- **Quem anda:** só jogadores com o próprio personagem aprovado, em pé, no mapa atual e com o modo livre ligado, como em 055. O mestre não anda com NPCs no 3D e move peças pelo 2D como hoje.
- **O que é gravado:** a posição gravada é sempre um hex com uma direção. A posição exata dentro do hex só existe enquanto alguém anda; quem entra depois vê o personagem no centro do hex onde ele parou.
- **Câmera:** a câmera estilo WoW (068) não muda.
- **Mapas fora do atual:** quem não é mestre só vê o mapa atual (039), então o andar só acontece nele.
- **Volume de dados:** as atualizações de posição enquanto alguém anda não ficam no histórico do chat nem no turno. Só a posição final da peça é gravada.
