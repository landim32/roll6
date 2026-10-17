# Feature Specification: Personagens fora do mapa agem pelo chat

**Feature Branch**: `080-offmap-chat-actions`
**Created**: 2026-10-16
**Status**: Draft
**Input**: User description: "Verifiquei q quando os personagens não estão no mapa, não conseguem clicar no raio e efetuar ações. Está errado, personagens fora do mapa que estão na campanha podem efetuar ações pelo chat sempre que possível"

## Contexto

No chat da campanha (041), quem fala com um personagem tem o seletor **Conversa / Ação** (o "raio"). Com ele ligado, o
texto enviado vira a **ação do turno** daquele personagem. A ação:

- conta para o turno;
- aparece para o mestre;
- cancela a ação anterior do mesmo turno (044/073);
- entra no resumo e nos dados do turno;
- tira o personagem da lista de quem falta jogar.

Hoje a ação está presa à **peça do personagem no mapa aberto**. Se o personagem não tem peça nesse mapa, o raio fica
desabilitado com o aviso "Coloque o personagem no mapa aberto para agir". O mesmo vale para transformar uma mensagem do
personagem em ação pelo menu de segurar.

Isso está errado. O personagem participa da campanha mesmo sem peça no mapa: ainda não entrou na cena, está em outro
lugar, ou a mesa joga só pelo chat. Ele deve poder agir pelo chat **sempre que a campanha permitir ações**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agir pelo chat sem estar no mapa (Priority: P1)

A jogadora Ana tem a personagem Aria aprovada na campanha, mas Aria não tem peça no mapa aberto (ou não há mapa aberto).
Ana liga o raio no chat, escreve "Aria vasculha a biblioteca" e envia. A mensagem vira a ação de Aria no turno, como se
ela estivesse no mapa.

**Why this priority**: é o defeito relatado; sem isso, personagens fora do mapa ficam de fora do turno.

**Independent Test**: com uma personagem aprovada sem peça no mapa atual, ligar o raio e enviar um texto. Depois,
conferir três coisas:

- o texto aparece como ação do turno;
- o mestre é avisado;
- a personagem sai da lista de quem falta jogar.

**Acceptance Scenarios**:

1. **Given** Aria aprovada, campanha ativa e Aria sem peça no mapa aberto, **When** Ana abre o chat com Aria
   selecionada, **Then** o raio está habilitado, sem o aviso de colocar no mapa.
2. **Given** o raio ligado, **When** Ana envia "Aria vasculha a biblioteca", **Then** o texto é registrado como a ação de
   Aria no turno em andamento, com tudo o que uma ação faz hoje:
   - aparece no chat como ação;
   - conta para o turno;
   - conta para a lista de quem falta jogar;
   - o mestre recebe o aviso de ação.
3. **Given** Aria já agiu neste turno sem estar no mapa, **When** Ana envia outra ação, **Then** a anterior fica como
   "Ação cancelada" e só a nova vale (uma ação por personagem e turno, como hoje).
4. **Given** nenhum mapa aberto na tela, ou a campanha sem mapa atual, **When** Ana envia uma ação com Aria, **Then** a
   ação é registrada normalmente.
5. **Given** Aria tem peça no mapa atual, **When** Ana age pelo chat, **Then** tudo funciona como hoje, inclusive o balão
   sobre a peça.

---

### User Story 2 - Transformar mensagem em ação sem estar no mapa (Priority: P2)

Ana escreveu uma mensagem com Aria, que está sem peça no mapa, e quer que ela vire a ação do turno. Pelo menu de segurar,
ela escolhe "Ação" e a mensagem vira a ação de Aria, como já acontece com personagens no mapa.

**Why this priority**: completa o mesmo fluxo pelo outro caminho que o chat já oferece.

**Independent Test**: enviar uma mensagem com uma personagem sem peça no mapa atual e transformá-la em ação pelo menu de
segurar.

**Acceptance Scenarios**:

1. **Given** uma mensagem de texto de Aria no turno em andamento e Aria sem peça no mapa atual, **When** Ana segura a
   mensagem, **Then** o menu oferece transformar em ação.
2. **Given** essa opção, **When** Ana escolhe, **Then** a mensagem vira a ação de Aria no turno, com as mesmas regras de
   hoje: cancela a ação anterior e avisa o mestre.
3. **Given** a ação de Aria, **When** Ana a transforma de volta em mensagem, **Then** funciona como hoje.

---

### User Story 3 - Desfazer a ação de quem está fora do mapa (Priority: P3)

Ana se arrependeu da ação de Aria, que está fora do mapa. Ela consegue cancelá-la pelo chat, como já faz com qualquer
ação: apagar a ação no menu de segurar a deixa como "Ação cancelada".

**Why this priority**: o cancelamento pelo chat já existe e não depende do mapa; esta história só garante que continua
valendo para quem está fora do mapa.

**Independent Test**: cancelar pelo chat a ação de uma personagem sem peça no mapa.

**Acceptance Scenarios**:

1. **Given** a ação de Aria (fora do mapa) no turno, **When** Ana a apaga no chat, **Then** ela fica como "Ação
   cancelada" e Aria volta para a lista de quem falta jogar.

---

### User Story 4 - Assistentes de IA (Priority: P3)

Um assistente de IA ligado à mesa registra a ação de um personagem que não tem peça no mapa, indicando o personagem em
vez da peça.

**Why this priority**: a API e o MCP devem oferecer o que o site oferece.

**Independent Test**: registrar pela ferramenta de agir a ação de um personagem sem peça e vê-la no chat e nos dados do
turno.

**Acceptance Scenarios**:

1. **Given** um personagem aprovado sem peça, **When** o assistente registra a ação indicando o personagem, **Then** a
   ação vale como no site.

### Edge Cases

- **Campanha não ativa** (preparando, pausada ou finalizada): a ação continua recusada, com ou sem peça, como hoje.
- **Personagem não aprovado ou de outra pessoa**: recusado como hoje. O mestre continua podendo agir com personagens da
  campanha como hoje.
- **Personagem com peça em outro mapa** que não o atual: a ação vale pelo personagem, sem depender de qual mapa está
  aberto.
- **Mestre falando como mestre** (sem personagem): não há raio, como hoje. O mestre narra ou age pelos NPCs.
- **NPCs**: continuam agindo pelas suas instâncias no mapa, como hoje. Um NPC fora do mapa não existe como instância.
- **Sussurros e respostas**: uma ação de quem está fora do mapa pode ser sussurrada e pode responder a uma mensagem,
  como as demais.
- **Balões no 2D/3D**: sem peça no mapa não há onde desenhar o balão, então a ação aparece só no chat. Se a peça for
  colocada depois, no mesmo turno, o balão da ação aparece sobre ela.
- **Resumo e dados do turno**: a ação aparece nos dois. A posição do personagem fica ausente quando ele não tem peça,
  como hoje.
- **Resetar turno**: o item do menu da peça continua existindo para quem tem peça; quem não tem desfaz a ação pelo chat.
- **Modo livre**: valem as mesmas regras de ação, com uma ação válida por personagem e turno.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Um personagem aprovado na campanha DEVE poder registrar a ação do turno pelo chat **sem ter peça** — nem
  no mapa aberto, nem no mapa atual, nem em mapa nenhum —, sempre que a campanha estiver ativa.
- **FR-002**: O seletor Conversa/Ação do chat DEVE ficar habilitado para quem fala com um personagem aprovado, em
  qualquer mapa. O aviso "Coloque o personagem no mapa aberto para agir" DEVE deixar de existir.
- **FR-003**: A ação de quem está fora do mapa DEVE seguir todas as regras da ação de hoje:
  - uma ação válida por personagem e turno (a anterior fica "Ação cancelada");
  - aviso ao mestre;
  - lista de quem falta jogar e lembrete "Falta…";
  - resumo e dados do turno;
  - sussurro e resposta.
- **FR-004**: Transformar uma mensagem de um personagem em ação, e de volta, pelo menu de segurar DEVE funcionar também
  quando o personagem não tem peça no mapa atual. As demais condições de hoje continuam valendo: mensagem de texto do
  turno em andamento, dono do personagem ou mestre, e campanha ativa.
- **FR-005**: Quem tem peça no mapa DEVE continuar agindo exatamente como hoje, inclusive pelo "Agir" do menu da peça e
  com o balão sobre a peça.
- **FR-006**: As permissões NÃO mudam. Só o dono atual do personagem aprovado ou o mestre da campanha registram a ação do
  personagem, e campanhas fora do status ativo continuam recusando.
- **FR-007**: A API e as ferramentas de IA DEVEM permitir registrar a ação de um personagem indicando o personagem, sem
  peça, além da forma atual pela peça.
- **FR-008**: As ações registradas antes desta mudança e o comportamento dos NPCs NÃO mudam.

### Key Entities

- **Ação do turno**: entrada do chat que conta como a jogada de um personagem no turno. Passa a pertencer ao personagem;
  a peça e o mapa ficam ligados a ela só quando existirem.
- **Personagem na campanha**: a participação aprovada que dá o direito de agir, com ou sem peça.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos personagens aprovados conseguem registrar uma ação pelo chat numa campanha ativa, com ou sem peça
  no mapa.
- **SC-002**: Registrar a ação de um personagem fora do mapa leva os mesmos passos de quem está no mapa: ligar o raio,
  escrever e enviar.
- **SC-003**: Nenhuma regra do turno muda para quem está no mapa: as ações e os balões dos personagens no mapa continuam
  idênticos.
- **SC-004**: A ação de um personagem fora do mapa aparece para o mestre e no resumo do turno em todas as verificações.

## Assumptions

- "Sempre que possível" = as mesmas condições de hoje, menos a exigência da peça:
  - campanha **ativa** (049);
  - personagem **aprovado** do usuário, ou o mestre agindo por um personagem da campanha.
- A ação de quem está fora do mapa fica registrada no mapa atual da campanha quando houver um, ou sem mapa. Isso não
  muda o que o jogador vê.
- O "Resetar turno" do menu da peça não ganha um equivalente novo: quem está fora do mapa desfaz a ação pelo chat, com o
  apagar que já existe e que cancela a ação.
- NPCs ficam como estão: agem só pelas instâncias no mapa.
