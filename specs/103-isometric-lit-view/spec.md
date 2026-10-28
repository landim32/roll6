# Feature Specification: Vista isométrica iluminada

**Feature Branch**: `103-isometric-lit-view`
**Created**: 2026-10-27
**Status**: Draft
**Input**: User description: "Crie outra versão do 3D: é uma versão totalmente diferente do 3D, no cenário é um desenvolvimento novo, a estrutura dos modelos pode ser aproveitada; ao mudar para o modo 3D deve ter as duas opções, esse isométrico ou o 3D atual; essa versão é isométrica, o usuário pode mudar o ângulo da câmera e dar zoom; os modelos ficam parados, na posição parado por enquanto; deve exibir a grid hexagonal no chão, sobre a imagem do mapa; só deve ser exibido um círculo do tamanho de um determinado raio da posição do personagem do usuário, inicialmente 5 hexágonos; nessa opção do 3D não existe mais a máscara do mapa, não exibe paredes, o mapa é plano; fora desse raio deve ficar tudo escuro, como se viesse uma luz de cima e só iluminasse esse círculo; até a imagem do mapa deve ficar escura fora do círculo; se um modelo estiver metade dentro do círculo e a outra metade fora, deve aparecer apenas a metade de dentro; se possível colocar algum efeito de escuridão ou névoa fora do círculo"

## Contexto

Hoje o botão 2D/3D do mapa troca o mapa plano pela vista 3D em primeira/terceira pessoa (081): terreno levantado a partir
da máscara 3D, paredes, céu, câmera atrás do personagem e, no modo livre, a caminhada. Esta funcionalidade cria uma
**segunda vista 3D, independente da atual**: uma vista **isométrica**, vista de cima e de lado, de um mapa **plano** (sem
máscara, sem paredes, sem céu), com a grid hexagonal desenhada no chão e um **círculo de luz** em volta do personagem do
usuário — só o que está dentro dele aparece; o resto fica no escuro, como uma lanterna vinda de cima. As peças usam os
mesmos modelos e figuras dos tokens que a vista 3D atual usa, mas **paradas**, na pose de "Parado".

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Escolher entre a vista isométrica e o 3D atual (Priority: P1)

Ao sair do 2D, o usuário escolhe qual vista 3D quer: **"Isométrica"** ou **"3D"** (a atual). A escolha é lembrada, e voltar
ao 2D continua sendo um clique.

**Why this priority**: Sem a escolha a vista nova não é alcançável, e a vista atual não pode ser perdida.

**Independent Test**: Num mapa de campanha, abrir a escolha, entrar na isométrica, voltar ao 2D, entrar de novo — a
isométrica é a sugerida; escolher "3D" abre a vista atual igual a hoje.

**Acceptance Scenarios**:

1. **Given** um mapa aberto em 2D, **When** o usuário pede a vista 3D, **Then** ele vê as duas opções, "Isométrica" e "3D".
2. **Given** a opção "3D", **When** escolhida, **Then** a vista atual abre exatamente como hoje (máscara, paredes, caminhada).
3. **Given** o usuário escolheu "Isométrica" num mapa, **When** ele recarrega a página ou volta a esse mapa, **Then** o mapa
   reabre na mesma vista em que estava.
4. **Given** qualquer uma das vistas 3D, **When** o usuário volta ao 2D, **Then** o mapa 2D aparece como sempre.

---

### User Story 2 — O círculo de luz em volta do personagem (Priority: P1)

Na vista isométrica, o usuário vê o mapa plano com a grid hexagonal por cima da imagem. Só um círculo de **5 hexágonos de
raio** em volta da peça do seu personagem está iluminado: dentro dele a imagem do mapa, a grid e as peças aparecem claras;
fora dele tudo — a imagem, a grid e as peças — está no escuro, com uma borda suave e uma névoa escura, como se uma luz
viesse de cima e só alcançasse o círculo. Uma peça que esteja metade dentro e metade fora mostra apenas a metade de dentro.

**Why this priority**: É o coração do pedido: a sensação de explorar no escuro só o que o personagem enxerga.

**Independent Test**: Com o personagem num ponto do mapa e outras peças a 3, 5 e 8 hexágonos dele, abrir a isométrica: as
peças a 3 aparecem inteiras, a de 8 não aparece, a que cruza a borda aparece cortada; a imagem do mapa fora do círculo é
escura.

**Acceptance Scenarios**:

1. **Given** o personagem do usuário no hex (10, 8), **When** a isométrica abre, **Then** o círculo iluminado tem centro na
   peça e raio de 5 hexágonos, e a câmera começa olhando para ele.
2. **Given** uma peça a 3 hexágonos do personagem, **When** a vista é desenhada, **Then** ela aparece inteira e iluminada.
3. **Given** uma peça a 8 hexágonos, **When** a vista é desenhada, **Then** ela não é visível (fica no escuro).
4. **Given** uma peça atravessando a borda do círculo, **When** a vista é desenhada, **Then** só a parte dentro do círculo
   aparece; a parte de fora some no escuro.
5. **Given** a imagem do mapa e a grid, **When** a vista é desenhada, **Then** dentro do círculo estão claras e fora dele
   escurecidas até o preto, com uma transição suave na borda e névoa escura além dela.
6. **Given** o mapa tem máscara 3D, parede ou fundo 360° cadastrados, **When** a isométrica abre, **Then** nada disso aparece:
   o chão é plano.
7. **Given** a peça do personagem muda de hex (por "Mover", outro jogador, o mestre ou o tempo real), **When** a mudança
   chega, **Then** o círculo acompanha a nova posição sem recarregar a vista.

---

### User Story 3 — Girar a câmera e dar zoom (Priority: P2)

O usuário gira a câmera em volta do ponto de interesse (o personagem), muda a inclinação dentro de limites que mantêm o ar
isométrico e aproxima ou afasta com a roda do mouse, o gesto de pinça ou os botões +/− do mapa.

**Why this priority**: O pedido diz que o ângulo e o zoom são do usuário; sem isso a vista é uma imagem fixa.

**Independent Test**: Arrastar gira a vista; a roda, a pinça e +/− aproximam até ver uma peça de perto e afastam até ver o
círculo inteiro com folga; o círculo continua no mesmo lugar do chão.

**Acceptance Scenarios**:

1. **Given** a isométrica aberta, **When** o usuário arrasta horizontalmente, **Then** a câmera gira em volta do personagem.
2. **Given** a isométrica aberta, **When** o usuário arrasta verticalmente, **Then** a inclinação muda entre um limite mais
   deitado e um mais de cima, sem nunca ficar abaixo do chão nem perfeitamente vertical.
3. **Given** a isométrica aberta, **When** o usuário usa a roda, a pinça ou +/−, **Then** o zoom muda entre um mínimo e um
   máximo, centrado no personagem.
4. **Given** uma tela de celular, **When** o usuário usa um dedo para girar e dois para o zoom, **Then** a vista responde sem
   rolar a página.

---

### User Story 4 — As peças paradas, com os modelos dos tokens (Priority: P2)

Cada peça dentro do círculo é desenhada com o que o token tem: o **modelo 3D** na pose "Parado" (sem animação, por
enquanto), senão a figura 2,5D em pé, senão a imagem do token deitada no chão, no tamanho do hex. A peça olha para o lado
para onde está virada no mapa (`look`) e ocupa o tamanho que ocupa no 2D.

**Why this priority**: Aproveita a estrutura dos modelos que já existe e dá sentido à luz; a animação fica para depois.

**Independent Test**: Um token com modelo, um só com figura 2,5D e um só com imagem, todos no círculo: o primeiro aparece
como modelo parado, o segundo como figura em pé, o terceiro como a imagem no chão, cada um virado como no 2D.

**Acceptance Scenarios**:

1. **Given** um token com modelo 3D, **When** a peça está no círculo, **Then** o modelo aparece parado na primeira pose da
   animação de "Parado" (ou na pose de repouso se não houver), sem tocar animação.
2. **Given** um token sem modelo mas com figura 2,5D, **When** a peça está no círculo, **Then** a figura aparece em pé
   mostrando o lado que a câmera vê.
3. **Given** um token só com imagem, **When** a peça está no círculo, **Then** a imagem aparece deitada no chão sobre o hex
   da peça, girada conforme o `look`.
4. **Given** um token com armas nos encaixes, **When** o modelo aparece, **Then** as armas aparecem nos encaixes como na
   vista 3D atual.
5. **Given** a peça muda de lugar, de direção, de token ou é retirada, **When** a mudança chega pelo tempo real, **Then** a
   vista isométrica reflete a mudança.

---

### User Story 5 — Mudar o foco para outro personagem (Priority: P2)

Qualquer usuário — jogador ou mestre — clica em outro personagem e a vista passa a focar nele: a câmera vai para ele e o
círculo de luz passa a ser o dele. **O cenário não é recarregado**: o chão, a grid, as peças e os modelos já carregados
continuam; só mudam o alvo da câmera e a área iluminada. O mestre, que não tem personagem próprio na vista, começa focado no
primeiro personagem da lista do grupo.

**Why this priority**: Dá ao mestre uma vista útil e permite a qualquer um acompanhar um companheiro sem sair da vista.

**Independent Test**: Com dois personagens a 10 hexes um do outro, focar no segundo: a câmera desliza até ele, a luz passa a
ser o círculo dele e nenhuma peça ou modelo é recarregado (sem piscar nem tela de carregamento).

**Acceptance Scenarios**:

1. **Given** um jogador focado no próprio personagem, **When** ele clica num outro personagem, **Then** a câmera passa a
   olhar para esse personagem e o círculo iluminado passa a ser o dele.
2. **Given** a troca de foco, **When** ela acontece, **Then** nada é recarregado: só a câmera e a área de luz/sombra mudam.
3. **Given** o mestre (sem personagem) abre a isométrica, **When** a vista aparece, **Then** ela está focada no primeiro
   personagem da lista do grupo que tem peça no mapa aberto.
4. **Given** o foco em outro personagem, **When** o usuário pede para voltar ao próprio personagem, **Then** o foco volta a
   ele (jogadores).
5. **Given** o personagem em foco sai do mapa ou deixa de ser aprovado, **When** a mudança chega, **Then** o foco volta à
   regra inicial (o próprio personagem, ou o primeiro da lista).

---

### Edge Cases

- **Só um círculo**: a luz é sempre um único círculo, o do personagem em foco; as peças dos companheiros fora dele ficam no
  escuro (Q2 = A).
- **Personagens no escuro**: como uma peça fora da luz não é visível, a troca de foco também pode ser feita por uma lista dos
  personagens do grupo na própria vista, não só clicando numa peça.
- **Jogador sem peça no mapa aberto**: começa focado no primeiro personagem da lista que tenha peça, como o mestre.
- **Nenhum personagem com peça no mapa** (ou mapa fora de campanha): o círculo fica no meio do mapa.
- **Personagem caído ou fora de combate**: a peça aparece na pose "Parado" como as outras, por enquanto (a postura não muda o
  desenho nesta vista); o círculo continua centrado nela.
- **Círculo cortando a borda do mapa**: a parte do círculo além da imagem do mapa é chão escuro neutro; a grid só existe
  dentro do mapa.
- **Mapa sem imagem**: chão neutro com a grid, com a mesma luz.
- **Navegador sem suporte a 3D**: aviso e volta ao 2D, como a vista 3D atual.
- **Modelo que não carrega**: a peça cai para a figura 2,5D ou a imagem do token, como na vista atual.
- **Modo livre e caminhada**: a isométrica não caminha nem move peças; os movimentos continuam pelo 2D (e pela vista 3D
  atual). Movimentos feitos ali aparecem aqui pelo tempo real.
- **Cores das peças e rastros**: sob cada peça os hexes que ela ocupa são preenchidos e contornados com a cor do 2D (azul
  personagem, vermelho NPC, verde-água aliado, cinza objeto), e os movimentos do turno em andamento aparecem como o rastro
  tracejado do 2D (nenhum no modo livre) — cortados pela luz como o resto (pedido após o primeiro teste).
- **Balões de fala/ação**: como na vista 3D atual — a ação do turno e, por 60 s, o que o personagem disse no chat — só sobre as
  peças iluminadas (pedido após o primeiro teste).
- **Qualidade do 3D** (Padrão/Alta/Ultra): vale também para a isométrica no que couber (resolução e suavização).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O controle 2D/3D do mapa MUST oferecer duas vistas 3D, "Isométrica" e "3D" (a atual), além do 2D.
- **FR-002**: A vista escolhida MUST ser lembrada por mapa neste aparelho, como a escolha 2D/3D já é, e reaberta no retorno.
- **FR-003**: A vista "3D" atual MUST continuar funcionando sem mudança de comportamento.
- **FR-004**: A vista isométrica MUST desenhar o mapa como um chão plano com a imagem do mapa na posição e escala do 2D,
  ignorando máscara 3D, textura de parede e fundo 360°.
- **FR-005**: A vista isométrica MUST desenhar a grid hexagonal do mapa (as mesmas colunas, linhas e hexágonos do 2D) sobre a
  imagem do mapa.
- **FR-006**: A vista isométrica MUST iluminar um círculo centrado na peça do personagem em foco, de raio **5 hexágonos** por
  padrão; ao lado do seletor de foco o usuário MUST poder escolher o raio de **3 a 6 hexágonos**, lembrado neste aparelho.
- **FR-006a**: Os modelos 3D MUST projetar sombra no chão iluminado (luz vinda de cima); figuras 2,5D têm uma sombra
  suave sob elas; nada fora do círculo projeta sombra dentro dele.
- **FR-007**: Fora do círculo, a imagem do mapa, a grid e as peças MUST ficar escuras até o preto, com uma transição suave na
  borda e uma névoa/escuridão além dela.
- **FR-008**: Uma peça ou modelo que cruza a borda do círculo MUST mostrar só a parte que está dentro dele.
- **FR-009**: A câmera MUST ser isométrica/ortográfica, girar em volta do personagem, mudar a inclinação dentro de limites e
  dar zoom entre um mínimo e um máximo por roda, pinça e pelos botões +/− do mapa.
- **FR-010**: As peças MUST usar o modelo 3D do token parado na pose de "Parado", senão a figura 2,5D em pé, senão a imagem do
  token no chão; virada pelo `look` e no tamanho de hexágonos da peça; com as armas dos encaixes.
- **FR-011**: A vista MUST acompanhar em tempo real as mudanças de peças (posição, direção, token, inclusão, retirada) e o
  círculo MUST seguir a peça do personagem.
- **FR-012**: A vista isométrica MUST ser só de observação: nenhuma ação nela move, vira ou altera peças.
- **FR-013**: A vista isométrica MUST NOT carregar o código 3D quando o usuário está no 2D (como a vista atual, só sob demanda).
- **FR-014**: A regra de visibilidade MUST valer igual para mestre e jogadores: um único círculo, o do personagem em foco.
- **FR-015**: Qualquer usuário MUST poder mudar o foco para outro personagem do grupo, clicando na peça dele na vista ou
  escolhendo-o numa lista da vista; a câmera e o círculo passam para esse personagem.
- **FR-016**: A troca de foco MUST NOT recarregar o cenário: só o alvo da câmera e a área de luz/sombra mudam.
- **FR-017**: O foco inicial MUST ser o personagem escolhido do usuário quando ele tem peça no mapa aberto; senão (mestre,
  ou jogador sem peça), o primeiro personagem da lista do grupo que tem peça no mapa; senão, o meio do mapa.
- **FR-018**: O foco MUST ser só de quem olha: mudar o foco não muda nada para os outros participantes nem é salvo no servidor.

### Key Entities

- **Vista do mapa**: 2D, 3D (atual) ou Isométrica; preferência por mapa e por aparelho, sem nada no servidor.
- **Círculo de luz**: centro (a peça do personagem em foco) e raio em hexágonos (5).
- **Foco**: o personagem que a câmera acompanha e que ilumina o círculo; local a quem olha.
- **Peça**: as que o mapa já tem — posição, direção, tamanho e o token (modelo, figuras 2,5D, imagem, armas).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A partir do 2D, o usuário chega à vista isométrica em no máximo 2 cliques ou toques.
- **SC-002**: Em 100% dos casos de teste, peças até 4 hexágonos do personagem aparecem inteiras, peças a mais de 6 não
  aparecem e peças cruzando a borda aparecem cortadas.
- **SC-003**: A vista isométrica abre em até 3 segundos num mapa com 20 peças numa conexão comum, e gira e dá zoom sem
  travadas perceptíveis num celular intermediário.
- **SC-004**: Um movimento da peça do personagem feito por outra pessoa move o círculo na tela em até 2 segundos.
- **SC-007**: O menu "Escolher vista" abre à esquerda do botão.
- **SC-005**: Trocar o foco para outro personagem leva a câmera e a luz até ele em até 1 segundo, sem recarregar nenhuma peça
  ou modelo.
- **SC-006**: Nada muda para quem usa só o 2D ou o 3D atual: os mesmos testes da vista atual passam e o 2D não carrega código
  novo.

## Assumptions

- Só frontend: nenhuma coluna, endpoint, evento ou ferramenta MCP nova; a vista usa as peças, tokens, modelos e armas que já
  chegam ao site.
- O raio começa em 5 hexágonos e o usuário o muda de 3 a 6 ao lado do seletor de foco (pedido após o primeiro teste); a escolha é
  só deste aparelho.
- O ponto de interesse da câmera é o personagem em foco; arrastar gira, não desloca o mapa (sem pan nesta versão).
- "Personagem" para o foco são os personagens aprovados do grupo (PJs); NPCs e objetos não recebem o foco.
- "Primeiro da lista" é a ordem do painel do grupo.
- O foco não é lembrado ao sair da vista: ao reabrir, vale de novo o foco inicial.
- A distância do círculo é a distância em linha reta no chão a partir do centro do hex da peça (5 × a distância entre centros
  de hexágonos vizinhos), não a contagem de hexágonos em degraus.
- A figura 2,5D e o modelo seguem as mesmas regras de escolha de lado e de encaixe de armas da vista 3D atual.
- Sem animações, sem postura deitada e sem caminhada nesta versão.
