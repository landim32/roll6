# Feature Specification: Status da campanha

**Feature Branch**: `049-campaign-status`
**Created**: 2026-10-11
**Status**: Draft
**Input**: User description: "crie um status da campanha, com as opções Preparando, Ativa, Pausada e Finalizada. Se o status for diferente de ativo, não permite mais mexer nos mapas, executar ações, não fica mais mostrando a imagem dos personagens no topo, não pode incluir personagens, nem aceitar novos personagens. Apenas o chat de conversa continua funcionando"

## Contexto

Hoje uma campanha está sempre "em jogo": a qualquer momento os jogadores podem mover peças, agir, entrar com novos personagens, e o mestre pode finalizar turnos. Não há como dizer à mesa que a campanha ainda está sendo preparada, que está de férias ou que acabou. O mestre precisa de um **status da campanha** que congele o jogo e deixe apenas a conversa aberta.

## Clarifications

### Session 2026-10-11

- Q: Status de uma campanha nova? → A: Preparando.
- Q: O bloqueio dos mapas vale para o mestre? → A: Em Preparando o mestre continua mexendo nos mapas (peças, NPCs, imagem); em Pausada e Finalizada o bloqueio vale para todos, inclusive o mestre. Os jogadores ficam bloqueados em todo status diferente de Ativa.
- Q: Rolagens de dados no chat fora de Ativa? → A: Continuam permitidas (são conversa).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mestre define o status da campanha (Priority: P1)

O mestre escolhe o status da campanha entre **Preparando**, **Ativa**, **Pausada** e **Finalizada**. Todos os participantes veem o status atual da campanha.

**Why this priority**: Sem o status não há o que respeitar; é a base de todas as outras histórias.

**Independent Test**: O mestre muda a campanha de "Ativa" para "Pausada"; ao reabrir a campanha (ou em outra sessão de um jogador) o status mostrado é "Pausada".

**Acceptance Scenarios**:

1. **Given** uma campanha Ativa, **When** o mestre escolhe "Pausada", **Then** a campanha passa a Pausada e todos os participantes conectados veem o novo status sem recarregar a página.
2. **Given** um jogador participante, **When** ele abre as informações da campanha, **Then** vê o status, mas não tem como alterá-lo.
3. **Given** uma campanha Finalizada, **When** o mestre escolhe "Ativa", **Then** a campanha volta a funcionar normalmente (nenhum status é definitivo).

---

### User Story 2 - Jogo congelado fora do status Ativa (Priority: P1)

Com a campanha em qualquer status diferente de Ativa, os jogadores não conseguem mexer nos mapas da campanha (mover, incluir, girar, mudar postura ou remover peças); o mestre também não, exceto em **Preparando**, quando continua montando mapas, peças e NPCs. Ninguém consegue agir no turno, resetar ou finalizar turnos. As figuras dos personagens pendentes sobre o chat deixam de aparecer.

**Why this priority**: É o objetivo central do pedido: congelar a mesa.

**Independent Test**: Com a campanha Pausada, um jogador tenta mover sua peça e enviar uma ação; nenhuma das duas é aceita e ele vê o aviso de que a campanha não está ativa. As figuras dos pendentes não aparecem sobre o chat.

**Acceptance Scenarios**:

1. **Given** uma campanha Pausada, **When** um jogador tenta mover a peça do seu personagem, **Then** a operação é recusada e uma mensagem explica que a campanha está pausada.
2. **Given** uma campanha Preparando, Pausada ou Finalizada, **When** alguém tenta registrar uma ação (pelo mapa, pelo chat em modo Ação, convertendo uma mensagem em ação ou por assistente de IA), **Then** a operação é recusada.
3. **Given** uma campanha não Ativa, **When** o mestre tenta finalizar o turno, processar o turno ou cutucar os jogadores, **Then** a operação é recusada.
4. **Given** uma campanha não Ativa, **When** qualquer participante abre o chat, **Then** as figuras dos personagens pendentes não aparecem no topo do chat.
5. **Given** uma campanha não Ativa, **When** um jogador olha o mapa, **Then** os controles que alteram o mapa (menu de peça, arrastar cartas, "Mover", "Agir") não são oferecidos, mas o mapa continua visível.
6. **Given** uma campanha Preparando, **When** o mestre posiciona um NPC, move uma peça ou troca a imagem de um mapa da campanha, **Then** a operação é aceita (mas "Agir" e "Finalizar turno" continuam indisponíveis).
7. **Given** uma campanha Pausada ou Finalizada, **When** o mestre tenta mover uma peça ou incluir um NPC no mapa, **Then** a operação é recusada.
8. **Given** uma campanha que volta a Ativa, **When** o jogador tenta mover a peça, **Then** a operação é aceita normalmente.

---

### User Story 3 - Nenhum personagem novo fora do status Ativa (Priority: P2)

Com a campanha em status diferente de Ativa, não é possível incluir personagens na campanha: jogadores não podem pedir acesso, o mestre não pode convidar e não pode aprovar pedidos ou convites pendentes.

**Why this priority**: Faz parte do pedido, mas afeta menos a sessão em andamento do que o congelamento do jogo.

**Independent Test**: Com a campanha Finalizada, um jogador procura a campanha e tenta pedir acesso com um personagem; o pedido é recusado. O mestre tenta aprovar um pedido que já estava pendente; a aprovação é recusada.

**Acceptance Scenarios**:

1. **Given** uma campanha não Ativa, **When** um jogador pede acesso com um personagem, **Then** o pedido é recusado com a mensagem de que a campanha não está ativa.
2. **Given** uma campanha não Ativa, **When** o mestre convida um personagem, **Then** o convite é recusado.
3. **Given** uma campanha não Ativa com pedidos ou convites pendentes, **When** o mestre tenta aprovar um pedido ou o jogador tenta aceitar um convite, **Then** a operação é recusada e o pendente continua pendente.
4. **Given** uma campanha que volta a Ativa, **When** o mestre aprova o pedido pendente, **Then** a aprovação funciona normalmente.

---

### User Story 4 - A conversa continua (Priority: P1)

Em qualquer status, os participantes continuam conversando no chat: mensagens de texto, fotos, áudios, rolagens de dados, enquetes, reações, respostas e sussurros.

**Why this priority**: É a única coisa que o pedido manda manter; sem ela o status quebraria a comunicação da mesa.

**Independent Test**: Com a campanha Pausada, um jogador envia texto, uma foto e vota numa enquete; tudo funciona e os outros participantes recebem em tempo real.

**Acceptance Scenarios**:

1. **Given** uma campanha Pausada, **When** um participante envia uma mensagem, foto ou áudio, **Then** a mensagem aparece para os demais como hoje.
2. **Given** uma campanha Finalizada, **When** um participante rola os dados, cria ou vota numa enquete, reage ou responde a uma mensagem, **Then** funciona como hoje.
3. **Given** uma campanha não Ativa, **When** um participante usa o chat, **Then** o seletor Conversa/Ação não oferece "Ação" e o menu da mensagem não oferece converter em ação.

---

### Edge Cases

- Campanhas existentes antes da mudança ficam **Ativa**, para nada mudar para as mesas em andamento.
- Mudar o status com uma ação ou movimento já registrados no turno: os registros ficam como estão; apenas novas operações são bloqueadas. O turno não é finalizado nem reiniciado pela mudança de status.
- Jogador com a tela aberta quando a campanha muda de status: os controles somem/aparecem sem recarregar, e se ele estava no modo "Mover" o modo é cancelado.
- Operação iniciada antes da mudança e enviada depois: o servidor decide pelo status no momento da gravação, então ela é recusada.
- Alterações que não são "jogo" continuam permitidas em qualquer status: renomear a campanha, abrir/fechar, editar o plano, editar o próprio personagem (fora da campanha), editar fichas da campanha, remover participantes, retirar NPCs, arquivar/excluir mapas, escolher o mapa atual, apagar a campanha.
- Assistentes de IA (MCP) seguem as mesmas regras, pois as recusas acontecem no servidor.
- Notificações automáticas de turno (maioria agiu, turno terminado) não são disparadas enquanto a campanha não estiver Ativa, já que as operações que as geram estão bloqueadas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toda campanha MUST ter um status entre Preparando, Ativa, Pausada e Finalizada.
- **FR-002**: Apenas o mestre da campanha MUST poder alterar o status, em qualquer direção entre os quatro valores.
- **FR-003**: O status MUST ser visível a todos os participantes e atualizado em tempo real para quem está com a campanha aberta.
- **FR-004**: Campanhas já existentes MUST ficar com status Ativa.
- **FR-005**: Uma campanha nova MUST começar com o status Preparando.
- **FR-006**: Com status diferente de Ativa, o sistema MUST recusar alterações nos mapas da campanha — posicionar, mover, girar, trocar token, mudar postura e remover peças; incluir, alterar e remover ocorrências de NPC no mapa; alterar a imagem/configuração de um mapa da campanha — feitas por jogadores. Para o mestre, o bloqueio vale em Pausada e Finalizada; em Preparando o mestre pode fazer todas essas alterações.
- **FR-007**: Com status diferente de Ativa, o sistema MUST recusar ações de turno: agir, converter mensagem em ação, resetar o turno, finalizar o turno, processar o turno, mudar o turno atual e cutucar jogadores.
- **FR-008**: Com status diferente de Ativa, o sistema MUST recusar a entrada de personagens: pedidos de acesso, convites, aprovação de pedidos e aceite de convites.
- **FR-009**: Com status diferente de Ativa, o chat de conversa MUST continuar funcionando: texto, foto, áudio, enquetes e votos, reações, respostas, sussurros, apagar mensagens e marcar como lido.
- **FR-010**: Rolagens de dados no chat MUST continuar permitidas em qualquer status (são conversa).
- **FR-011**: Com status diferente de Ativa, as figuras dos personagens pendentes no topo do chat MUST não ser exibidas.
- **FR-012**: Com status diferente de Ativa, a interface MUST esconder ou desabilitar os controles das operações bloqueadas para aquele usuário (no caso do mestre em Preparando, só os de turno), mantendo o mapa visível para consulta.
- **FR-013**: Toda recusa por status MUST vir com uma mensagem que nomeia o status atual (ex.: "A campanha está pausada.").
- **FR-014**: As regras MUST valer igualmente pela interface e pelos assistentes de IA, porque a decisão é tomada no servidor.

### Key Entities

- **Campanha**: ganha o atributo **status** (Preparando, Ativa, Pausada, Finalizada), alterado só pelo mestre e lido por todos os participantes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com a campanha não Ativa, 100% das tentativas dos jogadores (e do mestre em Pausada/Finalizada) de mover peças, agir, finalizar turnos e incluir personagens são recusadas, pela interface e por assistentes de IA.
- **SC-002**: Com a campanha não Ativa, 100% das mensagens de conversa (texto, foto, áudio, enquete, reação) são entregues como numa campanha Ativa.
- **SC-003**: Participantes conectados veem a mudança de status em até 3 segundos, sem recarregar a página.
- **SC-004**: Nenhuma campanha existente muda de comportamento após a implantação (todas começam Ativa); campanhas criadas depois começam em Preparando.
- **SC-005**: O mestre muda o status em no máximo 3 toques a partir da mesa.

## Assumptions

- O status é independente de "aberta/fechada" (que só decide se pedidos de acesso são aprovados automaticamente).
- O status é escolhido nas Configurações da campanha do mestre; os participantes veem o status junto ao nome da campanha.
- Nenhum status é definitivo: uma campanha Finalizada pode voltar a Ativa.
- Os jogadores continuam podendo abrir e consultar os mapas, fichas e o histórico em qualquer status; só as alterações de jogo são bloqueadas.
- Mudar o status não gera mensagem no chat nem notificação push.
