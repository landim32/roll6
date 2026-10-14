# Feature Specification: Melhorias no token 3D — oclusão, postura defensiva, linha do tempo e foto da pose

**Feature Branch**: `057-token-3d-pose-capture`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "Melhorias no Token 3D: Quando o 2.5D passa na frente de um Token 3D, o 3D sempre fica visivel; Adicione uma animação stand (Parado em posição defensiva); Deve ter uma barra de exibe o progresso na animação; O usuário pode mover a animação pra onde quiser, pode pausar tb; Quando usuário pausa, ele deve ter uma combo gerar imagem, com as opções: Imagem em Pé - Tira uma foto da animação na posição em que está pausado em um angulo de 90º e salva na imagem em pé; Imagem Caído - Tira uma foto da animação na posição em que está pausado em um angulo de 90º e salva na imagem caído"

## Contexto

Desde a feature 055 um token pode ter um **modelo 3D**, desenhado pela vista 3D da mesa no lugar da figura "2,5D", e desde a escolha de animações o formulário do token tem, na aba **"3D"**, uma prévia do modelo e um seletor da animação de cada estado (Parado e Caminhando: automático, um clipe do arquivo, a animação do Roll6 ou nenhuma).

Esta feature resolve um defeito e acrescenta três coisas:

1. **Defeito de sobreposição**: na vista 3D, quando uma figura 2,5D está **mais perto** da câmera que um modelo 3D, o modelo continua aparecendo por cima dela, como se estivesse na frente. A figura mais próxima deve cobrir o modelo, como já cobre outra figura.
2. **Postura defensiva**: uma nova animação própria do Roll6, "Parado em posição defensiva" (guarda alta, pernas afastadas, peso baixo, respiração tensa), oferecida como opção nos seletores de animação.
3. **Linha do tempo da prévia**: uma barra mostra o andamento da animação que a prévia toca, com pausar/continuar e a possibilidade de arrastar para qualquer ponto da animação.
4. **Foto da pose**: com a prévia pausada, o usuário gera a **imagem em pé** ou a **imagem caído** do token a partir da pose em que o modelo está, sem precisar desenhar nem recortar uma imagem à parte.

## Clarifications

### Session 2026-10-14

- Q: Qual é o "ângulo de 90º" de cada foto? → A: As duas fotos são tiradas de cima, com a câmera perpendicular ao chão, como o mapa 2D é visto. "Imagem em Pé" e "Imagem Caído" usam a mesma vista; mudam só o campo de destino e o quadro (o tamanho da imagem em pé ou caído para o espaço do token).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A figura mais próxima cobre o modelo 3D (Priority: P1)

Na vista 3D da mesa, quem olha a cena vê as peças na ordem certa de profundidade: se uma figura 2,5D está entre a câmera e um modelo 3D, a figura aparece na frente e esconde a parte do modelo que fica atrás dela; se o modelo está mais perto, ele aparece na frente da figura (como hoje). As paredes continuam escondendo os dois.

**Why this priority**: É um defeito visível em qualquer mesa que misture tokens com modelo e tokens 2,5D, e quebra a leitura de quem está na frente de quem — informação que importa na mesa.

**Independent Test**: Num mapa com uma peça com modelo 3D e outra só com imagens 2,5D, posicionar a câmera de modo que a figura 2,5D fique entre a câmera e o modelo: a figura cobre o modelo. Girar a câmera até o modelo ficar entre a câmera e a figura: o modelo cobre a figura.

**Acceptance Scenarios**:

1. **Given** uma figura 2,5D mais próxima da câmera que um modelo 3D, sobrepostos na tela, **When** a vista 3D desenha a cena, **Then** a figura aparece inteira e a parte do modelo atrás dela não aparece.
2. **Given** um modelo 3D mais próximo da câmera que uma figura 2,5D, sobrepostos na tela, **When** a vista 3D desenha a cena, **Then** o modelo aparece na frente da figura.
3. **Given** uma figura 2,5D com partes transparentes (entre os braços, em volta da cabeça) na frente de um modelo, **When** a cena é desenhada, **Then** o modelo aparece através das partes transparentes da figura e só fica escondido onde a figura tem desenho.
4. **Given** a câmera andando ao redor das duas peças (inclusive na caminhada do modo livre), **When** a ordem de profundidade muda, **Then** quem fica na frente muda junto, sem piscar nem atrasar em relação ao movimento.

---

### User Story 2 - Linha do tempo da animação na prévia (Priority: P1)

Na aba "3D" do token, abaixo da prévia, uma barra mostra em que ponto a animação que está tocando se encontra (início à esquerda, fim à direita), avançando enquanto toca e voltando ao início quando a animação recomeça. Um botão pausa e retoma a animação. O usuário arrasta o marcador da barra (ou toca/clica num ponto dela) e o modelo vai imediatamente para aquele ponto da animação, ficando pausado ali enquanto ele segura e depois de soltar, se estava pausado.

**Why this priority**: É o que permite escolher uma pose exata, base da geração de imagem (história 3); também ajuda a conferir uma animação quadro a quadro antes de escolhê-la.

**Independent Test**: Abrir um token com modelo animado, ver a barra andar; pausar e ver modelo e barra pararem; arrastar a barra para o meio e ver o modelo na pose do meio da animação; retomar e ver a animação seguir a partir dali.

**Acceptance Scenarios**:

1. **Given** a prévia tocando uma animação, **When** o usuário olha a barra, **Then** o marcador avança em sincronia com o movimento do modelo e volta ao início a cada repetição.
2. **Given** a prévia tocando, **When** o usuário toca em "Pausar", **Then** o modelo e o marcador param no mesmo instante, e o botão passa a "Continuar".
3. **Given** a prévia pausada ou tocando, **When** o usuário arrasta o marcador ou toca num ponto da barra, **Then** o modelo mostra a pose daquele ponto enquanto arrasta, e ao soltar fica pausado ali.
4. **Given** a prévia pausada num ponto, **When** o usuário toca em "Continuar", **Then** a animação segue a partir daquele ponto.
5. **Given** a troca entre Parado e Caminhando ou a troca da animação escolhida num seletor, **When** a nova animação começa, **Then** a barra passa a refletir a nova animação, começando do início e tocando.
6. **Given** um estado sem animação (modelo estático ou "Sem animação"), **When** a prévia o mostra, **Then** a barra e o botão de pausa ficam desabilitados, e a geração de imagem (história 3) continua disponível sobre a pose de repouso.
7. **Given** a barra em teclado, **When** o usuário foca o marcador e usa as setas, **Then** o ponto da animação avança ou recua em passos pequenos, e o leitor de tela anuncia o tempo atual e o total.

---

### User Story 3 - Gerar a imagem em pé ou caído a partir da pose pausada (Priority: P2)

Com a prévia pausada, aparece o controle **"Gerar imagem"** com duas opções: **Imagem em Pé** e **Imagem Caído**. Ao escolher uma delas, o sistema fotografa o modelo na pose pausada, visto de cima como no mapa 2D, com fundo transparente e no enquadramento da imagem correspondente do token, e coloca a foto no campo dessa imagem na aba "Token" — no lugar da imagem que havia, como se o usuário tivesse escolhido um novo arquivo. O usuário vê o resultado no campo, pode ajustar o recorte como faz com qualquer imagem e decide salvar o token ou não; nada é salvo antes disso.

**Why this priority**: É o ganho de produtividade da feature (a imagem 2D do token sai do próprio modelo), mas depende da pausa (história 2) e não corrige nada que esteja errado hoje.

**Independent Test**: Num token com modelo, pausar a prévia numa pose, gerar "Imagem em Pé", ir à aba "Token" e ver a foto no campo da imagem em pé; salvar e ver a peça no mapa 2D com a imagem nova. Repetir com "Imagem Caído" e ver a peça caída usar a foto.

**Acceptance Scenarios**:

1. **Given** a prévia tocando, **When** o usuário olha os controles, **Then** "Gerar imagem" não está disponível (só aparece ou só se habilita com a prévia pausada).
2. **Given** a prévia pausada numa pose, **When** o usuário escolhe "Imagem em Pé", **Then** em até 2 s o campo da imagem em pé passa a ter a foto dessa pose, com fundo transparente, no tamanho da imagem em pé para o espaço escolhido do token, e uma mensagem confirma onde a imagem foi colocada.
3. **Given** a prévia pausada numa pose, **When** o usuário escolhe "Imagem Caído", **Then** o campo da imagem caído passa a ter a foto da mesma vista de cima, no tamanho da imagem caído para o espaço caído escolhido (2 hexes quando não há escolha), com o modelo centrado no quadro.
4. **Given** uma imagem gerada e o token ainda não salvo, **When** o usuário fecha o formulário sem salvar, **Then** o token continua com as imagens de antes.
5. **Given** uma imagem gerada, **When** o usuário salva o token, **Then** a peça no mapa 2D passa a usar a foto (em pé ou caída, conforme a postura), como usaria uma imagem enviada à mão.
6. **Given** a foto gerada, **When** o usuário a vê no mapa 2D, **Then** a frente do personagem fica para o mesmo lado que as imagens de token enviadas à mão (a frente da peça), e o personagem ocupa o quadro sem cortes nas bordas.
7. **Given** um aparelho onde a prévia 3D não abre, **When** o usuário vai à aba "3D", **Then** "Gerar imagem" não é oferecido.

---

### User Story 4 - Animação "Parado em posição defensiva" (Priority: P3)

Nos seletores de animação da aba "3D", ao lado de "Animação do Roll6", aparece **"Posição defensiva (Roll6)"**: o personagem parado em guarda, pernas afastadas e flexionadas, braços erguidos à frente do corpo, com um leve balanço de peso e respiração. Escolhida para o estado Parado, é ela que a prévia mostra e que a vista 3D da mesa toca para esse token quando a peça está parada.

**Why this priority**: Enriquece a apresentação, mas o token já funciona sem ela; é útil sobretudo junto com a história 3, para gerar uma imagem de token em guarda.

**Independent Test**: Num token com esqueleto humanoide padrão, escolher "Posição defensiva (Roll6)" para Parado, ver a prévia na pose de guarda, salvar e ver a mesma animação na vista 3D da mesa.

**Acceptance Scenarios**:

1. **Given** um modelo com esqueleto humanoide padrão, **When** o usuário abre o seletor de Parado ou de Caminhando, **Then** "Posição defensiva (Roll6)" está entre as opções.
2. **Given** um modelo sem esqueleto humanoide padrão, **When** o usuário abre os seletores, **Then** a opção não aparece (como a animação do Roll6 hoje).
3. **Given** a posição defensiva escolhida para Parado e o token salvo, **When** a peça está parada na vista 3D da mesa, **Then** ela toca a posição defensiva.
4. **Given** um modelo cujo rig só aguenta parte do movimento, **When** a posição defensiva é escolhida, **Then** ela é reduzida como as outras animações do Roll6 (sem rasgar a malha) e o aviso de movimento reduzido aparece.

---

### Edge Cases

- **Modelo ainda carregando**: a barra e "Gerar imagem" ficam desabilitados até a prévia terminar de abrir o modelo.
- **Arquivo trocado com a prévia pausada**: o novo modelo começa tocando, a barra volta ao início e qualquer escolha anterior em "Gerar imagem" não é refeita.
- **Rotação manual da prévia**: girar o modelo com o arrasto na prévia não muda a foto — a foto usa sempre o enquadramento fixo da história 3, independente de para onde a prévia estiver virada.
- **Animação muito curta** (menos de meio segundo) ou muito longa: a barra continua utilizável, com passos de teclado proporcionais à duração.
- **Gerar duas vezes**: gerar "Imagem em Pé" de novo substitui a foto anterior no campo; gerar "Imagem Caído" não toca a imagem em pé.
- **Token sem imagem em pé ainda (criação)**: gerar "Imagem em Pé" preenche o campo, satisfazendo a exigência de imagem em pé para salvar.
- **Vista de cima numa pose que se inclina** (golpe, agachado): a foto mostra o que a câmera de cima vê nessa pose, sem corrigir a inclinação; quem quiser outra pose escolhe outro ponto na barra.
- **Modelo em pose que sai do enquadramento** (braços muito abertos, arma longa): a foto ajusta o enquadramento para caber o modelo inteiro na pose atual, sem cortar.
- **Figura 2,5D e modelo no mesmo hex/sobrepostos (peça caída por cima, que permite sobreposição)**: a ordem segue a distância de cada ponto desenhado à câmera, sem que um some por inteiro.
- **Peça caída ou fora de combate**: continua sem aparecer na vista 3D, com ou sem modelo; a correção de sobreposição só se aplica a peças desenhadas.

## Requirements *(mandatory)*

### Functional Requirements

**Sobreposição na vista 3D**

- **FR-001**: A vista 3D MUST desenhar figuras 2,5D e modelos 3D respeitando a profundidade de cada ponto desenhado: o que estiver mais perto da câmera aparece na frente, nos dois sentidos (figura sobre modelo e modelo sobre figura).
- **FR-002**: Partes transparentes de uma figura 2,5D MUST deixar ver o modelo que está atrás delas.
- **FR-003**: A correção MUST valer em todos os níveis de qualidade do 3D (Padrão, Alta, Ultra), na câmera de observador e na caminhada do modo livre, sem mudar o que já está certo (paredes escondendo modelos e figuras, balões, sombras).

**Linha do tempo da prévia**

- **FR-004**: A prévia da aba "3D" MUST mostrar uma barra de progresso da animação em reprodução, sincronizada com o modelo, do início ao fim da animação, reiniciando a cada repetição.
- **FR-005**: Os usuários MUST poder pausar e retomar a animação da prévia; ao retomar, ela segue do ponto em que parou.
- **FR-006**: Os usuários MUST poder levar a animação a qualquer ponto arrastando o marcador ou tocando/clicando na barra; o modelo MUST mostrar a pose daquele ponto durante o arrasto, e a prévia MUST ficar pausada nesse ponto ao soltar.
- **FR-007**: A barra MUST funcionar por toque, mouse e teclado (setas avançam/recuam), e MUST anunciar o tempo atual e o total a tecnologias assistivas.
- **FR-008**: Trocar entre Parado e Caminhando ou trocar a animação escolhida MUST reiniciar a barra na nova animação, tocando.
- **FR-009**: Sem animação no estado mostrado, a barra e o pausar MUST ficar desabilitados.

**Gerar imagem a partir da pose**

- **FR-010**: Com a prévia pausada (ou num estado sem animação), o sistema MUST oferecer "Gerar imagem" com as opções "Imagem em Pé" e "Imagem Caído"; com a prévia tocando, a opção MUST não estar disponível.
- **FR-011**: Gerar uma imagem MUST fotografar o modelo na pose exibida, com fundo transparente, com a câmera **vendo o modelo de cima, perpendicular ao chão** (como o mapa 2D é visto), tanto para "Imagem em Pé" quanto para "Imagem Caído"; as duas fotos diferem só no campo de destino e no tamanho do quadro (FR-012).
- **FR-012**: A foto MUST sair no tamanho e na proporção da imagem correspondente do token para o espaço escolhido (em pé: o espaço em pé; caído: o espaço caído, 2 hexes quando não escolhido), com o modelo inteiro dentro do quadro e a frente do personagem para o mesmo lado das imagens de token enviadas à mão.
- **FR-013**: A foto gerada MUST entrar no campo da imagem correspondente da aba "Token" exatamente como um arquivo escolhido pelo usuário (com o mesmo ajuste de recorte disponível), substituindo o que havia no campo, e MUST só ser gravada quando o token for salvo.
- **FR-014**: O sistema MUST confirmar ao usuário qual imagem foi gerada; uma falha na geração MUST ser avisada sem alterar o campo.
- **FR-015**: Gerar imagem MUST estar disponível para quem pode editar o token (na criação e na edição pelo criador), e só onde a prévia 3D abre.

**Postura defensiva**

- **FR-016**: O sistema MUST oferecer uma nova animação própria, "Posição defensiva (Roll6)", nos seletores de Parado e de Caminhando, nas mesmas condições da animação do Roll6 (esqueleto humanoide padrão).
- **FR-017**: A escolha MUST ser salva com o token como as demais escolhas de animação e MUST ser tocada pela prévia e pela vista 3D da mesa.
- **FR-018**: A posição defensiva MUST ser ajustada ao rig do modelo como as demais animações do Roll6 (reduzida quando necessário, sem rasgar a malha, com o mesmo aviso).
- **FR-019**: A nova opção MUST ser aceita também pelas ferramentas de assistentes de IA que criam e alteram tokens, com a descrição atualizada.

### Key Entities

- **Token**: ganha um novo valor possível na escolha de animação de cada estado (a posição defensiva); as imagens em pé e caído continuam as mesmas, só que podem passar a vir de uma foto do modelo.
- **Pose pausada da prévia**: estado só do formulário — animação mostrada e ponto dela —, usado para a foto; não é salvo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos casos de teste com uma figura 2,5D na frente de um modelo 3D, a figura aparece sobre o modelo, em todos os níveis de qualidade e nos dois modos de câmera.
- **SC-002**: A vista 3D com modelos e figuras mantém a mesma fluidez de antes da correção (sem queda perceptível de quadros por segundo no mesmo aparelho).
- **SC-003**: O usuário consegue parar a prévia numa pose escolhida e gerar a imagem em pé do token em menos de 30 segundos, sem sair do formulário.
- **SC-004**: A foto gerada aparece no campo da imagem em até 2 segundos após a escolha.
- **SC-005**: Uma peça cuja imagem foi gerada a partir do modelo aparece no mapa 2D com o personagem inteiro, sem cortes, e virada para o mesmo lado que uma peça com imagem enviada à mão.
- **SC-006**: Ao arrastar a barra, o modelo acompanha o marcador sem atraso perceptível (a pose muda no mesmo quadro do movimento).

## Assumptions

- A linha do tempo e "Gerar imagem" ficam só na prévia da aba "3D" do formulário do token; a vista 3D da mesa não ganha controles de animação.
- A foto vai para o campo da imagem, não é salva sozinha: o usuário confere e salva o token como sempre — o mesmo fluxo das imagens enviadas à mão (upload só no salvamento).
- "Posição defensiva" é uma opção a mais nos seletores existentes, não um terceiro estado: o token continua com dois estados (Parado e Caminhando), e o uso esperado é escolhê-la para Parado.
- A foto não depende da rotação manual que o usuário deu à prévia: o enquadramento é fixo, com a frente do personagem para o lado que as imagens de token usam no mapa 2D.
- Quem pode editar o token (o criador, ou quem está criando um novo) é quem usa "Gerar imagem"; a prévia continua visível a todos que abrem o token, como hoje.
- Não há mudança de quem pode ver a vista 3D nem de como as peças se movem; a correção de sobreposição é só de desenho.
