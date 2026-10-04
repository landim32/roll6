# Feature Specification: Mapa de história 2,5D

**Feature Branch**: `033-story-map-2-5d`  
**Created**: 2026-10-04  
**Status**: Draft  
**Input**: User description: "Crie mais de uma opção de mapa, o 2D e o 2,5D: modelo de mapa 2,5D baseado em Doom e Wolfenstein, construído sobre uma imagem 2D com paredes e espaços vazios, para contar histórias (não combate); personagens exibidos em 2,5D; imagem de fundo opcional; janela 3D ocupando o fundo da tela mostrando PJs e NPCs; navegação livre e zoom; alternar entre 2D e 3D; o 2D é igual ao mapa normal."

## Clarifications

### Session 2026-10-04

- Q: Qual o formato das células do mapa 2,5D? → A: Paredes nos hexágonos da grade atual (o 2D fica idêntico ao mapa normal)
- Q: Como é a câmera da vista 3D? → A: Câmera ao nível do chão, andando pelos corredores no estilo Doom/Wolfenstein (mover + girar), zoom pelo campo de visão — refinada na pergunta seguinte para terceira pessoa (atrás do personagem)
- Q: Onde a câmera começa ao abrir o 3D? → A: A câmera olha o personagem escolhido de fora (terceira pessoa, atrás dele, na direção do seu look); quando o usuário troca o "Personagem atual", a câmera passa para o novo personagem
- Q: O que é a "imagem de fundo" no 3D? → A: As duas: a imagem 2D do mapa como chão + uma imagem opcional de céu/horizonte atrás das paredes
- Q: As paredes bloqueiam as peças no 2D? → A: Sim, como um hex ocupado: não se coloca, move ou gira uma peça para dentro de uma parede nem se passa por ela (o caminho contorna), para todos, inclusive o mestre

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar um mapa de história 2,5D (Priority: P1)

O mestre, ao criar um mapa, escolhe entre dois tipos: **Mapa de combate (2D)** — o mapa atual — e **Mapa de história (2,5D)**. No mapa de história ele carrega a imagem 2D (planta do lugar) e, em cima dela, marca quais células são **parede** e quais são **espaço vazio**, como em um labirinto de Doom/Wolfenstein. Pode opcionalmente definir uma **imagem de céu/horizonte** (o fundo da cena 3D, atrás das paredes) e salvar o mapa como qualquer outro.

**Why this priority**: sem o mapa e suas paredes não existe nada para visualizar; é a base de toda a funcionalidade.

**Independent Test**: criar um mapa de história, desenhar paredes sobre a imagem, salvar, reabrir e ver as mesmas paredes marcadas.

**Acceptance Scenarios**:

1. **Given** o mestre criando um mapa, **When** escolhe o tipo "Mapa de história (2,5D)", **Then** as ferramentas de parede/espaço vazio ficam disponíveis; no tipo 2D elas não aparecem.
2. **Given** um mapa de história com imagem carregada, **When** o mestre marca células como parede e salva, **Then** ao reabrir o mapa as paredes continuam exatamente nas mesmas células.
3. **Given** um mapa de história, **When** o mestre apaga uma parede, **Then** a célula volta a ser espaço vazio.
4. **Given** um mapa de história com paredes, **When** alguém (mestre ou jogador) tenta colocar ou mover uma peça para uma parede, **Then** a ação é recusada como em um hex ocupado e o caminho do "Mover" contorna as paredes.
5. **Given** um mapa de combate 2D existente (criado antes desta funcionalidade), **When** é aberto, **Then** continua funcionando sem alterações e é tratado como tipo 2D.

---

### User Story 2 - Ver o mapa em 3D e navegar livremente (Priority: P1)

Em um mapa de história, o usuário (mestre ou jogador com acesso) alterna do modo 2D para o modo 3D. A janela 3D ocupa o fundo da tela inteira, mostrando paredes e espaços no estilo Doom/Wolfenstein, com a câmera em **terceira pessoa**: ela começa atrás do personagem escolhido ("Personagem atual"), olhando-o de fora na direção para onde ele está virado. O usuário anda livremente pelos corredores (mover-se e girar a visão) e pode aproximar/afastar (zoom pelo campo de visão); trocar o personagem atual leva a câmera para o novo personagem.

**Why this priority**: é o valor central pedido — contar histórias com uma visão imersiva.

**Independent Test**: abrir um mapa de história com paredes, alternar para 3D, mover a câmera por todo o mapa e dar zoom.

**Acceptance Scenarios**:

1. **Given** um mapa de história aberto em 2D, **When** o usuário aciona a opção 3D, **Then** a cena 3D passa a ocupar o fundo da tela e os menus/painéis continuam utilizáveis por cima.
2. **Given** a vista 3D, **When** o usuário arrasta/usa as teclas de movimento, **Then** a câmera se desloca e gira livremente pelo mapa.
3. **Given** a vista 3D, **When** o usuário usa a roda do mouse (ou gesto de pinça no celular), **Then** o campo de visão se estreita (aproxima) ou se alarga (afasta) dentro de limites, sem mover a câmera.
4. **Given** a vista 3D, **When** a câmera tenta atravessar uma parede, **Then** ela é impedida de atravessar.
5. **Given** um jogador com personagem escolhido que tem peça no mapa, **When** abre o 3D, **Then** a câmera aparece atrás da peça, olhando-a de fora na direção do seu look.
6. **Given** a vista 3D aberta, **When** o usuário troca o "Personagem atual" para outro com peça no mapa, **Then** a câmera vai para trás da peça do novo personagem.
7. **Given** a câmera presa ao personagem, **When** a peça dele é movida no 2D (por ele ou pelo mestre), **Then** a câmera acompanha a nova posição e direção.
8. **Given** o usuário navegou livremente para longe, **When** aciona "Voltar ao personagem", **Then** a câmera volta para trás da peça e passa a acompanhá-la de novo.
9. **Given** a vista 3D, **When** o usuário aciona a opção 2D, **Then** volta ao mapa 2D no mesmo estado (mesma posição/zoom de antes).

---

### User Story 3 - Ver personagens e NPCs em 2,5D (Priority: P1)

Na vista 3D, PJs e NPCs que estão no mapa aparecem como figuras em pé (sprites planos que sempre encaram a câmera, como os inimigos de Doom/Wolfenstein), usando a imagem do token de cada um, nas posições onde estão no mapa 2D. Objetos também aparecem. Quando uma peça é movida no 2D (ou por outro usuário em tempo real), a figura se move também no 3D.

**Why this priority**: sem as peças a vista 3D não conta a história da mesa.

**Independent Test**: com peças posicionadas no mapa, abrir o 3D e conferir que cada uma aparece na posição certa; mover uma e ver a mudança.

**Acceptance Scenarios**:

1. **Given** um PJ e um NPC no mapa, **When** o usuário abre o 3D, **Then** ambos aparecem como figuras com a imagem do seu token nas posições correspondentes.
2. **Given** a vista 3D aberta, **When** o mestre move uma peça (ou o jogador move a sua), **Then** a figura se atualiza no 3D sem recarregar a página.
3. **Given** uma peça atrás de uma parede em relação à câmera, **When** a cena é desenhada, **Then** a parede a oculta.
4. **Given** uma peça caída/fora de combate, **When** exibida no 3D, **Then** reflete a postura de forma reconhecível (deitada e/ou em preto e branco), coerente com o 2D.

---

### User Story 4 - Alternar 2D/3D, chão e céu/horizonte (Priority: P2)

Um controle sempre visível alterna entre 2D e 3D. Na vista 3D, a imagem 2D do mapa aparece como **chão** (na mesma posição/escala em que está sob a grade no 2D) e a imagem de céu/horizonte, quando existir, aparece atrás das paredes; sem essas imagens, a cena usa chão e céu em cores padrão. A escolha 2D/3D é lembrada ao reabrir o mapa no mesmo dispositivo.

**Why this priority**: refina a experiência; o essencial já funciona com os itens acima.

**Independent Test**: alternar várias vezes, recarregar a página e conferir o modo lembrado; abrir mapa com e sem imagem de céu/horizonte.

**Acceptance Scenarios**:

1. **Given** um mapa de história, **When** o usuário alterna 2D↔3D repetidamente, **Then** a troca é imediata e nenhuma peça/parede se perde.
2. **Given** um mapa com imagem 2D e imagem de céu/horizonte, **When** em 3D, **Then** a imagem 2D aparece como chão alinhada às paredes e o céu/horizonte aparece atrás delas.
3. **Given** um mapa sem imagem de céu/horizonte (ou sem imagem 2D), **When** em 3D, **Then** a parte ausente aparece em cor padrão, sem erros.
4. **Given** o mestre editando um mapa 2,5D, **When** troca ou remove a imagem de céu/horizonte e salva, **Then** a cena 3D passa a mostrar a nova imagem (ou a cor padrão).
5. **Given** um mapa de combate 2D, **When** aberto, **Then** o controle 2D/3D não é oferecido.

---

### Edge Cases

- Personagem escolhido sem peça no mapa atual (ou mestre como GM): câmera solta no centro do mapa.
- A peça do personagem é removida com a câmera presa: a câmera fica solta onde estava.
- Mapa de história sem nenhuma parede: a vista 3D mostra apenas o espaço aberto e as peças.
- Mapa muito grande ou com muitas peças: a navegação continua fluida (ver SC-003).
- Dispositivo sem suporte a gráficos 3D: o usuário vê mensagem clara e permanece no 2D.
- Celular (< 768 px): navegação por toque (controle de deslocamento na tela, arrastar para girar, pinça para zoom).
- O mestre troca o mapa atual da campanha enquanto jogadores estão em 3D: eles seguem o novo mapa (regra atual); se o novo for 2D, voltam ao 2D.
- Parede marcada sob uma peça: permitido, a peça não é apagada e continua visível; ela pode sair de lá com "Mover" (o estado inicial é aceito), mas nada pode voltar a entrar na parede.
- Tentativa de colocar ou mover uma peça para uma parede: recusada com o mesmo aviso de hex ocupado.
- Mapa mudado de 2,5D para 2D: as paredes deixam de bloquear e de aparecer, mas ficam guardadas caso o mapa volte a ser 2,5D.
- Jogadores nunca editam paredes; só o dono do mapa/mestre.
- Mudar o tipo de um mapa já salvo (2D ↔ 2,5D) não apaga posições nem peças.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer dois tipos de mapa ao criar um mapa: "2D" (comportamento atual) e "2,5D (história)".
- **FR-002**: Mapas existentes MUST ser tratados como tipo 2D sem nenhuma perda ou mudança de comportamento.
- **FR-003**: No tipo 2,5D, o dono do mapa MUST poder marcar e desmarcar células como parede ou espaço vazio sobre a imagem 2D.
- **FR-003a**: As paredes MUST ocupar exatamente as células hexagonais da grade atual do mapa (a mesma usada por posições, movimento e tamanho das peças), sem grade própria.
- **FR-003b**: Em mapas 2,5D, uma parede MUST bloquear as peças como um hex ocupado, para todos (inclusive o mestre) e em todas as formas de escrever posições (colocar personagem, objeto ou NPC, mover, girar, resetar turno, processar turno): nenhuma célula da forma da peça pode cair em parede, e o caminho do "Mover" MUST contornar paredes. Fora da regra: mudar a postura nunca é recusado (mesma regra de sobreposição atual).
- **FR-004**: O sistema MUST persistir as paredes junto com o mapa e restaurá-las exatamente ao reabrir.
- **FR-005**: O sistema MUST permitir uma imagem de céu/horizonte opcional no mapa 2,5D, enviada como as demais imagens, que o dono pode trocar ou remover.
- **FR-006**: Em mapas 2,5D o usuário MUST poder alternar entre as vistas 2D e 3D por um controle sempre visível; em mapas 2D o controle MUST NOT aparecer.
- **FR-007**: A vista 2D de um mapa 2,5D MUST ser igual ao mapa normal (imagem, grade, peças, menus e movimento), apenas acrescida da exibição/edição das paredes.
- **FR-008**: A vista 3D MUST ocupar o fundo da tela, mantendo os painéis e menus existentes utilizáveis por cima.
- **FR-009**: Na vista 3D, paredes MUST ser desenhadas em estilo 2,5D (Doom/Wolfenstein) e espaços vazios como chão navegável.
- **FR-010**: A vista 3D MUST usar câmera em terceira pessoa ao nível do chão; o usuário MUST poder andar (frente/trás/lados), girar a visão e dar zoom pelo campo de visão, com teclado/mouse no computador e toque no celular (controle de deslocamento na tela + arrastar para girar + pinça para zoom).
- **FR-010a**: Ao abrir o 3D, a câmera MUST ficar atrás da peça do personagem escolhido ("Personagem atual"), olhando-a de fora na direção do seu look, e acompanhá-la quando ela se move ou gira.
- **FR-010b**: Ao trocar o "Personagem atual", a câmera MUST passar para trás da peça do novo personagem e acompanhá-la.
- **FR-010c**: Navegar livremente MUST soltar a câmera do personagem; um controle "Voltar ao personagem" MUST prendê-la de novo.
- **FR-010d**: Sem personagem escolhido com peça no mapa (mestre como GM ou personagem fora do mapa), a câmera MUST começar no centro do mapa, solta.
- **FR-011**: A câmera MUST NOT atravessar paredes; quando presa ao personagem e houver parede entre ela e a peça, MUST se aproximar da peça em vez de ficar atrás da parede.
- **FR-012**: Na vista 3D, PJs, NPCs e objetos MUST aparecer como figuras em pé que encaram a câmera, com a imagem do token, nas posições do mapa, ocultadas por paredes quando for o caso.
- **FR-013**: Mudanças em peças (criar, mover, remover, postura, giro) MUST refletir na vista 3D em tempo real, pelas mesmas fontes de atualização do 2D.
- **FR-014**: Na vista 3D, o sistema MUST exibir a imagem 2D do mapa como chão, alinhada às mesmas células do 2D, e a imagem de céu/horizonte atrás das paredes; cada uma ausente MUST ser substituída por uma cor padrão.
- **FR-015**: O sistema MUST lembrar o modo (2D/3D) escolhido por mapa no dispositivo do usuário.
- **FR-016**: Apenas o dono do mapa (e o mestre da campanha) MUST poder editar paredes; jogadores aprovados apenas visualizam.
- **FR-017**: O mapa de história é para narrativa: o movimento e as ações de peças continuam sendo feitos somente no 2D; o 3D não traz mecânicas de combate.
- **FR-018**: Se o dispositivo não suportar a vista 3D, o sistema MUST informar o usuário e mantê-lo no 2D.
- **FR-019**: A interface MUST seguir os padrões existentes (tema escuro, textos traduzidos, avisos por toast).

### Key Entities

- **Mapa (modelo de mapa)**: ganha um **tipo** (2D ou 2,5D) e, no 2,5D, uma **imagem de céu/horizonte** opcional. A imagem 2D existente é o chão da cena 3D. Os mapas atuais são 2D.
- **Parede**: célula hexagonal (coluna/linha) do mapa 2,5D marcada como bloqueio; toda célula não marcada é espaço vazio. Pertence ao modelo do mapa, é salva junto com ele e bloqueia as peças como um hex ocupado.
- **Peça**: PJ, NPC ou objeto já existentes; sem mudança de dados, apenas ganham uma segunda forma de exibição (figura no 3D).
- **Preferência de vista**: modo 2D/3D lembrado por mapa no dispositivo do usuário (não compartilhado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre cria um mapa de história com paredes marcadas sobre a imagem em menos de 10 minutos para um mapa de 30×20 células.
- **SC-002**: A troca entre 2D e 3D leva menos de 2 segundos e não perde nenhuma peça nem parede.
- **SC-003**: A navegação 3D mantém movimento fluido (sensação de pelo menos 30 quadros por segundo) com até 50 peças e mapa de 60×40 células em computador comum.
- **SC-004**: 100% das peças do mapa aparecem no 3D nas posições corretas e as mudanças feitas por outros usuários aparecem em até 2 segundos.
- **SC-005**: 100% dos mapas 2D existentes abrem e funcionam exatamente como antes.
- **SC-006**: Pelo menos 90% dos jogadores conseguem alternar para 3D, girar e dar zoom na primeira tentativa, sem instrução.

## Assumptions

- A vista 3D apenas reinterpreta as células hexagonais já existentes (ver Clarifications).
- A vista 3D é somente de visualização e navegação da câmera: mover, girar peças e demais ações continuam no 2D.
- Todos com acesso ao mapa (mestre e participantes aprovados) podem usar a vista 3D; a câmera é local de cada usuário e não é sincronizada.
- A câmera colide com paredes (não atravessa) e não é sincronizada entre usuários.
- Texturas das paredes são simples e padronizadas nesta primeira versão; personalização fica fora do escopo.
- Fora do escopo: iluminação dinâmica, portas, névoa de guerra, combate/medição em 3D, edição de peças no 3D, alturas variáveis de parede.
- Reutiliza o login, as campanhas, as peças e a atualização em tempo real já existentes.
