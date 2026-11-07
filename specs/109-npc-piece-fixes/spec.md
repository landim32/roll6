# Feature Specification: Peças de NPC e de objeto — postura, arrasto, retirada e painel

**Feature Branch**: `109-npc-piece-fixes`
**Created**: 2026-11-07
**Status**: Draft
**Input**: User description: "Melhorias: os tokens também devem ter a opção de postura (em pé, caídos ou Fora de Combate); ao arrastar um NPC que está agrupado parece arrastar o grupo todo, deve arrastar apenas a unidade; parece que há algum bug que coloca um NPC no meio do mapa, investigue; quando existem muitos NPCs os botões do menu de zoom ficam em cima do card de NPCs; quando retirar do mapa um NPC que caiu, deixe o token sem ligação com o NPC no mapa."

## Contexto observado (investigação inicial)

- Hoje só peças de personagem e de NPC têm postura; uma peça de **objeto** (token solto, "Incluir token" no menu do hex) não pode mudar de postura — o servidor recusa.
- O card de um NPC no painel lista todas as suas instâncias no mapa aberto ("Guarda", "Guarda 2"…). O card inteiro é a área de arrasto: a imagem arrastada é o card com todas as instâncias, e soltá-lo cria **mais uma** instância. Não há como arrastar uma instância específica.
- **Bug de peça duplicada** (confirmado pelo usuário): uma única inclusão de NPC grava **duas** peças — uma no hex escolhido e outra no hex livre mais próximo do meio do mapa. O único lugar que cria peças de NPC é a criação de instância, e o meio do mapa é o que ela usa quando o pedido chega **sem** hex. Então chegam dois pedidos de criação para uma ação, um com hex e um sem. Na leitura do código, o soltar do card faz um único pedido com hex; os pedidos sem hex vêm de "Incluir NPC" (clicar num NPC que já está na campanha ou incluir um novo com um mapa aberto, 052/076) e da integração MCP sem coordenadas. A causa exata ainda precisa ser reproduzida (ver FR-012).
- O painel de NPCs à direita reserva um espaço fixo para a coluna de botões do mapa (zoom, 2D/3D, compartilhar, editar…). A coluna cresceu e, com muitos NPCs, o painel fica comprido o bastante para ficar por baixo dos botões.
- Retirar uma instância do mapa apaga a peça junto; não sobra nada no hex, nem quando o NPC estava caído.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retirar um NPC caído deixa o corpo no mapa (Priority: P1)

O mestre derruba um inimigo durante a luta e quer tirá-lo do painel de NPCs (ele não age mais), mas sem que o corpo desapareça do mapa. Ao retirar do mapa uma instância caída, a peça fica onde estava, com a mesma imagem e postura, mas vira uma peça de objeto, sem ligação com o NPC.

**Why this priority**: É a mudança de regra com mais efeito na mesa e depende da postura em objetos (US2) para que o corpo continue deitado.

**Independent Test**: Com um NPC caído no mapa, retirar a instância pelo X do card ou por "Retirar do mapa" no menu do hex e conferir que a peça permanece no mesmo hex, deitada, cinza de objeto, e que o NPC some do painel.

**Acceptance Scenarios**:

1. **Given** uma instância de NPC com postura Caído num mapa da campanha, **When** o mestre a retira do mapa, **Then** a instância sai do painel e do turno, e no mesmo hex fica uma peça de objeto com o mesmo token, a mesma direção e a postura Caído.
2. **Given** uma instância de NPC Fora de Combate, **When** o mestre a retira do mapa, **Then** o mesmo acontece, com a peça de objeto em Fora de Combate.
3. **Given** uma instância de NPC Em pé, **When** o mestre a retira do mapa, **Then** a peça é apagada como hoje.
4. **Given** um corpo deixado no mapa, **When** qualquer pessoa olha a peça, **Then** ela se comporta como qualquer objeto: o mestre pode movê-la, trocar o token, mudar a postura ou apagá-la; ela não tem vida, energia, status nem turno.
5. **Given** registros de turno da instância retirada, **When** se lê o chat ou o resumo do turno, **Then** os registros continuam lá, como hoje.

---

### User Story 2 - Postura em peças de objeto (Priority: P1)

O mestre põe tokens soltos no mapa (um corpo, uma estátua tombada, um barril derrubado) e quer marcá-los como Em pé, Caído ou Fora de Combate, com o mesmo desenho das outras peças.

**Why this priority**: Pedido direto e base da US1.

**Independent Test**: Incluir um token de objeto num hex, abrir o menu da peça, trocar a postura entre as três opções e conferir o desenho no 2D, no isométrico e no JPEG compartilhado.

**Acceptance Scenarios**:

1. **Given** uma peça de objeto no mapa, **When** o mestre abre o menu do hex, **Then** vê o grupo "Postura" com Em pé, Caído e Fora de Combate, com a postura atual marcada.
2. **Given** uma peça de objeto Em pé, **When** o mestre escolhe Caído, **Then** ela é desenhada deitada (imagem "Caído" do token, ou a imagem em pé virada) e passa a ocupar o espaço "caído" do token; Fora de Combate a desenha também em preto e branco.
3. **Given** uma mudança de postura de objeto, **When** os outros participantes que veem o mapa estão conectados, **Then** veem a mudança sem recarregar.
4. **Given** um jogador, **When** abre o menu de uma peça de objeto, **Then** não vê o grupo Postura (só o mestre mexe em objetos).
5. **Given** um objeto passando para Caído num lugar onde a forma deitada não cabe livre, **When** a postura muda, **Then** a mudança é aceita (como nas outras peças, a sobreposição dura até a peça ser movida).

---

### User Story 3 - Arrastar uma instância de NPC, não o grupo (Priority: P2)

Quando um NPC tem várias instâncias no mapa, o mestre quer arrastar só uma delas — e quer ver só uma unidade sendo arrastada.

**Why this priority**: Corrige uma interação que hoje engana (parece mover o grupo todo).

**Independent Test**: Com "Guarda" e "Guarda 2" no mapa, arrastar a linha de "Guarda 2" para outro hex livre e conferir que só ela se move; arrastar o cabeçalho do card e conferir que entra uma nova instância e que a imagem arrastada é uma única unidade.

**Acceptance Scenarios**:

1. **Given** um card de NPC com várias instâncias, **When** o mestre começa a arrastar, **Then** a imagem que acompanha o ponteiro é de uma única unidade (retrato + nome), nunca o card inteiro.
2. **Given** a linha de uma instância no card, **When** o mestre a arrasta e solta num hex livre do mapa aberto, **Then** só aquela instância vai para o hex (mesmas regras de um "Mover" do mestre), sem criar outra.
3. **Given** o cabeçalho do card (retrato/nome do NPC), **When** o mestre o arrasta e solta num hex livre, **Then** cria uma nova instância nesse hex, como hoje.
4. **Given** um hex ocupado ou onde a forma não cabe, **When** o mestre solta ali uma instância ou o cabeçalho, **Then** nada muda e aparece o aviso de hex ocupado / não cabe.
5. **Given** um aliado mostrado sob o card do seu personagem-mestre, **When** o mestre o arrasta, **Then** vale a mesma regra (instância move, cabeçalho cria).

---

### User Story 4 - Uma inclusão de NPC grava uma única peça (Priority: P1)

Ao pôr um NPC no mapa, aparecem duas peças: uma onde o mestre escolheu e outra no meio do mapa. Cada inclusão tem de criar exatamente uma instância e uma peça.

**Why this priority**: É um bug que grava dados errados (instâncias a mais, com turno próprio e nomes "Guarda 2" indevidos).

**Independent Test**: Repetir cada forma de incluir um NPC no mapa (soltar o card, "Incluir NPC" com NPC novo, "Incluir NPC" com NPC já na campanha, MCP com e sem hex) e contar as instâncias e peças criadas: sempre uma.

**Acceptance Scenarios**:

1. **Given** um mapa da campanha aberto, **When** o mestre solta o card de um NPC num hex livre, **Then** é criada exatamente uma instância, com a peça nesse hex, e nenhuma no meio do mapa.
2. **Given** "Incluir NPC" com um NPC que ainda não está na campanha, **When** o mestre o inclui com um mapa aberto, **Then** ele entra na campanha e ganha exatamente uma instância, no hex livre mais próximo do meio, como hoje.
3. **Given** "Incluir NPC" com um NPC que já está na campanha, **When** o mestre clica nele, **Then** é criada exatamente uma nova instância, no hex livre mais próximo do meio, como hoje.
4. **Given** qualquer caminho que mova uma peça de NPC (Mover, resetar ação, processar turno, transferências, eventos em tempo real), **When** ele termina, **Then** nenhuma peça nova aparece.
5. **Given** a causa identificada, **When** a correção é entregue, **Then** há um teste que reproduz a duplicação e passa.

---

### User Story 5 - Painel de NPCs não fica sob os botões do mapa (Priority: P3)

Com muitos NPCs, o painel da direita cresce e fica embaixo da coluna de botões (zoom, vista, compartilhar, editar). Os botões e os cards precisam ficar acessíveis.

**Why this priority**: Problema visual que atrapalha, mas tem contorno (recolher o painel).

**Independent Test**: Abrir um mapa com 10+ NPCs no painel, em desktop e em celular, nos layouts mapa e dividido, com o modo de edição ligado e desligado, e conferir que nenhum card fica sob os botões e que o painel rola.

**Acceptance Scenarios**:

1. **Given** um painel de NPCs mais alto que o espaço livre, **When** o mapa é exibido, **Then** o painel termina acima do primeiro botão da coluna e rola por dentro.
2. **Given** a coluna de botões muda de altura (editar mapa ligado, botões extras, celular, layout dividido), **When** isso acontece, **Then** o painel se ajusta sem sobrepor.
3. **Given** poucos NPCs, **When** o mapa é exibido, **Then** o painel continua do tamanho do conteúdo.

---

### Edge Cases

- Retirar um NPC caído cujo token foi depois apagado da biblioteca: tokens em uso por objetos já não podem ser apagados, então o corpo mantém o token; a regra de bloqueio passa a valer para ele.
- Retirar o NPC da campanha (`Retirar da campanha`) com instâncias caídas: as instâncias caídas também deixam seus corpos como objetos; as em pé são apagadas.
- Retirar uma instância caída com uma ação repetida ativa: a repetição é limpa como hoje; o corpo não herda nada do turno.
- Campanha pausada/finalizada: retirar instâncias continua permitido como hoje; mudar postura de objeto segue as mesmas regras de edição do mapa que as outras escritas em peças (só o mestre, mapa editável).
- Arrastar uma instância para o hex em que ela já está: não muda nada.
- Arrastar uma instância cujo card está desatualizado (ela foi retirada por outra pessoa): aviso de erro, nada muda.
- Free mode: arrastar uma instância segue as regras do Mover do mestre no modo livre (sem registro de movimento).
- Telas muito baixas, onde nem um card cabe acima dos botões: o painel mostra pelo menos o título (recolhível) e rola.

## Requirements *(mandatory)*

### Functional Requirements

**Postura de objetos**

- **FR-001**: Peças de objeto MUST ter postura própria, uma das três: Em pé (padrão), Caído, Fora de Combate.
- **FR-002**: Só o mestre MUST poder mudar a postura de uma peça de objeto, pelo grupo "Postura" do menu do hex, com as mesmas regras de edição do mapa que valem para as outras escritas em peças.
- **FR-003**: A postura de um objeto MUST decidir seu desenho e seu espaço exatamente como nas peças de personagem/NPC (deitado com a imagem "Caído" ou a em pé virada; preto e branco em Fora de Combate; espaço "caído" do token fora de Em pé) no 2D, no isométrico (miniatura tombada), na vista 3D e na imagem compartilhada.
- **FR-004**: Mudar a postura de um objeto MUST nunca ser recusado por falta de espaço e MUST chegar em tempo real a quem vê o mapa.
- **FR-005**: Mudar a postura de um objeto MUST NOT gerar registro de turno (objetos não têm turno).
- **FR-006**: A postura de objeto MUST estar disponível também para a integração por API/MCP (a ferramenta de postura de peça passa a aceitar objetos).

**Retirada de NPC caído**

- **FR-007**: Ao retirar do mapa uma instância de NPC com postura Caído ou Fora de Combate (pelo X do card, por "Retirar do mapa" no menu do hex, pela retirada do NPC da campanha ou pela API/MCP), o sistema MUST manter a peça no mesmo hex e direção, com o mesmo token e a mesma postura, convertida em peça de objeto sem ligação com o NPC ou a instância.
- **FR-008**: Instâncias Em pé MUST continuar sendo retiradas junto com a peça, como hoje.
- **FR-009**: A instância retirada MUST seguir as regras atuais de retirada (some do painel e do turno, registros de turno preservados, ação repetida limpa).

**Arrasto de NPC**

- **FR-010**: A imagem de arrasto de um card de NPC MUST mostrar uma única unidade.
- **FR-011**: Arrastar a linha de uma instância e soltá-la num hex MUST mover só aquela instância, com as regras do "Mover" do mestre (forma dentro da grade e livre; registro de movimento conforme o modo da campanha); arrastar o cabeçalho do card MUST continuar criando uma nova instância.

**Peça duplicada**

- **FR-012**: A causa da peça duplicada (uma no hex escolhido, outra no meio do mapa) MUST ser reproduzida em todos os caminhos que criam instâncias (soltar card, "Incluir NPC" com NPC novo ou já na campanha, API/MCP), registrada no plano e corrigida, com um teste que reproduza o caso.
- **FR-013**: Cada pedido de inclusão do mestre MUST criar exatamente uma instância e uma peça; um mesmo gesto MUST NOT gerar dois pedidos de criação. O posicionamento automático no hex livre mais próximo do meio continua como hoje, só para os caminhos que já o usam ("Incluir NPC" e API/MCP sem hex).

**Painel de NPCs**

- **FR-014**: O painel de NPCs MUST nunca ficar sob a coluna de botões do mapa, em nenhum layout, tamanho de tela ou estado do modo de edição; quando não couber, MUST rolar por dentro.

### Key Entities

- **Peça de objeto**: peça do mapa sem personagem nem NPC (token solto); ganha postura própria.
- **Instância de NPC**: ocorrência de um NPC num mapa, com sua peça; ao ser retirada caída, sua peça vira peça de objeto.
- **Card de NPC**: entrada do painel com cabeçalho (o NPC) e linhas (as instâncias no mapa aberto); cada parte tem seu próprio arrasto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das retiradas de instâncias caídas ou fora de combate, o corpo permanece no mesmo hex com a mesma postura; em 100% das retiradas de instâncias em pé, nada sobra.
- **SC-002**: O mestre muda a postura de um objeto em no máximo 2 cliques a partir da peça, e os outros participantes conectados veem a mudança em até 2 segundos.
- **SC-003**: Arrastar uma instância move exatamente uma peça; nenhum arrasto produz mais de uma peça nova.
- **SC-004**: Em 100% das inclusões de NPC, por qualquer caminho, é criada exatamente uma instância e uma peça, comprovado por teste de cada caminho.
- **SC-005**: Com 15 NPCs no painel, em desktop e em celular, nos layouts mapa e dividido, 0 cards ficam sob os botões e todos ficam alcançáveis rolando o painel.

## Assumptions

- "Tokens" no pedido = peças de objeto (tokens soltos no mapa); personagens e NPCs já têm postura.
- "Que caiu" inclui Caído e Fora de Combate; só Em pé some ao ser retirado.
- O corpo deixado no mapa guarda o nome da instância como nome da peça (para o mestre reconhecer quem era), mas nenhum dado de vida/energia/status.
- A regra de corpo vale para todas as formas de retirar instâncias (card, menu do hex, retirada da campanha, API/MCP), para ser previsível.
- Arrastar uma instância é exclusivo do mestre, como o arrasto de cards hoje; o comandante de um aliado continua movendo pelo "Mover".
- Sem mudanças nas vistas além do desenho de postura de objetos; a pintura do mapa e as marcações não interagem com essas regras.

