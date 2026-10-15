# Feature Specification: Chat à direita, balões do chat no modo livre e câmera estilo World of Warcraft

**Feature Branch**: `068-wow-camera-chat-bubbles`
**Created**: 2026-10-15
**Status**: Draft
**Input**: User description: "Melhoria no 3D e chat:
- O modo de tela dividida "Mapa e Chat" na resolução de desktop, o chat deve aparecer do lado direito, ocupando 30% da tela
- Em mobile, essa tela dividida continua da mesma forma que está
- No modo livre, qualquer coisa escrita no chat (não precisa ser ação) aparece como balão no 3D por 60s, depois some
- O balão deve acompanhar o movimento do personagem
- A camera do personagem deve funcionar como um World of Warcrat, ou seja:
    - Posso rotacionar a camera e ver meu personagem
    - Quando começar a andar a camera volta para as costas do personagem
    - Pesquise a camera de World of Warcraft, deve ser uma camera igual a dele"

## Clarifications

### Session 2026-10-15

- Q: A câmera inclina para cima e para baixo, como no WoW, ou só gira para os lados? → A: só gira para os lados, na
  mesma altura de hoje (a vista 3D não inclina).

## Contexto

Hoje a mesa tem três disposições: só o mapa, "Mapa e Chat" e só o chat. Em "Mapa e Chat" o mapa fica em cima (60% da
altura) e o chat embaixo (40%), em qualquer tamanho de tela. Num monitor largo isso deixa o mapa achatado e o chat com
linhas muito compridas.

Na vista 3D, os balões mostram só a **ação** do turno em andamento de cada personagem. No **modo livre** (054) a mesa
conversa à vontade e as ações deixam de ser o centro, mas a conversa não aparece no 3D.

A câmera do 3D hoje fica atrás do personagem escolhido. Fora do modo livre, qualquer movimento a solta do personagem e
"Voltar ao personagem" a prende de novo. No modo livre, quando o jogador anda com o personagem (055), a câmera fica
**travada** atrás dele: as setas laterais giram o personagem e não há como girar a câmera para vê-lo de frente.

**Referência: a câmera do World of Warcraft**, pesquisada para esta spec:
- **Arrastar com o botão esquerdo** gira a câmera em volta do personagem, para os lados e para cima/baixo, sem virar o
  personagem. Assim o jogador vê o personagem de lado ou de frente.
- **Arrastar com o botão direito** gira a câmera e vira o personagem para onde a câmera olha ("mouselook"). Andar
  então segue a direção da câmera.
- **Os dois botões juntos** fazem o personagem andar para a frente.
- **A roda do mouse** aproxima e afasta a câmera.
- **Estilo de acompanhamento** ("Camera Following Style"), configurável no jogo:
  - "Somente ao se mover" (o padrão): a câmera fica onde o jogador a deixou enquanto o personagem está parado e, ao
    andar, volta suavemente para as costas dele.
  - "Sempre ajustar": volta sempre.
  - "Nunca ajustar": nunca volta.
- **Paredes:** a câmera não atravessa paredes. Quando há uma parede entre ela e o personagem, ela se aproxima dele.

Esta funcionalidade adota o comportamento padrão do jogo ("Somente ao se mover").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chat à direita em "Mapa e Chat" no computador (Priority: P1)

Num computador, o jogador escolhe "Mapa e Chat". O mapa (2D ou 3D) ocupa a parte esquerda da tela e o chat uma coluna
à direita, com 30% da largura e toda a altura abaixo do menu. No celular nada muda: o mapa continua em cima e o chat
embaixo.

**Why this priority**: muda o uso de toda sessão em computador, vale para todos os usuários e não depende do 3D nem do
modo livre.

**Independent Test**: abrir uma campanha num navegador de computador, escolher "Mapa e Chat" e conferir a coluna do chat
à direita. Estreitar a janela até a largura de celular e conferir que volta ao arranjo de cima e embaixo.

**Acceptance Scenarios**:

1. **Given** uma tela de computador e a disposição "Mapa e Chat", **When** a mesa é exibida, **Then** o chat ocupa uma
   coluna à direita com 30% da largura da janela e toda a altura abaixo do menu, e o mapa ocupa os 70% restantes à
   esquerda.
2. **Given** a disposição "Mapa e Chat" num celular (largura abaixo do ponto de corte atual de celular), **When** a mesa
   é exibida, **Then** o mapa fica em cima e o chat embaixo, exatamente como hoje.
3. **Given** a disposição "Mapa e Chat" no computador, **When** o usuário centraliza o mapa, abre a vista 3D, abre os
   painéis de personagens e NPCs ou usa os botões do mapa, **Then** tudo isso acontece dentro da área do mapa, sem ficar
   embaixo da coluna do chat.
4. **Given** a janela redimensionada entre computador e celular com a disposição "Mapa e Chat", **When** passa o ponto
   de corte, **Then** a disposição muda de lado para cima e embaixo (e vice-versa) sem recarregar e sem perder o que
   estava escrito no campo do chat.

---

### User Story 2 - Câmera estilo World of Warcraft (Priority: P2)

Na vista 3D, o jogador arrasta para girar a câmera em volta do próprio personagem e vê-lo de lado ou de frente. Quando
começa a andar (modo livre), a câmera volta suavemente para as costas do personagem. Também pode arrastar de um jeito
que vira o personagem junto com a câmera, aproximar e afastar com a roda, e a câmera nunca atravessa uma parede.

**Why this priority**: é a mudança de maior valor no 3D, mas só para quem usa a vista 3D com um personagem no mapa.

**Independent Test**: num mapa com o personagem do jogador em pé e modo livre ligado, abrir o 3D, arrastar para dar a
volta no personagem e vê-lo de frente, depois andar e conferir que a câmera volta para as costas.

**Acceptance Scenarios**:

1. **Given** o 3D aberto com o personagem do jogador no mapa, parado, **When** o jogador arrasta com o botão esquerdo
   (ou com um dedo, no celular), **Then** a câmera gira em volta do personagem, sem virar o personagem, e continua
   apontada para ele, inclusive de frente.
2. **Given** a câmera girada para a frente do personagem e o personagem parado, **When** o jogador solta o mouse,
   **Then** a câmera fica onde está e não volta sozinha.
3. **Given** a câmera girada e o modo livre ligado, **When** o jogador começa a andar para a frente, **Then** a câmera
   volta suavemente para as costas do personagem, em menos de 1 segundo, e segue atrás dele enquanto anda.
4. **Given** o modo livre ligado, **When** o jogador arrasta com o botão direito, **Then** a câmera gira e o personagem
   vira para a mesma direção. Andar para a frente segue essa direção.
5. **Given** o modo livre ligado, **When** o jogador segura os dois botões do mouse, **Then** o personagem anda para a
   frente na direção da câmera.
6. **Given** uma parede entre a câmera e o personagem, **When** a câmera gira ou o personagem anda, **Then** a câmera se
   aproxima do personagem para ficar do lado de cá da parede e volta à distância escolhida quando a parede deixa de
   estar no meio.
7. **Given** o 3D aberto, **When** o jogador gira a roda do mouse (ou faz pinça, no celular), **Then** a câmera se
   aproxima ou se afasta do personagem dentro dos limites atuais, como hoje.
8. **Given** um usuário sem personagem no mapa (o mestre ou um jogador sem peça), **When** abre o 3D, **Then** a câmera
   livre continua como hoje.

---

### User Story 3 - Balões do chat no 3D durante o modo livre (Priority: P3)

Com o modo livre ligado, o que um personagem diz no chat aparece num balão sobre ele na vista 3D por 60 segundos e
depois some. O balão acompanha o personagem quando ele anda.

**Why this priority**: dá vida à conversa no 3D, mas só vale no modo livre e na vista 3D.

**Independent Test**: com o modo livre ligado e dois navegadores no 3D, o jogador A escreve no chat. O jogador B vê o
balão sobre o personagem de A. Quando A anda, o balão o acompanha; depois de 60 s ele some.

**Acceptance Scenarios**:

1. **Given** o modo livre ligado e o personagem em pé no mapa atual, **When** o jogador envia uma mensagem de texto no
   chat com aquele personagem, **Then** todos que veem a mensagem e estão no 3D veem um balão com o texto sobre aquele
   personagem.
2. **Given** um balão de conversa visível, **When** passam 60 segundos desde o envio da mensagem, **Then** o balão some.
3. **Given** um balão visível, **When** o mesmo personagem envia outra mensagem, **Then** o balão passa a mostrar a nova
   mensagem e os 60 segundos recomeçam.
4. **Given** um balão visível, **When** o personagem anda no 3D (inclusive o andar local do modo livre de quem o
   controla) ou a peça é movida no mapa, **Then** o balão acompanha a cabeça do personagem a cada quadro.
5. **Given** o modo livre ligado, **When** um personagem age (Ação), **Then** o balão mostra a ação, pelas mesmas regras
   de duração. O balão mostra sempre o que é mais recente entre a última mensagem e a última ação.
6. **Given** o modo livre desligado, **When** alguém escreve no chat, **Then** nenhum balão de conversa aparece e os
   balões voltam a mostrar só as ações do turno, como hoje.
7. **Given** uma mensagem sussurrada, **When** é enviada no modo livre, **Then** o balão aparece só para quem pode ver a
   mensagem no chat.
8. **Given** uma mensagem apagada, **When** o balão dela ainda está visível, **Then** o balão some.

---

### Edge Cases

- **Mensagem longa:** o balão mostra até três linhas, como o balão de hoje, e corta o resto com "…".
- **Mestre sem personagem:** as mensagens dele não têm de quem sair e não viram balão.
- **Personagem fora da vista 3D:** um personagem caído, fora de combate, sem imagem 2,5D nem modelo 3D, ou sem peça no
  mapa atual não mostra balão. Se voltar a aparecer dentro dos 60 s, o balão reaparece até completar o tempo.
- **Foto e áudio:** viram balão só pela legenda; sem legenda, nenhum balão. Rolagem de dados vira balão com o
  resultado ("5 + 3 + 6 = 14 — motivo"). Enquetes, cutucadas e linhas do sistema não viram balão.
- **Abrir o 3D depois:** quem abre o 3D (ou entra na mesa) depois de uma mensagem ainda vê o balão pelo tempo que falta
  dos 60 s, contados do envio e não da chegada.
- **Desligar o modo livre:** os balões de conversa somem na hora.
- **Câmera girada e peça movida:** se a peça é movida por outro usuário ou o andar recomeça (055), a câmera volta para
  as costas.
- **Celular:** um dedo arrastando na vista gira a câmera em volta. No modo livre, o joystick anda e vira o personagem,
  e ao andar a câmera volta para as costas. Não há "botão direito" no toque.
- **Fora do modo livre:** o personagem não anda. Girar a câmera em volta dele funciona e ela fica onde foi deixada.
  "Voltar ao personagem" a recoloca nas costas.

## Requirements *(mandatory)*

### Functional Requirements

**Disposição "Mapa e Chat"**

- **FR-001**: No computador (largura a partir do ponto de corte atual de celular, 768 px), a disposição "Mapa e Chat"
  MUST mostrar o chat numa coluna à direita com 30% da largura da janela, do menu até o pé da tela, e o mapa nos 70%
  restantes à esquerda.
- **FR-002**: No celular (abaixo de 768 px), a disposição "Mapa e Chat" MUST continuar como hoje, com o mapa em cima e o
  chat embaixo.
- **FR-003**: Os elementos do mapa MUST ficar dentro da área do mapa e nunca embaixo da coluna do chat: painéis de
  personagens e NPCs, botões do mapa, rodapé, centralização, vista 3D e joystick.
- **FR-004**: A troca entre as duas formas, ao redimensionar a janela, MUST acontecer sem recarregar e sem perder o
  texto do campo do chat nem a posição de leitura.

**Câmera da vista 3D**

- **FR-005**: Quando o usuário segue o próprio personagem no 3D, arrastar com o botão esquerdo do mouse (ou com um dedo
  no toque) MUST girar a câmera em volta do personagem, sem virar o personagem, mantendo-o no centro da vista.
- **FR-006**: A câmera girada MUST ficar onde o usuário a deixou enquanto o personagem não anda.
- **FR-007**: No modo livre, quando o personagem começa a andar, a câmera MUST voltar suavemente para as costas dele
  (em até 1 s) e segui-lo atrás enquanto anda.
- **FR-008**: No modo livre, arrastar com o botão direito MUST girar a câmera e virar o personagem para a mesma direção.
  Segurar os dois botões MUST fazer o personagem andar para a frente.
- **FR-009**: A câmera MUST continuar sem atravessar paredes e sem sair do mapa. Quando uma parede fica entre ela e o
  personagem, ela se aproxima do personagem.
- **FR-010**: A distância MUST continuar controlada pela roda, pelos botões +/− e pela pinça, nos limites atuais.
- **FR-011**: Fora do modo livre, girar a câmera em volta do personagem MUST funcionar como em FR-005 e FR-006, e
  "Voltar ao personagem" MUST recolocá-la nas costas.
- **FR-012**: Para quem não tem personagem no mapa (o mestre ou um jogador sem peça), a câmera livre MUST continuar como
  hoje.
- **FR-013**: A câmera MUST só girar para os lados, sempre na mesma altura, como a vista 3D faz hoje. Arrastar para
  cima ou para baixo não inclina a câmera.

**Balões do chat no modo livre**

- **FR-014**: Com o modo livre ligado, cada mensagem do chat dita por um personagem MUST aparecer num balão sobre esse
  personagem no 3D, para quem vê aquela mensagem no chat. Contam o texto, a legenda de foto ou áudio, a rolagem de
  dados com o resultado e a ação.
- **FR-015**: O balão MUST sumir 60 segundos depois do envio da mensagem, contados pelo horário do envio, não pelo da
  chegada. Também some quando a mensagem é apagada ou o modo livre é desligado.
- **FR-016**: Cada personagem MUST ter no máximo um balão, com o que disse por último (mensagem ou ação). Uma nova
  mensagem substitui o balão e recomeça os 60 s.
- **FR-017**: O balão MUST acompanhar o personagem a cada quadro, incluindo o andar local do modo livre de quem o
  controla e os movimentos da peça vistos pelos outros.
- **FR-018**: O balão MUST manter a aparência e as regras de hoje: até três linhas, escala pela distância, dentro da
  tela, embaixo da cabeça quando não cabe em cima, escondido atrás de paredes e sumindo com o personagem.
- **FR-019**: Com o modo livre desligado, os balões MUST mostrar só as ações do turno, como hoje.
- **FR-020**: Mensagens sussurradas MUST virar balão só para quem as vê no chat. Os outros não veem balão nem indício
  dele.

### Key Entities

- **Disposição da mesa**: "Mapa", "Mapa e Chat" ou "Chat", lembrada por aparelho como hoje. "Mapa e Chat" passa a ter
  duas formas, lado a lado no computador e em cima e embaixo no celular.
- **Câmera do personagem**: a direção em volta do personagem, a distância e se
  está "solta" (girada pelo usuário) ou atrás do personagem. Fica só no navegador.
- **Balão de conversa**: o personagem que falou, o texto mostrado, o horário do envio e o fim (envio + 60 s). Vem das
  mensagens do chat já carregadas, e nada novo é guardado no servidor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em telas de computador, a coluna do chat em "Mapa e Chat" ocupa 30% da largura (±1%) em larguras de 768 a
  2560 px. Abaixo de 768 px a disposição é idêntica à de hoje.
- **SC-002**: O jogador consegue ver o próprio personagem de frente no 3D em até 3 segundos, só arrastando.
- **SC-003**: Ao começar a andar com a câmera girada, a câmera está nas costas do personagem em no máximo 1 segundo.
- **SC-004**: Um balão de conversa aparece para os outros jogadores no 3D em até 2 segundos após o envio da mensagem
  (com o tempo real conectado) e some aos 60 s (±1 s) do envio.
- **SC-005**: Em 100% dos casos de teste, nenhum jogador vê o balão de um sussurro que não pode ler no chat.
- **SC-006**: A vista 3D mantém a mesma fluidez de hoje (sem queda perceptível de quadros) com até 8 balões na tela.

## Assumptions

- O ponto de corte entre computador e celular é o de hoje (768 px, o `md` do Bootstrap).
- A coluna do chat em "Mapa e Chat" não pode ser redimensionada pelo usuário: é fixa em 30%.
- Os balões de conversa são só da vista 3D. O mapa 2D continua mostrando só os balões das ações, como hoje.
- O estilo de acompanhamento é o padrão do WoW, "Somente ao se mover", sem opção para trocar de estilo.
- Nada muda no servidor nem no MCP: os balões saem das mensagens que o chat já recebe, com a mesma visibilidade, e a
  câmera é local.
- O andar continua local (055): os outros jogadores veem a peça onde ela está no mapa, e o balão acompanha o que cada um
  vê.
- Fora do modo livre os jogadores não andam no 3D, então a parte "ao andar a câmera volta" vale só no modo livre.
