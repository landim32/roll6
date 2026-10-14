# Feature Specification: Token 3D — posição defensiva visível e animação de morte

**Feature Branch**: `058-token-3d-guard-death`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "Melhorias no Token 3D: Adicione uma animação stand (Parado em posição defensiva) <- Pedi isso na passada e não foi feito; adicione uma animação death (morto); Personagens caidos deve aparecer no ultimo frame dessa animação"

## Contexto

Desde a feature 055 um token pode ter um **modelo 3D**, desenhado pela vista 3D da mesa no lugar da figura "2,5D". Na aba **"3D"** do formulário do token o usuário escolhe a animação de cada estado (056: **Parado** e **Caminhando**) e vê uma prévia com linha do tempo e "Gerar imagem" (057).

**Por que a "posição defensiva" parece não ter sido feita.** A 057 criou a "Posição defensiva (Roll6)", e ela já está no site como opção dos dois seletores. Só que as animações próprias do Roll6 são ajustadas a cada modelo. Em modelos com rig automático, como o orc de exemplo, braços e pernas ficam parados para a malha não rasgar. A posição defensiva é quase toda feita de braços e pernas: guarda alta, joelhos dobrados, pernas afastadas. Nesse modelo sobra só uma leve inclinação do tronco, e o resultado parece igual ao "Parado". A opção existe, mas não se reconhece a postura.

**Por que falta uma animação de morte.** Hoje uma peça **caída** ou **fora de combate** simplesmente não aparece na vista 3D, porque só peças em pé são desenhadas. Um token com modelo 3D pode mostrar o personagem caído no chão, na pose final de uma animação de morte.

Esta feature:

1. Faz a posição defensiva ser **reconhecível** em qualquer modelo onde ela é oferecida.
2. Acrescenta a animação **de morte** ("Caído") e um terceiro estado na aba "3D".
3. Faz peças com modelo 3D, quando caídas, **aparecerem na vista 3D no último quadro dessa animação**.

## Clarifications

### Session 2026-10-14

- Q: O que fazer quando o rig do modelo não aguenta mover braços e pernas sem deformar a malha (guarda)? → A: Mostrar a guarda completa mesmo com alguma deformação.
- Q: Peças "Fora de combate" com modelo 3D também aparecem mortas na vista 3D? → A: Sim, "Caído" e "Fora de combate" aparecem no último quadro da morte.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A posição defensiva é reconhecível (Priority: P1)

O usuário escolhe "Posição defensiva (Roll6)" no estado Parado e, na prévia e na mesa, vê claramente o personagem em guarda. A diferença para o "Parado" comum deve ser evidente, inclusive no orc de exemplo.

**Why this priority**: É um pedido refeito pelo usuário, que considerou que a entrega anterior não o atendeu.

**Independent Test**: Editar o token do orc de exemplo, aba "3D", Parado = "Posição defensiva (Roll6)". Comparar com "Animação do Roll6": a silhueta muda de forma evidente.

**Acceptance Scenarios**:

1. **Given** um modelo com esqueleto compatível com as animações do Roll6, **When** o usuário escolhe "Posição defensiva (Roll6)", **Then** a prévia mostra o personagem em guarda, de modo claramente distinto da animação "Parado" do Roll6.
2. **Given** o orc de exemplo (rig automático que limita braços e pernas), **When** a posição defensiva toca, **Then** ela toca completa (braços em guarda, pernas afastadas e dobradas), mesmo que a malha deforme um pouco, e a prévia avisa que pode haver deformação.
3. **Given** o token salvo com a posição defensiva no estado Parado, **When** a peça está em pé na vista 3D, **Then** o modelo toca a posição defensiva.

---

### User Story 2 - Peças caídas aparecem mortas na vista 3D (Priority: P1)

Na vista 3D, uma peça com modelo 3D cuja postura é "Caído" ou "Fora de combate" aparece deitada no chão, na pose do **último quadro** da animação de morte do token. Ela não some mais da cena. Quando a peça cai enquanto alguém está olhando a vista 3D, essa pessoa vê a animação de morte tocar uma vez, e a peça fica parada na pose final.

**Why this priority**: Junto com a US1, é o núcleo do pedido. Mostra na mesa 3D quem caiu, uma informação que hoje só existe no mapa 2D.

**Independent Test**: Numa mesa com uma peça de modelo 3D em pé, abrir a vista 3D e mudar a postura dela para "Caído": o modelo toca a morte e fica no chão. Recarregar a página: a peça já aparece no chão, na pose final.

**Acceptance Scenarios**:

1. **Given** uma peça com modelo 3D e postura "Caído", **When** a vista 3D é aberta, **Then** o modelo aparece no seu lugar, no último quadro da animação de morte, sem tocá-la.
2. **Given** a vista 3D aberta e a peça em pé, **When** a postura muda para "Caído", **Then** a animação de morte toca uma única vez e o modelo fica no último quadro.
3. **Given** uma peça caída, **When** a postura volta para "Em pé", **Then** o modelo volta a ficar em pé com a animação Parado.
4. **Given** uma peça caída sem modelo 3D (só imagens 2,5D), **When** a vista 3D desenha a cena, **Then** nada muda em relação a hoje: ela não aparece.
5. **Given** uma peça caída na vista 3D, **When** paredes ou figuras mais próximas ficam à frente, **Then** elas a escondem como escondem os modelos em pé.

---

### User Story 3 - Escolher e ver a animação de morte no formulário (Priority: P2)

Na aba "3D" do token há um terceiro estado, **Caído**, com o mesmo tipo de seletor dos outros dois. As opções são: Automático, um clipe do arquivo, "Morte (Roll6)" e "Sem animação". A prévia toca a morte e para no último quadro. A linha do tempo permite voltar, arrastar e pausar. Com o estado Caído no fim da animação, "Gerar imagem" → "Imagem Caído" gera a imagem caída a partir do personagem deitado.

**Why this priority**: Permite escolher a animação quando o arquivo traz uma morte própria, ou desligá-la. Sem esta história, a US2 funciona com a escolha automática.

**Independent Test**: Abrir a aba "3D" de um token com modelo, escolher o estado Caído na prévia, ver a morte tocar e parar, salvar uma escolha diferente e reabrir.

**Acceptance Scenarios**:

1. **Given** um arquivo com um clipe chamado como morte (por exemplo "Death" ou "Die"), **When** Caído está em "Automático", **Then** esse clipe é usado e o texto diz isso.
2. **Given** um arquivo sem clipe de morte e esqueleto compatível, **When** Caído está em "Automático", **Then** é usada a "Morte (Roll6)".
3. **Given** a prévia no estado Caído, **When** a animação termina, **Then** o modelo para no último quadro, que é o ponto de partida padrão da linha do tempo e de "Gerar imagem".
4. **Given** uma escolha salva para Caído, **When** o token é reaberto ou a peça aparece caída na mesa, **Then** a escolha salva é respeitada.

---

### Edge Cases

- **Modelo sem animação de morte possível** (esqueleto incompatível sem clipe de morte, ou "Sem animação"): a peça caída aparece **deitada de costas** no chão, com o modelo inteiro tombado, no mesmo lugar e na mesma direção. Nunca some e nunca fica em pé.
- **Clipe de morte do arquivo que não termina deitado**: usa-se o último quadro do jeito que vier; o Roll6 não corrige clipes do usuário.
- **Peça caída e câmera em terceira pessoa**: a câmera continua podendo seguir o próprio personagem caído, como hoje. No modo livre a caminhada local não começa com o personagem caído.
- **Balões de fala de uma peça caída**: continuam ocultos na vista 3D, como hoje.
- **Postura muda várias vezes seguidas** (em pé, caído, em pé, caído): cada queda toca a morte desde o início; nada fica preso no meio.
- **Prévia do formulário**: a animação de morte não se repete em loop. Ao terminar, fica parada no último quadro. "Continuar" no fim recomeça do início.
- **Rig que rasga com a morte do Roll6**: a morte segue a mesma regra da guarda (Q1 = A): toca completa, aceitando deformação, e a prévia avisa. A pose final continua deitada.

## Requirements *(mandatory)*

### Functional Requirements

**Posição defensiva**

- **FR-001**: A "Posição defensiva (Roll6)" MUST ter uma silhueta claramente diferente da animação "Parado" do Roll6 em todo modelo onde ela é oferecida. Em pé, um observador deve conseguir dizer qual das duas está tocando.
- **FR-002**: A posição defensiva MUST continuar oferecida nos seletores Parado e Caminhando, como na 057, sem mudar o valor já salvo nos tokens existentes.
- **FR-003**: Em modelos cujo rig limita braços e pernas, a posição defensiva MUST tocar **completa**, sem a redução de amplitude aplicada às outras animações do Roll6, aceitando alguma deformação da malha em ombros e quadris. A prévia MUST avisar que a guarda pode deformar este modelo (em vez do aviso de movimento reduzido). As animações Parado e Caminhando do Roll6 continuam protegidas como hoje.

**Animação de morte**

- **FR-004**: O token com modelo MUST ter um terceiro estado de animação, **Caído**, com as mesmas opções dos outros dois: Automático, clipe do arquivo, animação do Roll6 ("Morte (Roll6)") e "Sem animação".
- **FR-005**: "Automático" no estado Caído MUST usar o clipe do arquivo com nome de morte, como "Death", "Die", "Dying" ou "Dead", sem diferenciar maiúsculas. Sem esse clipe, MUST usar a "Morte (Roll6)" quando o esqueleto for compatível. Caso contrário, nenhuma animação.
- **FR-006**: A "Morte (Roll6)" MUST levar o personagem de pé até deitado no chão, de costas, em no máximo 2 segundos, e terminar inteiro dentro do espaço da peça.
- **FR-007**: A animação de morte MUST tocar uma vez e MUST parar no último quadro, nunca em loop, tanto na prévia quanto na mesa.
- **FR-008**: A escolha de Caído MUST ser salva com o token, como as de Parado e Caminhando, e MUST ser descartada quando o token deixa de ter modelo.
- **FR-009**: A escolha MUST estar disponível também para assistentes de IA, nas mesmas ferramentas de criar e editar token que já aceitam as escolhas de Parado e Caminhando.

**Peças caídas na vista 3D**

- **FR-010**: Uma peça com modelo 3D e postura "Caído" ou "Fora de combate" MUST aparecer na vista 3D no último quadro da animação de morte do token, no centro da sua posição e com a direção da peça.
- **FR-011**: Ao abrir a vista, recarregar ou entrar na peça no campo de visão, a peça já caída MUST aparecer direto no último quadro, sem tocar a morte.
- **FR-012**: Quando a postura muda para caído com a vista 3D aberta, a animação de morte MUST tocar uma vez, a partir do início, e parar no último quadro. Quando a postura volta para "Em pé", MUST voltar à animação Parado.
- **FR-013**: Sem animação de morte, a peça caída MUST aparecer com o modelo inteiro deitado de costas no chão (ver Edge Cases).
- **FR-014**: Paredes e figuras mais próximas MUST esconder a peça caída como escondem os modelos em pé.
- **FR-015**: Peças caídas **sem** modelo 3D MUST continuar fora da vista 3D, como hoje. O mapa 2D não muda.
- **FR-016**: A postura "Fora de combate" MUST ser tratada exatamente como "Caído" na vista 3D: a peça com modelo aparece no último quadro da animação de morte (e a toca ao vivo quando a postura muda para ela). Mudar entre "Caído" e "Fora de combate" não toca a morte de novo: a peça já está deitada.

**Prévia e foto**

- **FR-017**: A prévia da aba "3D" MUST permitir ver o estado Caído, tocar a morte, pará-la no último quadro e usar a linha do tempo (pausar, arrastar, continuar) como nos outros estados.
- **FR-018**: "Gerar imagem" MUST funcionar no estado Caído como nos demais. No último quadro, "Imagem Caído" mostra o personagem deitado visto de cima.

### Key Entities *(include if feature involves data)*

- **Token (modelo 3D)**: além do arquivo do modelo e das escolhas de animação de Parado e Caminhando, passa a guardar a **escolha de animação de Caído** (vazia = automático). Os valores aceitos são os mesmos: Roll6, nenhuma ou um clipe do arquivo por nome. Acrescenta-se o valor específico da morte do Roll6, se necessário.
- **Peça no mapa**: inalterada. A postura já existe (031) e passa a decidir também como o modelo aparece na vista 3D.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No orc de exemplo, quem olha a prévia identifica, em 10 de 10 trocas entre "Animação do Roll6" e "Posição defensiva (Roll6)", qual das duas está tocando.
- **SC-002**: Em 100% das aberturas da vista 3D, uma peça com modelo e postura caída aparece no chão, na pose final, sem passar pela animação.
- **SC-003**: Uma queda vista ao vivo termina, parada no último quadro, em até 2 segundos depois de a postura mudar na tela.
- **SC-004**: Mostrar peças caídas não reduz de forma perceptível a fluidez da vista 3D em relação ao mesmo mapa com as peças em pé.
- **SC-005**: Tokens criados antes desta feature continuam com a mesma aparência em pé e caminhando. Só ganham a morte automática quando caídos.

## Assumptions

- "Stand" do pedido é a "Posição defensiva (Roll6)" da 057, e o problema relatado é ela não ser reconhecível no modelo usado. Não se cria uma segunda animação de guarda nem um quarto estado.
- "Personagens caídos" quer dizer peças cuja postura é "Caído" ou "Fora de combate" (031), sejam personagens ou NPCs. Na vista 3D, "Fora de combate" não fica em preto e branco.
- Só peças com modelo 3D ganham representação caída na vista 3D. Para figuras 2,5D não há imagem caída de pé que faça sentido no raycaster.
- A animação de morte não é uma informação da mesa compartilhada: cada pessoa a vê tocar só se estiver olhando no momento da queda. Quem chega depois vê a pose final.
- Nenhuma regra de jogo muda. Postura, ocupação de hexes, movimento e turnos são os mesmos de hoje.
- Ainda não há banco local. A validação manual na mesa segue pendente como nas features anteriores, e os testes automáticos cobrem as regras puras.
