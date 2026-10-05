# Feature Specification: Imagens 2,5D por direção do token

**Feature Branch**: `035-token-direction-views`  
**Created**: 2026-10-04  
**Status**: Draft  
**Input**: User description: "Vamos aplicar o 2,5D de verdade agora: crie mais 3 imagens no token (right, left e backend [costas]); funcionam da mesma forma que o front, coloque uma figura humana na mesma posição; na tela de cadastro de token, crie uma aba apenas para as imagens 2.5D; no 3D, deve mudar a posição do token de acordo com a visão do personagem, igual um 2.5D real."

## Contexto

Hoje (feature 034) o token tem uma única imagem "2,5D frente": no 3D, o personagem aparece sempre de frente, qualquer que seja o lado de onde a câmera o veja. Em um 2,5D de verdade (como os monstros do Doom), o desenho **muda conforme o lado em que o observador está em relação ao personagem**: de frente, de lado, de costas.

Esta feature completa o conjunto com mais **três imagens** — direita, esquerda e costas — recortadas do mesmo jeito que a frente (retrato 3:4, com a silhueta humana de guia no mesmo lugar), reúne as quatro numa **aba própria** do cadastro de token e faz o 3D escolher a imagem certa pela posição da câmera em relação à direção para onde o personagem está virado.

O que continua como está (034): a câmera em terceira pessoa atrás do personagem escolhido, só observadora; o tamanho e o lugar da figura no chão; as paredes que escondem as figuras; as peças caídas ou fora de combate fora do 3D; o 2D inalterado.

## Clarifications

### Session 2026-10-04

- Q: O que o 3D mostra quando falta a imagem de um lado lateral? → A: Espelha a imagem do lado lateral oposto; se faltarem os dois laterais, usa a frente; sem frente, a imagem em pé do token
- Q: Para onde o personagem olha nas imagens laterais? → A: Na imagem "Direita" ele aparece de perfil olhando para a direita da imagem (vemos o lado direito dele); na "Esquerda", olhando para a esquerda da imagem
- Q: Em que ângulos cada lado aparece? → A: Quatro setores iguais em torno da peça: frente a ±45° da direção para onde ela está virada, costas a ±45° da direção oposta, e cada lateral 90°; na divisa exata vale a frente ou as costas

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar as quatro imagens 2,5D numa aba própria (Priority: P1)

Quem cria ou edita um token abre a aba **"2,5D"** do cadastro e vê quatro campos: **Frente, Direita, Esquerda e Costas**. Cada um funciona como a "2,5D frente" de hoje (a frente mostra o personagem de frente, as costas de costas, a direita de perfil olhando para a direita da imagem e a esquerda de perfil olhando para a esquerda): escolhe um arquivo, ajusta o recorte (zoom, posição, rotação) com a **silhueta humana** de guia, que ocupa 60% da altura do recorte, centralizada e com os pés na borda de baixo — a mesma silhueta, na mesma posição, nos quatro. As quatro imagens são opcionais e independentes. O restante do cadastro (nome, descrição, imagens em pé e deitada, tamanhos) fica na aba principal do token.

**Why this priority**: sem as imagens cadastradas não há o que mostrar no 3D; é a base de toda a feature.

**Independent Test**: criar um token com as quatro imagens, salvar, reabrir a edição e ver as quatro; trocar uma e remover outra sem mexer nas demais.

**Acceptance Scenarios**:

1. **Given** o cadastro (ou a edição) de um token, **When** o usuário abre a aba "2,5D", **Then** vê os quatro campos (Frente, Direita, Esquerda, Costas), cada um com sua prévia quando já houver imagem salva.
2. **Given** um arquivo escolhido em qualquer dos quatro campos, **When** o recorte abre, **Then** aparece a silhueta humana de guia (60% da altura, centralizada, pés na borda de baixo), igual nos quatro campos, e o recorte é um retrato 3:4.
3. **Given** um token com as quatro imagens, **When** o usuário salva e reabre a edição, **Then** as quatro continuam lá, cada uma na sua posição.
4. **Given** um token salvo, **When** o usuário troca a imagem da direita e remove a das costas, **Then** a frente e a esquerda não mudam.
5. **Given** a aba "2,5D" aberta, **When** o usuário olha cada campo, **Then** cada um diz como o personagem deve ser desenhado (de frente, de costas, de perfil olhando para a direita, de perfil olhando para a esquerda), para não haver dúvida de lado.
6. **Given** o usuário preencheu a aba principal e a aba "2,5D", **When** alterna entre as abas antes de salvar, **Then** nada do que foi preenchido se perde.
7. **Given** um token que já tinha "2,5D frente" (034), **When** é editado, **Then** a imagem aparece no campo "Frente" da aba "2,5D" e a aba principal deixa de ter esse campo.

---

### User Story 2 - Ver o lado certo do personagem no 3D (Priority: P1)

No 3D, cada figura mostra a imagem correspondente ao **lado em que a câmera a enxerga**, em relação à direção para onde a peça está virada no mapa: câmera diante do personagem → **frente**; câmera atrás → **costas**; câmera do lado direito dele → **direita**; do lado esquerdo → **esquerda**. Ao andar em volta de um personagem, a imagem troca; quando a peça é girada no 2D, a imagem troca também. Como a câmera padrão fica atrás do personagem escolhido, o jogador vê as **costas** do próprio personagem e a **frente** dos que estão virados para ele.

**Why this priority**: é o ponto central do pedido — o "2,5D de verdade".

**Independent Test**: com um token de quatro imagens bem diferentes (por exemplo, com uma letra em cada), colocar a peça no mapa, abrir o 3D e circular em volta dela; conferir qual imagem aparece em cada lado e girar a peça no 2D.

**Acceptance Scenarios**:

1. **Given** uma peça virada para o norte e a câmera ao norte dela (diante do personagem), **When** o usuário olha, **Then** aparece a imagem de **frente**.
2. **Given** a mesma peça e a câmera ao sul (atrás do personagem), **When** o usuário olha, **Then** aparece a imagem das **costas**.
3. **Given** a mesma peça e a câmera a leste dela (o lado direito de quem está virado para o norte), **When** o usuário olha, **Then** aparece a imagem da **direita**; a oeste, a da **esquerda**.
4. **Given** o usuário andando em volta da peça, **When** a câmera passa de um lado para o outro, **Then** a imagem muda para a do novo lado, sem a figura mudar de tamanho nem sair do lugar.
5. **Given** a vista 3D aberta, **When** alguém gira a peça no 2D (ou ela se move), **Then** a imagem exibida acompanha a nova direção em até 2 segundos.
6. **Given** a câmera presa ao personagem escolhido (atrás dele), **When** o usuário olha o próprio personagem, **Then** vê a imagem das costas; um NPC virado para ele aparece de frente.
7. **Given** várias peças de direções diferentes no mesmo mapa, **When** o usuário olha, **Then** cada uma mostra o lado correspondente à sua própria direção.

---

### User Story 3 - Tokens com poucas imagens continuam funcionando (Priority: P2)

Nem todo token terá as quatro imagens. Quando falta a imagem de um lado **lateral** e existe a do lado oposto, o 3D usa a do lado oposto **espelhada** (como num 2,5D de verdade, com três imagens o personagem já gira de forma convincente). Quando faltam as duas laterais, ou falta a das costas, usa a **frente**; sem frente, usa a imagem em pé do token, como hoje. Tokens que não têm nenhuma imagem 2,5D continuam aparecendo exatamente como antes desta feature.

**Why this priority**: evita figuras vazias e preserva os tokens existentes; não bloqueia o resto.

**Independent Test**: criar um token só com a frente e circular em volta dele (sempre a frente); um token com frente, costas e só a direita (a esquerda aparece como a direita espelhada); um token só com costas (o lado de trás mostra as costas, os outros usam a imagem em pé); um token antigo sem nenhuma (igual a antes).

**Acceptance Scenarios**:

1. **Given** um token só com a imagem de frente, **When** a câmera o vê de qualquer lado, **Then** aparece a frente.
2. **Given** um token com a imagem da direita mas sem a da esquerda, **When** a câmera o vê pelo lado esquerdo do personagem, **Then** aparece a imagem da direita espelhada na horizontal (e vice-versa).
3. **Given** um token com as duas imagens laterais, **When** a câmera o vê por qualquer lado, **Then** cada lado mostra a sua própria imagem, sem espelhar nada.
4. **Given** um token com frente e costas, mas sem direita nem esquerda, **When** a câmera o vê pelo lado, **Then** aparece a frente.
5. **Given** um token sem a imagem das costas, **When** a câmera o vê por trás, **Then** aparece a frente (as costas nunca são espelhadas a partir da frente).
6. **Given** um token sem imagem de frente, **When** a câmera o vê por um lado que também não tem imagem (nem a lateral oposta), **Then** aparece a imagem em pé do token (como hoje).
7. **Given** um token criado antes desta feature, **When** visto no 3D, **Then** aparece exatamente como antes.

---

### Edge Cases

- Peça em que a direção muda enquanto o usuário observa: a imagem troca de uma vez, sem animação intermediária.
- Token só com uma lateral que tem detalhes assimétricos (uma arma na mão, por exemplo): o lado espelhado mostra o detalhe do lado oposto; quem precisa dele no lado certo cadastra as duas laterais.
- Câmera exatamente na divisa entre dois lados (a 45°, 135°, 225° ou 315° da direção da peça): vale a frente ou as costas, e o resultado é sempre o mesmo para a mesma posição (nada de piscar com a câmera parada).
- Peça de vários hexágonos (2, 3, 7 ou 10): usa a direção e o centro da forma da peça, como nas demais regras.
- Objetos (que não têm postura): usam as imagens do token da mesma forma, pela direção em que estão colocados.
- Peça caída ou fora de combate: continua fora do 3D (034), nenhuma imagem é escolhida.
- Imagem salva que ainda não carregou: a figura aparece com a de reserva (a inicial do nome, como hoje) até carregar, sem travar o 3D.
- Edição de token de outra pessoa: continua só do criador; quem não pode editar vê as imagens mas não as altera.
- Troca de aba do cadastro com um recorte aberto: o recorte e o arquivo escolhido não se perdem.

## Requirements *(mandatory)*

### Functional Requirements

**Cadastro**

- **FR-001**: O token MUST aceitar quatro imagens 2,5D opcionais e independentes: **frente** (já existente), **direita**, **esquerda** e **costas**.
- **FR-002**: Cada uma das quatro imagens MUST ser recortada como a "2,5D frente" de hoje: retrato 3:4, salvo no mesmo tamanho, com zoom, posição e rotação ajustáveis, e a margem que sobrar fica transparente.
- **FR-003**: O recorte de cada imagem MUST mostrar a mesma silhueta humana de guia, no mesmo lugar: 60% da altura do recorte, centralizada, com os pés na borda de baixo. A silhueta é só um guia e MUST NOT entrar na imagem salva. Cada campo MUST dizer, na tela, como o personagem deve ser desenhado nele (de frente, de costas, de perfil olhando para a direita ou para a esquerda da imagem).
- **FR-004**: O cadastro de token (criar e editar) MUST ter uma aba própria para as imagens 2,5D, com os quatro campos; a imagem de frente MUST sair da aba principal e ficar nela.
- **FR-005**: Alternar entre a aba principal e a aba 2,5D MUST NOT perder nada do que foi preenchido (textos, tamanhos, imagens escolhidas e recortes em andamento).
- **FR-006**: Cada imagem MUST poder ser enviada, trocada ou removida sem afetar as outras; nenhuma é obrigatória, e o token continua válido sem nenhuma delas.
- **FR-007**: A edição do token continua só do criador, e salvar MUST substituir todos os campos como hoje: uma imagem 2,5D que não for reenviada nem mantida é removida.

**Integração**

- **FR-008**: A API do token MUST receber e devolver as quatro imagens (nome do arquivo e endereço temporário), e as informações das peças no mapa MUST trazer os endereços das quatro, para o 3D usar.
- **FR-009**: As integrações para assistentes de IA MUST refletir os campos novos (direita, esquerda, costas) ao criar, editar e listar tokens, e o guia delas MUST explicar a regra de escolha do lado.

**3D**

- **FR-010**: No 3D, cada figura MUST mostrar a imagem do lado em que a câmera a vê em relação à direção da peça no mapa: **frente** quando a câmera está diante do personagem, **costas** quando atrás, **direita** quando do lado direito dele e **esquerda** quando do lado esquerdo.
- **FR-011**: "Direita" e "esquerda" são sempre os lados **do próprio personagem**: a imagem da direita mostra o personagem visto pelo seu lado direito, de perfil **olhando para a direita da imagem**, e a da esquerda, olhando para a esquerda da imagem. Os quatro lados dividem a volta em torno da peça em **setores iguais de 90°**: a frente vale a ±45° da direção para onde a peça está virada, as costas a ±45° da direção oposta e cada lateral os 90° restantes de seu lado; exatamente na divisa entre um setor lateral e a frente ou as costas, vale a frente ou as costas.
- **FR-012**: A escolha MUST ser refeita sempre que a câmera se mover ou a peça mudar de direção ou de lugar, e MUST ser independente para cada peça.
- **FR-013**: Quando falta a imagem do lado visto, o 3D MUST escolher, nesta ordem: (1) se o lado visto é a direita ou a esquerda e existe a imagem do lado lateral oposto, essa imagem **espelhada na horizontal**; (2) a imagem de frente; (3) a imagem em pé do token, como hoje. A imagem das costas MUST NOT ser obtida espelhando outra. Um token sem nenhuma imagem 2,5D MUST aparecer exatamente como antes.
- **FR-014**: Trocar de imagem MUST NOT mudar o tamanho, o lugar nem a ordem de oclusão da figura: ela continua em pé, com os pés no chão, escondida pelas paredes como antes.
- **FR-015**: A mesma posição da câmera MUST sempre resultar na mesma imagem, espelhada ou não (sem piscar com a câmera parada).
- **FR-016**: O 2D, as regras de posição e movimento das peças e a regra de peças caídas/fora de combate fora do 3D MUST continuar como estão.

### Key Entities

- **Token**: ganha três imagens 2,5D opcionais — direita, esquerda e costas — além da frente que já tinha. Todas seguem o mesmo formato (retrato 3:4, silhueta de guia).
- **Peça no mapa**: já tem uma direção (para onde está virada); ela decide qual lado do token a câmera enxerga. A peça passa a trazer os endereços das quatro imagens do seu token.
- **Lado visto**: frente, direita, esquerda ou costas; resulta da posição da câmera em relação à direção da peça.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem tem as quatro imagens prontas cadastra todas num token novo em menos de 3 minutos.
- **SC-002**: Em 100% das posições testadas em volta de uma peça (nos quatro lados e em ângulos intermediários), a imagem exibida é a do lado correto, para peças viradas nas seis direções possíveis.
- **SC-003**: Ao girar uma peça no 2D, a imagem do 3D acompanha em até 2 segundos, para todos que estão com o 3D aberto.
- **SC-004**: A navegação no 3D continua fluida (pelo menos 30 quadros por segundo) com 50 peças de quatro imagens cada, em computador comum.
- **SC-005**: 100% dos tokens existentes (sem imagens 2,5D, ou só com a frente) aparecem no 3D como antes desta feature.
- **SC-006**: Pelo menos 90% dos usuários encontram a aba das imagens 2,5D e preenchem as quatro sem ajuda, na primeira tentativa.

## Assumptions

- "backend" do pedido é **costas** (back); na interface as imagens se chamam Frente, Direita, Esquerda e Costas.
- São **quatro direções** (não oito) e a troca é instantânea, sem mistura entre imagens. O espelhamento é só o descrito em FR-013 (lateral que falta); não há opção para desligá-lo.
- A direção de uma peça é a que ela já tem no mapa (seis direções, 60° cada); o "frente" do token é o lado para onde a peça está virada.
- A silhueta, o formato 3:4 e a posição dela são exatamente os da imagem de frente (034); só muda que agora há quatro campos.
- A câmera continua em terceira pessoa atrás do personagem escolhido (034): por isso o jogador vê as costas do próprio personagem.
- Esta feature parte do código da 034 já mesclado e das mudanças em andamento no recorte da frente; as imagens de frente já cadastradas viram o campo "Frente" sem nenhuma ação do usuário.
- Fora do escopo: animação de andar, oito ou mais direções, espelhar frente ou costas, escolher por token se o espelhamento vale, mistura suave entre imagens e qualquer mudança no 2D.
