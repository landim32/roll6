# Feature Specification: "Ação sobre…" — a ação declarada sobre um hex do mapa

**Feature Branch**: `098-action-target`
**Created**: 2026-10-20
**Status**: Draft
**Input**: User description: "Crie uma opção chamada "Ação sobre...": no mesmo menu da ação, coloque o "Ação sobre..." acima do "Ação"; a ação sobre quer que selecione um hex; pode ser um hex com um aliado, inimigo ou vazio; quando um aliado ou inimigo estiver no hex, deve pegar informações dele para passar para o modelo; quando o hex estiver vazio deve apenas informar qual hex é; altere as skills "processar-turno" e "gm" para receber essa informação na pasta c:\repos\gurps-adventure; em qualquer ação, pressionar Enter deve funcionar como o clique no botão."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Declarar uma ação sobre um hex (Priority: P1)

Um jogador (ou o mestre) abre o menu da peça do seu personagem no mapa e, acima de **"Agir"**, encontra **"Ação
sobre…"**. Ao escolher, o mapa pede um hex: o jogador clica no hex do inimigo que quer atacar, do aliado que quer
ajudar, ou num hex vazio para onde quer atirar, olhar ou correr. O mapa mostra o hex escolhido e a janela da ação abre
já dizendo sobre quem (ou sobre qual hex) a ação é; o jogador descreve a ação e confirma. A ação vai para a mesa como
qualquer outra, mas **carregando o alvo**: quem está lá, ou o hex. Quem resolve o turno — o mestre com
`processar-turno`, ou o GM com `gm` — recebe esse alvo junto com a declaração.

**Why this priority**: é o recurso em si; sem o alvo, "ataco o goblin" obriga o modelo a adivinhar qual goblin, onde,
e a que distância.

**Independent Test**: com uma peça própria no mapa e um NPC inimigo a três hexes, "Ação sobre…" → clique no NPC →
"Ataco com a espada" → a ação aparece no chat com o alvo nomeado e os dados do turno a trazem com a peça alvo
(nome, tipo, posição, distância) para quem processa.

**Acceptance Scenarios**:

1. **Given** o menu de uma peça com a qual o jogador pode agir, **When** o menu abre, **Then** "Ação sobre…" aparece
   logo acima de "Agir", com a mesma disponibilidade (quem pode agir pode agir sobre).
2. **Given** "Ação sobre…" escolhido, **When** o jogador clica num hex do mapa, **Then** o hex fica marcado e a janela
   da ação abre com o alvo descrito no título ("Ação sobre Goblin guerreiro", "Ação sobre o hex (9,7)"); Esc ou um
   clique fora do mapa cancela a escolha sem abrir a janela.
3. **Given** um hex com um aliado ou inimigo (um personagem ou um NPC), **When** a ação é confirmada, **Then** ela
   carrega os dados dessa peça como a mesa os mostra: nome, se é personagem ou NPC e de que lado (aliado, inimigo,
   neutro), postura, status, PV e Fadiga atuais e totais, posição e frente, e a distância em hexes da peça que age.
4. **Given** um hex vazio, **When** a ação é confirmada, **Then** ela carrega só o hex (coordenadas e o rótulo que a
   mesa usa) e a distância da peça que age.
5. **Given** a ação salva, **When** alguém lê o chat, **Then** a linha da ação mostra sobre quem ou sobre qual hex ela
   é, além do texto.
6. **Given** a ação salva, **When** o mestre ou o GM lê os dados do turno, **Then** a declaração vem com o alvo
   (peça ou hex) e seus dados.

---

### User Story 2 - As skills recebem o alvo (Priority: P1)

O mestre roda `processar-turno` (ou o Modo GM roda `gm`) num turno em que alguns personagens declararam ações sobre
alvos. O contexto mostra, em cada declaração, o alvo: "ATAQUE: Ataco com a espada → sobre Goblin guerreiro (inimigo,
NPC) em (9,7), a 3 hexes, de frente SE, status: …" ou "→ sobre o hex (12,4), a 5 hexes". A resolução usa esse alvo
sem precisar adivinhá-lo pelo texto: o alcance e a distância vêm do alvo, o adversário é esse, a direção é essa.

**Why this priority**: sem a leitura do alvo pelas skills, a US1 só decora o chat.

**Independent Test**: um turno com uma ação sobre um NPC e outra sobre um hex vazio; `processar_turno.py contexto` e
`gm.py contexto` mostram os dois alvos nas declarações, e a narração do turno resolve o ataque contra o NPC apontado
(não contra outro de mesmo nome).

**Acceptance Scenarios**:

1. **Given** uma ação com alvo, **When** o contexto das skills é montado, **Then** a declaração mostra o alvo com
   os seus dados e a distância; sem alvo, a declaração vem como hoje.
2. **Given** dois NPCs de mesmo nome e uma ação sobre um deles, **When** a skill resolve, **Then** resolve contra a
   peça apontada (pela identidade da peça, não pelo nome).
3. **Given** uma ação sobre um hex vazio, **When** a skill resolve, **Then** usa o hex como destino/alvo da ação
   (um tiro, um movimento, uma observação) e a distância para alcance e penalidades.

---

### User Story 3 - Enter confirma a ação (Priority: P2)

Em qualquer janela de ação — "Agir" e "Ação sobre…" —, com o texto escrito, **Enter** confirma como se o botão tivesse
sido clicado; **Shift+Enter** quebra a linha. Nada muda no botão.

**Why this priority**: é o pedido explícito e um atrito pequeno mas constante.

**Independent Test**: abrir "Agir", escrever uma linha e teclar Enter → a ação é enviada; Shift+Enter → nova linha
no texto; com o texto vazio, Enter não envia.

**Acceptance Scenarios**:

1. **Given** a janela da ação com texto, **When** Enter, **Then** a ação é enviada e a janela fecha.
2. **Given** a janela da ação, **When** Shift+Enter, **Then** uma quebra de linha é inserida e nada é enviado.
3. **Given** a janela da ação com o texto vazio ou só espaços, **When** Enter, **Then** nada é enviado.

---

### Edge Cases

- O alvo é a própria peça (o jogador clica no seu hex): vale — "ação sobre si mesmo" (preparar, concentrar).
- O hex tem mais de uma peça (modo livre, sobreposição): a ação aponta a peça de cima, como a mesa a mostra, e o alvo
  diz qual.
- A peça alvo sai do mapa, morre ou é removida antes do processamento: a ação guarda o que foi visto no momento da
  declaração (nome, dados, posição) e aponta a peça; quem processa vê que ela não está mais lá.
- O alvo é um objeto (um token sem personagem nem NPC): tratado como "coisa", com nome e posição.
- A ação é trocada (uma nova declaração cancela a anterior, 044): o alvo vai com a nova; "Agir" sem alvo troca uma
  ação com alvo por uma sem.
- Uma ação convertida de mensagem do chat (044) ou declarada pelo chat sem peça (080) não tem alvo.
- Um hex fora da grade não pode ser escolhido.
- Jogador que não pode agir com a peça (não é dele, campanha não ativa) não vê "Ação sobre…", como não vê "Agir".
- Sussurro (047): uma ação sussurrada com alvo mascara o alvo junto com o texto para quem não a vê.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O menu de uma peça MUST oferecer **"Ação sobre…"** imediatamente acima de "Agir", a quem pode agir com a
  peça, nas mesmas condições.
- **FR-002**: "Ação sobre…" MUST entrar num modo de escolha em que um clique num hex da grade escolhe o alvo (a peça
  do hex, se houver, ou o hex vazio); o hex escolhido fica marcado; Esc, um clique fora do mapa ou um novo menu cancela.
- **FR-003**: Escolhido o alvo, a janela da ação MUST abrir dizendo o alvo no título e MUST enviar a ação com o alvo.
- **FR-004**: Uma ação com alvo MUST guardar: o hex (coordenadas e rótulo da mesa), a distância em hexes da peça que
  age e, quando há peça no hex, a identidade da peça e o que a mesa mostrava dela na hora — nome, tipo (personagem,
  NPC ou objeto), lado (aliado, inimigo, neutro; os personagens são aliados entre si), postura, status, PV e Fadiga
  atuais e totais, frente.
- **FR-005**: A linha da ação no chat MUST mostrar o alvo ("sobre Goblin guerreiro" / "sobre o hex (9,7)"), e os dados
  do turno lidos por quem processa (o mestre, o GM, a ferramenta de IA) MUST trazer o alvo com os seus dados.
- **FR-006**: A declaração de ação por outros caminhos (chat, conversão de mensagem) MUST continuar sem alvo, sem
  mudança.
- **FR-007**: As skills `processar-turno` e `gm` (em `c:\repos\gurps-adventure`, como arquivos) MUST mostrar o alvo em
  cada declaração que o tem — peça com os dados e a distância, ou hex e distância — e MUST usá-lo na resolução
  (o adversário é a peça apontada; o alcance e as penalidades vêm da distância; um hex vazio é o destino ou o ponto
  mirado).
- **FR-008**: Em toda janela de ação, Enter MUST confirmar como o botão (com texto não vazio) e Shift+Enter MUST
  inserir uma quebra de linha.
- **FR-009**: O alvo de uma ação sussurrada MUST ser escondido junto com o texto para quem não a vê.

### Key Entities *(include if feature involves data)*

- **Alvo da ação**: o que a ação é sobre — um hex (coordenadas, rótulo, distância da peça que age) e, opcionalmente,
  a peça que estava nele (identidade, nome, tipo, lado, postura, status, PV/Fadiga, frente), guardado com a ação no
  momento da declaração.
- **Ação (existente)**: ganha o alvo opcional; tudo o mais igual (um valor por turno, cancelável, sussurrável).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador declara uma ação sobre um alvo em até três toques depois de abrir o menu da peça (opção,
  hex, confirmar).
- **SC-002**: Em 100% das ações com alvo, o chat mostra o alvo e os dados do turno o trazem com os campos da FR-004.
- **SC-003**: Em 100% das ações com alvo, o contexto de `processar-turno` e de `gm` mostra o alvo e a distância na
  declaração, e a resolução age sobre a peça apontada.
- **SC-004**: Enter confirma a ação em 100% das janelas de ação; Shift+Enter nunca envia.
- **SC-005**: Ações sem alvo (chat, conversão, "Agir") continuam exatamente como antes (0 regressões nos testes atuais).

## Assumptions

- "O mesmo menu da ação" é o menu da peça no mapa, onde fica "Agir"; a ação pelo chat (⚡) não ganha alvo — ela não tem
  mapa à vista.
- Os dados da peça alvo são os que a mesa já mostra a quem está vendo (nome, lado, postura, status, PV/Fadiga, frente),
  copiados no momento da declaração — não uma referência viva —, mais a identidade da peça para quem processa.
- "Aliado/inimigo" segue a categoria dos NPCs da campanha (Inimigo, Neutro, Aliado) e trata os personagens como
  aliados entre si; um objeto é "coisa".
- A distância é a contagem de hexes entre a peça que age e o hex alvo, pela geometria da mesa.
- As skills são alteradas como arquivos no repositório da mesa, sem commit pela feature; a `gm` continua só pelo MCP
  (o alvo chega pelos dados do turno).
