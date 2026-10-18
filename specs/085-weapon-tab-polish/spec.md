# Feature Specification: Melhorias das armas no token

**Feature Branch**: `085-weapon-tab-polish`
**Created**: 2026-10-18
**Status**: Draft
**Input**: User description: "Melhoria das armas no token: na aba de Armas do Token, a arma na mão do personagem está apontando para a direita, mesmo estando configurada corretamente para a frente (prints `screenshots/token-com-arma.jpg` e `screenshots/arma.jpg`). Preciso poder dar zoom no 3D. O ajuste fino está ficando muito abaixo, preciso que ele abra do lado no modelo 3D, pelo menos no desktop, para facilitar o ajuste."

## Contexto

A 083 criou os encaixes das armas e a 084 o giro fino da pose. No primeiro uso real apareceram três problemas, todos na aba "Armas" do token e no editor da arma:

1. **A arma não aponta para onde a pose diz.** No editor da arma (`arma.jpg`), o machado está certo: cabeça para cima (seta verde, "cima") e gume para a direita (seta vermelha). Na mão direita do ogro (`token-com-arma.jpg`), o cabo aponta para fora, na horizontal, e o gume para a frente: a arma ficou girada um quarto de volta em relação ao esperado. O esperado, com o braço caído, é a cabeça do machado saindo do punho pelo lado do polegar (para a frente) e o gume voltado para os nós dos dedos. O modelo do print é um personagem criado por um gerador automático, cujo esqueleto não tem os ossos dos dedos.
2. **Não dá para aproximar a prévia 3D.** Para ajustar uma arma na mão é preciso ver a mão de perto, e hoje a prévia fica sempre no mesmo enquadramento (o personagem inteiro, pequeno).
3. **O ajuste fino fica longe do modelo.** Os controles do ajuste fino abrem embaixo da lista de encaixes, muito abaixo da prévia; no desktop o usuário precisa rolar para cima e para baixo entre cada arrasto e o resultado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A arma aponta para onde a pose diz, em qualquer modelo (Priority: P1)

O usuário define a pose padrão de uma arma no editor (ponta para cima, gume para a direita) e a escolhe para a mão de um token. Na prévia do token, e na mesa, a arma aparece na mão como a pose diz: a ponta sai do punho pelo lado do polegar e o gume aponta para os nós dos dedos. Isso vale tanto para modelos com os ossos dos dedos quanto para modelos de geradores automáticos, sem dedos, como o ogro do print.

**Why this priority**: é o motivo dos encaixes existirem. Uma arma atravessada na mão torna a feature inútil para os modelos mais comuns do usuário.

**Independent Test**: com o machado do print (pose certa no editor), escolhê-lo na mão direita do ogro do print e ver, na prévia do token, a cabeça do machado para a frente/cima e o gume para baixo, sem tocar no ajuste fino. Repetir com um modelo humanoide com dedos: mesmo resultado.

**Acceptance Scenarios**:

1. **Given** uma arma posada no editor com a ponta para cima e o gume para a direita, **When** ela é escolhida na mão direita do ogro do print, **Then** a prévia mostra a ponta saindo do punho pelo lado do polegar e o gume voltado para os nós dos dedos, sem ajuste fino.
2. **Given** a mesma arma, **When** escolhida na mão esquerda, **Then** fica segura do mesmo jeito pela outra mão.
3. **Given** a mesma arma num modelo humanoide com os ossos dos dedos, **Then** o resultado é o mesmo da US2 da 083: ponta pelo polegar, gume pelos nós dos dedos.
4. **Given** a arma colocada numa mão, **When** a prévia toca Parado e Caminhando, **Then** a arma acompanha a mão mantendo essa orientação em relação a ela.
5. **Given** o token salvo, **When** a peça aparece na vista 3D da mesa, **Then** a arma está na mesma orientação da prévia.
6. **Given** um modelo em que o encaixe da mão é aproximado (sem dedos), **Then** a aba continua avisando que o encaixe é aproximado e o ajuste fino continua disponível para corrigir o resto.

---

### User Story 2 - Aproximar e afastar a prévia 3D (Priority: P2)

Na aba "Armas" do token (e nas outras abas do modelo 3D), o usuário aproxima a prévia para ver a mão e a arma de perto — com a roda do mouse, com dois dedos no celular ou com botões "+" e "−" — e afasta de novo para ver o personagem inteiro. A prévia continua girando e o ajuste fino continua refletido na hora.

**Why this priority**: sem aproximar, o ajuste de uma arma na mão é feito no escuro. É o que torna o ajuste fino utilizável.

**Independent Test**: na aba "Armas", aproximar até a mão encher a prévia, arrastar um controle do ajuste fino e ver a arma se mover de perto; afastar até o personagem inteiro caber de novo.

**Acceptance Scenarios**:

1. **Given** a prévia do modelo 3D, **When** o usuário usa a roda do mouse sobre ela ou os botões "+"/"−", **Then** a prévia aproxima ou afasta, dentro de limites que nem escondem o personagem nem o deixam minúsculo.
2. **Given** a prévia no celular, **When** o usuário faz o gesto de pinça sobre ela, **Then** ela aproxima ou afasta do mesmo jeito.
3. **Given** a prévia aproximada, **When** o usuário muda a arma, a pose, o tamanho ou o ajuste fino, **Then** a prévia continua aproximada e mostra a mudança.
4. **Given** a prévia aproximada, **When** o usuário troca de aba ("3D", "Animação", "Armas") ou de estado (Parado, Caminhando, Caído), **Then** a aproximação é mantida enquanto o mesmo modelo está aberto.
5. **Given** a prévia aproximada, **When** o usuário abre outro token ou troca o modelo, **Then** a prévia volta ao enquadramento inteiro.
6. **Given** a roda do mouse sobre a prévia, **Then** a página não rola junto.
7. **Given** o editor da arma, **When** o usuário usa a roda, a pinça ou os botões, **Then** a arma aproxima e afasta do mesmo jeito, e o clique para marcar a pega continua funcionando aproximado.

---

### User Story 3 - Ajuste fino ao lado do modelo no desktop (Priority: P2)

No desktop, a aba "Armas" mostra a prévia 3D de um lado e, do outro, os controles do encaixe escolhido: a arma, o tamanho e o ajuste fino já aberto. O usuário arrasta um controle e vê a arma se mover ao lado, sem rolar a página. No celular, onde não há largura, os controles continuam embaixo da prévia, como hoje.

**Why this priority**: o ajuste fino existe para modelos fora do padrão; se cada arrasto exige rolar a janela, ele não é usado.

**Independent Test**: no desktop, abrir a aba "Armas" de um token com arma, ver prévia e controles lado a lado sem rolagem, arrastar um controle do ajuste fino e ver o resultado ao lado. No celular, ver os controles embaixo da prévia.

**Acceptance Scenarios**:

1. **Given** a aba "Armas" no desktop, **Then** a prévia e os controles do encaixe (arma, tamanho, ajuste fino) ficam lado a lado e visíveis ao mesmo tempo, sem rolar.
2. **Given** a aba "Armas" no desktop, **When** o usuário arrasta um controle do ajuste fino, **Then** a arma se move na prévia ao lado, na hora.
3. **Given** a aba "Armas" no celular, **Then** a prévia fica em cima e os controles embaixo, e o ajuste fino continua recolhido por padrão.
4. **Given** as abas "3D" e "Animação", **Then** elas continuam como estão: a prévia muda de lugar só na aba "Armas" (ou, se a mudança valer para as três, sem perder nenhum controle que elas têm hoje).
5. **Given** a janela do token redimensionada entre desktop e celular, **Then** o modelo 3D não é carregado de novo nem perde a aproximação.

---

### Edge Cases

- **Modelo sem os ossos dos dedos** (o ogro): a orientação da mão sai do braço e do corpo do personagem; o resultado deve ser o mesmo "ponta pelo polegar, gume pelos nós dos dedos" na pose de descanso, e o aviso de encaixe aproximado continua.
- **Modelo com pose de descanso diferente** (braços caídos em "A", palmas viradas para trás ou para o corpo): a orientação da arma na mão deve ser a mesma em relação à mão, e não depender de como o arquivo foi exportado.
- **Modelo em que a mão aponta para um lado estranho na animação**: a arma acompanha a mão; se o resultado ficar feio por causa da animação, o ajuste fino corrige, e isso é esperado.
- **Aproximação máxima/mínima**: a prévia nunca entra no modelo nem o perde de vista; os botões ficam desabilitados nos limites.
- **Roda do mouse fora da prévia**: a página rola normalmente.
- **Desktop estreito** (janela pequena): se não couberem lado a lado, os controles vão para baixo, como no celular.
- **Vista 3D da mesa**: o zoom dela (campo de visão / distância da câmera) não muda com esta feature; só as prévias do formulário e do editor ganham zoom.

## Requirements *(mandatory)*

### Functional Requirements

**Orientação na mão**

- **FR-001**: Uma arma com a pose padrão definida (ponta +Y, gume +X, face +Z) MUST aparecer na mão do token com a ponta saindo do punho pelo lado do polegar, o gume voltado para os nós dos dedos e a face voltada para o dorso da mão, na pose de descanso do modelo, em modelos com ou sem os ossos dos dedos.
- **FR-002**: Esse resultado MUST ser o mesmo na prévia do token e na vista 3D da mesa, e MUST acompanhar a mão em todas as animações.
- **FR-003**: Para modelos sem os ossos dos dedos, o encaixe MUST continuar marcado como aproximado, e o ajuste fino MUST continuar disponível.
- **FR-004**: O ogro do print (`screenshots/token-com-arma.jpg`) e os modelos humanoides de exemplo do projeto MUST ser os casos de verificação.

**Zoom da prévia**

- **FR-005**: As prévias 3D do formulário do token (abas "3D", "Animação" e "Armas") e do editor da arma MUST aproximar e afastar com a roda do mouse, com o gesto de pinça e com botões "+" e "−".
- **FR-006**: A aproximação MUST ter limites: no mínimo o enquadramento inteiro de hoje; no máximo o suficiente para a mão e a arma encherem a prévia.
- **FR-007**: A aproximação MUST ser mantida enquanto o mesmo modelo está aberto (troca de aba, de estado, de arma, de pose, de tamanho, de ajuste fino) e MUST voltar ao enquadramento inteiro quando outro modelo é aberto.
- **FR-008**: A roda do mouse sobre a prévia MUST NOT rolar a página.
- **FR-009**: Aproximar MUST NOT mudar o giro da prévia, o clique para marcar a pega nem a foto da pose ("Gerar imagem").

**Ajuste fino ao lado**

- **FR-010**: No desktop, a aba "Armas" MUST mostrar a prévia e os controles do encaixe escolhido (encaixe, arma, tamanho, ajuste fino) lado a lado, visíveis ao mesmo tempo sem rolagem numa janela de altura comum.
- **FR-011**: No desktop, o ajuste fino MUST estar aberto nessa coluna (não recolhido).
- **FR-012**: No celular, ou quando a largura não permitir, os controles MUST ficar embaixo da prévia, com o ajuste fino recolhido por padrão, como hoje.
- **FR-013**: Mudar entre os dois arranjos MUST NOT recarregar o modelo 3D nem perder a aproximação.

### Key Entities

Nenhuma entidade nova: a feature muda a forma como a orientação do encaixe da mão é calculada e a apresentação das prévias e da aba "Armas". Nada é guardado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No ogro do print e nos modelos humanoides de exemplo, uma arma posada no editor aparece na mão com a ponta pelo polegar e o gume pelos nós dos dedos em 100% dos casos, sem ajuste fino.
- **SC-002**: O usuário aproxima a prévia até a mão encher a janela em menos de 3 segundos, com a roda, a pinça ou dois cliques no "+".
- **SC-003**: No desktop, o usuário faz um ajuste fino completo (arma, tamanho e os seis controles) sem rolar a página nenhuma vez.
- **SC-004**: A prévia continua respondendo na hora (sem atraso perceptível) com a aproximação máxima num notebook comum.

## Assumptions

- O problema da orientação está no cálculo do encaixe da mão para alguns esqueletos (sem dedos, ou com pose de descanso diferente da esperada), não na pose da arma: o editor mostra a arma certa.
- "Desktop" é a largura em que o Roll6 já mostra o menu em uma linha (a mesma divisão que o resto do site usa entre celular e desktop).
- O zoom é da prévia, não do modelo: nada é guardado no token nem na arma.
- O zoom da vista 3D da mesa já existe (campo de visão / distância da câmera) e não muda.
- As abas "3D" e "Animação" podem ou não ganhar o mesmo arranjo lado a lado; o que não pode é perder os controles que têm hoje (arquivo, tamanho do modelo, animações, linha do tempo, "Gerar imagem").
