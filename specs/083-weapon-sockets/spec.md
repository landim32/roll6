# Feature Specification: Pontos de encaixe de armas nos tokens 3D

**Feature Branch**: `083-weapon-sockets`
**Created**: 2026-10-18
**Status**: Draft
**Input**: User description: "Essa forma ficou muito trabalhosa para colocar em um modelo. O ideal seria criar uma espécie de ponto de encaixe no token, tipo mão direita, mão esquerda, costas, coldre na cintura direito e esquerdo. Aí crio um ponto de encaixe na arma também e defino qual a posição dela é cima e direita. Quando for encaixar a arma no modelo, o máximo que precisaria ajustar é o tamanho da arma. Crie a spec para isso, mantenha o ajuste fino e a orientação da arma fica em passos de 90º."

## Contexto

A 082 criou a biblioteca de armas e deixou o usuário prender uma arma em cada mão de um token com modelo 3D. Na mesa funcionou, mas **colocar a arma ficou trabalhoso**: a pegada é ajustada em sete controles (três de posição, três de rotação e o tamanho), e os eixos em que esses controles agem são os do osso da mão, que mudam de um modelo para outro e até entre a mão direita e a esquerda do mesmo modelo. Cada token exige girar a arma nos três eixos até acertar, e o acerto de um token não serve para o próximo.

Esta feature troca esse ajuste por **pontos de encaixe**, o jeito que os jogos usam:

1. **Encaixes no token**: todo token com modelo 3D humanoide ganha, de graça, cinco pontos de encaixe com significado fixo — mão direita, mão esquerda, costas, coldre direito e coldre esquerdo. O usuário não cadastra nada: o sistema os encontra no esqueleto e dá a cada um a mesma orientação em qualquer modelo (na mão, "cima" é a saída do punho fechado do lado do polegar; nas costas, a arma fica na diagonal com a pega acima do ombro; no coldre, a ponta fica para baixo).
2. **Pega na arma**: cada arma da biblioteca ganha, uma única vez, o seu ponto de pega (onde a mão segura) e a sua **pose padrão** — a arma de pé, com a ponta para cima e o gume para a direita —, definida girando o modelo em passos de 90°.
3. **Encaixar**: no token, o usuário escolhe uma arma para cada encaixe que quiser. O sistema alinha a pega da arma ao encaixe e, no caso normal, **só o tamanho precisa de ajuste**. O ajuste fino de posição e rotação da 082 continua existindo, escondido, para os modelos que fugirem do padrão.

## Clarifications

### Session 2026-10-18

- Q: O ajuste fino de posição e rotação da 082 continua? → A: Sim, como um ajuste opcional e escondido por padrão, por encaixe de cada token. No caso normal o usuário só mexe no tamanho.
- Q: A pose padrão da arma gira livremente ou em passos? → A: Só em passos de 90°, em cada um dos três eixos. Não há giro livre na arma.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Definir a pega e a pose padrão de uma arma (Priority: P1)

Na biblioteca de armas, o usuário abre uma arma e vê o modelo na prévia junto com uma referência do que é "cima" e "direita". Ele gira a arma em passos de 90° até ela ficar de pé, ponta para cima e gume para a direita, e marca onde a mão segura (o meio do cabo numa espada, a alça num escudo, o punho num arco). Isso fica gravado na arma e vale para todos os tokens que a usarem.

**Why this priority**: sem a pega e a pose padrão, o encaixe não sabe como alinhar a arma. É a base das outras histórias.

**Independent Test**: enviar uma espada deitada no arquivo, girá-la na prévia até ficar de pé com o gume para a direita, marcar o cabo e salvar. Reabrir a arma e ver a mesma pose e a mesma marca.

**Acceptance Scenarios**:

1. **Given** uma arma nova ou existente, **When** o usuário abre a sua edição, **Then** a prévia mostra o modelo com uma referência visível de "cima" e "direita" e a marca da pega.
2. **Given** a arma na prévia, **When** o usuário gira em passos de 90° num dos três eixos, **Then** a prévia gira na hora e nunca para numa posição fora dos passos.
3. **Given** a arma na pose desejada, **When** o usuário marca o ponto de pega, **Then** a marca aparece sobre o modelo onde ele indicou.
4. **Given** pose e pega definidas, **When** o usuário salva, **Then** ao reabrir a arma a pose e a pega são as mesmas.
5. **Given** uma arma enviada sem nada definido, **Then** a pega padrão fica no meio da arma e a pose padrão é a do arquivo, de modo que o encaixe funciona desde o primeiro momento, mesmo sem ajuste.
6. **Given** uma arma de outro usuário, **When** o usuário a abre, **Then** ele vê a pose e a pega, mas não as muda: só o dono define a pega e a pose (como já acontece com o nome e o arquivo).

---

### User Story 2 - Encaixar armas nos pontos do token (Priority: P1)

Na edição de um token com modelo 3D humanoide, a aba de armas lista os cinco encaixes — mão direita, mão esquerda, costas, coldre direito e coldre esquerdo. Para cada um o usuário escolhe uma arma da biblioteca (ou nenhuma). A arma aparece na prévia já na posição certa: na mão, segurada pela pega, ponta para cima quando o braço está relaxado; nas costas, na diagonal com a pega acima do ombro; no coldre, com a ponta para baixo na lateral da cintura. O usuário ajusta, no máximo, o tamanho.

**Why this priority**: é o que resolve o problema relatado. Junto com a US1, é o menor recorte que entrega valor.

**Independent Test**: com uma espada definida na US1, escolhê-la na mão direita de um token humanoide e ver, sem tocar em mais nada, o cabo na palma e a lâmina para cima. Escolher a mesma espada nas costas e ver a bainha na diagonal. Salvar e ver o mesmo resultado na vista 3D da mesa, em todas as animações.

**Acceptance Scenarios**:

1. **Given** um token com modelo humanoide, **When** o usuário escolhe uma espada na mão direita, **Then** a prévia mostra o cabo na palma e a lâmina saindo do punho pelo lado do polegar, sem nenhum ajuste.
2. **Given** a mesma espada, **When** o usuário a escolhe na mão esquerda, **Then** ela fica segura do mesmo jeito pela mão esquerda, espelhada como uma mão espelha a outra.
3. **Given** um escudo com a pega definida na alça, **When** o usuário o escolhe na mão esquerda, **Then** o escudo fica na frente do antebraço, com a face externa para fora.
4. **Given** uma arma escolhida nas costas, **Then** ela fica atrás do tronco, na diagonal, com a pega acima de um ombro, e acompanha o tronco em todas as animações.
5. **Given** uma arma escolhida num coldre, **Then** ela fica na lateral da cintura daquele lado, ponta para baixo, e acompanha o quadril.
6. **Given** armas em vários encaixes ao mesmo tempo (espada na mão, escudo na outra, arco nas costas, adaga no coldre), **Then** todas aparecem, cada uma no seu lugar.
7. **Given** uma arma encaixada, **When** o usuário muda o tamanho, **Then** a arma cresce ou encolhe em torno da pega, que fica no mesmo lugar.
8. **Given** o token salvo, **When** qualquer participante abre a vista 3D de um mapa com essa peça, **Then** a peça aparece com todas as armas nos seus encaixes, parada, andando no modo livre e caída.
9. **Given** o dono da arma muda a pega ou a pose padrão dela, **Then** todos os tokens que a usam passam a mostrar a arma com a pega e a pose novas, sem que ninguém precise reajustar.
10. **Given** um modelo sem os ossos de um encaixe (por exemplo, sem os dedos ou sem a coluna), **Then** aquele encaixe aparece indisponível, com o motivo, e os outros continuam funcionando.
11. **Given** um token sem modelo 3D, **Then** não há encaixes, como na 082.

---

### User Story 3 - Ajuste fino para modelos fora do padrão (Priority: P2)

Alguns modelos têm o esqueleto torto, a mão muito grande ou um coldre que ficaria dentro da perna. Para esses, o usuário abre "Ajuste fino" num encaixe e corrige a posição e a rotação da arma a partir do lugar em que o encaixe a colocou, vendo o resultado na prévia. O ajuste é daquele token e daquele encaixe.

**Why this priority**: o encaixe automático resolve o caso normal. O ajuste fino é a saída para o resto e evita que um modelo esquisito deixe a feature inútil para ele.

**Independent Test**: num token em que o coldre fica dentro da coxa, abrir o ajuste fino do coldre direito, puxar a arma para fora, salvar e ver na vista 3D a arma no lugar corrigido.

**Acceptance Scenarios**:

1. **Given** uma arma encaixada, **When** o usuário abre "Ajuste fino", **Then** aparecem os controles de posição e rotação daquele encaixe, começando do zero (o lugar do encaixe).
2. **Given** o ajuste fino aberto, **When** o usuário move ou gira a arma, **Then** a prévia mostra a mudança na hora, a partir do lugar do encaixe.
3. **Given** um ajuste fino salvo, **When** a peça aparece na vista 3D, **Then** o ajuste é o mesmo da prévia.
4. **Given** um ajuste fino feito, **When** o usuário pede "Voltar ao padrão", **Then** a arma volta ao lugar do encaixe e só o tamanho fica.
5. **Given** o ajuste fino fechado, **Then** um encaixe que tem ajuste indica isso, para o usuário saber por que a arma não está no lugar padrão.
6. **Given** a mesma arma em dois tokens, **When** o usuário ajusta num deles, **Then** o outro não muda.

---

### User Story 4 - Armas já vinculadas pela 082 (Priority: P2)

Quem já prendeu armas nas mãos dos tokens pela 082 continua vendo as suas peças armadas depois desta entrega, e passa a ter os novos encaixes nos mesmos tokens.

**Why this priority**: a 082 está em produção. Ninguém pode perder o que já ajustou, mas isso não acrescenta nada novo.

**Independent Test**: antes da entrega, salvar um token com espada na mão direita e um ajuste de pegada. Depois da entrega, abrir o token e a vista 3D e ver a espada na mesma mão e no mesmo lugar.

**Acceptance Scenarios**:

1. **Given** um token com armas nas mãos pela 082, **When** a entrega entra, **Then** o token mostra essas armas nos encaixes de mão direita e mão esquerda, no mesmo lugar em que estavam.
2. **Given** esse token, **When** o usuário o edita, **Then** os encaixes de costas e coldres aparecem vazios e prontos para uso.
3. **Given** uma arma usada por algum token, **When** o dono tenta apagá-la, **Then** a recusa da 082 continua: ela está em uso.

---

### User Story 5 - Encaixes pelo MCP (Priority: P3)

Um assistente de IA conectado pelo MCP define a pega e a pose padrão de uma arma e escolhe armas para os encaixes de um token, com as mesmas regras do site.

**Why this priority**: o Roll6 exige que todo endpoint tenha a sua ferramenta no MCP, mas o uso principal é pelo site.

**Independent Test**: com uma chave de API, definir a pose de uma arma e encaixá-la nas costas de um token pelo MCP e ver o resultado na vista 3D.

**Acceptance Scenarios**:

1. **Given** uma chave de API válida e uma arma do usuário, **When** o assistente define a pega e a pose em passos de 90°, **Then** a arma passa a ter essas definições no site.
2. **Given** uma arma e um token do usuário, **When** o assistente escolhe a arma para um encaixe (mãos, costas ou coldres), com ou sem tamanho e ajuste fino, **Then** a vista 3D mostra a arma naquele encaixe.
3. **Given** um giro fora dos passos de 90° ou um encaixe desconhecido, **Then** o pedido é recusado com o motivo.

---

### Edge Cases

- **Arma sem gume ou sem ponta** (escudo, maça, bastão): a referência de "cima" e "direita" continua valendo — "cima" é o lado que fica para cima quando a arma está em pé na mão, e "direita" é o lado de ataque ou, quando não há, a face que fica longe do corpo. A pega marca o que a mão segura.
- **Arma pensada para as costas ou para o coldre** (aljava, mochila, bainha vazia): o encaixe das costas e dos coldres aceita qualquer arma da biblioteca, com a mesma pega e pose padrão. Nada impede o usuário de colocar uma espada só nas costas, sem nada na mão.
- **A mesma arma em dois encaixes** (espada na mão e a mesma espada nas costas): permitido. Cada encaixe tem a sua cópia, o seu tamanho e o seu ajuste fino.
- **Modelo sem dedos**: a orientação da mão sai do antebraço e da frente do personagem. Funciona, mas pode ficar menos precisa; o ajuste fino cobre a diferença.
- **Modelo sem os ossos do tronco ou do quadril**: costas ou coldres ficam indisponíveis com o motivo; as mãos continuam funcionando.
- **Modelo trocado**: se o novo modelo tem os ossos dos encaixes usados, as armas ficam. Se não tem, os vínculos continuam guardados, as armas não aparecem e a aba avisa.
- **Pega marcada fora do modelo**: a marca só pode ser colocada sobre o modelo. Se a marca salva ficar fora do modelo depois de uma troca de arquivo da arma, ela volta ao meio da arma.
- **Troca do arquivo da arma pelo dono**: a pose e a pega continuam as mesmas, porque o dono costuma trocar por uma versão do mesmo objeto. Se a pega ficar fora do novo modelo, ela volta ao meio.
- **Tamanho do modelo** (063): quando o "Tamanho" do modelo do token muda, as armas acompanham na mesma proporção.
- **Tamanho inicial**: ao encaixar, a arma começa com um tamanho proporcional ao personagem, como na 082, e nunca aparece gigante nem invisível.
- **Foto da pose** (057) e **peça caída** (058): a foto inclui todas as armas encaixadas, e o modelo deitado leva as armas junto.
- **Arma que não carrega**: a peça aparece sem aquela arma e as outras continuam.
- **Animações**: as armas não mudam as animações. Elas só seguem o osso do seu encaixe. Uma arma nas costas não "sai" para a mão quando o personagem ataca.

## Requirements *(mandatory)*

### Functional Requirements

**Pega e pose padrão da arma**

- **FR-001**: Cada arma da biblioteca MUST ter um ponto de pega (onde a mão segura) e uma pose padrão (como a arma fica de pé: ponta para cima e gume para a direita), ambos com valores iniciais que funcionam sem ajuste (pega no meio da arma, pose do arquivo).
- **FR-002**: A pose padrão MUST ser definida só por giros em passos de 90° em cada um dos três eixos. O sistema MUST recusar qualquer valor fora desses passos.
- **FR-003**: A edição da arma MUST mostrar o modelo na prévia com uma referência visível de "cima" e "direita" e a marca da pega, e refletir na hora cada giro e cada mudança da pega.
- **FR-004**: O usuário MUST poder marcar a pega apontando um lugar sobre o modelo na prévia. A marca MUST ficar sobre o modelo.
- **FR-005**: Só o dono MUST poder mudar a pega e a pose padrão, como já acontece com o nome e o arquivo. Qualquer usuário logado vê as duas.
- **FR-006**: Uma mudança na pega ou na pose MUST chegar a todos os tokens que usam a arma, no site e nas mesas abertas, sem que esses tokens precisem ser salvos de novo.

**Encaixes do token**

- **FR-007**: Todo token com modelo 3D humanoide MUST ter cinco encaixes com significado fixo: mão direita, mão esquerda, costas, coldre direito e coldre esquerdo. O usuário não cria nem cadastra encaixes.
- **FR-008**: O sistema MUST encontrar cada encaixe no esqueleto do modelo e dar-lhe a mesma orientação em qualquer modelo: na mão, a pega fica no meio da palma e "cima" aponta para a saída do punho fechado do lado do polegar; nas costas, a arma fica atrás do tronco na diagonal, com a pega acima de um ombro; no coldre, a arma fica na lateral da cintura daquele lado, ponta para baixo.
- **FR-009**: Para cada encaixe, o usuário MUST poder escolher uma arma da biblioteca ou nenhuma. A mesma arma pode estar em mais de um encaixe.
- **FR-010**: Ao encaixar, o sistema MUST alinhar a pega e a pose padrão da arma ao encaixe, de modo que a arma apareça no lugar e na direção certos sem nenhum ajuste do usuário.
- **FR-011**: Cada encaixe MUST ter um tamanho ajustável pelo usuário, que começa proporcional ao personagem e muda a arma em torno da pega.
- **FR-012**: Cada encaixe MUST ter um ajuste fino opcional de posição e rotação, a partir do lugar do encaixe, escondido por padrão, com "Voltar ao padrão", e indicado quando existe. O ajuste fino pertence ao token e ao encaixe, não à arma.
- **FR-013**: Quando o modelo não tem os ossos de um encaixe, esse encaixe MUST ficar indisponível com o motivo, sem afetar os outros. Um vínculo já salvo continua guardado.
- **FR-014**: A prévia do token MUST mostrar todas as armas encaixadas enquanto toca as animações, e "Gerar imagem" MUST incluí-las.

**Mesa**

- **FR-015**: A vista 3D da mesa MUST mostrar, para todos os participantes, as armas de cada peça em todos os seus encaixes, com tamanho e ajuste fino salvos, parada, andando no modo livre e caída.
- **FR-016**: Uma mudança no token (encaixes, tamanho, ajuste fino) ou na arma (arquivo, pega, pose) MUST chegar às mesas abertas sem recarregar a página.
- **FR-017**: O mapa 2D, as figuras 2,5D, as regras de movimento, a ocupação dos hexes e os turnos MUST continuar iguais. As armas são só visuais.
- **FR-018**: Se uma arma não carregar, a peça MUST aparecer sem ela e com as outras, sem erro além do que já existe para modelos.

**Continuidade da 082**

- **FR-019**: As armas já vinculadas às mãos pela 082 MUST continuar nos encaixes de mão direita e mão esquerda, no mesmo lugar visual em que estavam, sem que o usuário precise fazer nada.
- **FR-020**: Apagar uma arma usada por algum encaixe MUST continuar recusado, com a mensagem de que ela está em uso.

**Integrações**

- **FR-021**: O MCP MUST permitir definir a pega e a pose padrão de uma arma e escolher armas para os encaixes de um token, com tamanho e ajuste fino, com as mesmas permissões e validações do site. O guia do MCP MUST explicar os encaixes, a pose padrão e os passos de 90°.

### Key Entities

- **Arma**: a arma da biblioteca da 082, que passa a guardar também a **pega** (um ponto sobre o modelo) e a **pose padrão** (três giros em passos de 90°). Ambas são do dono e valem para todos os tokens.
- **Encaixe**: um dos cinco lugares fixos de um token com modelo 3D humanoide — mão direita, mão esquerda, costas, coldre direito, coldre esquerdo. Não é cadastrado: o sistema o encontra no esqueleto.
- **Vínculo arma–encaixe**: liga um encaixe de um token a uma arma e guarda o **tamanho** e o **ajuste fino** (posição e rotação a partir do lugar do encaixe). Cada token tem no máximo um vínculo por encaixe. Substitui o vínculo por mão da 082, cujos dados são preservados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Com a pega e a pose definidas na arma, um usuário encaixa uma arma num token humanoide em menos de 30 segundos e sem tocar em mais nada além da escolha da arma e, se quiser, do tamanho.
- **SC-002**: Nos modelos humanoides de exemplo do Roll6, uma espada escolhida na mão fica com o cabo na palma e a lâmina para cima sem ajuste em 100% dos modelos; o ajuste fino só é necessário em modelos fora do padrão.
- **SC-003**: O mesmo encaixe (por exemplo, "mão direita") coloca a mesma arma do mesmo jeito em modelos diferentes: o usuário não precisa redescobrir a orientação a cada token.
- **SC-004**: Definir a pose padrão de uma arma leva menos de 1 minuto, porque cada eixo tem no máximo quatro posições possíveis.
- **SC-005**: As armas ficam presas aos seus encaixes em 100% dos quadros de todas as animações, na prévia e na mesa, e o que se vê na prévia é o que todos veem na mesa.
- **SC-006**: Nenhum token armado pela 082 perde a arma ou muda de lugar visível depois da entrega.
- **SC-007**: Um mapa com até 10 peças, cada uma com até 5 armas encaixadas, não fica visivelmente mais lento num celular intermediário.

## Assumptions

- "Modelo humanoide" quer dizer um esqueleto com os ossos nomeados no padrão Mixamo, que o Roll6 já reconhece para as animações (059) e as mãos (082). O encaixe das mãos usa os ossos das mãos e dos dedos quando existem; o das costas, os do tronco; o dos coldres, os do quadril e das coxas.
- A pose padrão é "ponta para cima e gume para a direita", como o usuário descreveu. Para armas sem gume, "direita" é o lado de ataque ou a face que fica longe do corpo. A prévia mostra uma referência para o usuário não precisar lembrar disso.
- A pega e a pose são da arma e valem para todos os encaixes e tokens; o tamanho e o ajuste fino são do token e do encaixe (como a pegada da 082).
- Os cinco encaixes são fixos nesta entrega. Outros (cabeça, ombro, duas mãos na mesma arma) ficam para depois.
- Uma arma nas costas ou no coldre é só decoração: ela não vai para a mão quando o personagem ataca, e não há regra de jogo ligada aos encaixes.
- Os vínculos de mão da 082 são migrados para os encaixes de mão direita e mão esquerda, com a pegada antiga convertida em ajuste fino, de modo que nada muda de lugar.
- As armas continuam no mesmo formato, com o mesmo limite de tamanho e no mesmo armazenamento da 082, e não aparecem nas figuras 2,5D nem no mapa 2D.
- A ferramenta roll6anime (062) não precisa mostrar armas nesta entrega.
