# Feature Specification: Painel de NPCs só com os NPCs do mapa

**Feature Branch**: `076-npc-panel-map-filter`
**Created**: 2026-10-15
**Status**: Draft
**Input**: User description: "O painel de NPCs da campanha lista todos os NPCs cadastrados na campanha, estejam ou não no mapa em jogo. Isso está errado. A campanha tem 21 NPCs cadastrados (13 de um mapa 'Taberna', 7 de um mapa 'Casa de apostas' e 1 aliado); o mapa atual é a 'Casa de apostas', com 8 NPCs com peça, mas o painel de neutros/inimigos mostra 20. Neutros e inimigos: só os que têm ao menos uma peça no mapa atual; a lista troca na hora quando o mapa muda; várias ocorrências no mesmo mapa continuam como hoje. Aliados: aparecem em todos os mapas até serem retirados da campanha. Permissões e visibilidade como hoje, só o filtro por mapa. O contador acompanha a lista filtrada. Reagir à troca de mapa e a colocar/retirar peças. Sem mudar API nem banco, a menos que seja mais simples; um parâmetro novo deve manter o comportamento atual sem ele."

## Contexto

O painel de NPCs, à direita, mostra hoje **todos** os NPCs neutros e inimigos que já foram incluídos na campanha. Numa campanha com vários mapas, ele fica cheio de NPCs que não estão na cena: 20 cartões quando o mapa em jogo tem 8 peças.

Os **aliados** (071) já ficam do lado do grupo, sob o personagem-mestre ou no grupo "Aliados", e acompanham o grupo de mapa em mapa.

Esta funcionalidade:

- deixa no painel só os neutros e inimigos **da cena**, ou seja, os que têm peça no mapa;
- mantém os aliados sempre visíveis.

Hoje o cartão de um NPC também é a forma de **colocar** uma peça desse NPC no mapa: o mestre arrasta o cartão até um hex livre. Um NPC recém-incluído na campanha ainda não tem peça, e por isso a Q1 importa.

## Clarifications

### Session 2026-10-15

- Q: O mestre também vê só os NPCs do mapa? Como ele coloca no mapa um NPC da campanha que ainda não tem peça? → A:
  **todos veem só os do mapa**, o mestre também. Incluir um NPC na campanha pelo "Incluir NPC" ("Meus NPCs" ou "Novo
  NPC") com um mapa da campanha aberto já coloca a peça dele nesse mapa, no hex livre mais próximo do centro. O mestre
  a move depois, e o cartão aparece porque o NPC passa a ter peça.
- Q: "Mapa atual" é o mapa que os jogadores seguem ou o mapa aberto na tela? → A: **o mapa aberto na tela de cada um**.
  Para os jogadores é sempre o mapa atual da campanha (039). O mestre que abre outro mapa da campanha para preparar a
  próxima cena vê os NPCs desse mapa, e os cartões batem com as peças que ele está vendo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Só os NPCs da cena no painel (Priority: P1)

Na mesa, o painel de NPCs mostra só os neutros e inimigos que têm ao menos uma peça no mapa em jogo. Um NPC com várias
peças nesse mapa ("Guarda", "Guarda 2") aparece num só cartão com as suas ocorrências, como hoje. O título do painel
mostra quantos NPCs estão na lista.

**Why this priority**: é o defeito relatado. O painel com 20 NPCs de outros mapas atrapalha a mesa.

**Independent Test**: campanha com o mapa A (13 NPCs com peça), o mapa B (7 NPCs com peça) e 1 aliado sem peça. Com A
em jogo, o painel mostra 13 NPCs e diz 13. O aliado aparece do lado do grupo.

**Acceptance Scenarios**:

1. **Given** a campanha com 20 neutros/inimigos cadastrados e 8 deles com peça no mapa em jogo, **When** alguém olha o
   painel, **Then** vê 8 cartões e o título diz 8.
2. **Given** um NPC com duas peças no mapa ("Guarda" e "Guarda 2"), **Then** ele aparece num só cartão, com as duas
   ocorrências.
3. **Given** um NPC cadastrado na campanha sem peça no mapa em jogo, **Then** ele não aparece no painel. Ele continua na
   campanha e em Configurações › NPCs.
4. **Given** um jogador (que não é o mestre), **Then** vê os mesmos cartões, só leitura como hoje, e o painel não
   aparece quando a lista fica vazia, como hoje.

---

### User Story 2 - A lista acompanha a troca de mapa e as peças (Priority: P1)

Quando o mapa em jogo muda, ou quando uma peça de NPC entra ou sai dele, a lista se atualiza na hora para todos, sem
recarregar a página.

**Why this priority**: sem isso o filtro mostra a cena errada depois da primeira troca.

**Independent Test**: com A em jogo (13), o mestre leva a mesa para B. Em poucos segundos todos veem 7. Volta para A:
13. O mestre coloca no mapa em jogo uma peça de um NPC que só estava em B: o cartão dele aparece. Ele apaga essa peça:
o cartão some, e o NPC continua na campanha.

**Acceptance Scenarios**:

1. **Given** o mapa A em jogo, **When** o mestre torna B o mapa atual, **Then** o painel de cada participante mostra os
   NPCs de B, sem recarregar.
2. **Given** um NPC sem peça no mapa em jogo, **When** uma peça dele é colocada nesse mapa, **Then** o cartão aparece
   para todos.
3. **Given** um NPC com uma única peça no mapa em jogo, **When** essa peça é retirada do mapa, **Then** o cartão some, e
   o NPC continua na campanha.
4. **Given** um NPC com duas peças, **When** uma delas é retirada, **Then** o cartão continua, com a ocorrência que
   sobrou.

---

### User Story 3 - Aliados em todos os mapas (Priority: P1)

Os aliados (categoria Aliado) continuam aparecendo do lado do grupo em todos os mapas, com ou sem peça no mapa em jogo,
até serem retirados da campanha.

**Why this priority**: o aliado viaja com o grupo. Filtrá-lo pelo mapa o faria sumir a cada troca de cena.

**Independent Test**: com o aliado sem peça em nenhum mapa, troque A → B → A. Ele aparece o tempo todo. Retirado da
campanha, ele some em qualquer mapa.

**Acceptance Scenarios**:

1. **Given** um aliado sem peça no mapa em jogo, **Then** ele aparece no seu lugar do lado do grupo (sob o
   personagem-mestre ou em "Aliados").
2. **Given** um aliado, **When** o mapa em jogo muda, **Then** ele continua aparecendo.
3. **Given** um aliado, **When** é retirado da campanha, **Then** some da lista em qualquer mapa.
4. **Given** um NPC que deixa de ser aliado (vira Neutro ou Inimigo), **Then** ele passa a seguir o filtro do mapa.

---

### Edge Cases

- **Mapa em jogo sem nenhuma peça de NPC**: o painel fica vazio para o mestre (com "Incluir NPC") e não aparece para os
  jogadores, como hoje com uma lista vazia.
- **Nenhum mapa da campanha aberto** (sem mapa, ou um modelo aberto fora da campanha): não há cena. O painel não lista
  neutros nem inimigos; o mestre vê só "Incluir NPC", e os jogadores não veem o painel. Os aliados continuam.
- **O mestre abre outro mapa da campanha**: o painel dele passa a listar os NPCs desse mapa, e o dos jogadores continua
  no mapa atual.
- **Mesa sem personagens aprovados**: hoje o painel mostra também os aliados. O filtro vale só para neutros e inimigos;
  os aliados continuam.
- **Peça retirada por "Retirar do mapa"**: a instância sai do mapa, e o cartão sai se era a última.
- **NPC com peça em outro mapa e nenhuma no mapa em jogo**: não aparece.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O painel de NPCs MUST listar só os NPCs neutros e inimigos da campanha que têm ao menos uma peça no mapa
  aberto na tela (Q2 = A; para os jogadores, o mapa atual da campanha). Vale para o mestre também (Q1 = A).
- **FR-002**: Um NPC com várias peças no mapa em jogo MUST aparecer num só cartão, com todas as suas ocorrências desse
  mapa, como hoje.
- **FR-003**: O contador do título do painel MUST contar a lista filtrada.
- **FR-004**: Os aliados MUST aparecer em todos os mapas, com ou sem peça, até serem retirados da campanha.
- **FR-005**: A lista MUST se atualizar para todos os participantes, sem recarregar a página, quando:
  - o mapa em jogo muda;
  - uma peça de NPC é colocada no mapa em jogo;
  - uma peça de NPC é retirada do mapa em jogo;
  - a categoria de um NPC muda.
- **FR-006**: Quem vê o painel e o que cada um pode fazer nele MUST continuar como hoje.
- **FR-007**: A gestão dos NPCs da campanha (Configurações › NPCs, "Incluir NPC", "Retirar da campanha") MUST continuar
  listando todos os NPCs da campanha.
- **FR-008**: Incluir um NPC na campanha pelo "Incluir NPC", com um mapa da campanha aberto, MUST também colocar a peça
  dele nesse mapa, no hex livre mais próximo do centro (Q1 = A). Sem mapa da campanha aberto, ele entra só na campanha,
  como hoje. Um NPC que já está na campanha continua ganhando mais uma instância no mapa aberto (052).
- **FR-009**: Se não houver hex livre para a peça, o NPC MUST entrar na campanha mesmo assim, e o mestre MUST ver um
  aviso de que não houve lugar no mapa.

### Key Entities

- **NPC da campanha**: um NPC incluído na campanha, com a sua categoria (Inimigo, Neutro, Aliado).
- **Ocorrência (peça) no mapa**: uma instância desse NPC num mapa da campanha. É ela que decide se o NPC está na cena.
- **Mapa em jogo**: o mapa aberto na tela, que define a cena do painel (Q2 = A).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No cenário relatado (20 neutros/inimigos cadastrados, 8 com peça no mapa em jogo), o painel mostra
  exatamente 8 cartões e o título diz 8.
- **SC-002**: Ao trocar o mapa em jogo, todos os participantes veem a lista do novo mapa em até 3 segundos, sem
  recarregar.
- **SC-003**: Em 10 trocas seguidas entre dois mapas, o aliado aparece em todas, e a contagem de neutros/inimigos é
  sempre a do mapa em jogo.
- **SC-004**: Nenhum NPC some da campanha por causa do filtro: Configurações › NPCs lista os mesmos NPCs de antes.

## Assumptions

- A cena é decidida pelas peças (ocorrências) no mapa. Não ter peça é estar fora da cena, mesmo que o NPC já tenha
  estado no mapa antes.
- A área de gestão (Configurações › NPCs) não é filtrada: lá o mestre vê e edita todos os NPCs da campanha.
- O cartão de um NPC na cena continua mostrando só as ocorrências desse mapa, como hoje.
- Não muda nada no servidor nem no MCP, a menos que o plano encontre um filtro no servidor mais simples, sempre
  opcional e sem mudar o comportamento atual.
