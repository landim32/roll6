# Feature Specification: Mudar peça de mapa

**Feature Branch**: `111-piece-map-transfer`  
**Created**: 2026-11-08  
**Status**: Draft  
**Input**: User description: "Crie uma forma de transferir um personagem/npc para outro mapa, deve colocar o persoangem/npc na mesma posição que estava no mapa anterior. Deve tem uma opção mudar de mapa no menu que abre um popup para escolher o mapa. Apenas o mestre pode fazer isso"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mestre leva um personagem para outro mapa (Priority: P1)

Durante a sessão, o grupo sai de um ambiente (por exemplo, a taverna) e entra em outro (a rua). O mestre clica na peça de um personagem no mapa aberto, escolhe **"Mudar de mapa"** no menu da peça, e uma janela lista os outros mapas ativos da campanha. Ele escolhe o mapa de destino e confirma: o personagem sai do mapa atual e aparece no mapa escolhido **no mesmo hex (coluna/linha) e virado para o mesmo lado** em que estava. A tela do jogador dono do personagem acompanha o personagem para o novo mapa, como já acontece quando o mestre traz um personagem de outro mapa.

**Why this priority**: É o caso central do pedido — trocar de cena sem precisar arrastar o card do personagem e reposicioná-lo à mão, preservando a formação do grupo.

**Independent Test**: Com uma campanha de dois mapas ativos e um personagem no hex (5, 3) do mapa A, o mestre usa "Mudar de mapa" → mapa B; o personagem passa a estar só no mapa B, no hex (5, 3), com a mesma direção, e o jogador vê o mapa B.

**Acceptance Scenarios**:

1. **Given** um personagem no hex (5, 3) do mapa A olhando para a direção 2, **When** o mestre escolhe "Mudar de mapa" e seleciona o mapa B, **Then** o personagem some do mapa A e aparece no mapa B no hex (5, 3), olhando para a direção 2.
2. **Given** o jogador dono do personagem está vendo o mapa A, **When** o mestre transfere o personagem para o mapa B, **Then** a tela do jogador passa a mostrar o mapa B (com o aviso já existente "O mestre está mudando o mapa").
3. **Given** a transferência foi feita, **When** alguém consulta o turno, **Then** nenhum movimento é registrado, o Deslocamento do personagem não é gasto e a regra de "um movimento por turno" não é afetada.

---

### User Story 2 - Mestre leva um NPC para outro mapa (Priority: P1)

O mestre faz o mesmo com a peça de um NPC (inimigo, neutro ou aliado): "Mudar de mapa" → escolhe o mapa → a unidade do NPC passa para o mapa escolhido na mesma posição e direção, **mantendo** sua vida/fadiga atuais, status, postura, Deslocamento atual, ação repetida e o histórico de turno.

**Why this priority**: O pedido cita explicitamente personagem **e** NPC; um aliado que acompanha o grupo ou um inimigo que persegue os personagens precisa trocar de mapa junto, sem perder o estado.

**Independent Test**: Com um NPC "Goblin" ferido (vida 3 de 8) no hex (2, 4) do mapa A, o mestre o transfere para o mapa B; no mapa B aparece o Goblin no hex (2, 4), com vida 3 de 8, mesmo status e postura, e ele não aparece mais no mapa A.

**Acceptance Scenarios**:

1. **Given** uma unidade de NPC no mapa A com vida atual menor que a total e um status, **When** o mestre a transfere para o mapa B, **Then** ela aparece no mapa B no mesmo hex e direção, com a mesma vida, fadiga, status, postura e Deslocamento atual.
2. **Given** as ações já registradas pela unidade no turno, **When** ela é transferida, **Then** as entradas de turno continuam ligadas à mesma unidade (o histórico não se perde nem se duplica).
3. **Given** o mapa B já tem uma unidade com o mesmo nome (por exemplo, outro "Goblin 2"), **When** a unidade é transferida, **Then** ela recebe o próximo nome livre naquele mapa ("Goblin 3"), seguindo a regra de nomes já existente.

---

### User Story 3 - Posição de destino ocupada ou fora do mapa (Priority: P2)

O mapa de destino pode ser menor que o de origem, ou o hex de destino pode já estar ocupado por outra peça. Nesses casos a peça vai para o **hex livre mais próximo** da posição original onde toda a sua forma caiba; se não houver nenhum, a transferência é recusada com uma mensagem clara e nada muda.

**Why this priority**: Sem essa regra a função falharia justamente quando o grupo inteiro é levado de um mapa para outro de tamanho diferente; mas o caso comum (mesma posição livre) já entrega valor sem ela.

**Independent Test**: Transferir um personagem do hex (5, 3) para um mapa B em que (5, 3) está ocupado; ele fica no hex livre mais próximo de (5, 3). Transferir para um mapa B totalmente ocupado; recebe a mensagem de erro e continua no mapa A.

**Acceptance Scenarios**:

1. **Given** o hex (5, 3) do mapa B está ocupado, **When** o mestre transfere para B uma peça que estava em (5, 3), **Then** ela fica no hex livre mais próximo de (5, 3) e o mestre é avisado de que a posição foi ajustada.
2. **Given** o mapa B tem só 4 × 4 hexes e a peça estava em (10, 8), **When** o mestre a transfere para B, **Then** ela fica no hex livre mais próximo de (10, 8) dentro do mapa B.
3. **Given** o mapa B não tem nenhum lugar livre para a forma da peça, **When** o mestre tenta a transferência, **Then** recebe a mensagem "Não há um hex livre para a peça neste mapa." e a peça continua no mapa A sem alteração.

---

### Edge Cases

- **Só um mapa ativo na campanha**: a janela informa que não há outro mapa para onde levar a peça (a opção pode aparecer desabilitada ou a lista vem vazia com essa mensagem).
- **Mapas arquivados ou apagados**: não aparecem na lista e não são aceitos como destino.
- **Campanha pausada ou finalizada**: a opção não aparece (mesma regra que bloqueia editar peças no mapa); em preparação continua disponível para o mestre.
- **Peça grande ou caída**: a posição considera a forma atual da peça (tamanho conforme a postura); a forma inteira deve caber livre no destino.
- **Peça mudou enquanto a janela estava aberta** (outro usuário moveu, removeu ou já transferiu): a transferência usa o estado atual; se a peça não existir mais, o mestre recebe "não encontrado" e a janela fecha.
- **Jogador ou comandante de aliado**: não veem a opção "Mudar de mapa" e, se tentarem por outro meio, a operação é recusada.
- **Objetos** (peças que não são personagem nem NPC): fora do escopo — a opção não aparece para eles.
- **Personagem com uma caminhada no modo livre em andamento**: o ponto exato de caminhada é descartado; a peça fica no centro do hex no destino.
- **Ações sobre alvo** já declaradas mantêm o alvo como foi registrado (é uma fotografia do momento, nunca relida).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O menu da peça DEVE oferecer a opção **"Mudar de mapa"** para peças de personagem e de NPC, visível **apenas para o mestre** da campanha, tanto na visão 2D quanto na isométrica (mesmo menu).
- **FR-002**: Escolher "Mudar de mapa" DEVE abrir uma janela que lista os mapas **ativos** da campanha, exceto o mapa em que a peça está, e permite escolher um e confirmar ou cancelar.
- **FR-003**: Ao confirmar, o sistema DEVE retirar a peça do mapa de origem e colocá-la no mapa escolhido, no **mesmo hex (coluna/linha)** e com a **mesma direção** que tinha na origem.
- **FR-004**: Se a forma da peça não couber livre nessa posição no destino (hex ocupado ou fora da grade), o sistema DEVE colocá-la no hex livre mais próximo da posição original em que a forma inteira caiba, e informar o mestre que a posição foi ajustada; se não houver nenhum, DEVE recusar com "Não há um hex livre para a peça neste mapa." sem alterar nada.
- **FR-005**: Apenas o mestre da campanha DEVE poder transferir; qualquer outro usuário (inclusive o dono do personagem e o comandante de um aliado) DEVE ser recusado.
- **FR-006**: A transferência DEVE obedecer às mesmas regras de status da campanha que a edição de peças no mapa (permitida em campanha ativa, e em preparação para o mestre).
- **FR-007**: A transferência de um personagem DEVE manter a mesma participação na campanha (vida, fadiga, status, postura, Deslocamento, ficha e ação repetida inalterados), respeitando a regra de que um personagem está em no máximo um mapa.
- **FR-008**: A transferência de um NPC DEVE mover a **mesma unidade** (não criar outra): vida e fadiga atuais, status, postura, Deslocamento atual, ação repetida, categoria/comando e histórico de turno inalterados; o nome só muda se já houver outra unidade ativa com o mesmo nome no destino, recebendo então o próximo nome livre.
- **FR-009**: A transferência NÃO DEVE registrar movimento no turno, gastar Deslocamento nem contar para a regra de um movimento por turno.
- **FR-010**: Todos os que veem os dois mapas DEVEM ver a mudança em tempo real: a peça some da origem e aparece no destino para o mestre e para quem tem personagens em cada um desses mapas.
- **FR-011**: Quando um personagem é transferido, a tela do jogador dono, se estiver acompanhando esse personagem, DEVE passar para o novo mapa (mesmo comportamento já existente quando o mestre traz o personagem de outro mapa).
- **FR-012**: Os painéis e listas que mostram em que mapa cada personagem/NPC está (cards do grupo, painel de NPCs, seleção de mesa) DEVEM refletir o novo mapa sem recarregar a página.
- **FR-013**: A operação DEVE estar disponível também para o Claude/automação do mestre (servidor MCP), como toda nova operação do sistema.

### Key Entities *(include if feature involves data)*

- **Peça no mapa**: a representação de um personagem ou de uma unidade de NPC em um mapa da campanha — mapa, hex (coluna/linha), direção e forma (tamanho conforme a postura). A transferência muda o mapa e, se necessário, o hex; a identidade da peça continua a mesma.
- **Unidade de NPC no mapa**: o NPC em um mapa específico, com nome próprio e estado atual (vida, fadiga, status, postura, Deslocamento, ação repetida). Passa a pertencer ao mapa de destino.
- **Mapa da campanha**: o destino possível — somente mapas ativos da mesma campanha, diferentes do atual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O mestre leva uma peça para outro mapa em no máximo 3 interações (abrir o menu, escolher "Mudar de mapa", escolher o mapa) e em menos de 10 segundos.
- **SC-002**: Em 100% das transferências em que a posição original está livre no destino, a peça fica exatamente no mesmo hex e direção.
- **SC-003**: Após a transferência de um NPC, 100% do seu estado (vida, fadiga, status, postura, Deslocamento atual) e das suas entradas de turno continuam iguais.
- **SC-004**: Os demais participantes veem a peça sair de um mapa e entrar no outro em até 2 segundos, sem recarregar a página.
- **SC-005**: Nenhuma tentativa feita por um usuário que não é o mestre altera o mapa de uma peça.

## Assumptions

- "Mesma posição" significa o mesmo hex (coluna/linha) e a mesma direção da peça; como todos os mapas usam o mesmo tamanho de hex, a correspondência é direta, e não se tenta mapear coordenadas em pixels da imagem.
- Quando a posição não serve, o desvio para o hex livre mais próximo é preferível a recusar, pois o mestre costuma levar várias peças seguidas para o mesmo destino; o mestre pode ajustar depois com "Mover".
- A transferência de personagem reaproveita o comportamento já existente de trazer um personagem de outro mapa (mesma peça, sem movimento registrado, tela do jogador acompanha); a diferença é a posição preservada e o ponto de partida (menu da peça, em vez de arrastar o card).
- Transferir várias peças de uma vez está fora do escopo; cada peça é transferida individualmente.
- Objetos (peças sem personagem nem NPC), inclusive corpos de NPC, ficam fora do escopo.
- Não há confirmação extra além da própria janela de escolha do mapa (a escolha já é a confirmação).
