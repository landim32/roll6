# Feature Specification: Notificações em ordem de tempo e "Marcar tudo como lido"

**Feature Branch**: `046-notification-order-read`
**Created**: 2026-10-09
**Status**: Draft
**Input**: User description: "Mehorias nas notificações: - Está exibindo primeiro os turnos q depois as notificações normais - Deve exibir em ordem de tempo, os mais recentes primeiro - Deve ter uma opção no começo de marcar tudo como lido"

## Clarifications

### Session 2026-10-09

- Q: O fim do turno vira uma notificação guardada como as demais ou continua um aviso só do aparelho, apenas reordenado pelo horário? → A: Continua um aviso do aparelho e da campanha atual, ordenado pelo momento em que o aparelho percebeu o fim do turno (mudança só no frontend).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver as notificações na ordem em que aconteceram (Priority: P1)

Um jogador abre o sino depois de um tempo fora. Hoje ele vê primeiro todos os avisos de "Turno N finalizado" e só depois as outras notificações (mensagens, cutucadas, PV), fora de ordem. Ele quer uma lista única, como em qualquer aplicativo: o que aconteceu por último no topo, descendo até o mais antigo, sem importar o tipo.

**Why this priority**: é o problema relatado; com a lista fora de ordem o jogador não entende o que aconteceu e em que sequência.

**Independent Test**: gerar, em sequência, uma mensagem, o fim de um turno e uma cutucada; abrir o sino e conferir que aparecem cutucada, fim de turno e mensagem, nessa ordem, cada um com seu horário.

**Acceptance Scenarios**:

1. **Given** notificações de tipos diferentes recebidas em momentos diferentes, **When** o usuário abre o sino, **Then** elas aparecem numa única lista ordenada da mais recente para a mais antiga, sem agrupar por tipo.
2. **Given** um turno finalizado depois de uma mensagem, **When** o sino é aberto, **Then** o aviso do turno aparece acima da mensagem.
3. **Given** cada item da lista, **When** exibido, **Then** mostra o horário (hoje) ou a data (dias anteriores) em que aconteceu.
4. **Given** um turno finalizado, **When** o sino é aberto, **Then** o aviso "Turno N finalizado" aparece na posição do momento em que este aparelho percebeu o fim do turno.
5. **Given** um convite de campanha pendente, **When** o sino é aberto, **Then** ele aparece na lista na posição do momento em que o convite foi feito, com os botões Aceitar e Recusar.

---

### User Story 2 - Marcar tudo como lido (Priority: P1)

O jogador vê o número no sino e a lista cheia de itens não lidos. No topo da lista há "Marcar tudo como lido"; ao tocar, todos os itens passam a lidos e o número do sino some.

**Why this priority**: foi pedido explicitamente e é o jeito de limpar o sino de uma vez.

**Independent Test**: com 3 notificações não lidas, abrir o sino, tocar em "Marcar tudo como lido" e ver o número sumir e os itens sem a marca de não lida, também após recarregar a página.

**Acceptance Scenarios**:

1. **Given** há itens não lidos, **When** o usuário abre o sino, **Then** a primeira linha da lista é "Marcar tudo como lido".
2. **Given** o usuário toca em "Marcar tudo como lido", **When** a ação termina, **Then** todos os itens ficam lidos, o número do sino vai a zero e a lista continua aberta mostrando os itens.
3. **Given** não há nada não lido, **When** o sino é aberto, **Then** "Marcar tudo como lido" aparece desabilitado (ou não aparece).
4. **Given** o usuário apenas abre o sino e fecha, **When** fecha, **Then** os itens continuam não lidos e o número permanece — só "Marcar tudo como lido" ou abrir um item marcam como lido.
5. **Given** o usuário toca num item não lido, **When** o item é aberto, **Then** só ele passa a lido.
6. **Given** convites pendentes, **When** "Marcar tudo como lido" é usado, **Then** os convites continuam na lista até serem aceitos ou recusados (marcar como lido não responde a um convite).

---

### Edge Cases

- Lista vazia: mostra "Nenhuma notificação" e não oferece "Marcar tudo como lido".
- Muitos itens: a lista mostra as 30 notificações mais recentes (como hoje), mais os convites pendentes, sempre em ordem de tempo.
- Dois itens no mesmo instante: a ordem entre eles é estável (o último recebido primeiro).
- "Marcar tudo como lido" falha por falta de conexão: os itens voltam a aparecer como não lidos e o usuário é avisado.
- O usuário marca tudo como lido num aparelho: no outro aparelho aberto o número do sino também cai, no máximo na próxima atualização.
- Avisos de fim de turno antigos, guardados antes desta mudança, não têm horário: aparecem no fim da lista (como os mais antigos).
- O aviso de fim de turno continua sendo deste aparelho e da campanha atual: em outro aparelho ou ao trocar de campanha ele não aparece (como hoje).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sino MUST mostrar todos os itens (convites, fins de turno e as demais notificações) numa única lista ordenada pelo momento em que aconteceram, do mais recente para o mais antigo.
- **FR-002**: Cada item MUST mostrar o horário em que aconteceu (hora se for hoje, data se for antes).
- **FR-003**: O aviso de fim de turno MUST continuar sendo um aviso deste aparelho e da campanha atual (como hoje), agora guardando o momento em que o aparelho percebeu o fim do turno, e ser ordenado na lista por esse momento junto com os demais itens.
- **FR-004**: Tocar num fim de turno MUST continuar abrindo a narração desse turno.
- **FR-005**: A lista MUST começar com a ação "Marcar tudo como lido", habilitada só quando há algo não lido.
- **FR-006**: "Marcar tudo como lido" MUST marcar como lidos todos os itens da lista (exceto convites, que só saem ao serem respondidos) e zerar o número do sino, sem fechar a lista.
- **FR-007**: Abrir o sino MUST NOT marcar nada como lido por si só; abrir um item marca só aquele item.
- **FR-008**: O número do sino MUST contar os itens não lidos mais os convites pendentes.
- **FR-009**: O estado de lido das notificações recebidas MUST valer em todos os aparelhos do usuário; o dos avisos de fim de turno vale para este aparelho (eles são locais).

### Key Entities

- **Item do sino**: convite pendente, fim de turno ou notificação recebida; tem momento, texto, destino ao tocar e estado lido/não lido (convites: pendente).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos casos, os itens do sino aparecem do mais recente para o mais antigo, independentemente do tipo.
- **SC-002**: O usuário limpa o número do sino com 2 toques (abrir o sino + "Marcar tudo como lido").
- **SC-003**: Depois de "Marcar tudo como lido", o número do sino continua zerado ao recarregar a página; as notificações recebidas também aparecem lidas em outro aparelho.

## Assumptions

- A lista continua limitada às 30 notificações mais recentes, como hoje.
- Convites não têm estado de lido: ficam até serem aceitos ou recusados, na posição do momento do convite.
- Hoje abrir o sino marca tudo como lido; isso muda: só a nova ação ou abrir um item marcam como lido (comportamento do WhatsApp/Gmail).
- Os textos e destinos de cada notificação continuam os mesmos de hoje.
- O jogador pode continuar vendo o fim de um turno duas vezes (o aviso local "Turno N finalizado" e a notificação "Turno N terminado. Pode agir novamente"); unificar os dois ficou fora desta mudança (decisão da sessão de esclarecimento).
