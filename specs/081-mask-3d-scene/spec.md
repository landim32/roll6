# Feature Specification: Mapa 3D de verdade montado pela máscara

**Feature Branch**: `081-mask-3d-scene`
**Created**: 2026-10-17
**Status**: Draft
**Input**: User description: "A montagem do mapa é usando raycaster, eu acho. Estou querendo mudar totalmente a forma que o mapa é montando. Cria o mapa de verdade, de forma que o personagem consiga subir em objetos, olhar para cima e para baixo. E montar o mapa usando apenas a mascara. Tem q ser algo simples de montar, mas q fique melhor q está hoje." — seguindo a solução recomendada: uma cena 3D de verdade gerada a partir da máscara como mapa de alturas.

## Contexto

Hoje a vista 3D de um mapa (034–070) é desenhada como um jogo antigo, no estilo Wolfenstein:

- as paredes são colunas verticais vistas sempre na altura dos olhos;
- a câmera só gira para os lados;
- não existe altura de chão: o personagem anda sempre no mesmo plano e nunca sobe em nada;
- os modelos 3D das peças são desenhados numa segunda camada por cima, com vários ajustes para combinar as duas.

A máscara 3D já diz a **altura** de cada ponto do mapa pelos tons de cinza (036):

- branco = chão;
- cinza = objeto baixo (meia altura, por exemplo);
- preto = parede de altura cheia.

Esta funcionalidade troca o desenho por um **mapa 3D de verdade**, montado só a partir dessa mesma máscara. Nele:

- objetos e paredes têm volume;
- dá para olhar para cima e para baixo;
- o personagem sobe em objetos baixos (caixotes, muretas, mesas, palanques) e é barrado por paredes altas.

Quem monta o mapa continua fazendo só o que já faz hoje: a imagem do mapa, a máscara em tons de cinza e,
opcionalmente, o fundo 360° e a textura de parede.

## Clarifications

### Session 2026-10-17

- Q: Tudo numa entrega ou em etapas? → B: **uma entrega só**, com cenário, câmera, subida, peças, balões e desempenho
  prontos juntos; a vista antiga sai na mesma troca.
- Q: Blocos acima de um degrau e abaixo de uma parede? → A: **barram como parede**; só se sobe sozinho até a altura de um
  degrau, sem pulo. Um palanque alto é feito com uma escada de tons na máscara.
- Q: Os níveis de qualidade (053)? → A: **ficam os três** (Padrão, Alta, Ultra), redefinidos para o novo desenho, com a
  escolha guardada no aparelho mantida.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o mapa em 3D de verdade (Priority: P1)

O mestre e os jogadores abrem a vista 3D de um mapa que tem máscara. Em vez de colunas de parede, veem um cenário com
volume:

- o chão com a imagem do mapa;
- objetos baixos e paredes altas em blocos sólidos, com a altura dada pelo tom da máscara;
- o topo dos objetos com a parte da imagem do mapa que fica sob eles;
- as laterais com a textura de parede, ou com as cores do mapa quando ela não existe;
- o céu com o fundo 360°.

**Why this priority**: é a base de tudo; sem o cenário de verdade, nada mais desta funcionalidade existe.

**Independent Test**: abrir em 3D um mapa com máscara de três tons (branco, cinza e preto) e conferir que o cinza vira
um bloco baixo e o preto um bloco alto, com topo e laterais visíveis de vários ângulos.

**Acceptance Scenarios**:

1. **Given** um mapa com máscara, **When** alguém abre a vista 3D, **Then** cada área cinza ou preta aparece como um
   bloco sólido cuja altura acompanha o tom (quanto mais escuro, mais alto).
2. **Given** um bloco baixo, **When** a câmera o olha de cima, **Then** o topo mostra a parte da imagem do mapa que fica
   sob ele.
3. **Given** um mapa com textura de parede, **When** alguém olha uma lateral, **Then** ela mostra a textura; sem
   textura, mostra as cores do mapa.
4. **Given** um mapa com fundo 360°, **When** alguém olha para o horizonte ou para cima, **Then** vê o fundo; sem
   fundo, vê um céu neutro.
5. **Given** um mapa sem máscara, **When** alguém abre a vista 3D, **Then** vê o chão plano com a imagem do mapa e as
   peças, sem nenhum bloco.
6. **Given** uma máscara só em preto e branco (de antes de 036), **When** alguém abre a vista 3D, **Then** vê paredes de
   altura cheia onde é preto e chão onde é branco.

---

### User Story 2 - Olhar para cima e para baixo (Priority: P1)

Quem está na vista 3D inclina a câmera para olhar o topo de uma torre ou o chão aos pés do personagem, com o mesmo
gesto que hoje gira a câmera para os lados.

**Why this priority**: é um dos dois pedidos centrais e vale para todos, andando ou só observando.

**Independent Test**: arrastar na vertical, ou usar as teclas e o controle do celular, e ver a câmera inclinar dentro
de um limite.

**Acceptance Scenarios**:

1. **Given** a vista 3D aberta, **When** a pessoa arrasta para cima ou para baixo (mouse ou dedo), **Then** a câmera
   inclina para cima ou para baixo.
2. **Given** a câmera inclinando, **When** chega ao limite, **Then** para — nunca vira de ponta-cabeça nem olha
   exatamente para cima ou para baixo.
3. **Given** a câmera em terceira pessoa atrás do personagem, **When** ela inclina, **Then** continua centrada no
   personagem e nunca atravessa paredes nem o chão.
4. **Given** "Voltar ao personagem", **When** a pessoa toca, **Then** a câmera volta atrás do personagem com a inclinação
   inicial.

---

### User Story 3 - Subir em objetos andando (Priority: P1)

No modo livre, o jogador que anda com o personagem pela vista 3D (055/069) se aproxima de um caixote. O personagem sobe
nele e continua andando por cima. Diante de uma parede alta, ele para. Ao sair de cima do caixote, desce até o chão.

**Why this priority**: é o outro pedido central; é o que faz o mapa parecer "de verdade" para quem joga.

**Independent Test**: num mapa com um bloco baixo e uma parede alta, andar até o bloco (sobe), andar por cima, sair
(desce) e andar até a parede (barra).

**Acceptance Scenarios**:

1. **Given** um bloco da altura de um degrau, **When** o personagem anda até ele, **Then** sobe sem nenhum comando extra
   e passa a andar na altura do topo.
2. **Given** o personagem em cima de um bloco, **When** anda para fora dele, **Then** desce até a altura de onde pisa,
   sem atravessar o chão.
3. **Given** uma parede alta, **When** o personagem anda até ela, **Then** é barrado, como hoje.
4. **Given** um bloco alto demais para subir sem ajuda, mas não uma parede, **When** o personagem tenta subir, **Then**
   é barrado como uma parede (Q2 = A). Quem monta o mapa faz um palanque alto desenhando uma escada de tons em degraus.
5. **Given** o personagem em cima de um bloco, **When** os outros veem a caminhada compartilhada (069), **Then** o veem na
   mesma altura.

---

### User Story 4 - Peças, modelos e balões no lugar certo (Priority: P2)

As peças continuam aparecendo na vista 3D como hoje, agora na altura certa:

- figuras 2,5D e modelos 3D;
- um personagem ou NPC num hex sobre um objeto baixo aparece em cima do objeto, não enterrado nele;
- os balões de fala e ação ficam sobre a cabeça;
- quem está atrás de um bloco fica escondido por ele.

**Why this priority**: sem isso a mesa perde o que já tinha; vem depois de o cenário existir.

**Independent Test**: pôr peças no chão, em cima de um bloco baixo e atrás de uma parede, e conferir altura, balões e
ocultação de vários ângulos.

**Acceptance Scenarios**:

1. **Given** uma peça num hex sobre um bloco baixo, **When** alguém abre a vista 3D, **Then** a peça aparece em pé sobre
   o topo do bloco.
2. **Given** uma peça atrás de uma parede, **When** a câmera olha do outro lado, **Then** a peça fica escondida, mesmo de
   cima, enquanto a parede estiver na frente.
3. **Given** uma peça com balão (ação do turno ou fala, 073), **When** ela está visível, **Then** o balão aparece sobre a
   cabeça, acompanha a peça e some quando a cabeça não está visível.
4. **Given** uma figura 2,5D e um modelo 3D lado a lado, **When** um está na frente do outro, **Then** o da frente cobre o
   de trás.
5. **Given** as regras de 034–070 (lado da figura conforme a câmera, peças caídas, tamanho do modelo, animações,
   caminhada compartilhada no ponto exato), **When** alguém usa a vista 3D, **Then** continuam valendo.

---

### User Story 5 - Funcionar bem em celular e computador (Priority: P2)

A vista 3D continua leve o bastante para ser usada na mesa em celulares comuns, e a pessoa ainda escolhe a qualidade,
como em "Qualidade do 3D" (053): os três níveis Padrão, Alta e Ultra continuam, redefinidos para o novo desenho (Q3 =
A).

**Why this priority**: a mesa é jogada em celular; um 3D bonito que trava não serve.

**Independent Test**: abrir num celular intermediário um mapa grande com máscara detalhada e andar por ele.

**Acceptance Scenarios**:

1. **Given** um mapa grande com máscara detalhada, **When** alguém abre a vista 3D num celular intermediário, **Then** ela
   abre e se move de forma fluida.
2. **Given** um aparelho sem suporte a 3D, **When** a pessoa tenta abrir a vista 3D, **Then** recebe o aviso de hoje e
   volta para o 2D.

### Edge Cases

- **Máscara com muitos detalhes finos** (ruído, bordas suavizadas): tons muito próximos são tratados como a mesma altura,
  e pontos isolados não viram "espinhos". O resultado é limpo, como já acontece hoje com a mediana por célula (036).
- **Máscara de outra proporção**: segue a regra de hoje (aviso ao enviar).
- **Personagem que começa dentro de uma parede** (peça posta no 2D num hex que a máscara marca como parede): a vista 3D
  o coloca no topo daquele ponto. Se for alto demais, a câmera fica livre. A máscara nunca bloqueia o 2D (034).
- **Borda do mapa**: o personagem não sai do mapa, como hoje. O chão continua além da borda, com a cor da borda (036).
- **Peças caídas ou fora de combate**: deitadas sobre o chão ou o topo onde estão, como hoje (058).
- **Modo de observação** (fora do modo livre, ou o mestre): a câmera olha para cima e para baixo também, mas ninguém anda
  nem sobe.
- **Câmera perto de paredes e tetos baixos**: ela se aproxima do personagem em vez de atravessar o bloco, como já faz
  com as paredes.
- **Passagens por baixo** (pontes, varandas, tetos): não existem. A máscara diz uma altura por ponto. Fica fora do
  escopo.
- **2D, grid hexagonal, movimento, ocupação e turnos**: nada muda. A máscara continua valendo só para a vista 3D.

## Requirements *(mandatory)*

### Functional Requirements

**Cenário**

- **FR-001**: A vista 3D DEVE mostrar um cenário com volume, gerado só a partir da imagem do mapa, da máscara 3D e,
  quando existirem, do fundo 360° e da textura de parede. Nenhum dado novo é pedido a quem monta o mapa.
- **FR-002**: Cada ponto da máscara DEVE virar uma altura: branco = chão, preto = altura cheia de parede, e os tons
  intermediários proporcionais, mantendo o significado dos tons de 036. Uma máscara só em preto e branco DEVE dar o mesmo
  desenho de paredes de antes (paredes cheias e chão).
- **FR-003**: O topo dos blocos e o chão DEVEM mostrar a imagem do mapa no lugar correspondente. As laterais DEVEM
  mostrar a textura de parede, ou as cores do mapa quando ela não existe. O chão DEVE continuar além da borda do mapa com
  a cor da borda.
- **FR-004**: Mapas sem máscara DEVEM mostrar o chão plano com as peças.

**Câmera**

- **FR-005**: A câmera DEVE poder inclinar para cima e para baixo, além de girar para os lados, com o mesmo gesto (mouse,
  toque, teclado e controle do celular), dentro de um limite que nunca a deixa de ponta-cabeça.
- **FR-006**: A câmera em terceira pessoa (incluindo a órbita de 068) DEVE continuar centrada no personagem e nunca
  atravessar blocos nem o chão.

**Andar e subir**

- **FR-007**: Ao andar no modo livre, o personagem DEVE pisar na altura do ponto onde está, subir sozinho blocos até a
  altura de um degrau, descer ao sair de cima de um bloco e ser barrado por paredes altas.
- **FR-008**: Blocos acima da altura de um degrau DEVEM barrar o personagem como uma parede (Q2 = A). Não há pulo.
  Para um palanque alto, a máscara desenha degraus de tons.
- **FR-009**: Quem vê a caminhada compartilhada (069/070) DEVE ver o personagem na mesma altura que quem anda. Nada novo
  é gravado: a altura sai da máscara no ponto da peça.

**Peças**

- **FR-010**: Toda peça mostrada na vista 3D (figura 2,5D ou modelo 3D) DEVE ficar em pé na altura do ponto onde está, ou
  deitada sobre ela quando caída.
- **FR-011**: Blocos DEVEM esconder as peças e os balões que estão atrás deles, de qualquer ângulo. Entre peças, a mais
  próxima DEVE cobrir a de trás.
- **FR-012**: Os balões (ações e falas, 036/068/073) DEVEM aparecer sobre a cabeça da peça na altura certa, com as regras
  de hoje.
- **FR-013**: As regras atuais da vista 3D continuam valendo:
  - lados da figura 2,5D (035);
  - tamanho do modelo (063);
  - animações (056–061);
  - peças que não aparecem em 3D;
  - caminhada compartilhada e ponto exato (069/070).

**Escopo e desempenho**

- **FR-014**: A vista 3D DEVE ser utilizável de forma fluida num celular intermediário com um mapa grande. Os três níveis
  de "Qualidade do 3D" (Padrão, Alta, Ultra) DEVEM continuar, redefinidos para o novo desenho (resolução, nitidez,
  sombras). A escolha guardada no aparelho é mantida (Q3 = A).
- **FR-015**: O 2D, o grid hexagonal, o movimento, a ocupação, os turnos e o servidor NÃO mudam. A máscara continua
  afetando só a vista 3D.
- **FR-016**: A forma antiga de desenhar a vista 3D DEVE ser substituída, não mantida em paralelo, com a entrega
  **numa única entrega**, com todas as histórias prontas (Q1 = B): não há período com a vista nova sem peças.

### Key Entities

- **Máscara 3D**: imagem existente do modelo de mapa. Seus tons passam a ser lidos como um **mapa de alturas** do
  cenário inteiro.
- **Cenário 3D**: o terreno com blocos gerado da máscara e da imagem do mapa ao abrir a vista. Não é guardado.
- **Altura de um ponto**: a altura do terreno num ponto do mapa. Define onde as peças ficam e por onde o personagem
  pisa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem monta um mapa precisa só da imagem e de uma máscara em tons de cinza para ter blocos de alturas
  diferentes. Nenhum passo novo é pedido.
- **SC-002**: Em 100% dos mapas existentes com máscara, a vista 3D abre e mostra paredes onde antes havia paredes.
- **SC-003**: Num mapa com um bloco baixo, o jogador consegue subir nele, andar por cima e descer sem nenhum comando além
  de andar.
- **SC-004**: A câmera inclina para cima e para baixo em todos os aparelhos onde a vista 3D funciona hoje.
- **SC-005**: Num celular intermediário, a vista 3D de um mapa grande abre em até alguns segundos e se move sem travadas
  perceptíveis.
- **SC-006**: Nenhuma peça aparece enterrada num bloco ou flutuando acima do chão, e nenhuma aparece através de uma
  parede.

## Assumptions

- A altura cheia de parede continua a de hoje, mais alta que um personagem de 1 hex.
- O "degrau" que se sobe sozinho é uma altura baixa, aproximadamente até o joelho ou a cintura de um personagem de 1 hex.
  O valor exato é decidido no plano e ajustado na mesa.
- A leitura da máscara continua usando uma grade de resolução limitada, como hoje, para ficar leve. O limite exato fica
  para o plano.
- Andar e subir continuam existindo só no modo livre (055/069), para o jogador com o personagem em pé no mapa aberto.
  Fora disso a vista 3D é só de observação, agora com inclinação.
- As cores, as sombras e a iluminação podem melhorar com o novo desenho, desde que o mapa continue reconhecível pela sua
  imagem.
- O servidor, o MCP e o banco não mudam. É uma mudança só da vista 3D do site.
