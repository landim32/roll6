# Feature Specification: Status do mapa na campanha e o combo de mesas

**Feature Branch**: `078-map-status-table-combo`
**Created**: 2026-10-16
**Status**: Draft
**Input**: User description: "Melhoria em Mapas: Crie um status do mapa dentro da campanha caso não exista com as opções (Atual, Ativo, Arquivado). Pode usar esse campo ao invés de usar a flag do atual. O combo de mapa/campanha do menu deve exibir: para o GM, mapas Ativos de campanhas Ativas ou em planejamento; para os jogadores, apenas o mapa atual da campanha ativa, não consegue mudar. Lembrando que o usuário pode ser jogador em uma campanha e GM em outra. Lembrando também que quando o GM mudar o mapa Atual, os PJs são forçados para esse mapa."

## Contexto

Hoje cada mapa de uma campanha tem um status próprio (**Ativo** ou **Arquivado**, e Excluído, que não aparece). Qual deles é
o **mapa atual** (o que os jogadores seguem, 017/039/048) é guardado à parte, na campanha. O combo do menu (`TableSelect`)
mostra uma linha por campanha da mesa do usuário, com o mapa atual dela; os outros mapas só se abrem por "Mapas…" ou pelas
configurações.

Esta funcionalidade:

- passa a dizer, no **status do próprio mapa**, qual é o atual: **Atual**, **Ativo** ou **Arquivado** (e Excluído, que
  continua escondido), com exatamente um mapa Atual por campanha no máximo;
- muda o combo do menu: o **mestre** vê, em cada campanha Ativa ou em Preparação que mestra, **todos os mapas ativos** (o
  Atual e os Ativos); o **jogador** vê, em cada campanha Ativa onde joga, **só o mapa atual**, sem poder trocar;
- mantém a regra de 048/039: quando o mestre troca o mapa Atual, os jogadores são levados para ele.

Um mesmo usuário pode ser mestre de uma campanha e jogador em outra: o combo mostra cada campanha com a regra do papel que
ele tem **nela**.

## Clarifications

### Session 2026-10-16

- Q: O jogador vê no combo as campanhas onde joga que não estão Ativas (em preparação, pausadas, finalizadas)? → A:
  **não**. Para o jogador o combo mostra só as campanhas **Ativas**; uma campanha em preparação, pausada ou finalizada
  some do combo dele até voltar a ficar Ativa (ele ainda a acha em "Outras campanhas…").
- Q: Quando o mestre escolhe no combo um mapa que não é o Atual, isso torna o mapa Atual? → A: **não, só o abre para ele**.
  O Atual continua mudando só pelo "Tornar atual" (048), e os jogadores ficam onde estão.
- Q: E se o mestre arquivar o mapa Atual? → A: **recusar**. O mestre precisa primeiro tornar outro mapa Atual; a campanha
  nunca fica sem mapa por engano.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O status do mapa diz qual é o atual (Priority: P1)

Em Configurações › Mapas e em "Mapas da campanha", cada mapa mostra o seu status: **Atual**, **Ativo** ou **Arquivado**.
Há no máximo um Atual por campanha. Tornar um mapa Atual faz o Atual anterior virar Ativo, e os jogadores são levados para
o novo.

**Why this priority**: é a base de tudo o resto — o combo e o "forçar os jogadores" leem esse status.

**Independent Test**: numa campanha com três mapas (A Atual, B e C Ativos), o mestre torna B Atual: A vira Ativo, B Atual, C
continua Ativo, e os jogadores vão para B.

**Acceptance Scenarios**:

1. **Given** uma campanha com o mapa A atual, **When** o mestre abre a lista de mapas, **Then** A aparece como Atual e os
   outros como Ativo ou Arquivado.
2. **Given** o mestre torna o mapa B Atual, **Then** B passa a Atual, o Atual anterior passa a Ativo, e todos os jogadores
   conectados são levados a B, como hoje.
3. **Given** um mapa Arquivado, **Then** ele não pode virar Atual sem antes ser reativado (como hoje).
4. **Given** as campanhas que já existem, **Then** o mapa que hoje é o atual de cada uma aparece como Atual, e os outros
   mantêm Ativo/Arquivado — nada muda para a mesa.
5. **Given** um mapa novo criado na campanha, **Then** ele começa Ativo (nunca vira Atual sozinho).

---

### User Story 2 - O combo do mestre lista os mapas ativos (Priority: P1)

O mestre abre o combo do menu e vê, para cada campanha **Ativa ou em Preparação** que ele mestra, a campanha e, embaixo,
todos os mapas Atual e Ativos dela, com o Atual marcado. Escolher um mapa o abre.

**Why this priority**: é o pedido principal: trocar de mapa sem passar por "Mapas…".

**Independent Test**: o mestre tem a campanha X (Ativa, mapas A Atual, B Ativo, C Arquivado) e a campanha Y (Pausada). O
combo mostra X com A (marcado como atual) e B; não mostra C, nem Y.

**Acceptance Scenarios**:

1. **Given** o mestre de uma campanha Ativa ou em Preparação, **When** abre o combo, **Then** vê o nome da campanha e os seus
   mapas Atual e Ativos, o Atual destacado.
2. **Given** um mapa Arquivado ou Excluído, ou uma campanha Pausada ou Finalizada, **Then** não aparecem no combo do mestre.
3. **Given** o mestre escolhe no combo um mapa que não é o Atual, **Then** o mapa abre só para ele; o Atual não muda e os
   jogadores ficam onde estão (Q2 = A).
4. **Given** um mapa é criado, arquivado, reativado, renomeado ou se torna Atual, **Then** o combo reflete na próxima vez que
   é aberto, sem recarregar a página.

---

### User Story 3 - O combo do jogador mostra só o mapa atual (Priority: P1)

O jogador vê, para cada campanha **Ativa** onde tem personagem aprovado (Q1 = A), só o mapa Atual dela. Ele escolhe a
campanha, mas não troca de mapa: o combo não oferece outros mapas.

**Why this priority**: os jogadores ficam sempre na cena que o mestre escolheu (039), agora também no combo.

**Independent Test**: um jogador na campanha X (A Atual, B Ativo) vê no combo só X com A. O mestre torna B Atual: o jogador é
levado a B e o combo passa a mostrar B.

**Acceptance Scenarios**:

1. **Given** um jogador numa campanha Ativa, **When** abre o combo, **Then** vê a campanha e só o mapa Atual dela.
2. **Given** a campanha não tem mapa Atual, **Then** o combo mostra a campanha sem mapa, e ao entrar o jogador vê "O mestre
   ainda não escolheu um mapa", como hoje.
3. **Given** o mestre troca o mapa Atual, **Then** o jogador é levado ao novo mapa e o combo dele mostra o novo.
4. **Given** um usuário que é mestre na campanha X e jogador na campanha Z, **Then** o combo mostra X com os mapas ativos e Z
   só com o mapa Atual.

---

### Edge Cases

- **Campanha sem mapas**: o mestre vê a campanha no combo sem mapas embaixo (e entra nela); o jogador, como hoje.
- **Mestre que também tem personagem na própria campanha**: vale o papel de mestre.
- **Mapa Atual excluído**: a campanha fica sem Atual, como hoje.
- **Arquivar o mapa Atual**: recusado com "Torne outro mapa atual antes de arquivar este." (Q3 = A). Excluir o mapa Atual
  continua deixando a campanha sem Atual, como hoje.
- **Campanha do jogador fora de Ativa**: some do combo dele (Q1 = A); se ele estiver nela quando ela pausar, continua na
  tela, mas ela não aparece mais no combo até voltar a Ativa.
- **Dois mestres trocando o Atual ao mesmo tempo**: não existe (uma campanha tem um mestre); duas abas do mesmo mestre:
  vale a última troca, e continua havendo no máximo um Atual.
- **Ferramentas de IA e API**: quem lê os mapas da campanha passa a ver Atual/Ativo/Arquivado; tornar Atual continua sendo
  só o mestre.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada mapa de uma campanha MUST ter o status **Atual**, **Ativo** ou **Arquivado** (Excluído continua oculto).
- **FR-002**: Uma campanha MUST ter no máximo um mapa Atual; tornar um mapa Atual MUST passar o anterior a Ativo.
- **FR-003**: Só um mapa Ativo (ou já Atual) MUST poder virar Atual; só o mestre MUST poder fazê-lo.
- **FR-004**: Os dados atuais MUST ser preservados: o mapa que hoje é o atual de cada campanha MUST virar Atual, sem
  mudança para a mesa.
- **FR-005**: Quando o mapa Atual muda, os jogadores da campanha MUST ser levados a ele na hora, como hoje.
- **FR-006**: O combo do menu MUST mostrar, para cada campanha que o usuário **mestra** e que está Ativa ou em Preparação, os
  mapas Atual e Ativos dela, com o Atual destacado; escolher um mapa MUST abri-lo.
- **FR-007**: O combo MUST mostrar, para cada campanha **Ativa** onde o usuário **joga** com personagem aprovado (Q1 = A),
  só o mapa Atual; o jogador MUST NOT conseguir abrir outro mapa pelo combo.
- **FR-007a**: Escolher no combo um mapa que não é o Atual MUST só abri-lo para o mestre, sem mudar o Atual (Q2 = A).
- **FR-007b**: Arquivar o mapa Atual MUST ser recusado (Q3 = A).
- **FR-008**: Cada campanha do combo MUST seguir o papel do usuário nela (mestre ou jogador).
- **FR-009**: Mapas Arquivados e Excluídos MUST NOT aparecer no combo.
- **FR-010**: As ferramentas de IA e a leitura dos mapas da campanha MUST mostrar o novo status.

### Key Entities

- **Mapa da campanha**: o mapa de uma campanha, com nome e status — Atual, Ativo, Arquivado (ou Excluído).
- **Campanha**: tem um status (Preparando, Ativa, Pausada, Finalizada) e, no máximo, um mapa Atual.
- **Entrada do combo**: uma campanha com os mapas que o usuário pode abrir por ali, conforme o papel dele nela.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre troca para qualquer mapa ativo de uma campanha ativa em no máximo 2 toques (abrir o combo e escolher).
- **SC-002**: Em 100% das campanhas, existe no máximo um mapa Atual, e ele é o mesmo que os jogadores estão vendo.
- **SC-003**: Depois da troca do mapa Atual, todos os jogadores conectados estão no novo mapa em até 3 segundos.
- **SC-004**: Um jogador nunca encontra no combo um mapa que não seja o Atual.
- **SC-005**: Nenhuma campanha existente muda de mapa atual por causa da migração.

## Assumptions

- "Em planejamento" é o status **Preparando** (049).
- O combo continua com "Outras campanhas…" e "Mapas…", que dão acesso ao resto (campanhas pausadas, mapas arquivados).
- O status Excluído continua existindo e oculto, como hoje.
- A troca do mapa Atual continua deliberada ("Tornar atual", 048).
