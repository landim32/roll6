# Feature Specification: Ação repetida e menu da peça mais compacto

**Feature Branch**: `099-repeated-action`
**Created**: 2026-10-21
**Status**: Draft
**Input**: User description: "Melhoria nas ações: mexa no popup menu ao clicar no token; reduza a parte da posição, coloque 3 ícones em 3 colunas para ocupar menos espaço; tem uma linha separando os itens de menu, se for do mesmo grupo retire as linhas entre eles; crie uma nova ação "Ação repetida...": essa ação será adicionada à ação no início de cada turno, enquanto estiver ativada; se o jogador adicionar outra ação, essa ação repetida desaparece; quando abrir o popup dela, deve ter um texto explicando como funciona, deve falar que "para um melhor resultado, deve descrever bem" (ex.: "enquanto existirem inimigos vivos nessa sala, prepare o machado e ataque de forma repetida, sem ataque total até não existir mais nenhum inimigo"); se ela estiver ativa, deve ter um botão remover ação repetida; se o modelo de IA julgar que a ação foi finalizada, ele pode remover a ação repetida (ex.: "Bata no inimigo até ele morrer" — quando ele morrer, o modelo deve remover a ação); fica no grupo das ações."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Declarar uma ação repetida (Priority: P1)

Numa luta longa, o jogador não quer escrever a mesma ação a cada turno. No menu da peça, no grupo "Ação", ele
escolhe **"Ação repetida…"**. A janela explica como funciona — a ação vale como a ação do personagem **no início de
cada turno**, até ser removida, substituída por outra ação ou encerrada pelo mestre/GM quando cumprida — e lembra
que **"para um melhor resultado, descreva bem"**, com o exemplo "Enquanto existirem inimigos vivos nesta sala,
prepare o machado e ataque de forma repetida, sem ataque total, até não existir mais nenhum inimigo". Ele escreve e
confirma. Se ele ainda não agiu neste turno, ela já vale agora; a cada novo turno, a ação aparece sozinha como a ação do personagem (no chat, no balão, nos dados do
turno), marcada como repetida.

**Why this priority**: é o recurso novo pedido; o resto da feature serve a ele ou é polimento.

**Independent Test**: ativar uma ação repetida num personagem, finalizar o turno e ver no turno seguinte a mesma
ação registrada para ele, marcada como repetida, sem o jogador fazer nada.

**Acceptance Scenarios**:

1. **Given** o menu de uma peça com a qual o jogador pode agir, **When** abre, **Then** "Ação repetida…" está no grupo
   "Ação", junto de "Agir sobre…" e "Agir", com a mesma disponibilidade.
2. **Given** a janela da ação repetida, **When** abre, **Then** mostra o texto explicativo (como funciona, quando para,
   "para um melhor resultado, descreva bem" e o exemplo) e um campo para a ação.
3. **Given** uma ação repetida confirmada, **When** um turno começa (o mestre finaliza, o turno é processado ou
   avançado), **Then** o personagem já tem essa ação registrada no novo turno, marcada como repetida, e quem lê o chat,
   o resumo e os dados do turno a vê como a ação dele.
4. **Given** uma ação repetida ativa, **When** o jogador reabre "Ação repetida…", **Then** a janela vem com o texto
   atual e um botão **"Remover ação repetida"**; removendo, nenhum turno seguinte recebe mais a ação.
5. **Given** uma ação repetida ativa, **When** o jogador declara outra ação para o personagem ("Agir", "Agir sobre…",
   ação pelo chat ou conversão de mensagem), **Then** a ação repetida é desativada e não volta nos turnos seguintes.
6. **Given** uma peça com ação repetida ativa, **When** o menu ou o card do personagem é visto por quem pode agir com
   ele, **Then** há uma indicação de que ela está ativa.

---

### User Story 2 - O modelo encerra a ação repetida cumprida (Priority: P1)

O GM (o Claude do mestre) ou o mestre com `processar-turno` resolve um turno em que um personagem tem ação repetida.
Ele vê que a ação é repetida e, se julgar que o objetivo foi cumprido ("Bata no inimigo até ele morrer" e o inimigo
morreu), a remove ao fechar o turno: no turno seguinte o personagem não recebe mais a ação e a narração diz que ela
terminou.

**Why this priority**: sem isso a ação repetida continuaria depois de fazer sentido, e o jogador teria de lembrar de
removê-la.

**Independent Test**: um personagem com ação repetida "até o goblin morrer"; o turno é processado com o goblin morto e
a remoção pedida; no turno seguinte não há ação repetida para ele.

**Acceptance Scenarios**:

1. **Given** os dados do turno lidos por quem processa, **When** um personagem tem ação repetida, **Then** a ação
   aparece marcada como repetida, com o texto completo da repetição.
2. **Given** o fechamento do turno pelo processamento em lote, **When** ele pede a remoção da ação repetida de um
   personagem, **Then** ela é desativada antes do turno seguinte começar e nada é aplicado a ele no novo turno.
3. **Given** as skills `processar-turno` e `gm`, **When** resolvem uma ação repetida, **Then** julgam se o objetivo da
   repetição foi cumprido e, se sim, pedem a remoção e dizem na narração que a ação terminou.

---

### User Story 3 - Menu da peça mais compacto (Priority: P2)

O menu que abre ao clicar numa peça está alto demais. A postura vira **uma linha com 3 ícones** (Em pé, Caído, Fora
de combate) lado a lado, com o atual destacado; dentro de um mesmo grupo os itens deixam de ter linhas entre si —
só há separação entre grupos.

**Why this priority**: polimento visual pedido; independe das outras histórias.

**Independent Test**: abrir o menu de uma peça própria e ver a postura numa linha de 3 ícones e os itens do grupo
"Ação" sem linhas entre eles.

**Acceptance Scenarios**:

1. **Given** o menu de uma peça com postura alterável, **When** abre, **Then** a postura ocupa uma única linha com 3
   ícones, cada um com o nome em dica e leitor de tela, o atual marcado e não clicável.
2. **Given** um grupo do menu com vários itens, **When** abre, **Then** não há linha entre os itens do grupo, e há
   separação entre um grupo e o seguinte.
3. **Given** o menu num celular, **When** abre, **Then** os 3 ícones da postura são alvos de toque confortáveis.

---

### Edge Cases

- **Ação repetida ativada no meio do turno**: se o ator ainda não agiu no turno em curso, ela já é registrada como a
  ação dele (Q2 = A); se já agiu, a ação dele fica e a repetição começa no próximo turno.
- **Personagem sem peça no mapa** quando o turno começa: a ação repetida vale do mesmo jeito (ações sem peça já
  existem, 080).
- **NPCs**: o mestre (e quem comanda um aliado) também pode deixar uma ação repetida numa instância de NPC; ela
  desaparece se a instância sai do mapa.
- **Personagem que sai da campanha**, é transferido, cai/fica fora de combate: a ação repetida continua até ser
  removida (a postura não a cancela; quem processa julga se ela ainda faz sentido).
- **Resetar turno**: cancela a ação do turno em curso, inclusive a repetida aplicada nele, mas não desativa a
  repetição — ela volta no próximo turno.
- **Campanha pausada/finalizada**: nada é aplicado enquanto o turno não avança; a repetição fica guardada.
- **Modo livre**: a ação repetida é aplicada a cada início de turno como em qualquer modo.
- **Voltar o turno** (correção do mestre) não reaplica nem desfaz repetições.
- **Ação repetida vazia** não é aceita; o texto tem o mesmo limite de uma ação.
- **Modo GM** (Q1 = B): um turno em que todos os personagens agiram mas **só** por ações repetidas aplicadas no início
  do turno não dispara o GM; basta uma ação declarada no turno (por um jogador, o mestre ou a ativação de uma
  repetição nele) para o GM rodar como hoje.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O menu da peça MUST oferecer **"Ação repetida…"** no grupo "Ação", com a mesma disponibilidade de
  "Agir".
- **FR-002**: A janela da ação repetida MUST mostrar o texto explicativo (vale no início de cada turno; para quando é
  removida, substituída por outra ação ou encerrada por quem processa o turno; "para um melhor resultado, descreva
  bem"; o exemplo do machado) e o campo da ação; Enter envia, Shift+Enter quebra a linha.
- **FR-003**: Com uma ação repetida ativa, a janela MUST abrir com o texto dela e oferecer **"Remover ação
  repetida"**; o menu/card MUST indicar que há uma ativa.
- **FR-004**: Cada personagem (por campanha) e cada instância de NPC MUST ter no máximo uma ação repetida ativa;
  confirmar outra substitui a anterior.
- **FR-005**: No início de cada turno (finalizar, processar em lote, avançar o turno), o sistema MUST registrar,
  para cada ator com ação repetida ativa, uma ação desse turno com o texto da repetição, marcada como repetida,
  atribuída ao dono da repetição, visível no chat, no balão, no resumo e nos dados do turno como as demais.
- **FR-006**: Declarar outra ação para o mesmo ator (qualquer caminho) MUST desativar a ação repetida dele; a ação
  repetida já aplicada no turno em curso é substituída como qualquer ação (fica como "Ação cancelada").
- **FR-007**: O processamento em lote do turno MUST aceitar, por personagem e por NPC, o pedido de remover a ação
  repetida, aplicado antes do início do turno seguinte.
- **FR-008**: Os dados do turno e as entradas lidos por quem processa MUST indicar quais ações são repetidas e qual
  repetição está ativa por ator.
- **FR-009**: As skills `processar-turno` e `gm` (em `c:\repos\gurps-adventure`, como arquivos) MUST mostrar a ação
  repetida como tal e, quando julgarem o objetivo cumprido, pedir a remoção no fechamento do turno e dizer na narração
  que a ação terminou.
- **FR-010**: O menu da peça MUST mostrar a postura como uma linha de 3 ícones (o atual marcado e inativo) e MUST
  separar só os grupos, sem linhas entre itens do mesmo grupo.
- **FR-011**: A ação repetida MUST ser acessível pela ferramenta de IA (ativar, ler e remover), como as demais ações.
- **FR-012**: Uma ação repetida aplicada conta como ação do ator para a lista de quem falta e para o "Falta…" (Q1 = B).
- **FR-013**: O Modo GM MUST rodar sozinho só quando todos os personagens têm ação **e** pelo menos uma das ações do
  turno não foi aplicada automaticamente pela repetição (Q1 = B).
- **FR-014**: Ativar uma ação repetida para um ator sem ação válida no turno em curso MUST registrá-la já nesse turno
  (Q2 = A), como uma declaração do ator (conta para o Modo GM); com ação já declarada, a repetição começa no próximo
  turno.

### Key Entities *(include if feature involves data)*

- **Ação repetida**: o texto que vale como ação de um ator a cada início de turno, quem a definiu, quando, e se está
  ativa; uma por ator (participação de personagem ou instância de NPC).
- **Ação (existente)**: ganha a marca "repetida" quando foi registrada pela repetição.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com uma ação repetida ativa, o personagem tem sua ação registrada em 100% dos turnos seguintes sem
  nenhum passo do jogador, até ela ser removida, substituída ou encerrada.
- **SC-002**: Declarar outra ação desativa a repetição em 100% dos casos; nenhum turno seguinte a recebe.
- **SC-003**: Uma repetição removida por quem processa não aparece no turno seguinte em 100% dos casos.
- **SC-004**: O menu da peça de um personagem próprio fica pelo menos 2 linhas mais baixo que hoje (a postura passa
  de 4 linhas para 1).
- **SC-005**: Ativar uma ação repetida leva no máximo 3 passos a partir do menu (opção, texto, confirmar).

## Assumptions

- "Adicionada à ação no início de cada turno" = registrada como **a** ação do ator no turno novo (cada ator tem uma
  ação válida por turno, 044/073).
- Quem pode ativar/remover é quem pode agir com a peça (o dono do personagem, o mestre, quem comanda o aliado); o
  mestre pode remover a de qualquer ator da campanha.
- A ação repetida é só texto (sem alvo "Agir sobre…" e sem sussurro); uma repetição de "Agir sobre" fica para depois.
- O grupo "Ação" do menu fica: "Agir sobre…", "Agir", "Ação repetida…".
- Só a repetição é guardada; cada turno recebe uma ação comum marcada, que entra em todas as regras de turno já
  existentes.

## Clarifications

### Session 2026-10-21

- Q1: Uma ação repetida conta como "já agiu"? → **B**: conta para a lista de quem falta e para o "Falta…" (o
  personagem com ação repetida aplicada não está pendente), mas o **Modo GM só roda sozinho se pelo menos uma ação do
  turno foi declarada por alguém** (não repetida); um turno só de ações repetidas espera um jogador ou o mestre.
- Q2: Ao ativar no meio do turno, já vale para o turno em curso? → **A**: sim; se o ator ainda não tem ação válida no
  turno, a repetição é registrada como ação dele na hora (e conta como a declaração dele nesse turno).
