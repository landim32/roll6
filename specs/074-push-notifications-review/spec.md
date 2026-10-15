# Feature Specification: Revisão das notificações push

**Feature Branch**: `074-push-notifications-review`
**Created**: 2026-10-15
**Status**: Draft
**Input**: User description: "Preciso que reveja as web push notification: As vezes recebo as notificações com muito atraso ou nem recebo. Estou recebendo apenas as notificações de mensagem. Revise e, se for o caso, faça as notificações. Envie uma notificação para os PJs quando alguem clicar no cutucar. Quando todos tiverem feito suas ações, essa notificação do cutucar deve ir para o GM. O GM recebe uma notificação para cada ação feita, de qualquer personagem. Os PJ não recebem ações direto, apenas quando a maioria já tiver feito suas ações, eles começam a receber "Falta apenas Fulado e você" a cada ação feita, quando sobre só ele, ele recebe "Falta só você". Pense em uma forma de testar essas notificações"

## Contexto

As notificações (feature 043) já existem com este catálogo:

| | Aviso | Quem recebe hoje |
|---|---|---|
| N1 | Mensagem no chat | Todos menos o autor, e só quem não está com o chat na tela |
| N2 | Ação de um personagem | Só o mestre, e só se ele não está com o chat na tela |
| N3 | "Falta apenas você…" | Quem ainda não agiu, **uma única vez por turno**, no momento em que a maioria agiu; nunca no modo livre |
| N4 | "Turno N terminado" | Os jogadores |
| N5/N6 | PV e Fadiga do próprio personagem | O dono do personagem |
| N7 | "Fulano está cutucando você" | Os jogadores que ainda não agiram |

Na revisão do funcionamento atual apareceram causas prováveis para o que o usuário relata.

- **Atraso.**
  - As mensagens do chat saem com prioridade "normal". Com o celular em repouso, o sistema pode segurá-las por muito
    tempo.
  - Os avisos são entregues **um de cada vez**. Um aparelho que não responde pode levar até 15 segundos para falhar, e
    os avisos seguintes de todos os usuários esperam atrás dele. Esses aparelhos nunca são removidos, porque só "não
    existe mais" apaga o registro.
- **Perda.**
  - Uma mensagem do chat expira em 1 hora se o aparelho não a recebeu.
  - Avisos ainda na fila quando a API reinicia (por exemplo, num deploy) se perdem.
  - A presença na mesa é **por usuário, não por aparelho**. Quem deixa a mesa aberta no computador não recebe nada no
    celular: os avisos pessoais viram um aviso dentro do computador, e as mensagens e ações são simplesmente puladas.
- **"Só recebo mensagens".**
  - Os jogadores quase só têm mensagens a receber: N3 sai uma vez por turno e nunca no modo livre, e N4 só sai quando
    o mestre finaliza o turno.
  - A ação de um aliado comandado por um jogador (071) não avisa o mestre.
  - Os avisos pessoais são justamente os que viram aviso interno quando o mesmo usuário está com a mesa aberta em
    outro aparelho.

## Clarifications

### Session 2026-10-15

- Q: "Falta apenas …" vale também no modo livre? → A: **em qualquer modo**. Desde a 073 a ação é uma por turno em
  qualquer modo, então o lembrete também vale no modo livre.
- Q: Quando o usuário está com a mesa aberta num aparelho, os outros aparelhos dele recebem a notificação? → A:
  **sempre**. Toda notificação vai para **todos** os aparelhos registrados do destinatário, esteja a mesa aberta no
  desktop ou não, inclusive o próprio aparelho que mostra a mesa. A mesa aberta não substitui nem pula notificação
  nenhuma (revisto pelo usuário depois da primeira resposta "por aparelho").
- Q: E os avisos internos da mesa (o aviso flutuante que aparece no lugar da notificação quando a mesa está aberta)? →
  **Saem.** Os avisos são só por web push. O sino continua listando o histórico das notificações enviadas.
- Q: Como testar as notificações? → C: **os dois**. Cada usuário tem "Enviar teste" para o próprio aparelho, com o
  resultado e a lista dos aparelhos. O mestre tem uma simulação que envia a ele mesmo cada tipo do catálogo (N1–N7).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Notificações chegam na hora e não se perdem (Priority: P1)

Um jogador está com o celular no bolso, com a tela apagada. O mestre narra no chat. O celular vibra em segundos, e não
minutos depois. Se o celular ficou sem sinal por um tempo, a notificação chega quando o sinal volta.

**Why this priority**: é a reclamação principal. Sem entrega confiável, nenhuma das outras regras importa.

**Independent Test**: com um aparelho registrado e a tela apagada, outro participante envia uma mensagem. A notificação
aparece em até 10 segundos. Repetir com um aparelho "morto" registrado para o mesmo usuário (endereço que não
responde): o aparelho bom continua recebendo na hora.

**Acceptance Scenarios**:

1. **Given** um jogador com o celular em repouso, **When** alguém escreve no chat, **Then** a notificação aparece em
   até 10 segundos.
2. **Given** um aparelho registrado que não responde mais, **When** saem vários avisos, **Then** os avisos dos outros
   aparelhos e usuários não esperam por ele, e depois de algumas falhas seguidas ele deixa de ser usado.
3. **Given** um celular sem sinal por 3 horas, **When** o sinal volta, **Then** ele recebe a última mensagem do chat
   daquele período, e não perde o aviso.
4. **Given** um aviso enfileirado, **When** a API reinicia antes de enviá-lo, **Then** ele é enviado depois do
   reinício.

---

### User Story 2 - O mestre recebe cada ação (Priority: P1)

Toda vez que um personagem age, o mestre recebe "Aria: ataca o goblin". Isso vale para qualquer personagem da mesa e
também para um aliado comandado por um jogador.

**Why this priority**: o mestre precisa saber que pode narrar. É o aviso que mais faz a mesa andar.

**Independent Test**: com o mestre fora da mesa, dois jogadores agem. O mestre recebe duas notificações, uma por ação,
com o nome do personagem e o texto. Um jogador age com o aliado que comanda: o mestre recebe uma terceira.

**Acceptance Scenarios**:

1. **Given** um jogador age com o seu personagem, **When** a ação é gravada, **Then** o mestre recebe "{personagem}:
   {texto da ação}".
2. **Given** um jogador troca a ação (a anterior é cancelada), **When** grava a nova, **Then** o mestre recebe a nova.
3. **Given** um jogador age com um aliado que comanda, **When** a ação é gravada, **Then** o mestre recebe "{aliado}:
   {texto}".
4. **Given** o próprio mestre age com um personagem ou NPC, **Then** ele não recebe aviso da própria ação.
5. **Given** uma ação sussurrada, **Then** o mestre a recebe com o texto, como hoje.

---

### User Story 3 - "Falta apenas Fulano e você" (Priority: P1)

Os jogadores não recebem as ações dos outros. Quando a maioria dos personagens já agiu, **cada nova ação** avisa quem
ainda falta:

- "Falta apenas Bruno e você", com os nomes dos outros que ainda faltam;
- "Falta só você", quando só ele falta.

**Why this priority**: é o lembrete que faz o turno fechar sem o mestre precisar cobrar.

**Independent Test**: mesa com 4 personagens de 4 jogadores (Ana, Bruno, Caio, Duda).

| Ação de | Quem agiu | Avisos |
|---|---|---|
| Ana | 1 de 4 | nenhum |
| Bruno | 2 de 4, maioria | Caio: "Falta apenas Duda e você"; Duda: "Falta apenas Caio e você" |
| Caio | 3 de 4 | Duda: "Falta só você" |
| Duda | 4 de 4 | nenhum aos jogadores; o mestre recebe a ação |

**Acceptance Scenarios**:

1. **Given** menos da metade dos personagens agiu, **When** mais um age sem chegar à metade, **Then** nenhum jogador é
   avisado (o mestre recebe a ação).
2. **Given** a maioria já agiu, **When** um personagem que ainda não tinha agido age, **Then** cada jogador que ainda
   falta recebe a lista dos **outros** que faltam mais "você", ou "Falta só você".
3. **Given** um personagem troca a ação que já tinha, **Then** ninguém que falta recebe de novo, porque a lista não
   mudou.
4. **Given** um jogador tem dois personagens e só um agiu, **Then** ele ainda falta, e o nome dele aparece uma só vez.
5. **Given** todos agiram, **Then** nenhum jogador recebe "Falta…".
6. **Given** o reset de um personagem cancela a ação dele, **When** outro age, **Then** a lista recalculada inclui de
   novo quem resetou.

---

### User Story 4 - Cutucar avisa quem falta, ou o mestre (Priority: P2)

Quem toca em "Cutucar":

- **Ainda há jogadores sem ação**: cada um deles recebe "Fulano está cutucando você", como hoje. Nesse caso o aviso
  continua chegando quando o mesmo usuário está com a mesa aberta em outro aparelho (Q2: sempre para todos os aparelhos).
- **Todos os personagens já agiram e quem cutuca é um jogador**: o mestre recebe "Fulano está cutucando você: todos
  já agiram". Na mesa aparece "Fulano cutucou o mestre".
- **Todos já agiram e quem cutuca é o mestre**: nada é enviado, e ele vê "Todos já agiram neste turno", como hoje.

**Why this priority**: completa o ciclo do turno. Os jogadores cobram o mestre quando ele é o que falta.

**Independent Test**: com uma ação pendente, um jogador cutuca e o jogador que falta recebe o aviso. Depois que todos
agem, um jogador cutuca e o mestre recebe o aviso.

**Acceptance Scenarios**:

1. **Given** jogadores sem ação, **When** alguém cutuca, **Then** cada um deles recebe o aviso, e quem cutucou vê
   quantos foram cutucados.
2. **Given** todos agiram, **When** um jogador cutuca, **Then** o mestre recebe o aviso e o chat registra que o mestre
   foi cutucado.
3. **Given** a mesma pessoa cutucou há menos de 1 minuto, **Then** a nova cutucada é recusada, como hoje.
4. **Given** a campanha não está ativa, **Then** cutucar continua recusado, como hoje.

---

### User Story 5 - Testar as notificações (Priority: P2)

O usuário precisa saber, sem esperar a mesa jogar, se o aparelho dele recebe notificações, e o mestre precisa conferir
cada tipo de aviso.

**Why this priority**: sem um teste, "não recebi" fica sem diagnóstico (aparelho sem permissão, assinatura vencida,
celular em economia de bateria, campanha silenciada).

**Independent Test**: em "Notificações", o usuário toca em "Enviar teste" e recebe uma notificação no aparelho em
poucos segundos. Se falhar, a janela diz o motivo.

**Acceptance Scenarios**:

1. **Given** um aparelho com notificações ativas, **When** o usuário toca em "Enviar teste", **Then** ele recebe a
   notificação de teste nesse aparelho e a janela mostra "Enviada".
2. **Given** o aparelho perdeu a permissão ou o registro venceu, **When** testa, **Then** a janela diz o problema e
   oferece reativar.
3. **Given** um usuário com vários aparelhos, **Then** a janela lista cada um, com a última entrega com sucesso.
4. **Given** o mestre de uma campanha, **When** abre a simulação e escolhe um tipo (mensagem, ação, "Falta apenas…",
   "Falta só você", fim de turno, PV, Fadiga, cutucada, cutucada ao mestre), **Then** recebe nos aparelhos dele essa
   notificação com o texto real e o nome da campanha, marcada como teste, sem nada mudar na mesa nem nos outros
   participantes.
5. **Given** a simulação, **Then** ela também mostra o que a mesa enviaria agora a cada participante (quem falta agir
   e o texto de "Falta…" de cada um), para conferir as regras de quem recebe sem precisar jogar.

---

### Edge Cases

- Um usuário mestre que também tem personagem na mesa: recebe as ações dos outros como mestre, e "Falta…" como
  jogador quando o personagem dele falta.
- Personagem sem dono com acesso (participação aprovada que mudou de dono por transferência): o aviso vai para o dono
  atual.
- Campanha silenciada pelo usuário: nada sai para ele, nem por cutucada; o teste ignora o silêncio.
- Uma notificação nova do mesmo tipo e da mesma campanha substitui a anterior na bandeja do aparelho, para não
  empilhar dezenas de "Falta…".
- Mesa com um só personagem: a ação dele não gera "Falta…". O mestre recebe a ação.
- O mestre sem aparelho registrado: nada falha, e o sino da mesa continua listando os avisos.

## Requirements *(mandatory)*

### Functional Requirements

**Entrega**

- **FR-001**: Toda notificação MUST chegar ao aparelho em até 10 segundos depois do evento, com o aparelho ligado à
  internet, também com a tela apagada.
- **FR-002**: Um aparelho lento ou que não responde MUST NOT atrasar a entrega aos outros aparelhos e usuários.
- **FR-003**: Um aparelho que falha em várias entregas seguidas MUST deixar de receber, e o usuário vê isso no teste
  (US5).
- **FR-004**: Uma notificação MUST continuar valendo por pelo menos 12 horas para um aparelho sem sinal.
- **FR-005**: Os avisos aceitos e ainda não entregues MUST sobreviver a um reinício do servidor.

**Catálogo**

- **FR-006**: O mestre MUST receber uma notificação por ação gravada de qualquer personagem ou aliado comandado,
  exceto as que ele mesmo fez.
- **FR-007**: Os jogadores MUST NOT receber as ações dos outros.
- **FR-008**: Depois que pelo menos metade dos personagens aprovados agiu no turno, cada **primeira** ação de um
  personagem no turno MUST avisar cada jogador que ainda tem personagem sem ação: "Falta apenas {outros} e você", ou
  "Falta só você".
- **FR-009**: Trocar a própria ação MUST NOT repetir "Falta…".
- **FR-009a**: "Falta…" MUST valer em qualquer modo, inclusive no modo livre (Q1).
- **FR-009b**: Toda notificação MUST ir para todos os aparelhos registrados de cada destinatário, independente de a
  mesa ou o chat estarem abertos em algum aparelho. Ter a mesa na tela não pula nem troca a notificação por um aviso
  interno (Q2).
- **FR-009c**: Nenhum aviso do catálogo MUST aparecer como aviso interno (aviso flutuante) na mesa. A entrega é só por
  web push. O sino continua listando o histórico dos avisos enviados, e as respostas aos botões (por exemplo, "Cutucou 2
  jogadores") continuam aparecendo para quem tocou.
- **FR-010**: Cutucar com jogadores pendentes MUST avisar cada um deles. Cutucar por um jogador sem ninguém pendente
  MUST avisar o mestre. O intervalo de 1 minuto entre cutucadas continua.
- **FR-011**: Mensagens, fim de turno, PV e Fadiga MUST continuar como hoje, exceto pelas regras de entrega acima.

**Teste**

- **FR-012**: A janela "Notificações" MUST ter "Enviar teste" para o aparelho atual, com o resultado ("Enviada", ou o
  motivo da falha).
- **FR-013**: A janela MUST listar os aparelhos do usuário com a data da última entrega com sucesso.
- **FR-014**: O mestre MUST poder enviar a si mesmo cada tipo do catálogo como teste (marcado como teste, sem efeito na
  mesa nem em outros participantes) e ver o que cada participante receberia agora como "Falta…" (Q3).
- **FR-015**: As regras de quem recebe cada aviso MUST ser cobertas por testes automatizados com o cenário da tabela da
  US3.

### Key Entities

- **Aviso**: um tipo do catálogo, a campanha, quem causou e os destinatários com o texto de cada um. Fica guardado até
  ser entregue.
- **Aparelho registrado**: um navegador do usuário que aceitou notificações, com a última entrega com sucesso e as
  falhas seguidas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 20 envios de teste com o celular em repouso, pelo menos 19 chegam em até 10 segundos.
- **SC-002**: Num turno de 4 jogadores, o mestre recebe 4 notificações de ação, e os jogadores recebem exatamente os
  avisos da tabela da US3.
- **SC-003**: Com um aparelho morto registrado, o tempo de entrega aos outros não muda (diferença menor que 1 segundo).
- **SC-004**: Um usuário consegue saber em menos de 30 segundos, sem ajuda, se o aparelho dele recebe notificações.

## Assumptions

- "Maioria" segue a regra atual: metade arredondada para cima dos personagens aprovados (2 de 4, 2 de 3).
- Quem falta é contado por **personagem**, e a mensagem cita **pessoas** (o primeiro nome do dono), como hoje.
- Só a primeira ação de um personagem no turno conta para "Falta…". Ações de NPCs não contam na maioria (o turno
  pendente é dos personagens).
- O texto de cutucar o mestre segue o estilo atual: "Fulano está cutucando você: todos já agiram".
- O serviço de push do navegador pode atrasar sozinho (economia de bateria, iOS). O sistema pede prioridade alta e faz
  o que lhe cabe, mas não controla o aparelho.
- O sino da mesa continua guardando todos os avisos entregues, como hoje.
