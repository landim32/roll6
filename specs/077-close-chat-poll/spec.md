# Feature Specification: Encerrar uma enquete

**Feature Branch**: `077-close-chat-poll`
**Created**: 2026-10-16
**Status**: Draft
**Input**: User description: "Crie uma funcionalidade na enquete onde o GM pode encerrar a votação, no mesmo menu onde excluir, coloca emoji, etc. O GM encerra a enquete, ela para de ficar fixa embaixo e funciona como uma mensagem normal, onde só exibe o resultado"

## Contexto

As enquetes do chat (045, 050) ficam **fixas embaixo** enquanto algum personagem aprovado ainda não votou, e todos podem
votar ou trocar o voto a qualquer momento. Quando um jogador nunca vota (saiu, esqueceu, não quer), a enquete fica presa
embaixo do chat para sempre, e não há como dizer "a votação acabou".

Esta funcionalidade dá ao **mestre** a ação **"Encerrar enquete"** no menu da mensagem — o mesmo menu de segurar/clicar
com o botão direito que tem curtir, amei, gargalhada, responder, copiar e apagar. A enquete encerrada:

- deixa de ficar fixa e volta para o seu lugar no fluxo do chat, como uma mensagem comum;
- não aceita mais votos nem trocas;
- mostra só o resultado: cada opção com o número de votos e a barra, e quem votou em quê.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O mestre encerra a votação (Priority: P1)

O mestre segura (ou clica com o botão direito) a enquete fixa embaixo do chat e escolhe **"Encerrar enquete"**. A
enquete sai de baixo e aparece no lugar dela no chat, encerrada, para todos, na hora.

**Why this priority**: é o pedido. Sem isso uma enquete com um voto faltando fica presa embaixo do chat.

**Independent Test**: com 3 personagens aprovados e 2 votos, a enquete está fixa. O mestre encerra: ela sai de baixo e
aparece no fluxo, na tela do mestre e na dos jogadores, sem recarregar.

**Acceptance Scenarios**:

1. **Given** uma enquete aberta, **When** o mestre abre o menu dela, **Then** vê "Encerrar enquete" junto das outras
   ações.
2. **Given** o mestre escolhe "Encerrar enquete", **Then** a enquete deixa de ficar fixa e passa a aparecer no fluxo do
   chat, para todos os participantes, na hora.
3. **Given** um jogador (que não é o mestre), **Then** o menu dele não tem "Encerrar enquete", nem nas enquetes que ele
   mesmo criou.
4. **Given** uma enquete já encerrada, **Then** o menu não oferece "Encerrar enquete" de novo.

---

### User Story 2 - A enquete encerrada mostra só o resultado (Priority: P1)

Encerrada, a enquete vira uma mensagem de resultado: a pergunta, as opções com a contagem e a barra, a opção mais votada
em destaque e a indicação "Enquete encerrada". Ninguém vota mais.

**Why this priority**: é o que faz a enquete "funcionar como uma mensagem normal".

**Independent Test**: depois de encerrada, tocar numa opção não faz nada; "Ver votos" continua mostrando quem votou em
quê; a contagem é a mesma do momento do encerramento.

**Acceptance Scenarios**:

1. **Given** uma enquete encerrada, **When** alguém toca numa opção, **Then** nada muda: não há voto, troca nem retirada.
2. **Given** uma enquete encerrada, **Then** ela mostra "Enquete encerrada", a contagem e a barra de cada opção e quem
   votou (os avatares e "Ver votos"), sem os botões de escolha.
3. **Given** uma enquete encerrada com uma opção mais votada, **Then** essa opção aparece em destaque; com empate,
   todas as empatadas ficam em destaque.
4. **Given** um voto enviado ao mesmo tempo que o encerramento, **Then** ou ele entra antes e conta, ou é recusado com o
   aviso "A enquete foi encerrada." — nunca muda o resultado depois de encerrada.
5. **Given** uma enquete encerrada, **Then** ela continua aceitando reações, resposta, cópia e, para o autor ou o mestre,
   ser apagada, como qualquer mensagem.

---

### User Story 3 - Assistentes de IA também encerram (Priority: P3)

O mestre pode encerrar uma enquete pelo assistente de IA ligado à mesa, com as mesmas regras.

**Why this priority**: toda ação da mesa tem o seu equivalente para os assistentes; não é o uso principal.

**Independent Test**: pelo assistente, o mestre encerra uma enquete e a mesa mostra a enquete encerrada; um jogador que
tenta recebe a recusa.

**Acceptance Scenarios**:

1. **Given** o mestre, **When** pede ao assistente para encerrar uma enquete, **Then** ela fica encerrada como pela tela.
2. **Given** um jogador, **When** tenta encerrar, **Then** é recusado.
3. **Given** a leitura das mensagens do chat pelo assistente, **Then** cada enquete diz se está encerrada.

---

### Edge Cases

- **Enquete que todos já responderam** (não está mais fixa): o mestre ainda pode encerrá-la; ela para de aceitar trocas
  de voto e passa a mostrar só o resultado.
- **Enquete sem nenhum voto**: pode ser encerrada; mostra todas as opções com 0 e nenhum destaque.
- **Enquete apagada**: não pode ser encerrada (o menu não oferece; uma tentativa é recusada).
- **Enquete sussurrada**: não existe (enquetes não são sussurradas), nada muda.
- **Campanha pausada, em preparação ou finalizada**: encerrar funciona, como votar (o chat de conversa nunca é
  bloqueado pelo status).
- **Participante que entra depois do encerramento**: vê a enquete encerrada no fluxo, nunca fixa.
- **Reabrir**: não há; uma enquete encerrada fica encerrada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O menu da mensagem de uma enquete aberta MUST oferecer "Encerrar enquete" ao mestre da campanha, e só a
  ele.
- **FR-002**: Ao encerrar, a enquete MUST deixar de ficar fixa embaixo e passar a aparecer no fluxo do chat, para todos
  os participantes, sem recarregar a página.
- **FR-003**: Uma enquete encerrada MUST recusar novos votos, trocas e retiradas de voto, com o aviso "A enquete foi
  encerrada.".
- **FR-004**: Uma enquete encerrada MUST mostrar a indicação "Enquete encerrada", a contagem e a barra de cada opção, a
  opção (ou opções, em empate) mais votada em destaque e quem votou, sem os controles de voto.
- **FR-005**: O encerramento MUST ser definitivo (sem reabrir) e MUST ficar registrado com o momento em que aconteceu.
- **FR-006**: Encerrar MUST valer em qualquer status da campanha e MUST ser recusado para uma enquete apagada ou para
  quem não é o mestre.
- **FR-007**: A enquete encerrada MUST continuar aceitando reações, resposta, cópia e exclusão (autor ou mestre), como
  qualquer mensagem.
- **FR-008**: Os assistentes de IA MUST poder encerrar uma enquete (só o mestre) e MUST ver, na leitura do chat, se cada
  enquete está encerrada.

### Key Entities

- **Enquete**: pergunta, opções e votos (045). Ganha o estado **encerrada**, com o momento do encerramento. Encerrada,
  ela nunca é fixa e não muda mais de resultado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre encerra uma enquete em no máximo 2 toques (abrir o menu e escolher).
- **SC-002**: Em até 3 segundos depois do encerramento, todos os participantes veem a enquete fora de baixo, no fluxo,
  com o resultado.
- **SC-003**: Depois de encerrada, 100% das tentativas de voto são recusadas e o resultado não muda.
- **SC-004**: Nenhuma enquete encerrada volta a ficar fixa, nem depois de recarregar a página ou de um novo personagem
  entrar na campanha.

## Assumptions

- Só o **mestre** encerra, inclusive enquetes criadas por jogadores; o autor que não é o mestre não encerra (o pedido
  fala do GM).
- O encerramento não gera uma linha nova no chat nem notificação: a própria enquete muda de aparência para todos.
- A enquete encerrada fica no **lugar em que estava no fluxo** (a última vez que foi votada), sem pular para o fim.
- O texto de cópia ("Copiar") da enquete encerrada traz o resultado, como hoje.
- Reabrir uma enquete encerrada está fora do escopo.
