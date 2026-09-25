# Feature Specification: Personagens nas Campanhas (Convites e Pedidos de Acesso)

**Feature Branch**: `005-campaign-characters`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "Na entidade Campaign, crie um campo open (bool). Se a campanha for aberta, qualquer personagem pode entrar. Se for fechado, precisa de aprovação do mestre. O mestre tb pode convidar characteres, esse character entra com invited, assim q ele aceitar. Crie uma entidade CampaignCharacter (Campaign, Character, Status: Invited, RequestedAccess, Approved, Denied) com: listar por campanha, listar convites, convidar, declinar convite, requerer acesso, declinar acesso. Na lista de campanhas, exiba o nome do proprietário."

## Clarifications

### Session 2026-09-25

- Q: Quais campanhas aparecem na listagem? → A: Todas as campanhas de todos os usuários, abertas e
  fechadas (substitui a regra da feature 001 de listar só as do usuário).
- Q: O que a aprovação dá ao jogador? → A: Leitura: o dono de um personagem aprovado vê a campanha,
  os mapas dela e os tokens dos mapas; alterar continua sendo só do mestre.

## User Scenarios & Testing *(mandatory)*

Termos: **mestre** = dono da campanha; **jogador** = dono de um personagem.

### User Story 1 - Entrar em campanha aberta (Priority: P1)

O mestre marca a campanha como aberta. Um jogador pede para um dos seus personagens entrar e o
personagem já fica aprovado, sem esperar o mestre.

**Why this priority**: é o caminho mais simples para montar a mesa e o que mais será usado.

**Independent Test**: mestre cria campanha aberta; jogador pede acesso com um personagem;
listagem da campanha mostra o personagem como aprovado.

**Acceptance Scenarios**:

1. **Given** uma campanha aberta, **When** o jogador pede acesso com o seu personagem, **Then** o
   personagem fica com status Approved.
2. **Given** um personagem já aprovado na campanha, **When** o jogador pede acesso de novo,
   **Then** o pedido é recusado informando que o personagem já participa.
3. **Given** um personagem de outro usuário, **When** o jogador tenta pedir acesso com ele,
   **Then** o pedido é recusado.
4. **Given** uma campanha criada sem informar se é aberta, **When** ela é salva, **Then** ela é
   fechada.

---

### User Story 2 - Pedir acesso a campanha fechada e ser avaliado (Priority: P1)

Numa campanha fechada, o pedido do jogador fica pendente (RequestedAccess). O mestre aprova
(Approved) ou recusa (Denied).

**Why this priority**: protege mesas privadas; sem isso qualquer um entraria em qualquer campanha.

**Independent Test**: jogador pede acesso a campanha fechada → pendente; mestre aprova → aprovado;
outro pedido recusado → recusado.

**Acceptance Scenarios**:

1. **Given** uma campanha fechada, **When** o jogador pede acesso, **Then** o status fica
   RequestedAccess.
2. **Given** um pedido pendente, **When** o mestre aprova, **Then** o status passa a Approved.
3. **Given** um pedido pendente, **When** o mestre recusa, **Then** o status passa a Denied.
4. **Given** um pedido pendente, **When** alguém que não é o mestre tenta aprovar ou recusar,
   **Then** a operação é recusada.
5. **Given** um personagem com pedido recusado, **When** o jogador pede acesso de novo, **Then**
   o pedido é recusado (só um novo convite do mestre reabre).

---

### User Story 3 - Convidar personagens (Priority: P2)

O mestre convida um personagem (status Invited). O jogador vê seus convites, aceita (Approved) ou
recusa (Denied).

**Why this priority**: o mestre monta a mesa com quem já conhece, inclusive em campanhas fechadas.

**Independent Test**: mestre convida um personagem; jogador lista seus convites, aceita um e
recusa outro.

**Acceptance Scenarios**:

1. **Given** um personagem que não está na campanha, **When** o mestre o convida, **Then** o
   status fica Invited e o convite aparece na lista de convites do dono do personagem.
2. **Given** um convite, **When** o jogador aceita, **Then** o status passa a Approved.
3. **Given** um convite, **When** o jogador recusa, **Then** o status passa a Denied.
4. **Given** um personagem recusado anteriormente, **When** o mestre o convida de novo, **Then**
   o status volta a Invited.
5. **Given** um personagem com pedido de acesso pendente, **When** o mestre o convida, **Then** o
   personagem fica aprovado (o convite confirma o pedido).
6. **Given** um convite, **When** alguém que não é dono do personagem tenta aceitar ou recusar,
   **Then** a operação é recusada.

---

### User Story 4 - Ver os personagens de uma campanha (Priority: P2)

O mestre lista todos os personagens da campanha com o status de cada um. Jogadores com personagem
aprovado veem os personagens aprovados.

**Why this priority**: o mestre precisa saber quem está na mesa e o que está pendente.

**Independent Test**: com personagens em vários status, o mestre vê todos; um jogador aprovado vê
só os aprovados; um usuário sem personagem na campanha não vê nada.

**Acceptance Scenarios**:

1. **Given** uma campanha com personagens em vários status, **When** o mestre lista, **Then** vê
   todos, com status, nome do personagem e nome do dono do personagem.
2. **Given** um jogador com personagem aprovado, **When** ele lista a campanha, **Then** vê só os
   personagens aprovados.
3. **Given** um usuário sem personagem aprovado na campanha, **When** ele tenta listar, **Then** a
   operação é recusada.

---

### User Story 5 - Descobrir campanhas com o nome do dono (Priority: P2)

A listagem de campanhas mostra todas as campanhas de todos os usuários, com o nome do dono e se
ela é aberta, para o jogador escolher onde pedir acesso.

**Why this priority**: sem descobrir campanhas, jogadores só entram por convite.

**Independent Test**: dois usuários com campanhas; cada um lista e vê as dos dois, com nome do dono
e aberta/fechada.

**Acceptance Scenarios**:

1. **Given** campanhas na listagem, **When** o usuário lista, **Then** cada item traz o nome do
   dono e se a campanha é aberta.
2. **Given** campanhas de vários usuários, abertas e fechadas, **When** qualquer usuário lista,
   **Then** vê todas, paginadas.
3. **Given** uma campanha de outro usuário, **When** o usuário a consulta pelo identificador,
   **Then** vê nome, dono e se é aberta (sem os mapas, a menos que tenha personagem aprovado).

---

### User Story 6 - Acompanhar a campanha como jogador (Priority: P2)

O dono de um personagem aprovado vê a campanha, os mapas dela e os tokens de cada mapa, sem poder
alterar nada.

**Why this priority**: é o motivo de entrar na campanha — acompanhar o jogo.

**Independent Test**: jogador com personagem aprovado lista os mapas da campanha e os tokens de um
mapa; tenta alterar um token e é recusado; um jogador com pedido pendente não vê os mapas.

**Acceptance Scenarios**:

1. **Given** um personagem aprovado, **When** o dono dele lista os mapas da campanha, **Then** vê
   os mapas não excluídos, como o mestre.
2. **Given** um personagem aprovado, **When** o dono dele consulta um mapa ou lista os tokens do
   mapa, **Then** recebe os dados.
3. **Given** um personagem aprovado, **When** o dono dele tenta criar, alterar ou excluir mapa ou
   token de mapa, **Then** a operação é recusada.
4. **Given** um personagem com status Invited, RequestedAccess ou Denied, **When** o dono tenta
   ver os mapas, **Then** a operação é recusada.

---

### Edge Cases

- O mesmo personagem aparece no máximo uma vez por campanha; um novo convite ou pedido atualiza o
  registro existente conforme as regras acima.
- Mudar a campanha de fechada para aberta não aprova pedidos pendentes automaticamente; o mestre
  continua decidindo os que já existem.
- Excluir um personagem remove a participação dele nas campanhas.
- Excluir uma campanha remove as participações dela (as outras regras de exclusão continuam).
- Um personagem pode participar de várias campanhas ao mesmo tempo.
- O mestre pode convidar os próprios personagens.

## Requirements *(mandatory)*

### Functional Requirements

**Campanha**

- **FR-001**: A campanha MUST ter o indicador aberta/fechada, informado na criação e alterável
  pelo mestre; sem valor informado, MUST ser fechada.
- **FR-002**: A listagem e a leitura de campanha MUST trazer o nome do dono e o indicador
  aberta/fechada.
- **FR-003**: A listagem de campanhas MUST mostrar todas as campanhas de todos os usuários,
  abertas e fechadas, paginadas; a consulta de uma campanha pelo identificador MUST ser permitida
  a qualquer usuário autenticado. Alterar e excluir continuam só do mestre.

**Participação (CampaignCharacter)**

- **FR-004**: Cada participação MUST ligar uma campanha a um personagem, com status Invited,
  RequestedAccess, Approved ou Denied; cada personagem aparece no máximo uma vez por campanha.
- **FR-005**: O mestre MUST poder convidar qualquer personagem que não esteja aprovado nem já
  convidado; o convite cria (ou reabre, se Denied) a participação com status Invited; se houver
  pedido pendente, o convite a aprova.
- **FR-006**: O dono do personagem MUST poder aceitar (→ Approved) ou recusar (→ Denied) um convite.
- **FR-007**: O dono do personagem MUST poder pedir acesso: campanha aberta → Approved; campanha
  fechada → RequestedAccess. Personagem já aprovado, convidado, com pedido pendente ou recusado
  MUST ter o pedido recusado com mensagem explicando o motivo (convidado deve aceitar o convite).
- **FR-008**: O mestre MUST poder aprovar (→ Approved) ou recusar (→ Denied) um pedido pendente.
- **FR-009**: O dono do personagem MUST poder listar os convites pendentes (Invited) dos seus
  personagens, com o nome da campanha e do mestre.
- **FR-010**: A listagem por campanha MUST mostrar ao mestre todas as participações; a jogadores
  com personagem aprovado na campanha, só as aprovadas; aos demais, MUST recusar.
- **FR-011**: Cada participação listada MUST trazer o personagem (nome e imagem), o nome do dono do
  personagem e o status.
- **FR-012**: O dono de um personagem aprovado na campanha MUST poder listar os mapas da
  campanha, consultar cada mapa e listar os tokens dos mapas, com os mesmos dados que o mestre vê.
- **FR-014**: Criar, alterar e excluir mapas e tokens de mapa MUST continuar permitido apenas ao
  mestre; participantes com status diferente de Approved MUST NOT ver mapas nem tokens.
- **FR-013**: Excluir personagem ou campanha MUST remover as participações ligadas a eles.

### Key Entities *(include if feature involves data)*

- **Campaign** (alterada): ganha o indicador aberta/fechada; exibe o nome do dono.
- **CampaignCharacter** (nova): participação de um personagem numa campanha — campanha,
  personagem, status (Invited, RequestedAccess, Approved, Denied), datas de criação e alteração.

### Status da participação

```text
(nenhum) --convite do mestre--------------------> Invited
(nenhum) --pedido, campanha aberta--------------> Approved
(nenhum) --pedido, campanha fechada-------------> RequestedAccess
Invited --jogador aceita------------------------> Approved
Invited --jogador recusa------------------------> Denied
RequestedAccess --mestre aprova ou convida------> Approved
RequestedAccess --mestre recusa-----------------> Denied
Denied --novo convite do mestre-----------------> Invited
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador coloca um personagem numa campanha aberta em uma única ação.
- **SC-002**: 100% dos pedidos a campanhas fechadas ficam pendentes até decisão do mestre.
- **SC-003**: 100% das tentativas de aprovar, recusar ou convidar por quem não é o mestre, e de
  aceitar ou recusar convite por quem não é dono do personagem, são recusadas.
- **SC-004**: Cada campanha listada mostra o nome do dono, sem consulta adicional, e a listagem
  inclui campanhas de todos os usuários.
- **SC-006**: 100% das tentativas de alterar mapas ou tokens por participantes (não mestres) são
  recusadas, e 100% das leituras de mapas por participantes aprovados são atendidas.
- **SC-005**: Nenhum personagem aparece duas vezes na mesma campanha.

## Assumptions

- As funções "aceitar convite" e "aprovar pedido" não estavam na lista pedida, mas são necessárias
  para os fluxos descritos ("assim que ele aceitar", "precisa de aprovação do mestre").
- "Declinar acesso" é a recusa, pelo mestre, de um pedido pendente.
- Remover um personagem já aprovado da campanha (ou o jogador sair dela) fica fora do escopo.
- Recusa (Denied) é final para pedidos do jogador; só um novo convite do mestre reabre.
- Escopo: backend, documentação e coleção de requisições de exemplo.
- A listagem de campanhas passa a ser pública entre usuários autenticados (substitui FR-034 da
  feature 001 para campanhas); os nomes das campanhas deixam de ser privados.
