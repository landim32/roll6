# Feature Specification: A voz do mestre no chat

**Feature Branch**: `079-chat-master-voice`
**Created**: 2026-10-16
**Status**: Draft
**Input**: User description: "Melhoria no chat: A mensagem do mestre aparece em amarelo e negrito, dando mais destaque. Se o GM tb é um jogador, no mesmo menu dos emojis, ele tem a opção de mudar a mensagem para o GM ou o jogador, pode alterar. Da mesma forma q funciona com mensagem e ação hoje"

## Contexto

No chat da campanha (041), o mestre fala de duas formas:

- **como mestre**, sem personagem ("Mestre (GM) — Rodrigo");
- **como um personagem dele**, quando o mestre também tem personagem aprovado na mesa.

Hoje as duas falas têm a mesma aparência das mensagens dos jogadores. Se o mestre escreve com a voz errada (selecionou o
personagem e queria falar como mestre, ou o contrário), não há como corrigir: só apagando e escrevendo de novo.

Esta funcionalidade:

- dá destaque à fala **do mestre**: o texto aparece em **amarelo e negrito**;
- deixa o mestre que também joga **trocar a voz** de uma mensagem já enviada — de mestre para o personagem dele, ou do
  personagem para mestre — pelo menu de segurar a mensagem (o mesmo dos emojis), como hoje já se troca uma mensagem em
  ação e uma ação em mensagem.

## Clarifications

### Session 2026-10-16

- Q: O que fica amarelo e negrito? → **O cartão (balão) da mensagem é amarelo, e o texto vai em negrito** — a ideia é
  destacar, com sugestões aceitas. Decisão: um **cartão amarelo-ouro sólido** com o **texto escuro em negrito**, para
  contrastar bem no tema escuro e não se confundir com o **sussurro** (047), que já usa um amarelo **claro e
  translúcido** com borda e o rodapé "Visível apenas para". Um sussurro do mestre fica com o cartão amarelo do mestre
  **mais** a borda e o rodapé do sussurro.
- Q: Quais mensagens podem trocar de voz? → B: **texto, foto, áudio e rolagem de dados** (a enquete não).
- Q: E quando o mestre tem mais de um personagem na campanha? → B: **só o personagem selecionado no momento** (o do
  "Personagem atual"); o menu sempre tem no máximo uma troca.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A fala do mestre em destaque (Priority: P1)

Toda mensagem que o mestre envia **como mestre** aparece no chat num cartão amarelo-ouro com o texto escuro em negrito,
para todos. Quando o
mestre fala como um personagem dele, a mensagem tem a aparência normal de um jogador.

**Why this priority**: os jogadores precisam distinguir de relance a voz do mestre (descrições, avisos, regras) das falas
dos personagens.

**Independent Test**: o mestre envia "A ponte range sob os pés de vocês." como mestre e "Eu vou na frente." como o
personagem dele. No chat de qualquer participante, a primeira aparece no cartão amarelo em negrito e a segunda normal.

**Acceptance Scenarios**:

1. **Given** o mestre escreve como mestre, **Then** a mensagem aparece no cartão amarelo, com o texto em negrito, para todos
   os participantes.
2. **Given** o mestre escreve como um personagem dele, **Then** a mensagem aparece como a de um jogador.
3. **Given** uma mensagem do mestre que é resposta a outra, legenda de foto, áudio ou rolagem, **Then** o cartão dela é o
   amarelo do mestre. Num sussurro do mestre, o cartão amarelo ganha também a borda e o rodapé do sussurro.
4. **Given** as mensagens antigas do mestre, **Then** também aparecem em destaque (vale para todo o histórico).
5. **Given** a narração do mestre, **Then** ela continua com o cartão de narração de hoje (não muda).

---

### User Story 2 - O mestre que joga troca a voz da mensagem (Priority: P1)

O mestre que também tem personagem aprovado na campanha segura uma mensagem que ele mesmo enviou (texto, foto, áudio ou
rolagem de dados — Q2) e escolhe:

- "Falar como mestre", se a mensagem foi enviada como o personagem;
- "Falar como {personagem}", se foi enviada como mestre — o personagem é o selecionado em "Personagem atual" (Q3); com
  "Mestre (GM)" selecionado ou nenhum personagem dele aprovado, essa opção não aparece.

A mensagem passa a ser daquela voz para todos, na hora, mantendo o texto, o horário, as reações e as respostas.

**Why this priority**: corrige o engano mais comum do mestre que joga sem apagar e reescrever.

**Independent Test**: com o personagem Goran aprovado, o mestre envia "Silêncio!" como mestre (amarelo). Ele segura a
mensagem e escolhe "Falar como Goran": a mensagem passa a mostrar Goran, sem destaque, para todos. Ele volta para "Falar
como mestre": volta ao destaque.

**Acceptance Scenarios**:

1. **Given** o mestre com o personagem Goran selecionado e uma mensagem que ele enviou como mestre, **When** abre o menu,
   **Then** vê "Falar como Goran".
2. **Given** a mensagem foi enviada como o personagem dele, **When** abre o menu, **Then** vê "Falar como mestre".
3. **Given** a troca, **Then** a mensagem mostra o novo nome e a nova foto, e o destaque acompanha a voz: amarelo e negrito
   como mestre, normal como personagem. O texto, o horário, as reações e as respostas continuam.
4. **Given** um jogador (que não é o mestre), **Then** o menu dele nunca oferece trocar de voz.
5. **Given** o mestre sem personagem aprovado na campanha, **Then** o menu não oferece a troca.
6. **Given** uma mensagem de outra pessoa, **Then** o mestre não troca a voz dela.
7. **Given** uma mensagem apagada, uma enquete, uma ação ou uma narração, **Then** não há troca de voz (a ação continua
   com "Ação/Mensagem" como hoje).
8. **Given** uma mensagem enviada como o personagem Goran, com outro personagem dele (Lia) selecionado, **Then** o menu
   oferece "Falar como mestre" (a volta para Goran só aparece quando Goran estiver selecionado).

---

### User Story 3 - Assistentes de IA (Priority: P3)

O mestre também pode trocar a voz de uma mensagem dele pelo assistente de IA ligado à mesa, com as mesmas regras, e a
leitura do chat diz qual é a voz de cada mensagem.

**Why this priority**: toda ação da mesa tem o seu equivalente para os assistentes; não é o uso principal.

**Independent Test**: pelo assistente, o mestre troca a voz de uma mensagem dele; a mesa mostra a troca. Um jogador que
tenta é recusado.

**Acceptance Scenarios**:

1. **Given** o mestre e uma mensagem dele, **When** pede ao assistente para trocar a voz, **Then** ela muda como pela tela.
2. **Given** um jogador, **When** tenta trocar a voz de uma mensagem, **Then** é recusado.

---

### Edge Cases

- **Personagem que deixou de estar aprovado**: a mensagem enviada como ele continua com o nome dele, e o mestre ainda pode
  trocá-la para mestre, mas não de volta para aquele personagem.
- **Mensagem sussurrada** pelo mestre como personagem: a troca para mestre mantém os mesmos destinatários (só que
  agora o mestre não precisa estar entre eles, porque o mestre sempre vê).
- **Campanha pausada, em preparação ou finalizada**: a troca funciona como o resto da conversa (o chat de conversa nunca é
  bloqueado pelo status).
- **Balões do 3D** (068/073): a fala de um personagem que vira fala do mestre deixa de ser balão daquele personagem, e a
  fala do mestre que vira de um personagem passa a ser balão dele, pela regra de hoje.
- **Mestre que mudou de nome**: a troca mostra o nome atual dele, como uma mensagem nova mostraria.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Mensagens enviadas pelo mestre como mestre MUST aparecer em destaque — cartão amarelo-ouro e texto escuro em
  negrito — para todos os participantes, em todo o histórico, sem se confundir com o sussurro (Q1).
- **FR-002**: Mensagens enviadas como um personagem (do mestre ou de jogador) MUST manter a aparência de hoje.
- **FR-003**: O menu de segurar uma mensagem MUST oferecer ao mestre que tem personagem aprovado na campanha a troca de voz
  das mensagens que ele mesmo enviou — texto, foto, áudio e rolagem (Q2) —: do personagem para mestre, e de mestre para o
  personagem selecionado em "Personagem atual" (Q3).
- **FR-004**: A troca MUST manter o texto, o horário, a posição no chat, as reações e as respostas, e MUST atualizar o nome,
  a foto e o destaque da mensagem para todos, na hora.
- **FR-005**: A troca MUST ser recusada para quem não é o mestre, para mensagens de outra pessoa, para mensagens apagadas,
  enquetes, ações e narrações, e para um personagem que não é do mestre ou não está aprovado na campanha.
- **FR-006**: A narração e as ações MUST continuar como hoje.
- **FR-007**: Os assistentes de IA MUST poder trocar a voz de uma mensagem do mestre (só o mestre) e MUST ver, na leitura do
  chat, se uma mensagem é do mestre ou de um personagem.

### Key Entities

- **Mensagem do chat**: tem um autor (usuário) e uma **voz** — o mestre ou um personagem —, que define o nome, a foto e o
  destaque mostrados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Num chat com falas do mestre e dos jogadores misturadas, um participante identifica a fala do mestre de
  relance, sem ler o nome, em 100% das mensagens.
- **SC-002**: O mestre corrige a voz de uma mensagem em no máximo 2 toques (abrir o menu e escolher).
- **SC-003**: Em até 3 segundos depois da troca, todos os participantes veem a mensagem com a nova voz.
- **SC-004**: Nenhum jogador consegue trocar a voz de mensagem nenhuma.

## Assumptions

- "Mensagem do mestre" é a enviada pelo mestre sem personagem ("Mestre (GM) — nome"); o destaque não depende de quem é o
  dono da campanha, e sim da voz da mensagem.
- O amarelo do mestre é um amarelo-ouro **sólido** com texto escuro (contraste legível no tema escuro), diferente do
  amarelo claro e translúcido do sussurro (047).
- A troca de voz não gera linha nova no chat nem notificação.
- A troca vale em qualquer turno (não só no turno atual), já que a voz não afeta regras do turno.
