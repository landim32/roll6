# Feature Specification: Cards dos Personagens da Campanha

**Feature Branch**: `009-campaign-character-cards`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "No frontend, na tela principal: deve aparecer um card com os personagens que estão na campanha; imagem redonda, nome, vida e energia; vida e energia como barra, exibindo o valor atual (no CampaignCharacter) e o valor total (Character); ícone para editar, que abre o modal do cadastro do personagem; apenas o GM e o próprio dono do personagem podem editar; esses cards devem ficar fixos e visíveis sempre, ocupando pouco espaço."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver a mesa num relance (Priority: P1)

Na tela do mapa, um painel fixo e compacto mostra um card para cada personagem aprovado na campanha
atual. Cada card tem a foto redonda, o nome e duas barras finas: vida e energia, cada uma com o valor
atual na campanha e o total do personagem (ex.: "8/12"). O painel fica sempre visível por cima do
mapa, sem cobrir o menu, os botões de zoom/imagem nem o rodapé, e pode ser recolhido.

**Why this priority**: é o que mestre e jogadores olham o tempo todo durante a sessão; sem isso a vida e
a energia ficam escondidas em modais.

**Independent Test**: numa campanha com três personagens aprovados, abrir o mapa e ver três cards com
foto/inicial, nome e as barras "atual/total"; recolher e reabrir o painel.

**Acceptance Scenarios**:

1. **Given** uma campanha atual com personagens aprovados, **When** o usuário (mestre ou participante
   aprovado) está no mapa, **Then** vê um card por personagem aprovado, na ordem em que entraram.
2. **Given** um personagem com vida atual 8 e vida total 12, **When** o card é exibido, **Then** a
   barra de vida aparece preenchida em 2/3 e com o texto "8/12"; o mesmo vale para a energia.
3. **Given** um personagem com vida atual 0 ou negativa, **When** o card é exibido, **Then** a barra
   fica vazia, o texto mostra o valor real (ex.: "-2/12") e o card indica visualmente que o personagem
   caiu.
4. **Given** um personagem com total 0, **When** o card é exibido, **Then** a barra aparece vazia com
   "0/0", sem erro.
5. **Given** personagens convidados, com acesso solicitado ou recusados, **When** o painel é exibido,
   **Then** eles não aparecem (só aprovados).
6. **Given** nenhuma campanha selecionada, ou uma campanha sem personagens aprovados, **When** o
   usuário está no mapa, **Then** o painel não aparece (ou mostra só um aviso discreto para o mestre).
7. **Given** o usuário não é o mestre nem tem personagem aprovado na campanha, **When** está no mapa,
   **Then** o painel não aparece.
8. **Given** o painel aberto, **When** o usuário o recolhe, **Then** ele vira uma aba estreita e a
   escolha é lembrada ao recarregar a página.
9. **Given** o personagem atual do usuário (combo "Personagem atual"), **When** o painel é exibido,
   **Then** o card dele fica destacado.

---

### User Story 2 - Atualizar vida e energia durante o jogo (Priority: P1)

O mestre ou o dono do personagem clica no ícone de editar do card. Abre o modal de cadastro do
personagem com os dados atuais; além dos campos do personagem, há "Vida atual" e "Energia atual" nesta
campanha. Ao salvar, o card reflete os novos valores.

**Why this priority**: vida e energia mudam a cada rodada; sem editar, as barras não servem.

**Independent Test**: como dono, abrir o editar do próprio card, mudar a vida atual de 12 para 8,
salvar e ver "8/12"; como outro jogador, confirmar que o ícone de editar não aparece no card alheio.

**Acceptance Scenarios**:

1. **Given** o usuário é o mestre da campanha, **When** olha os cards, **Then** todos têm o ícone de
   editar.
2. **Given** o usuário é jogador, **When** olha os cards, **Then** só os cards dos seus personagens
   têm o ícone de editar.
3. **Given** o modal aberto a partir de um card, **When** ele é exibido, **Then** traz os dados do
   personagem (nome, imagem, atributos, ficha) e a vida/energia atuais na campanha já preenchidos.
4. **Given** o usuário altera a vida atual para 8 e salva, **When** o modal fecha, **Then** o card
   mostra "8/12" e um toast confirma.
5. **Given** o usuário altera o total de vida para 10 enquanto a atual é 12, **When** salva, **Then** a
   atual passa a 10 (nunca acima do total).
6. **Given** um valor atual acima do total, **When** o usuário tenta salvar, **Then** um toast informa o
   limite e nada é salvo.
7. **Given** um jogador que não é dono, **When** tenta editar (por qualquer meio), **Then** o sistema
   recusa e informa que não tem permissão.
8. **Given** o mestre edita o personagem de um jogador, **When** salva, **Then** o dono vê os novos
   dados na próxima atualização do painel.

---

### User Story 3 - Painel sempre atualizado (Priority: P2)

Os valores de todos os participantes aparecem atualizados para todos na mesa sem recarregar a página.

**Why this priority**: numa sessão o mestre muda a vida de todos; os jogadores precisam ver.

**Independent Test**: com duas sessões abertas (mestre e jogador), o mestre muda a vida do personagem
do jogador; em até 15 segundos o card do jogador mostra o novo valor.

**Acceptance Scenarios**:

1. **Given** duas pessoas na mesma campanha, **When** uma altera vida/energia de um personagem,
   **Then** a outra vê o novo valor em até 15 segundos, sem recarregar.
2. **Given** um personagem aprovado ou removido da campanha, **When** o painel atualiza, **Then** o
   card aparece ou some.
3. **Given** a aba do navegador oculta, **When** o tempo passa, **Then** o painel não fica consultando
   o sistema; ao voltar, atualiza na hora.

---

### Edge Cases

- Muitos personagens (ex.: 12): o painel rola internamente sem crescer além da área reservada.
- Nome longo: truncado com reticências; o nome completo aparece ao passar o mouse.
- Personagem sem imagem: círculo com a inicial.
- Troca de campanha: o painel passa a mostrar os personagens da nova campanha imediatamente.
- Edição simultânea (mestre e dono ao mesmo tempo): vale o último salvamento; o painel mostra o valor
  mais recente na próxima atualização.
- Personagem removido da campanha enquanto o modal de edição está aberto: salvar informa o erro e o
  card some na atualização.
- Tela estreita: o painel continua compacto e recolhível, sem cobrir os controles do mapa.

## Requirements *(mandatory)*

### Functional Requirements

**Painel e cards**

- **FR-001**: A tela do mapa MUST exibir um painel fixo com um card por personagem **aprovado** na
  campanha atual, visível ao mestre e aos participantes aprovados.
- **FR-002**: Cada card MUST mostrar a imagem redonda (ou a inicial), o nome e duas barras — vida e
  energia — com o texto "atual/total".
- **FR-003**: O preenchimento de cada barra MUST ser atual ÷ total, limitado entre 0% e 100%; total 0
  MUST exibir barra vazia; atual ≤ 0 MUST destacar o card como "caído".
- **FR-004**: O painel MUST ser compacto (cada card com no máximo ~56 px de altura e o painel com no
  máximo ~240 px de largura), não cobrir o menu, os botões do mapa nem o rodapé, rolar internamente
  quando necessário e poder ser recolhido; o estado recolhido MUST ser lembrado neste navegador.
- **FR-005**: O card do personagem atual do usuário MUST ficar destacado.

**Edição**

- **FR-006**: O ícone de editar MUST aparecer apenas para o mestre da campanha (em todos os cards) e
  para o dono do personagem (nos seus cards).
- **FR-007**: O ícone MUST abrir o modal de cadastro do personagem em modo de edição, com os dados
  atuais do personagem e os campos adicionais "Vida atual" e "Energia atual" desta campanha.
- **FR-008**: O sistema MUST permitir que o mestre da campanha edite todos os dados de um personagem
  aprovado na sua campanha (nome, imagem, atributos, ficha e valores atuais), além do dono.
- **FR-009**: O sistema MUST recusar edições de quem não é o dono nem o mestre de uma campanha em que
  o personagem esteja aprovado.
- **FR-010**: Vida e energia atuais MUST ser números inteiros, não podem passar do total do personagem
  e podem ficar em zero ou negativos (personagem caído).
- **FR-011**: Ao reduzir um total abaixo do atual, o atual MUST ser ajustado para o novo total em
  todas as campanhas em que o personagem participa.
- **FR-012**: Ao entrar numa campanha (aprovação, convite aceito ou pedido aprovado direto), os valores
  atuais MUST começar iguais aos totais do personagem.

**Atualização**

- **FR-013**: O painel MUST ser recarregado ao trocar de campanha, após cada edição feita pelo usuário
  e periodicamente a cada 15 segundos enquanto a aba estiver visível.
- **FR-014**: Toda edição (sucesso ou erro) MUST ser comunicada por toast; textos em pt-BR.

### Key Entities

- **Personagem**: dono, nome, imagem, **vida total**, **energia total**, movimento, estado, ficha.
- **Participação na campanha**: liga o personagem à campanha com um status e passa a guardar a **vida
  atual** e a **energia atual** do personagem naquela campanha (independentes entre campanhas).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Qualquer participante vê vida e energia de todos os personagens aprovados sem abrir
  nenhuma janela (0 cliques).
- **SC-002**: O mestre atualiza a vida de um personagem em no máximo 3 cliques a partir do mapa
  (editar → alterar → salvar).
- **SC-003**: Uma alteração aparece para os demais participantes em até 15 segundos.
- **SC-004**: Com o painel aberto, pelo menos 80% da área do mapa continua visível numa tela de
  1366 × 768; recolhido, o painel ocupa no máximo 32 px de largura.
- **SC-005**: 100% das tentativas de edição por quem não é dono nem mestre são recusadas.

## Assumptions

- Esta feature exige mudanças no backend, além do frontend:
  - novos valores "vida atual" e "energia atual" na participação da campanha (os campos vida/energia do
    personagem passam a significar o **total**);
  - participações já existentes começam com os valores atuais iguais aos totais;
  - edição do personagem também pelo mestre de uma campanha em que ele está aprovado;
  - atualização dos valores atuais da participação pelo dono ou pelo mestre.
- O modal de edição é o mesmo "Incluir Personagem" (feature 008) em modo de edição; ao editar não há
  inclusão/pedido de acesso na campanha.
- Para o mestre editar, o personagem precisa estar **aprovado** na campanha dele; convidados ou com
  pedido pendente não aparecem no painel e não são editáveis pelo mestre.
- O painel fica no lado esquerdo, logo abaixo do menu, sobre o mapa; a posição exata é decidida no
  planejamento respeitando FR-004.
- Não há atualização em tempo real (WebSocket); a consulta a cada 15 segundos é suficiente.
- Excluir personagem e ajustes rápidos (+/−) direto no card estão fora do escopo.
