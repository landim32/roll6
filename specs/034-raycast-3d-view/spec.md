# Feature Specification: Vista 3D por raycasting (estilo Wolfenstein 3D)

**Feature Branch**: `034-raycast-3d-view`  
**Created**: 2026-10-04  
**Status**: Draft  
**Input**: User description: "O 2,5D não é exatamente isso que vc fez: se baseie nesse vídeo (reel de raycasting em Python/Pygame, 120 raios que batem nas paredes, cada raio virando uma coluna da tela); acho que é o algoritmo do primeiro Wolfenstein 3D; a câmera não precisa se mover na vertical, apenas na horizontal; pode retirar o tipo de mapa, todo mapa vai aceitar o 3D; no cadastro do mapa vai poder fazer upload de uma imagem Máscara 3D, da mesma proporção da imagem do mapa, apenas preto e branco (branco é espaço vazio, preto é parede); os tokens devem ter uma nova imagem chamada 2,5D frente, não obrigatória; o mapa também deve ter uma imagem de fundo, que aparece onde não houver parede na frente, tipo o céu; dos botões acrescentados na lateral deixe apenas o 3D."

## Contexto

Esta feature **substitui** a forma como a feature 033 (mapa de história 2,5D) construía as paredes e a vista 3D:

| 033 (atual) | 034 (esta feature) |
|---|---|
| Tipo de mapa (2D / história 2,5D) | **Não há tipo**: todo mapa oferece a vista 3D |
| Paredes pintadas célula a célula sobre os hexágonos | Paredes vêm de uma **Máscara 3D** em preto e branco enviada como imagem |
| Paredes bloqueiam as peças no 2D | A máscara só define as paredes do 3D; o 2D e o movimento das peças voltam a ser como antes da 033 |
| Câmera 3D que olha para cima e para baixo | Câmera **só na horizontal** (gira para os lados, sem olhar para cima/baixo, sempre na mesma altura) |
| Prismas hexagonais em um motor 3D | Visual de **raycasting** estilo Wolfenstein 3D: paredes como colunas verticais cuja altura depende da distância |
| Botão de menu (tipo, paredes, céu) + botão 2D/3D na lateral | Só o **botão 3D** na lateral; máscara e fundo são enviados no cadastro do mapa |
| Figuras usam a imagem de pé do token | Figuras usam a nova imagem **"2,5D frente"** do token, quando existir |

O que continua da 033: a vista 3D ocupa o fundo da tela por trás dos painéis; a câmera começa atrás do personagem escolhido, olhando-o de fora, e passa para o novo personagem quando o "Personagem atual" muda; o usuário navega livremente e dá zoom; as peças se atualizam em tempo real; o modo 2D/3D é lembrado por mapa no dispositivo.

## Clarifications

### Session 2026-10-04

- Q: Qual o ponto de vista da câmera no 3D? → A: Terceira pessoa (atrás do personagem escolhido, como na 033), mas o usuário não move o personagem: no 3D ele é só um observador da cena; andar e girar movem apenas a câmera, e as peças só se movem pelo 2D
- Q: A Máscara 3D bloqueia as peças no 2D? → A: Não bloqueia: a máscara só define as paredes do 3D; o 2D e o movimento das peças ficam como antes da 033 (resposta revista: antes tinha sido "bloqueia")
- Q: Qual a aparência das paredes no 3D? → A: A parede usa as cores da imagem do mapa naquele ponto (o muro desenhado na planta vira a face da parede), sombreada pela distância
- Q: O que aparece no chão do 3D? → A: A imagem do mapa em perspectiva (como a planta vista do chão), podendo ser desenhada em resolução menor para manter a fluidez
- Q: Como a imagem de fundo se comporta ao girar a câmera? → A: Panorama: o fundo gira junto com a câmera, cobrindo os 360°, e a imagem se repete se for estreita

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar a Máscara 3D e a imagem de fundo no cadastro do mapa (Priority: P1)

O mestre, no cadastro do mapa (onde já envia a imagem do mapa), envia também uma **Máscara 3D**: uma imagem em preto e branco, na mesma proporção da imagem do mapa, em que o **preto é parede** e o **branco é espaço vazio**. Pode também enviar uma **imagem de fundo** (o céu/horizonte) e salvar o mapa como sempre.

**Why this priority**: sem máscara não há paredes na vista 3D; é o dado de que todo o resto depende.

**Independent Test**: enviar uma máscara com a mesma proporção da imagem do mapa e um fundo, salvar, reabrir e ver as duas imagens no cadastro; tentar enviar uma máscara de proporção diferente e ser recusado.

**Acceptance Scenarios**:

1. **Given** um mapa com imagem, **When** o mestre envia uma Máscara 3D com a mesma proporção, **Then** a máscara é aceita, aparece como prévia no cadastro e é guardada ao salvar o mapa.
2. **Given** um mapa com imagem, **When** o mestre envia uma máscara de proporção diferente, **Then** o envio é recusado com uma mensagem que mostra as duas proporções.
3. **Given** uma máscara com tons de cinza ou cores, **When** é enviada, **Then** o sistema a trata como preto e branco (cada ponto escuro vira parede, cada ponto claro vira vazio) e mostra na prévia exatamente como ela será interpretada.
4. **Given** um mapa com máscara ou fundo, **When** o mestre os remove e salva, **Then** a vista 3D deixa de ter paredes (ou passa a usar o fundo padrão).
5. **Given** um mapa sem imagem do mapa, **When** o mestre tenta enviar uma máscara, **Then** é avisado de que precisa primeiro de uma imagem do mapa.
6. **Given** um mapa salvo com máscara, **When** alguém coloca ou move uma peça no 2D, inclusive sobre uma área preta, **Then** a ação segue as regras de antes da 033: a máscara não bloqueia nada no 2D.

---

### User Story 2 - Ver qualquer mapa em 3D com o visual do Wolfenstein 3D (Priority: P1)

Em **qualquer mapa**, o usuário (mestre ou jogador com acesso) aciona o botão **3D** na lateral. A vista 3D ocupa o fundo da tela: as paredes pretas da máscara aparecem como colunas verticais, mais altas quando perto e mais baixas quando longe, como no Wolfenstein 3D; onde não há parede à frente aparece a imagem de fundo do mapa, como um céu. O usuário gira a câmera para os lados, anda livremente e dá zoom; a câmera nunca olha para cima ou para baixo.

**Why this priority**: é o valor central pedido — a vista imersiva para contar a história.

**Independent Test**: abrir um mapa com máscara, acionar o 3D, andar pelos corredores, girar e dar zoom; abrir um mapa sem máscara e ver o 3D sem paredes.

**Acceptance Scenarios**:

1. **Given** qualquer mapa aberto, **When** o usuário olha a lateral, **Then** há um botão 3D (e nenhum outro botão novo da 033).
2. **Given** um mapa com máscara, **When** o usuário aciona o 3D, **Then** as áreas pretas da máscara aparecem como paredes, alinhadas com o lugar onde estão sobre a imagem do mapa, e a face de cada parede tem as cores que a imagem do mapa tem naquele ponto.
3. **Given** a vista 3D, **When** o usuário anda e gira, **Then** a câmera se move só no plano do chão, à mesma altura, e só gira para os lados.
4. **Given** a vista 3D, **When** não há parede em uma direção, **Then** aparece a imagem de fundo do mapa (ou uma cor padrão, se o mapa não tiver fundo); ao girar a câmera o fundo desliza junto, e ao andar ele fica parado.
5. **Given** a vista 3D, **When** o usuário tenta atravessar uma parede, **Then** a câmera é impedida.
6. **Given** um mapa sem máscara, **When** o usuário aciona o 3D, **Then** a vista abre sem paredes, só com o chão, o fundo e as peças.
7. **Given** a vista 3D, **When** o usuário aciona de novo o botão (agora "2D"), **Then** volta ao mapa 2D como estava.
8. **Given** a vista 3D com a câmera atrás do personagem escolhido, **When** o usuário anda ou gira, **Then** só a câmera se move (soltando-se do personagem); a peça do personagem continua no mesmo lugar, para ele e para todos.

---

### User Story 3 - Personagens e NPCs com a imagem "2,5D frente" (Priority: P1)

No cadastro de token há uma nova imagem opcional, **"2,5D frente"**: o desenho do personagem visto de frente, de pé. Na vista 3D, cada peça aparece como uma figura em pé que encara a câmera, usando essa imagem; se o token não tiver uma, usa a imagem atual do token. As figuras ficam ocultas atrás das paredes e se movem em tempo real.

**Why this priority**: sem as peças, a vista 3D não mostra a mesa; a imagem de frente é o que faz a figura parecer um personagem em pé, e não um token visto de cima.

**Independent Test**: enviar a imagem "2,5D frente" para um token, colocar a peça no mapa e vê-la de pé no 3D; uma peça de token sem essa imagem aparece com a imagem atual.

**Acceptance Scenarios**:

1. **Given** um token, **When** o dono abre o cadastro, **Then** pode enviar, trocar ou remover a imagem "2,5D frente", que não é obrigatória.
2. **Given** uma peça cujo token tem "2,5D frente", **When** vista no 3D, **Then** aparece de pé com essa imagem, na posição da peça no mapa.
3. **Given** uma peça cujo token não tem "2,5D frente", **When** vista no 3D, **Then** aparece com a imagem atual do token.
4. **Given** uma peça atrás de uma parede, **When** a cena é desenhada, **Then** a parede a esconde, total ou parcialmente.
5. **Given** a vista 3D aberta, **When** alguém move, coloca ou remove uma peça, **Then** a figura muda em até 2 segundos, sem recarregar.
6. **Given** uma peça caída ou fora de combate, **When** o usuário olha o 3D, **Then** ela não aparece (o 3D só desenha figuras em pé); no 2D continua aparecendo deitada, e volta ao 3D quando ficar em pé de novo.

---

### User Story 4 - Retirar o que a 033 acrescentou e não serve mais (Priority: P2)

O tipo de mapa, as paredes pintadas por célula, o bloqueio das peças por parede e o botão de menu da lateral deixam de existir. Os mapas criados como "história" na 033 continuam abrindo normalmente, agora como mapas comuns que aceitam 3D.

**Why this priority**: limpeza necessária para a interface e as regras ficarem simples, mas não entrega valor novo sozinha.

**Independent Test**: abrir um mapa criado na 033 com paredes pintadas: abre, as peças se movem sem bloqueio de parede e a lateral tem só o botão 3D.

**Acceptance Scenarios**:

1. **Given** um mapa criado na 033 como "história" e com paredes pintadas, **When** é aberto, **Then** funciona como qualquer mapa e as peças não são mais bloqueadas por aquelas paredes.
2. **Given** a lateral do mapa, **When** comparada com a de antes da 033, **Then** a única diferença é o botão 3D.
3. **Given** um mapa da 033 que tinha imagem de céu, **When** aberto, **Then** essa imagem passa a ser a imagem de fundo do mapa.

---

### Edge Cases

- Máscara com proporção quase igual (diferença de arredondamento de poucos pixels): aceita dentro de uma tolerância de 1%.
- Máscara muito maior ou menor que a imagem do mapa, com a mesma proporção: aceita; ela é esticada para cobrir a imagem do mapa exatamente.
- Máscara toda branca: 3D sem paredes. Máscara toda preta: a câmera não tem onde ficar — o usuário é avisado e a câmera fica parada no ponto de partida.
- Imagem do mapa trocada depois de enviar a máscara: se a proporção mudou, o mestre é avisado de que a máscara não corresponde mais e pode trocá-la ou removê-la.
- Peça em cima de uma área preta da máscara (permitido, a máscara não bloqueia o 2D): no 3D ela aparece normalmente, encostada ou dentro da parede; a câmera presa a ela se aproxima o necessário para não ficar dentro da parede.
- Personagem escolhido sem peça no mapa, ou mestre como GM: a câmera começa solta no centro do mapa.
- Personagem escolhido caído ou fora de combate: a figura dele não aparece no 3D, mas a câmera continua seguindo a posição da peça.
- A câmera presa ao personagem e uma parede entre ela e a peça: a câmera se aproxima da peça em vez de ficar atrás da parede.
- Celular (< 768 px): andar por um controle na tela, girar arrastando, zoom com pinça.
- Dispositivo que não consegue desenhar a vista: mensagem clara e permanece no 2D.
- Jogador sem acesso de edição: vê o 3D e as imagens, mas não envia máscara, fundo nem imagens de token de outros.

## Requirements *(mandatory)*

### Functional Requirements

**Mapa**

- **FR-001**: O sistema MUST deixar de ter tipo de mapa: todo mapa MUST oferecer a vista 3D.
- **FR-002**: O cadastro do mapa MUST permitir enviar, trocar e remover uma imagem **Máscara 3D**, opcional.
- **FR-003**: A Máscara 3D MUST ter a mesma proporção (largura ÷ altura) da imagem do mapa, com tolerância de 1%; fora disso o envio MUST ser recusado com uma mensagem que mostre as duas proporções.
- **FR-004**: A Máscara 3D MUST ser interpretada só em preto e branco: pontos escuros (luminosidade abaixo da metade) são parede, pontos claros são espaço vazio. A prévia no cadastro MUST mostrar o resultado já em preto e branco.
- **FR-005**: A Máscara 3D MUST cobrir exatamente a área da imagem do mapa (mesma posição e tamanho em que a imagem aparece no 2D), de modo que uma parede da máscara fique sobre o mesmo ponto da imagem.
- **FR-006**: O cadastro do mapa MUST permitir enviar, trocar e remover uma **imagem de fundo**, opcional, exibida no 3D onde não houver parede à frente.
- **FR-006a**: A imagem de fundo MUST se comportar como um **panorama**: ela cobre a volta inteira (360°) em torno da câmera e desliza ao girar, como o céu do Doom/Wolfenstein; andar não a move (está "infinitamente longe"). Uma imagem mais estreita que a volta MUST se repetir lado a lado, sem esticar; a altura da imagem MUST ocupar a área acima do horizonte.
- **FR-007**: Sem Máscara 3D, a vista 3D MUST abrir sem paredes; sem imagem de fundo, MUST usar uma cor padrão.
- **FR-007a**: A Máscara 3D MUST NOT afetar o 2D: ela não é desenhada sobre o mapa 2D e não bloqueia colocar, mover ou girar peças; as regras das peças são as de antes da 033.

**Vista 3D**

- **FR-008**: A lateral do mapa MUST ter um único botão novo, que alterna entre 2D e 3D, para todos com acesso ao mapa.
- **FR-009**: A vista 3D MUST seguir o visual do raycasting do Wolfenstein 3D: as paredes são desenhadas como colunas verticais da tela, cada uma com a altura determinada pela distância da parede na direção daquela coluna, e paredes mais distantes MUST parecer mais escuras.
- **FR-009a**: A face de cada parede MUST mostrar as cores da **imagem do mapa** no ponto em que o raio atinge a parede (o trecho de muro desenhado na planta "sobe" e vira a face da parede, repetido de cima a baixo), sombreada pela distância e um pouco mais escura nos lados voltados para norte/sul do que nos voltados para leste/oeste, como no Wolfenstein 3D. Sem imagem do mapa, a parede usa uma cor padrão.
- **FR-010**: A câmera MUST ficar sempre na mesma altura e só girar na horizontal; ela MUST NOT olhar para cima ou para baixo.
- **FR-011**: O usuário MUST poder andar (frente, trás, lados), girar e dar zoom, com teclado/mouse no computador e toque no celular. No 3D o usuário é só um **observador**: esses comandos movem apenas a câmera e MUST NOT mover, girar ou alterar nenhuma peça; o 3D não oferece nenhuma ação sobre as peças (elas só se movem pelo 2D).
- **FR-012**: A câmera MUST NOT atravessar paredes nem sair da área do mapa.
- **FR-013**: Ao abrir o 3D, a câmera MUST ficar atrás da peça do personagem escolhido, olhando-a de fora na direção do seu look, e acompanhá-la; trocar o "Personagem atual" MUST levá-la à peça do novo; andar livremente MUST soltá-la e um controle "Voltar ao personagem" MUST prendê-la de novo; sem personagem com peça, MUST começar solta no centro do mapa.
- **FR-014**: Na vista 3D, o chão MUST mostrar a imagem do mapa em perspectiva, alinhada com as paredes e as peças (o ponto do chão sob uma peça é o mesmo ponto da imagem onde a peça está no 2D); fora da imagem do mapa, o chão usa uma cor padrão. O fundo MUST aparecer acima do horizonte onde não houver parede. Para manter a fluidez (SC-003), o chão MAY ser desenhado em resolução menor que as paredes.
- **FR-015**: A vista 3D MUST ocupar o fundo da tela, mantendo os painéis, menus e o rodapé utilizáveis por cima.
- **FR-016**: O sistema MUST lembrar, por mapa e por dispositivo, se o usuário estava no 2D ou no 3D.
- **FR-017**: Se o dispositivo não conseguir desenhar a vista 3D, o sistema MUST avisar e permanecer no 2D.

**Peças**

- **FR-018**: O cadastro de token MUST ter uma imagem opcional **"2,5D frente"**, que o dono do token pode enviar, trocar ou remover.
- **FR-019**: Na vista 3D, cada peça (PJ, NPC ou objeto) MUST aparecer como uma figura em pé que sempre encara a câmera, com a imagem "2,5D frente" do token ou, sem ela, a imagem atual do token.
- **FR-020**: As figuras MUST ficar ocultas pelas paredes que estão entre elas e a câmera, inclusive parcialmente (uma figura pela metade atrás da quina de uma parede).
- **FR-021**: Mudanças nas peças (colocar, mover, girar, remover, postura) MUST aparecer no 3D em tempo real.
- **FR-022**: Peças caídas e peças fora de combate MUST NOT aparecer no 3D (o 3D só desenha figuras em pé); no 2D continuam como antes. Objetos, que não têm postura, sempre aparecem.

**Retirada do que a 033 acrescentou**

- **FR-023**: O sistema MUST remover o tipo de mapa, as paredes por célula, o bloqueio de peças por parede e o botão de menu (tipo, paredes, céu) da lateral; as regras de posicionamento e movimento das peças MUST voltar a ser as de antes da 033.
- **FR-024**: A imagem de céu de um mapa da 033 MUST virar a imagem de fundo desse mapa; o tipo e as paredes por célula guardados MUST ser descartados sem afetar o resto do mapa.
- **FR-025**: As integrações para assistentes de IA MUST refletir os novos campos (Máscara 3D e imagem de fundo do mapa, "2,5D frente" do token) e deixar de oferecer tipo e paredes.

### Key Entities

- **Mapa (modelo de mapa)**: perde o tipo e as paredes pintadas; ganha **Máscara 3D** (imagem preto e branco, opcional, mesma proporção da imagem do mapa) e **imagem de fundo** (opcional, era a "imagem de céu" da 033).- **Token**: ganha a imagem opcional **"2,5D frente"**, usada pelas figuras na vista 3D.
- **Preferência de vista**: 2D ou 3D por mapa, guardada no dispositivo do usuário.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um mestre prepara um mapa para o 3D (envia máscara e fundo) em menos de 2 minutos, tendo as imagens prontas.
- **SC-002**: 100% das paredes da máscara aparecem no 3D na posição correspondente da imagem do mapa (uma parede desenhada num canto da imagem aparece naquele canto no 3D).
- **SC-003**: A navegação no 3D mantém movimento fluido (sensação de pelo menos 30 quadros por segundo) num computador comum, com uma máscara de 2000 × 2000 pontos e 50 peças.
- **SC-004**: A troca entre 2D e 3D leva menos de 2 segundos.
- **SC-005**: Mudanças nas peças feitas por outros usuários aparecem no 3D em até 2 segundos.
- **SC-006**: Pelo menos 90% dos jogadores conseguem abrir o 3D, andar e girar na primeira tentativa, sem instrução.
- **SC-007**: 100% dos mapas existentes (inclusive os criados na 033), com ou sem máscara, continuam abrindo e funcionando no 2D como antes da 033.

## Assumptions

- Esta feature parte do código da 033 (ainda não mesclado, PR #24) e o altera; o ideal é mesclar as duas juntas ou descartar a 033 em favor desta.
- O "cadastro do mapa" é a janela em que hoje se envia a imagem do mapa; a Máscara 3D e a imagem de fundo ficam ao lado dela.
- A máscara não afeta o 2D nem as regras das peças: ela só define as paredes da vista 3D (o mapa é para contar histórias, não para combate) — ver Clarifications.
- As paredes têm todas a mesma altura; a aparência vem da imagem do mapa (ver Clarifications) — não há envio de textura de parede separada.
- A câmera continua em terceira pessoa, atrás do personagem escolhido, como decidido na 033 (ver Clarifications); o que muda é que ela não olha mais para cima nem para baixo.
- A imagem "2,5D frente" é enviada sem recorte obrigatório (é uma figura de pé, com fundo transparente de preferência); o tamanho da figura no 3D segue o tamanho da peça no mapa.
- Só quem já pode alterar o mapa (o dono, ou o mestre que salva uma cópia) envia máscara e fundo; só o dono do token envia a "2,5D frente".
- Fora do escopo: imagem de textura de parede enviada à parte, portas, iluminação dinâmica, alturas diferentes de parede, teto (acima do horizonte só aparece o fundo), chão com textura diferente da imagem do mapa, e combate no 3D.
