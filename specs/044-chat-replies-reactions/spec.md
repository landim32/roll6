# Feature Specification: Chat da mesa como no WhatsApp — responder, reagir, ações canceladas e colar imagens

**Feature Branch**: `044-chat-replies-reactions`
**Created**: 2026-10-09
**Status**: Draft
**Input**: User description: "Melhorias no chat: nova ação remove a anterior do turno ('Ação cancelada'); resetar o turno mostra 'Ação cancelada'; responder mensagens como no WhatsApp (arrastar para a direita); curtir (joinha) e amei (coração); converter mensagem em ação e ação em mensagem; segurar a mensagem abre um menu com 5 ícones (Curtir, Amei, Responder, Ação, Apagar); ações têm as mesmas opções das mensagens; colar imagens da área de transferência."

## Contexto

O chat da campanha (041) é a linha do tempo da mesa: conversa e registros do turno. Esta feature deixa a interação com cada mensagem parecida com a do WhatsApp — responder citando, reagir, um menu ao segurar a mensagem — e corrige a regra das ações: cada personagem tem **uma** ação valendo por turno, e a anterior aparece como "Ação cancelada" em vez de sumir sem rastro.

## Clarifications

### Session 2026-10-09

- Q: Como aparece uma "Ação cancelada" no chat? → A: O balão continua, com o texto original riscado e esmaecido e o rótulo "Ação cancelada".
- Q: Quantas reações cada pessoa pode deixar numa mensagem? → A: Uma por pessoa (Curtir ou Amei); tocar na mesma remove, tocar na outra troca.
- Q: O que pode virar "Ação" além de mensagens de texto? → A: Só mensagens de texto; fotos, áudios, rolagens e narrações não convertem.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Uma ação valendo por turno, a anterior fica "Ação cancelada" (Priority: P1)

Uma jogadora registra a ação "Ataco o orc" e, antes de o turno fechar, muda de ideia: registra "Recuo para a ponte". No chat, a primeira passa a aparecer riscada como "Ação cancelada" e só a nova vale para o turno (contagem de quem agiu, resumo, dados do turno, balão no mapa). Se ela (ou o mestre) resetar o turno do personagem, a ação dele também aparece como "Ação cancelada".

**Why this priority**: Hoje várias ações do mesmo personagem no turno se acumulam e confundem o mestre e a narração; e o reset apaga a ação sem deixar sinal na conversa.

**Independent Test**: Registrar duas ações seguidas com o mesmo personagem → no chat a primeira aparece como "Ação cancelada" e o resumo do turno mostra só a segunda; resetar o turno → a ação vira "Ação cancelada".

**Acceptance Scenarios**:

1. **Given** o personagem já tem uma ação no turno atual, **When** registra outra, **Then** a anterior fica cancelada e aparece no chat como "Ação cancelada" (texto original riscado e esmaecido), e só a nova conta como a ação do turno.
2. **Given** uma ação cancelada, **When** se olham o resumo do turno, os dados do turno, a lista de quem falta agir e o balão no mapa, **Then** só a ação vigente aparece.
3. **Given** o turno do personagem é resetado, **When** o reset termina, **Then** a ação dele aparece no chat como "Ação cancelada" (o movimento continua sendo desfeito como hoje).
4. **Given** um NPC (ações do mestre), **When** o mestre registra uma segunda ação para a mesma ocorrência no turno, **Then** vale a mesma regra.
5. **Given** ações de turnos anteriores, **When** se registra uma nova ação no turno atual, **Then** nada de turnos anteriores é cancelado.

---

### User Story 2 - Responder uma mensagem citando-a (Priority: P1)

No celular, a jogadora arrasta uma mensagem para a direita (como no WhatsApp); um cartão com a mensagem citada (nome do autor colorido e o começo do texto, ou "Foto", "Áudio", "Ação") aparece logo acima do campo de mensagem, com um X para desistir. Ela escreve e envia: a resposta aparece no chat com a citação dentro do balão; tocar na citação rola até a mensagem original e a destaca por um instante. No computador, o mesmo vem pelo menu da mensagem ("Responder").

**Why this priority**: Numa mesa com várias conversas paralelas, responder a alguém específico é o que mais falta no chat.

**Independent Test**: Responder uma mensagem de outra pessoa pelo gesto e pelo menu; ver a citação no balão; tocar nela e chegar à original.

**Acceptance Scenarios**:

1. **Given** uma mensagem, uma ação, uma rolagem ou uma narração, **When** o usuário arrasta o balão para a direita (celular), **Then** o balão acompanha o dedo, aparece o ícone de responder e, ao soltar depois de um limite, o cartão de resposta aparece acima do campo e o campo recebe o foco.
2. **Given** o cartão de resposta, **When** o usuário toca no X, **Then** a resposta é descartada e a próxima mensagem sai sem citação.
3. **Given** o cartão de resposta, **When** envia texto, foto, áudio ou uma ação, **Then** a nova entrada mostra a citação (autor + começo do conteúdo) dentro do balão.
4. **Given** uma resposta no chat, **When** alguém toca na citação, **Then** o chat rola até a original (carregando mensagens antigas se preciso) e a destaca por cerca de 1 segundo.
5. **Given** a mensagem citada foi apagada depois, **When** a resposta é exibida, **Then** a citação mostra "Mensagem apagada".
6. **Given** movimentos, mudanças de personagem, fins de turno e cutucões, **When** o usuário tenta responder, **Then** a opção não existe para eles.

---

### User Story 3 - Segurar a mensagem abre o menu de ações (Priority: P1)

Segurar um balão por meio segundo (ou clicar com o botão direito no computador) abre, sobre ele, uma barra com até cinco ícones grandes para o toque: Curtir (joinha), Amei (coração), Responder, Ação (ou "Mensagem", para converter de volta) e Apagar. Só aparecem as opções que valem para aquela entrada e para quem a segura. O antigo botão "…" deixa de existir.

**Why this priority**: É a porta de entrada de todas as novas ações; sem ela as outras histórias não são acessíveis no celular.

**Independent Test**: Segurar uma mensagem própria e uma de outra pessoa, no celular e no computador, e ver os ícones certos em cada caso; tocar fora fecha.

**Acceptance Scenarios**:

1. **Given** um balão de mensagem, ação, rolagem ou narração, **When** o usuário o segura por ~0,5 s (sem arrastar), **Then** abre uma barra flutuante com os ícones aplicáveis (cada um com área de toque de pelo menos 44 px) e o balão fica destacado.
2. **Given** a barra aberta, **When** o usuário toca fora, rola o chat ou aperta Esc, **Then** ela fecha sem fazer nada.
3. **Given** o computador, **When** o usuário clica com o botão direito no balão (ou passa o mouse e clica no ícone que aparece), **Then** a mesma barra abre.
4. **Given** a entrada de outra pessoa, **When** a barra abre, **Then** "Apagar" e "Ação/Mensagem" só aparecem para quem tem permissão (autor ou mestre, ver US5/US6).

---

### User Story 4 - Curtir e Amei (Priority: P2)

Na barra, "Curtir" (joinha) e "Amei" (coração) marcam a reação do usuário àquela entrada. As reações aparecem como um pequeno selo no canto do balão com os ícones e a contagem; tocar no selo mostra quem reagiu. Cada usuário tem no máximo uma reação por entrada: tocar na mesma de novo a remove; tocar na outra troca.

**Why this priority**: Dá retorno rápido sem poluir o chat com "kkk" e "boa".

**Independent Test**: Duas pessoas reagem à mesma mensagem (joinha e coração); o selo mostra os dois ícones e "2"; uma troca a reação; outra remove.

**Acceptance Scenarios**:

1. **Given** uma entrada sem reações, **When** o usuário toca em Curtir, **Then** aparece o selo com o joinha (e "1") para todos na mesa, na hora.
2. **Given** o usuário já curtiu, **When** toca em Amei, **Then** a reação dele passa a ser coração; **When** toca em Amei de novo, **Then** a reação dele é removida.
3. **Given** um selo com reações, **When** alguém toca nele, **Then** vê a lista "nome — reação".
4. **Given** reações, **When** chegam, **Then** não geram notificações nem contam como mensagem não lida.

---

### User Story 5 - Converter mensagem em ação e ação em mensagem (Priority: P2)

Uma jogadora escreveu "Vou abrir a porta com cuidado" como conversa, mas era a ação do turno. Ela segura a mensagem e toca em "Ação": a mensagem vira a ação do personagem no turno atual (cancelando a ação anterior dele, se houver), e no chat passa a aparecer como ação. O contrário também existe: segurar uma ação e tocar em "Mensagem" a transforma em conversa (deixando o personagem sem ação no turno).

**Why this priority**: Corrige o erro mais comum ao escrever no celular, sem apagar e reescrever.

**Independent Test**: Converter uma mensagem em ação e ver a contagem de quem agiu mudar; converter de volta e ver o personagem voltar a "falta agir".

**Acceptance Scenarios**:

1. **Given** uma mensagem de texto do próprio usuário falando como um personagem aprovado com peça no mapa atual, no turno atual, **When** ele toca em "Ação", **Then** a mensagem passa a ser a ação vigente do personagem no turno (a anterior vira "Ação cancelada") e aparece como ação no chat, para todos.
2. **Given** a ação vigente de um personagem no turno atual, **When** o dono do personagem ou o mestre toca em "Mensagem", **Then** ela passa a ser uma mensagem de texto do personagem, e o personagem volta a não ter ação no turno.
3. **Given** uma mensagem do mestre sem personagem, uma foto, um áudio, uma rolagem ou uma mensagem de um turno anterior, **When** a barra abre, **Then** "Ação" não aparece.
4. **Given** o mestre, **When** segura a mensagem de um jogador, **Then** também pode convertê-la em ação do personagem daquele jogador.
5. **Given** a conversão, **When** acontece, **Then** valem as mesmas notificações e regras de "Agir" (aviso ao mestre, "Falta apenas você…") e ela não gera uma nova notificação de mensagem.

---

### User Story 6 - Ações têm as mesmas opções das mensagens (Priority: P2)

As ações aparecem como balões e aceitam tudo o que uma mensagem aceita: reagir, responder, converter (para mensagem) e apagar. Apagar uma ação vigente funciona como cancelá-la: ela aparece como "Ação cancelada" e o personagem volta a "falta agir".

**Why this priority**: Unifica o comportamento; o jogador não precisa saber qual tipo de entrada está segurando.

**Independent Test**: Reagir, responder, converter e apagar uma ação, verificando o efeito no turno.

**Acceptance Scenarios**:

1. **Given** uma ação, **When** a barra abre para o dono do personagem ou o mestre, **Then** aparecem Curtir, Amei, Responder, Mensagem e Apagar; para os outros, Curtir, Amei e Responder.
2. **Given** uma ação vigente, **When** é apagada, **Then** aparece como "Ação cancelada" e deixa de contar no turno.

---

### User Story 7 - Colar imagens da área de transferência (Priority: P3)

No computador (Ctrl+V / Cmd+V) ou no celular (colar), com o campo de mensagem em foco, uma imagem copiada vira uma prévia acima do campo com "Enviar" e "Cancelar"; o texto digitado vira a legenda. Enviar segue o mesmo caminho da foto do clipe.

**Why this priority**: Comodidade para quem tira print de mapas e fichas.

**Independent Test**: Copiar uma imagem, colar no campo, ver a prévia, enviar com legenda.

**Acceptance Scenarios**:

1. **Given** uma imagem PNG/JPEG/WebP na área de transferência, **When** o usuário cola no campo de mensagem, **Then** aparece a prévia com Enviar/Cancelar e nada é enviado sozinho.
2. **Given** a prévia, **When** toca em Enviar, **Then** a foto vai ao chat com o texto do campo como legenda.
3. **Given** texto comum na área de transferência, **When** colado, **Then** é colado como texto, como hoje.
4. **Given** uma imagem acima de 10 MB ou de outro formato, **When** colada, **Then** aparece o mesmo aviso de tamanho/formato da foto do clipe.

---

### Edge Cases

- Duas ações enviadas quase ao mesmo tempo pelo mesmo personagem: só uma fica vigente; a outra aparece cancelada.
- Reset de um turno sem ação (só movimento): nada aparece como "Ação cancelada".
- "Ação cancelada" pode ser respondida e reagida como qualquer entrada, mas não pode ser convertida, apagada nem reativada.
- Responder a uma entrada que ainda não foi carregada na tela (muito antiga): tocar na citação carrega o histórico até ela; se não existir mais, mostra "Mensagem não encontrada".
- Arrastar para a direita durante a rolagem vertical: só conta como gesto de responder se o movimento for claramente horizontal; rolar o chat continua natural.
- Segurar enquanto o chat está rolando por inércia: não abre o menu.
- Reação numa entrada apagada: as reações somem com ela.
- Converter em ação quando o personagem não está no mapa atual: a opção aparece desabilitada com a explicação "Coloque o personagem no mapa aberto para agir".
- Converter uma mensagem que é resposta: a ação mantém a citação.
- Colar várias imagens de uma vez: só a primeira é usada (com aviso).
- Leitores de tela e teclado: a barra de ações é acessível pelo teclado (Shift+F10 / tecla de contexto) e cada ícone tem rótulo.

## Requirements *(mandatory)*

### Functional Requirements

**Ações do turno**
- **FR-001**: Cada personagem (e cada ocorrência de NPC) MUST ter no máximo **uma ação vigente** por turno; registrar uma nova ação MUST cancelar a vigente anterior do mesmo ator no mesmo turno.
- **FR-002**: Uma ação cancelada MUST permanecer no chat como "Ação cancelada" (texto original riscado e esmaecido, autor e hora visíveis) e MUST NOT contar em nenhuma regra do turno (quem agiu, "Finalizar turno", "Falta apenas você", resumo, dados do turno, narração, balões no mapa e na vista 3D).
- **FR-003**: Resetar o turno de um ator MUST cancelar (e não apagar) a ação dele, que aparece como "Ação cancelada"; o movimento continua sendo desfeito como hoje.
- **FR-004**: Apagar uma ação vigente pelo chat MUST equivaler a cancelá-la; ações canceladas não podem ser apagadas, convertidas nem reativadas.

**Responder**
- **FR-005**: Usuários MUST poder responder a mensagens de texto, fotos, áudios, rolagens, ações (vigentes ou canceladas) e narrações; MUST NOT poder responder a movimentos, mudanças de personagem, fins de turno e cutucões.
- **FR-006**: No celular, arrastar o balão para a direita além de um limite (~60 px, movimento predominantemente horizontal) MUST iniciar a resposta; o balão acompanha o dedo e volta ao lugar ao soltar. Em qualquer aparelho, "Responder" na barra de ações MUST fazer o mesmo.
- **FR-007**: Durante a resposta, um cartão acima do campo de mensagem MUST mostrar o autor (com a cor do nome) e o começo da entrada citada ("Foto", "Áudio", "Rolou 3d6: total N", "Ação: …", "Narração: …"), com um botão para desistir; a próxima entrada enviada (texto, foto, áudio, rolagem ou ação) MUST levar a citação.
- **FR-008**: A citação MUST aparecer dentro do balão da resposta; tocar nela MUST rolar até a original (carregando histórico se preciso) e destacá-la ~1 s; se a original foi apagada, a citação MUST mostrar "Mensagem apagada".

**Barra de ações (segurar)**
- **FR-009**: Segurar um balão por ~0,5 s sem mover (ou clicar com o botão direito / usar a tecla de contexto no computador) MUST abrir uma barra flutuante com até 5 ícones grandes (área de toque ≥ 44 px): Curtir (joinha), Amei (coração), Responder, Ação/Mensagem e Apagar, mostrando só os aplicáveis à entrada e a quem a segura. O botão "…" atual MUST ser removido.
- **FR-010**: A barra MUST fechar ao tocar fora, rolar o chat, apertar Esc ou escolher uma opção.

**Reações**
- **FR-011**: Usuários com acesso ao chat MUST poder reagir com Curtir ou Amei a mensagens, fotos, áudios, rolagens, ações e narrações; cada usuário tem no máximo uma reação por entrada (tocar na mesma remove, tocar na outra troca).
- **FR-012**: As reações MUST aparecer para todos, na hora, num selo no canto do balão com os ícones presentes e o total; tocar no selo MUST mostrar quem reagiu com o quê (primeiro nome).
- **FR-013**: Reações MUST NOT gerar notificações nem contar como não lidas.

**Converter**
- **FR-014**: Uma mensagem de texto do turno atual falada como um personagem aprovado MUST poder ser convertida em ação desse personagem pelo dono do personagem ou pelo mestre, quando o personagem tem peça no mapa atual da campanha; a conversão segue as regras de "Agir" (cancela a ação vigente anterior, conta para quem agiu, avisa o mestre, pode disparar "Falta apenas você…") e não gera nova notificação de mensagem.
- **FR-015**: A ação vigente de um personagem no turno atual MUST poder ser convertida em mensagem de texto do personagem pelo dono ou pelo mestre; o personagem volta a não ter ação no turno.
- **FR-016**: Fotos, áudios, rolagens, narrações, mensagens do mestre sem personagem e entradas de turnos anteriores MUST NOT oferecer a conversão.
- **FR-017**: A conversão MUST preservar autor, hora, posição na linha do tempo, citação e reações da entrada.

**Colar imagens**
- **FR-018**: Colar uma imagem (PNG, JPEG ou WebP, até 10 MB) no campo de mensagem MUST abrir uma prévia com "Enviar" e "Cancelar"; enviar MUST mandar a foto com o texto do campo como legenda; texto comum colado continua sendo texto.

**Geral**
- **FR-019**: Todas as mudanças (cancelamento, citação, reações, conversões) MUST aparecer para todos os participantes em tempo real, sem recarregar.
- **FR-020**: As mesmas operações MUST estar disponíveis para assistentes de IA com a chave do usuário onde fizer sentido (reagir, converter); responder vem junto do envio de mensagem/ação.
- **FR-021**: Todos os textos MUST estar em português (pt-BR).

### Key Entities

- **Entrada do chat** (já existe): ganha **a entrada citada** (quando é uma resposta) e, para ações, o estado **cancelada** (com quando foi cancelada).
- **Reação**: um usuário, uma entrada, o tipo (curtir ou amei); única por usuário e entrada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, um personagem nunca tem mais de uma ação vigente por turno, e o resumo/dados do turno mostram só a vigente.
- **SC-002**: Um usuário responde a uma mensagem no celular em até 2 gestos (arrastar + enviar).
- **SC-003**: Reações, respostas e conversões aparecem para os outros participantes em menos de 2 segundos em rede normal.
- **SC-004**: A barra de ações abre em até 0,6 s ao segurar e todos os ícones têm área de toque de pelo menos 44 × 44 px.
- **SC-005**: Rolar o chat com o dedo nunca dispara uma resposta nem abre a barra por engano nos testes manuais.
- **SC-006**: Colar uma imagem e enviá-la leva no máximo 2 ações do usuário (colar + Enviar).

## Assumptions

- "Curtir" e "Amei" são as duas únicas reações.
- Segurar = ~0,5 s (o "alguns segundos" do pedido ajustado ao padrão do WhatsApp, para não parecer travado); configurável no plano se o teste mostrar que é curto.
- No computador, o mouse também pode segurar; o botão direito e um ícone que aparece ao passar o mouse abrem a mesma barra.
- Quem pode apagar continua como hoje (autor ou mestre); para ações, apagar = cancelar.
- Reagir/converter/responder não mudam o "não lido" de ninguém além da própria entrada nova (a resposta conta como mensagem nova).
- As notificações (043) de uma resposta são as de uma mensagem/ação comum; reações não notificam.
- A conversão vale só no turno atual; entradas de turnos passados ficam como estão.
- Movimentos, mudanças de personagem, fins de turno e cutucões continuam como linhas informativas, sem barra de ações.
