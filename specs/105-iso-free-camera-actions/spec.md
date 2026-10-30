# Feature Specification: Câmera livre e jogo completo na vista isométrica

**Feature Branch**: `105-iso-free-camera-actions`
**Created**: 2026-10-30
**Status**: Draft
**Input**: User description: "Melhoria no 3D isometrico: A camara não fica mais travada em um PJ; Deve mover a camera livremente com o mouse botão direito; Move a posição da camera com o mouse botão esquerdo; O balão de ação deve ficar acima da cabeça do personagem; Deve funciona como o 2D, quando passar o mouse deve ficar transparente; O menu de ações tb deve ficar disponível no isometrico; Ao selecionar o tipo de mapa, no 3D coloque \"3D (legado)\"; O 3D antigo irá virar legado, colocaremos esforço no isometrico; Inclua todas as funcionalidades de movimento q existem no 2D no isometrico"

## Contexto

A vista isométrica (103/104) mostra o mapa plano com a grid, um círculo de luz e as peças como miniaturas de mesa, mas
hoje serve só para **olhar**: a câmera fica presa ao personagem em foco (arrastar só gira/inclina, não dá para deslizar
pelo mapa), os balões de ação não ficam presos à cabeça de forma confiável, não há menu do hex e nada se move por ela —
para agir ou mover é preciso voltar ao 2D. Esta funcionalidade torna a isométrica uma **vista de jogo completa**,
equivalente ao 2D, e passa a tratar a vista 3D em primeira/terceira pessoa (081) como **legado**: ela continua
disponível, sem novos investimentos, com o nome "3D (legado)" no seletor.

## Clarifications

### Session 2026-10-30

- Q: Quando a câmera desliza pelo mapa, o que acontece com o círculo de luz? → A: A luz acompanha o centro da câmera,
  como uma lanterna levada pelo usuário (B).
- Q: O jogador pode levar a câmera (e a luz) para qualquer lugar do mapa? → A: Sim, todos (mestre e jogadores); a luz é
  só ambientação e não esconde nada que o 2D já mostra (A).
- Pedido após a implementação: retirar a combo de foco do PJ da isométrica → A combo sai; a câmera só começa no
  personagem do usuário e depois é movida apenas pelo usuário.
- Pedido após a implementação: retirar a combo de raio e deixar fixo em 6 → A combo sai; o raio da luz é sempre 6
  hexágonos (nada guardado no aparelho).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Câmera livre (Priority: P1)

Na isométrica o usuário passeia pelo mapa como quiser: **arrastando com o botão esquerdo** a câmera desliza pelo mapa
(o chão acompanha o mouse); **arrastando com o botão direito** ela gira em volta do ponto que está olhando e inclina;
a roda continua aproximando e afastando. O círculo de luz vai junto com a câmera: fica sempre no ponto que a câmera está
olhando, como uma lanterna que o usuário leva pelo mapa. A câmera não fica mais presa ao personagem: ele só define onde a
vista começa e para onde ela volta quando o usuário pede.

**Why this priority**: É a base de tudo — sem poder olhar qualquer ponto do mapa não dá para escolher destinos, alvos
ou abrir menus longe do personagem.

**Independent Test**: Abrir a isométrica, arrastar com o botão esquerdo até o outro lado do mapa, girar com o direito,
dar zoom — nada disso move peças nem muda o mapa.

**Acceptance Scenarios**:

1. **Given** a isométrica aberta, **When** o usuário arrasta com o botão esquerdo, **Then** a câmera desliza pelo mapa
   na direção do arraste, o ponto do chão sob o mouse acompanha o ponteiro, o círculo de luz acompanha o centro da vista,
   e o ângulo e o zoom não mudam.
2. **Given** a isométrica aberta, **When** o usuário arrasta com o botão direito, **Then** a câmera gira em volta do
   ponto que está no centro da tela (horizontal) e inclina (vertical), dentro dos limites de inclinação de hoje.
3. **Given** um arraste com o botão direito, **When** o botão é solto, **Then** nenhum menu de contexto do navegador
   aparece.
4. **Given** a câmera deslizada para longe, **When** a peça do personagem se move ou outro evento do mapa chega,
   **Then** a câmera **não** pula de volta para o personagem.
5. **Given** a isométrica aberta, **When** o usuário procura um seletor de foco, **Then** não há nenhum: a câmera só se move
   pelos gestos do usuário.
6. **Given** o arraste, **When** a câmera chega à borda do mapa, **Then** ela para de deslizar (o centro da vista nunca
   sai do mapa).
7. **Given** uma tela de toque, **When** o usuário arrasta com um dedo, **Then** a câmera desliza; **When** usa dois
   dedos, **Then** aproxima/afasta (pinça) e gira (torção).

---

### User Story 2 — Menu do hex e ações na isométrica (Priority: P1)

Um clique (sem arrastar) num hex da isométrica abre o **mesmo menu** que o 2D abre naquele hex, com as mesmas opções e
permissões: Agir, Agir sobre…, Ação repetida…, Mover, Postura, Incluir/Alterar token, Editar NPC, Retirar do mapa etc.
O hex clicado fica destacado enquanto o menu está aberto, e o hex sob o mouse é destacado ao passar, como no 2D.

**Why this priority**: Sem o menu ninguém joga pela isométrica; é o que a torna utilizável no lugar do 2D.

**Independent Test**: Como jogador, clicar na peça do próprio personagem na isométrica e declarar uma ação pelo menu; como
mestre, clicar num hex vazio e incluir um token; conferir que as opções mostradas são as mesmas do 2D para o mesmo hex.

**Acceptance Scenarios**:

1. **Given** a isométrica, **When** o usuário clica (sem arrastar) num hex dentro do mapa, **Then** abre o menu do hex
   com exatamente as opções que o 2D mostraria para esse usuário nesse hex.
2. **Given** o mouse parado sobre o chão, **When** ele passa por um hex, **Then** o hex (ou a forma inteira da peça que o
   ocupa) é destacado como no 2D.
3. **Given** um clique sobre o desenho de uma miniatura (corpo, base), **When** o clique é feito, **Then** vale o hex
   dessa peça, não o hex do chão atrás dela.
4. **Given** um arraste com o botão esquerdo de qualquer distância acima de alguns pixels, **When** o botão é solto,
   **Then** nenhum menu abre (foi movimento de câmera).
5. **Given** "Agir sobre…", **When** o usuário clica num hex ou peça na isométrica, **Then** o alvo é escolhido como no
   2D (Esc, clique direito ou clique fora do mapa cancelam).
6. **Given** um hex fora do círculo de luz, **When** o usuário clica nele, **Then** o menu abre normalmente (a luz é só
   visual; o que se pode fazer não muda).

---

### User Story 3 — Mover peças na isométrica (Priority: P1)

Tudo o que o 2D oferece para mover peças funciona igual na isométrica: "Mover" com o caminho até o destino, o custo
gasto/total, a escolha da direção final e a confirmação; o modo livre sem custo e com bloqueio de hex ocupado; arrastar
os cartões do grupo e de NPCs para colocar peças no mapa; e os rastros dos movimentos do turno.

**Why this priority**: O pedido diz explicitamente "todas as funcionalidades de movimento do 2D"; sem isso a isométrica
continua exigindo voltar ao 2D a cada turno.

**Independent Test**: Num turno normal, mover o próprio personagem pela isométrica até um hex dentro do Deslocamento,
escolhendo a direção; conferir no 2D a mesma posição, direção e rastro; repetir em modo livre e arrastando um cartão do
grupo para o mapa.

**Acceptance Scenarios**:

1. **Given** "Mover" escolhido no menu, **When** o usuário passa o mouse pelos hexes, **Then** o caminho até o hex sob o
   mouse aparece no chão com a mesma cor de ok/excesso do 2D e o contador gasto/total é mostrado.
2. **Given** o destino escolhido com um clique, **When** o usuário move o mouse, **Then** a peça gira para a direção
   apontada; **When** clica de novo, **Then** o movimento é salvo como no 2D (mesma regra de custo, mesma validação no
   servidor).
3. **Given** um movimento em andamento, **When** o usuário aperta Esc ou clica com o botão direito sem arrastar, **Then**
   o movimento é cancelado; **When** arrasta com o botão direito, **Then** a câmera gira e o movimento continua.
4. **Given** um movimento em andamento, **When** o usuário arrasta com o botão esquerdo, **Then** a câmera desliza e o
   movimento continua (só um clique sem arrastar escolhe destino/direção).
5. **Given** o modo livre, **When** o usuário move uma peça, **Then** não há custo nem contador, hexes ocupados ficam
   bloqueados em vermelho com o mesmo aviso do 2D.
6. **Given** um cartão do grupo ou de NPC arrastado sobre a isométrica, **When** é solto num hex, **Then** acontece o que
   o 2D faria nesse hex (colocar, mover, abrir a escolha de token, criar a instância do NPC), com o hex destacado durante
   o arraste.
7. **Given** uma tela de toque e um movimento em andamento, **When** o usuário toca um hex, **Then** ele vê a prévia;
   **When** toca de novo, **Then** confirma (como no 2D).
8. **Given** a peça muda por baixo (outro usuário a moveu) ou a edição deixa de ser permitida, **When** isso acontece,
   **Then** o movimento é cancelado como no 2D.

---

### User Story 4 — Balões de ação acima da cabeça, transparentes ao passar o mouse (Priority: P2)

O balão com a ação (ou fala) de uma peça fica **acima da cabeça** da miniatura, com a ponta apontando para ela, e
acompanha a cabeça quando a câmera desliza, gira ou aproxima. Quando o mouse passa por cima de um balão ele fica
transparente, como no 2D, para deixar ver o que está atrás, e cliques atravessam o balão.

**Why this priority**: Com a câmera livre, balões soltos ou cobrindo peças atrapalham o jogo, mas a vista já é usável
sem este ajuste.

**Independent Test**: Declarar uma ação com uma peça; na isométrica o balão aparece sobre a cabeça; girar e deslizar a
câmera e ver o balão acompanhar; passar o mouse por cima e ver o mapa através dele; clicar através dele num hex.

**Acceptance Scenarios**:

1. **Given** uma peça em pé com uma ação no turno, **When** a isométrica é desenhada, **Then** o balão fica logo acima da
   cabeça da miniatura (modelo, figura ou imagem), com a ponta apontando para ela.
2. **Given** uma peça caída, **When** a vista é desenhada, **Then** o balão fica acima do ponto mais alto da miniatura
   deitada.
3. **Given** a câmera deslizando, girando ou com zoom, **When** a vista muda, **Then** o balão acompanha a cabeça sem
   atraso perceptível.
4. **Given** o mouse sobre um balão, **When** ele está por cima, **Then** o balão fica transparente; **When** sai,
   **Then** volta ao normal.
5. **Given** um balão sobre um hex, **When** o usuário clica ali, **Then** o clique vale para o hex/peça atrás dele.

---

### User Story 5 — "3D (legado)" no seletor de vista (Priority: P3)

No seletor de tipo de mapa, a opção da vista 3D antiga passa a se chamar **"3D (legado)"**. A isométrica é a vista 3D
recomendada.

**Why this priority**: Só muda um rótulo, mas deixa clara a direção do produto.

**Independent Test**: Abrir o seletor de vista e ver "Mapa 2D", "Isométrica" e "3D (legado)"; escolher "3D (legado)" e
ver a vista antiga funcionando como hoje.

**Acceptance Scenarios**:

1. **Given** o seletor de vista aberto, **When** o usuário lê as opções, **Then** vê "Mapa 2D", "Isométrica" e
   "3D (legado)", nessa ordem.
2. **Given** "3D (legado)", **When** escolhido, **Then** a vista antiga abre e se comporta exatamente como hoje.
3. **Given** um usuário que deixou um mapa na vista antiga, **When** volta a esse mapa, **Then** ele reabre na vista
   antiga (a escolha lembrada não muda).

---

### Edge Cases

- Clique com arraste mínimo (tremor da mão): até alguns pixels conta como clique, acima disso como movimento de câmera
  — o mesmo limiar do 2D.
- Botões esquerdo e direito ao mesmo tempo: não há caminhada na isométrica; a câmera atende ao primeiro botão pressionado.
- Câmera muito inclinada e longe: o clique continua escolhendo o hex certo do chão; cliques no céu/fora do mapa não abrem
  menu e, em "Agir sobre…", cancelam como no 2D.
- Miniaturas sobrepostas na tela (uma na frente da outra): vale a peça desenhada na frente sob o mouse.
- Peça fora do círculo de luz (invisível): clicar no hex dela abre o menu daquele hex, com a peça, como no 2D.
- Campanha congelada (em preparação/pausada/finalizada) ou modo sem permissão: o menu e o movimento seguem as mesmas
  regras do 2D (opções escondidas ou desabilitadas).
- Trocar de vista (2D ↔ isométrica) com o menu aberto, um movimento ou uma escolha de alvo em andamento: tudo é cancelado
  sem salvar nada.
- Balão de uma peça fora da tela ou fora do círculo de luz: não aparece.
- Peça que some (retirada do mapa) com o menu aberto ou movimento em andamento: o menu fecha / o movimento é cancelado.
- Celular (< 768 px) sem mouse: deslizar, pinça e torção substituem os botões; o toque curto abre o menu.

## Requirements *(mandatory)*

### Functional Requirements

**Câmera**

- **FR-001**: A câmera da isométrica MUST deslizar pelo mapa com arraste do botão esquerdo, mantendo o ponto do chão sob
  o ponteiro, sem mudar ângulo nem zoom.
- **FR-002**: A câmera MUST girar (horizontal) e inclinar (vertical) em volta do ponto central da vista com arraste do
  botão direito, respeitando os limites de inclinação e zoom atuais; o menu de contexto do navegador MUST ser suprimido
  na vista.
- **FR-003**: A câmera MUST NOT seguir automaticamente nenhuma peça: movimentos de peças, eventos em tempo real e
  recargas não mudam onde a câmera está olhando.
- **FR-004**: Ao abrir a vista, a câmera MUST começar olhando para o foco atual (o personagem do usuário, senão o primeiro
  do grupo com peça, senão o meio do mapa); não há seletor de foco.
- **FR-005**: O centro da vista MUST permanecer dentro dos limites do mapa durante o deslizar; dentro deles não há outro
  limite, para nenhum papel (mestre ou jogador).
- **FR-006**: Em telas de toque: um dedo desliza, dois dedos aproximam/afastam e giram; um toque curto equivale a um
  clique.
- **FR-007**: O círculo de luz MUST ficar centrado no ponto do chão que a câmera está olhando (o centro da vista) e
  acompanhá-lo a cada quadro ao deslizar; girar, inclinar e dar zoom não o deslocam. O raio é fixo em
  6 hexágonos (sem seletor).

**Menu e seleção**

- **FR-008**: Um clique sem arraste num hex do mapa MUST abrir o mesmo menu do hex do 2D, com as mesmas opções,
  permissões e ações, para o mesmo usuário e hex.
- **FR-009**: O hex sob o ponteiro MUST ser destacado (a forma inteira da peça que o ocupa), e o hex do menu aberto MUST
  ficar destacado enquanto o menu está aberto, com as mesmas cores do 2D.
- **FR-010**: Um clique sobre o desenho de uma miniatura MUST valer para o hex dessa peça; quando várias se sobrepõem na
  tela, vale a desenhada na frente.
- **FR-011**: "Agir sobre…" MUST funcionar na isométrica com as mesmas regras de escolha e cancelamento do 2D.
- **FR-012**: A luz MUST ser apenas visual: hexes e peças fora do círculo continuam clicáveis com o mesmo menu.

**Movimento**

- **FR-013**: "Mover" MUST funcionar na isométrica com as mesmas fases (caminho → direção), regras de custo, cores
  ok/excesso/bloqueado, contador gasto/total e confirmação do 2D, salvando pela mesma operação.
- **FR-014**: O caminho e a prévia da peça no destino/direção MUST ser desenhados no chão e na miniatura da isométrica.
- **FR-015**: Esc e clique direito sem arraste MUST cancelar o movimento; arrastes (esquerdo ou direito) MUST mover a
  câmera sem cancelar.
- **FR-016**: O modo livre MUST valer na isométrica como no 2D (sem custo/contador, bloqueio de hex ocupado com o mesmo
  aviso, sem rastros).
- **FR-017**: Arrastar cartões do grupo e de NPCs sobre a isométrica MUST destacar o hex de destino e, ao soltar, fazer o
  mesmo que o 2D faria naquele hex.
- **FR-018**: O cancelamento automático do 2D (peça alterada por outro, edição proibida, troca de mapa, troca do modo
  livre) MUST valer na isométrica.
- **FR-019**: Trocar de vista MUST cancelar menu, movimento e escolha de alvo em andamento, sem salvar.

**Balões**

- **FR-020**: O balão de ação/fala MUST ficar acima da cabeça da miniatura em pé (ou do ponto mais alto quando deitada),
  com a ponta apontando para ela, acompanhando a câmera a cada quadro.
- **FR-021**: Um balão MUST ficar transparente enquanto o ponteiro está sobre ele, e cliques MUST atravessá-lo até o
  mapa.

**Vista legada**

- **FR-022**: O seletor de vista MUST mostrar "Mapa 2D", "Isométrica" e "3D (legado)"; a vista antiga MUST continuar
  funcionando sem mudanças além do rótulo.
- **FR-023**: Nenhuma mudança de servidor, de dados salvos ou de regras de jogo: a isométrica usa as mesmas operações e
  validações do 2D.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador consegue jogar um turno inteiro (ver o mapa, declarar a ação, mover o personagem) sem sair da
  isométrica, em 100% dos casos que o 2D permite.
- **SC-002**: Para qualquer hex, o menu da isométrica mostra exatamente as mesmas opções que o 2D mostra ao mesmo
  usuário (0 diferenças numa conferência de pelo menos 10 situações: próprio personagem, aliado comandado, NPC, objeto,
  hex vazio, mestre, jogador, campanha pausada, modo livre, peça caída).
- **SC-003**: O movimento feito na isométrica resulta na mesma posição, direção, custo e rastro que o mesmo movimento
  feito no 2D.
- **SC-004**: Em 95% dos cliques o hex escolhido é o que o usuário apontou, inclusive com a câmera inclinada no mínimo e
  no máximo.
- **SC-005**: Um usuário chega a qualquer ponto do mapa deslizando a câmera em menos de 5 segundos, sem trocar de vista.
- **SC-006**: Os balões permanecem sobre a cabeça da peça certa durante giro, deslize e zoom, sem atraso visível
  (acompanham no mesmo quadro).

## Assumptions

- "Mover a câmera livremente com o botão direito" = girar e inclinar em volta do ponto olhado; "mover a posição com o
  botão esquerdo" = deslizar pelo mapa (pan). Zoom continua na roda/pinça/botões +−.
- O círculo de luz deixa de ser preso ao personagem: é uma lanterna no centro da vista (Clarifications). O foco passa a
  ser só o ponto inicial da câmera; as combos de foco e de raio foram retiradas (raio fixo em 6).
- Clicar numa peça iluminada deixa de trocar o foco (o clique passa a abrir o menu); não há mais troca de foco.
- "Quando passar o mouse deve ficar transparente" refere-se aos balões, como no 2D.
- O menu, as janelas (Agir, Ação repetida, token, NPC) e os avisos são os mesmos componentes do 2D; nada novo no servidor.
- A vista 3D antiga continua disponível e funcional, mas sem novas funcionalidades (legado); removê-la não faz parte
  desta entrega.
- Redimensionar/ajustar a imagem do mapa e editar o mapa continuam só no 2D.
- Caminhada do modo livre (que só existe na vista antiga) não é trazida para a isométrica.
