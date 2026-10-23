# Feature Specification: Aviso de turno em processamento

**Feature Branch**: `101-turn-processing-notice`
**Created**: 2026-10-22
**Status**: Draft
**Input**: User description: "implemente uma forma de avisar o roll6 quando o turno estiver processando, pode ser as mensagens azuis igual as no modo GM"

## Contexto

No Modo GM (096) a mesa já vê, no chat, linhas azuis discretas do "GM" — "O GM começou a processar o turno N." — e um selo
no rodapé "GM processando o turno N…". Quando o **mestre processa o turno por conta própria** (a skill `processar-turno`
do Claude dele, fora do Modo GM, ou à mão), os jogadores não sabem que o turno já está sendo resolvido: continuam
mudando ações, cutucando, perguntando se o mestre viu. Esta funcionalidade dá ao mestre (e ao Claude dele) uma forma de
avisar o Roll6 "estou processando o turno N" e "parei", com o mesmo visual do Modo GM.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — O mestre avisa que está processando (Priority: P1)

O mestre (ou o Claude dele, ao rodar a skill `processar-turno`) avisa o Roll6 que começou a processar o turno em
andamento. Todos na mesa veem, no chat, a linha azul "O mestre começou a processar o turno N." e, no rodapé do mapa, o
selo "Processando o turno N…". Quando o turno fecha, o selo some sozinho e a narração aparece como sempre.

**Why this priority**: É o pedido: a mesa saber que o turno está sendo resolvido.

**Independent Test**: Numa campanha ativa, o mestre avisa o início; um jogador em outro navegador vê a linha azul no
chat e o selo no rodapé em poucos segundos; o mestre fecha o turno e o selo some em todos.

**Acceptance Scenarios**:

1. **Given** uma campanha ativa no turno 7, **When** o mestre avisa que começou a processar, **Then** o chat de todos os
   participantes ganha a linha azul "O mestre começou a processar o turno 7." e o rodapé mostra "Processando o turno 7…".
2. **Given** o turno 7 em processamento, **When** o turno é fechado (narração processada, "Finalizar turno" ou avançar o
   turno), **Then** o selo desaparece para todos, sem outra linha no chat.
3. **Given** o turno 7 em processamento, **When** um participante recarrega a página ou entra depois, **Then** ele vê o
   selo.
4. **Given** o turno já em processamento, **When** o mestre avisa de novo, **Then** nenhuma linha nova aparece.

---

### User Story 2 — O mestre para sem fechar, ou o aviso expira (Priority: P2)

O mestre (ou o Claude dele) avisa que parou sem fechar o turno — por exemplo, para perguntar algo. O selo some e o chat
ganha a linha azul "O mestre interrompeu o processamento do turno N." (com o motivo, se houver). Se ninguém avisar nada,
o aviso expira sozinho, para não ficar preso.

**Why this priority**: Sem isso um aviso esquecido mentiria para a mesa.

**Independent Test**: Avisar o início e depois "parei: falta a ação do Bram"; o selo some e a linha com o motivo
aparece. Avisar o início e esperar o prazo; o selo some sozinho.

**Acceptance Scenarios**:

1. **Given** o turno em processamento, **When** o mestre avisa que parou com o motivo "falta a ação do Bram", **Then** o
   selo some e o chat mostra "O mestre interrompeu o processamento do turno 7: falta a ação do Bram."
2. **Given** o turno em processamento há mais de 30 minutos sem fechar nem parar, **When** alguém olha a mesa, **Then**
   o selo não aparece mais, sem linha no chat.

---

### User Story 3 — A skill avisa sozinha (Priority: P2)

A skill `processar-turno` do repositório da mesa avisa o início ao começar a resolver (depois de confirmar que ninguém
falta) e, se parar sem fechar o turno, avisa a interrupção com o motivo. Assistentes de IA alcançam o aviso pelo MCP.

**Why this priority**: O caso principal é o mestre rodando o Claude dele; sem a skill o aviso dependeria de ele lembrar.

**Independent Test**: Rodar `processar-turno` num turno completo: a linha azul aparece antes da narração.

**Acceptance Scenarios**:

1. **Given** um turno com todas as ações, **When** a skill começa a resolver, **Then** a linha azul aparece antes da
   narração e o selo some quando o turno fecha.
2. **Given** a skill encontra `FALTAM AÇÕES`, **When** ela para, **Then** nenhum aviso de início aparece.

### Edge Cases

- **Modo GM processando o mesmo turno**: o aviso manual de início é ignorado (o selo do GM continua valendo).
- **Turno avança por outro caminho** (voltar/adiantar o turno, "Finalizar turno" forçado): o processamento termina junto.
- **Campanha não ativa**: o aviso de início é recusado com a mensagem de status de sempre.
- **Quem não é o mestre** tenta avisar: recusado.
- **Jogador age durante o processamento** (Q1 = A): nada é bloqueado — agir, mudar a ação, mover e resetar continuam
  permitidos; o aviso é só informativo.
- **Notificações push** (Q2 = A): o início do processamento não manda notificação; fica só na linha do chat e no selo.

## Clarifications

### Session 2026-10-22

- Q: As ações dos jogadores ficam bloqueadas durante o processamento? → A: Não; o aviso é só informativo.
- Q: O início manda notificação push? → A: Não; só a linha do chat e o selo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O mestre da campanha DEVE poder avisar o Roll6 que começou a processar o turno em andamento, em campanha
  ativa; o aviso vale só para o turno atual.
- **FR-002**: Ao começar, o chat DEVE ganhar uma linha azul discreta, no estilo das linhas do Modo GM, "O mestre começou a
  processar o turno N.", vista pelo mestre e pelos participantes aprovados; ela não aceita resposta, reação nem exclusão.
- **FR-003**: Enquanto o turno está em processamento, o rodapé do mapa DEVE mostrar a todos "Processando o turno N…", e o
  estado DEVE valer também para quem entra ou recarrega a página.
- **FR-004**: Avisar o início de um turno já em processamento NÃO DEVE gerar nova linha.
- **FR-005**: O processamento DEVE terminar sozinho quando o turno avança por qualquer caminho, sem linha extra.
- **FR-006**: O mestre DEVE poder avisar que parou sem fechar, com motivo opcional (até 200 caracteres); o selo some e o
  chat ganha "O mestre interrompeu o processamento do turno N." (com ": motivo" quando houver).
- **FR-007**: Um processamento sem fechamento nem interrupção DEVE expirar após 30 minutos (o selo some, sem linha).
- **FR-008**: As mudanças de estado DEVEM chegar às telas abertas em tempo real.
- **FR-009**: Começar e parar DEVEM estar disponíveis para assistentes de IA pelo servidor MCP.
- **FR-010**: Enquanto o Modo GM processa aquele turno, um aviso manual de início é ignorado.
- **FR-011**: A skill `processar-turno` da mesa DEVE avisar o início ao começar a resolver um turno completo e a
  interrupção (com o motivo) quando parar sem fechar.
- **FR-012**: Só o mestre da campanha pode avisar; campanha fora de "Ativa" recusa o início.
- **FR-013**: O processamento NÃO DEVE bloquear nenhuma ação dos jogadores (Q1 = A).
- **FR-014**: Começar ou parar o processamento NÃO DEVE mandar notificação push (Q2 = A).

### Key Entities

- **Processamento do turno**: o mestre está resolvendo o turno N da campanha — turno, quem avisou, quando começou (para
  expirar). No máximo um por campanha.
- **Linha do processamento**: linha do chat no estilo das linhas do GM ("começou" / "interrompeu"), do mestre, sem
  personagem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Os participantes com a mesa aberta veem a linha azul e o selo em até 3 segundos depois do aviso.
- **SC-002**: O selo some para todos em até 3 segundos depois do fechamento do turno, em todos os caminhos de fechamento.
- **SC-003**: Nenhum aviso fica na tela por mais de 30 minutos sem que o mestre o renove.
- **SC-004**: Um turno processado pela skill mostra exatamente uma linha "começou" antes da narração.

## Assumptions

- O visual reaproveita as linhas azuis e o selo do Modo GM; o texto diz "O mestre" em vez de "O GM".
- O estado pode viver na memória do servidor, como o do Modo GM; perdê-lo num reinício do servidor é aceitável.
- Fechar o turno já gera a narração e o divisor; não há linha "terminou".
- As skills ficam no repositório da mesa (`c:\repos\gurps-adventure`), editadas só como arquivos.
