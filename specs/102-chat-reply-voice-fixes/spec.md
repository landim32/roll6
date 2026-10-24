# Feature Specification: Melhorias no chat — citação do mestre, resposta privada e voz do mestre

**Feature Branch**: `102-chat-reply-voice-fixes`
**Created**: 2026-10-24
**Status**: Draft
**Input**: User description: "melhorias no chat: a cor amarelo, do gm, quando responde alguém, a mensagem respondida fica meio ilegível, coloque com fonte escura; quando responder uma mensagem privada, esta respondendo de forma pública. Tem q responder apenas para quem mandou a mensagem privada; existe a opção de mudar uma mensagem do personagem para o mestre, mas não tem uma opção de mudar de mensagem de mestre para mensagem de personagem"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Citação legível no cartão dourado do mestre (Priority: P1)

Quando o mestre fala com a própria voz (o cartão dourado, 079) respondendo a alguém, a citação da mensagem respondida
aparece dentro do cartão com letras claras sobre o dourado e fica difícil de ler. A citação (nome de quem falou e o
trecho) deve usar letras escuras, legíveis sobre o dourado, como o resto do cartão.

**Why this priority**: Afeta toda resposta do mestre; é a correção mais visível.

**Independent Test**: O mestre responde a uma mensagem de um jogador sem personagem selecionado; a citação dentro do
cartão dourado é lida sem esforço, em letras escuras.

**Acceptance Scenarios**:

1. **Given** uma mensagem do mestre (sem personagem) que responde a outra, **When** qualquer participante a vê, **Then**
   o nome e o trecho da citação aparecem em cor escura, com contraste suficiente sobre o dourado.
2. **Given** a citação de uma mensagem apagada, cancelada ou sussurrada, **When** aparece no cartão dourado, **Then**
   o aviso ("Mensagem apagada", "Mensagem sussurrada"…) também é escuro e legível.
3. **Given** uma resposta que não é do mestre, **When** aparece, **Then** a citação continua como hoje.

---

### User Story 2 — Responder a uma mensagem privada é privado (Priority: P1)

Quem responde a uma mensagem sussurrada (privada) hoje responde em público, e a resposta pode revelar a conversa a
todos. Ao escolher "Responder" numa mensagem privada, a resposta deve ir só para quem mandou aquela mensagem: o campo já
fica no modo sussurro, com o destinatário escolhido — o personagem que falou, ou o "Mestre" quando foi o mestre.

**Why this priority**: É um vazamento de informação que a mesa considera privada.

**Independent Test**: Ana sussurra para Bram; Bram responde à mensagem; só Ana (e o mestre, que sempre vê sussurros)
veem a resposta.

**Acceptance Scenarios**:

1. **Given** Ana sussurrou para Bram, **When** Bram toca "Responder" nessa mensagem, **Then** o campo fica amarelo de
   sussurro com "Ana" como destinatária, e a resposta enviada é vista só por Ana, Bram e o mestre.
2. **Given** o mestre sussurrou para Bram, **When** Bram responde, **Then** a resposta vai sussurrada para o "Mestre".
3. **Given** um jogador sussurrou para o mestre, **When** o mestre responde, **Then** a resposta vai sussurrada só para
   o personagem que mandou.
4. **Given** Ana responde ao **próprio** sussurro, **When** escolhe "Responder", **Then** os destinatários são os do
   sussurro original (ela continua a conversa com as mesmas pessoas).
5. **Given** a resposta a um sussurro com o destinatário pré-preenchido (Q1 = B), **When** quem responde tira ou
   acrescenta destinatários (ou tira todos), **Then** a mensagem vai como ele deixou — o sussurro é só o ponto de partida.
6. **Given** uma resposta a uma mensagem pública, **When** é enviada, **Then** nada muda: segue pública, a menos que o
   autor escolha sussurrar.

---

### User Story 3 — Trocar a voz de uma mensagem do mestre para um personagem (Priority: P2)

O mestre que também joga já pode, pelo menu de segurar uma mensagem, trocar a mensagem do personagem para a voz do
mestre ("Falar como mestre"). O caminho inverso só aparece quando aquele personagem está escolhido em "Personagem
atual" — falando como mestre ele nunca está, então a opção nunca aparece. Numa mensagem do mestre (sem personagem) o
menu deve oferecer "Falar como {nome}" para cada personagem aprovado dele naquela campanha, esteja qual for o
"Personagem atual".

**Why this priority**: Corrige um caminho que hoje não existe; uso menos frequente que os dois anteriores.

**Independent Test**: O mestre, com "Mestre (GM)" escolhido, escreve uma mensagem; segura a mensagem; vê "Falar como
Sae'Varyn"; toca; a mensagem passa a ser do personagem.

**Acceptance Scenarios**:

1. **Given** uma mensagem do mestre escrita com a voz do mestre e ele tem um personagem aprovado na campanha, **When**
   ele segura a mensagem, **Then** o menu mostra "Falar como {nome do personagem}" e, tocando, a mensagem passa a ser
   desse personagem para todos.
2. **Given** o mestre tem dois personagens aprovados, **When** segura a mensagem, **Then** aparece uma opção para cada.
3. **Given** a mensagem é um sussurro para um dos personagens dele, **When** segura, **Then** esse personagem não é
   oferecido (não se sussurra para si mesmo); os outros sim.
4. **Given** o mestre não tem personagem aprovado na campanha, **When** segura a mensagem, **Then** nenhuma opção de
   trocar a voz aparece.
5. **Given** uma mensagem do personagem dele, **When** segura, **Then** "Falar como mestre" continua como hoje.

### Edge Cases

- Responder a um sussurro cujo autor perdeu o personagem ou cujo personagem não está mais aprovado: o destinatário não
  pode ser escolhido; a resposta vai para o mestre (que sempre vê) e o campo avisa.
- Responder a uma ação sussurrada mascarada (quem não estava no sussurro vê "está sussurrando!"): quem não pode ver a
  mensagem não pode respondê-la (como hoje).
- Trocar a resposta (cancelar a citação) volta o campo para o estado anterior de sussurro (vazio).
- A pergunta privada ao Claude do mestre (093) e a resposta dela já têm regra própria: fora do escopo.

## Clarifications

### Session 2026-10-24

- Q: A resposta a uma mensagem privada fica sempre privada? → B: o sussurro vem pré-preenchido com quem mandou; quem
  responde pode tirar ou mudar os destinatários.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A citação de uma resposta dentro do cartão dourado da voz do mestre DEVE usar cor escura (nome, trecho e
  avisos), com contraste de pelo menos 4,5:1 sobre o fundo dourado, nos cartões próprios e nos dos outros.
- **FR-002**: Ao escolher responder a uma mensagem sussurrada, o campo DEVE entrar no modo sussurro com o autor da
  mensagem original como único destinatário: o personagem dele, ou o "Mestre" quando o autor falou como mestre.
- **FR-003**: Quando quem responde é o próprio autor do sussurro, os destinatários DEVEM ser os do sussurro original.
- **FR-004**: O destinatário escolhido automaticamente DEVE respeitar as regras de sussurro de hoje (nunca o próprio
  personagem de quem responde; o mestre não sussurra para "Mestre").
- **FR-005**: O sussurro de uma resposta a mensagem privada DEVE vir apenas pré-preenchido (Q1 = B): quem responde pode
  tirar ou acrescentar destinatários antes de enviar; o servidor não muda suas regras.
- **FR-006**: Responder a uma mensagem pública NÃO DEVE mudar nada no envio.
- **FR-007**: Numa mensagem da voz do mestre escrita por ele, o menu de segurar DEVE oferecer "Falar como {nome}" para
  cada personagem aprovado dele na campanha, independente do "Personagem atual", menos um personagem que seja
  destinatário daquele sussurro.
- **FR-008**: "Falar como mestre" numa mensagem do personagem dele DEVE continuar como hoje.
- **FR-009**: A troca de voz continua valendo para todos na hora, mantendo hora, lugar, resposta, reações e sussurro.

### Key Entities

- **Resposta**: uma mensagem que cita outra; quando a citada é sussurrada, herda um público restrito.
- **Voz da mensagem**: o mestre ou um personagem; o mestre que joga troca a voz das próprias mensagens.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A citação no cartão dourado tem contraste ≥ 4,5:1 (legível pela regra de acessibilidade comum).
- **SC-002**: Em 100% das respostas a mensagens privadas feitas pelo fluxo padrão, a resposta chega só a quem mandou
  a mensagem (e ao mestre).
- **SC-003**: O mestre troca uma mensagem da voz do mestre para um personagem em no máximo 2 toques.

## Assumptions

- O mestre continua vendo todos os sussurros (regra de 047).
- O destinatário automático é o personagem que falou (a voz da mensagem), não todos os personagens do jogador.
- A troca de voz para personagem segue as regras do servidor de 079 (só personagem aprovado do próprio mestre; um
  sussurro endereçado àquele personagem é recusado).
