# Feature Specification: Sincronização em tempo real da mesa

**Feature Branch**: `017-realtime-signalr-sync`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Liste todos os serviços ligados ao mapa, troca de mapa, movimentação, ação, alterações dos personagens/npcs. Preciso que crie um serviço q use socket com signalR. Mantenha a api funcionando do mesmo jeito. O frontend deve conectar usando o socket e as alterações deve propagar para todos os outros jogadores e gm"

## Contexto: o que muda na mesa hoje e como os outros ficam sabendo

Levantamento das operações que alteram o que a mesa (mestre + jogadores de uma campanha) vê. Hoje as
alterações só chegam aos outros por consulta periódica (a cada 15 s) — e as peças do mapa nem isso: um
jogador só vê uma peça mudar de lugar recarregando a página.

| Grupo | Operação (quem) | Como os outros sabem hoje |
|---|---|---|
| **Peças do mapa** | Incluir objeto, colocar personagem, trocar o token, alterar, excluir, **mover** (mestre; jogador move o próprio personagem) | Não sabem (só recarregando) |
| **NPCs no mapa** | Colocar NPC (cria a ocorrência e a peça), alterar a ocorrência (nome, vida, energia, status), excluir | Não sabem |
| **NPCs da campanha** | Incluir / retirar NPC da campanha (mestre); editar o NPC da biblioteca | Lista consultada a cada 15 s |
| **Personagens da campanha** | Alterar vida/energia/status/ficha da campanha (dono ou mestre); editar o personagem (dono); aprovar/negar pedido, aceitar convite, remover participação | Grupo consultado a cada 15 s |
| **Turnos** | Agir, resetar turno, registro direto/exclusão (mestre), finalizar turno; o movimento também grava o turno | Turno consultado a cada 15 s |
| **Mapa** | Salvar o mapa (imagem, posição/tamanho da imagem, grade); incluir mapa na campanha, excluir mapa | Não sabem |
| **Troca de mapa** | Mestre abre outro mapa da campanha | Não sabem (cada um escolhe o seu mapa) |
| **Campanha** | Renomear, abrir/fechar, excluir | Não sabem |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver as peças se moverem na hora (Priority: P1)

Mestre e jogadores estão com o mesmo mapa da campanha aberto. Quando alguém move uma peça, inclui, troca,
altera ou exclui uma peça (inclusive NPCs colocados no mapa), todos os outros veem a mudança em instantes,
sem recarregar a página.

**Why this priority**: É a lacuna mais grave hoje (peças não atualizam nunca) e o coração de uma mesa
virtual: sem ver os movimentos dos outros, o jogo não acontece.

**Independent Test**: Abrir o mesmo mapa em dois navegadores (mestre e jogador); mover uma peça em um e
ver a peça mudar de lugar e de sentido no outro.

**Acceptance Scenarios**:

1. **Given** mestre e jogador com o mesmo mapa aberto, **When** o jogador move o próprio personagem, **Then** o mestre vê a peça na nova posição e sentido em até 2 segundos.
2. **Given** a mesma situação, **When** o mestre coloca um NPC, troca o token de uma peça ou exclui uma peça, **Then** o jogador vê a mudança em até 2 segundos.
3. **Given** um jogador com **outro** mapa da campanha aberto, **When** uma peça muda no primeiro mapa, **Then** o mapa desse jogador não é alterado.
4. **Given** um usuário que não participa da campanha, **When** peças mudam, **Then** ele não recebe nenhuma dessas alterações.

---

### User Story 2 - Turno, ações e cartões atualizados na hora (Priority: P1)

Ações, reset de turno e finalização de turno, e as mudanças de vida/energia/status de personagens e NPCs,
aparecem para toda a mesa imediatamente: círculos de status, balões de fala, rastros, "Turno N", cartões
do grupo e de NPCs e a notificação de turno finalizado.

**Why this priority**: Junto com a movimentação, é o que dá ritmo ao turno; hoje depende de esperar até
15 s.

**Independent Test**: Jogador age; o mestre vê o balão e o círculo verde imediatamente. Mestre finaliza o
turno; o jogador vê "Turno N+1" e recebe a notificação na hora.

**Acceptance Scenarios**:

1. **Given** mestre e jogadores na campanha, **When** um jogador registra uma ação, **Then** todos veem o balão e o círculo verde em até 2 segundos.
2. **Given** a mesma situação, **When** o mestre finaliza o turno, **Then** todos veem o novo número do turno e recebem a notificação "Turno N finalizado" em até 2 segundos.
3. **Given** a mesma situação, **When** o mestre altera a vida de um personagem ou de um NPC do mapa, **Then** as barras dos cartões e os dados da peça se atualizam para todos em até 2 segundos.
4. **Given** a mesma situação, **When** alguém reseta o turno de uma peça, **Then** a peça volta à posição anterior e os registros somem para todos.
5. **Given** a mesma situação, **When** o mestre inclui ou retira um NPC da campanha, ou um personagem é aprovado/removido, **Then** os painéis de NPCs e do grupo se atualizam para todos.

---

### User Story 3 - Troca de mapa e alterações do mapa (Priority: P2)

Quando o mestre abre outro mapa da campanha, os jogadores conectados seguem o mestre automaticamente para
esse mapa. A campanha lembra o mapa atual escolhido pelo mestre: quem entra na campanha depois (login,
recarga, troca de campanha) abre esse mapa. O jogador ainda pode abrir outro mapa por conta própria, mas
volta a seguir o mestre na próxima troca. Quando o mestre salva alterações do mapa (imagem, posição/tamanho da imagem, tamanho da
grade), quem está com esse mapa aberto vê a nova versão.

**Why this priority**: Importante para conduzir a sessão, mas a mesa já funciona se cada um abrir o mapa
certo manualmente.

**Independent Test**: Mestre abre outro mapa da campanha; o jogador passa a ver esse mapa sozinho. Mestre ajusta a imagem e salva; o jogador vê a imagem ajustada.

**Acceptance Scenarios**:

1. **Given** mestre e jogador no mapa A, **When** o mestre abre o mapa B da campanha, **Then** o jogador passa a ver o mapa B em até 2 segundos, com um aviso "O mestre abriu o mapa B".
2. **Given** o mestre com o mapa B aberto, **When** um jogador entra na campanha ou recarrega a página, **Then** ele abre o mapa B.
3. **Given** um jogador que abriu o mapa C por conta própria, **When** o mestre troca para o mapa D, **Then** o jogador passa ao mapa D.
4. **Given** jogador com o mapa A aberto, **When** o mestre salva uma alteração do mapa A, **Then** o jogador vê a nova imagem/grade em até 2 segundos, mantendo o próprio zoom e posição da tela.
5. **Given** jogador com o mapa A aberto, **When** o mestre exclui o mapa A, **Then** o jogador é avisado e o mapa é fechado.
6. **Given** mestre com alterações não salvas, **When** outro evento chega, **Then** as alterações não salvas do mestre não são perdidas.

---

### User Story 4 - Conexão resiliente (Priority: P2)

A conexão em tempo real se reconecta sozinha após quedas (rede, servidor reiniciado, aba em segundo plano)
e, ao voltar, a tela se atualiza com tudo o que mudou durante a queda. Enquanto estiver desconectado, o
usuário vê um indicador discreto e a aplicação continua funcionando como hoje.

**Why this priority**: Sem isso uma queda silenciosa deixaria a tela desatualizada sem ninguém perceber.

**Independent Test**: Derrubar a rede de um jogador, mover peças pelo mestre, restaurar a rede e ver o
jogador sincronizado sem recarregar.

**Acceptance Scenarios**:

1. **Given** um jogador desconectado, **When** a conexão volta, **Then** peças, turno, grupo e NPCs são recarregados e ficam iguais aos do mestre.
2. **Given** um jogador desconectado, **When** ele olha a tela, **Then** vê um indicador de "sem conexão em tempo real".
3. **Given** a conexão em tempo real indisponível, **When** o usuário usa a aplicação, **Then** todas as operações continuam funcionando e as atualizações dos outros ainda chegam, no mínimo, pela consulta periódica atual.

---

### Edge Cases

- O próprio autor de uma alteração não deve ver a mudança "piscar" ou ser aplicada duas vezes (a resposta da operação e o aviso em tempo real).
- Duas alterações quase simultâneas na mesma peça: todos terminam vendo o mesmo estado final (o último salvo).
- Usuário perde o acesso à campanha (participação removida) enquanto conectado: deixa de receber as alterações dela.
- Usuário troca de campanha: passa a receber só as alterações da nova campanha.
- O mesmo usuário com duas abas abertas: ambas recebem as alterações.
- Sessão expirada: a conexão em tempo real é encerrada junto com o logout.
- O mestre movendo uma peça (modo Mover, antes de confirmar) não transmite nada; só o movimento confirmado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer um canal em tempo real autenticado (a mesma sessão do login) pelo qual o frontend recebe as alterações da campanha atual.
- **FR-002**: Todas as operações atuais MUST continuar disponíveis e com o mesmo comportamento, permissões e respostas; o canal em tempo real apenas **avisa** das alterações feitas por elas.
- **FR-003**: Após cada alteração bem-sucedida listada no "Contexto" (peças, NPCs do mapa, NPCs da campanha, personagens da campanha, turnos, mapa, campanha), o sistema MUST avisar todos os usuários conectados que podem ver aquela campanha (mestre e participantes aprovados), inclusive outras abas do autor.
- **FR-004**: Usuários que não são mestre nem participantes aprovados da campanha MUST NOT receber avisos dela; a permissão é verificada ao entrar na campanha pelo canal.
- **FR-005**: Alterações de peças e do mapa MUST ser aplicadas apenas por quem está com aquele mapa aberto.
- **FR-006**: Os avisos MUST levar dados suficientes para atualizar a tela sem nova consulta quando possível (ex.: a peça alterada, o registro de turno); quando não for prático, MUST indicar o que recarregar.
- **FR-007**: Operações rejeitadas (sem permissão, conflito, validação) MUST NOT gerar avisos.
- **FR-008**: Ao conectar/reconectar ou trocar de campanha, o frontend MUST recarregar o estado atual (peças do mapa aberto, turno, grupo, NPCs) para não perder alterações.
- **FR-009**: Enquanto o canal estiver conectado, as consultas periódicas de grupo, NPCs e turno MUST ser desligadas ou espaçadas; desconectado, MUST voltar a funcionar como hoje.
- **FR-010**: O frontend MUST mostrar um indicador discreto quando o canal em tempo real estiver desconectado ou reconectando.
- **FR-011**: Quando o mestre abre um mapa da campanha, a campanha MUST registrar esse mapa como o mapa atual e os participantes conectados MUST passar automaticamente a esse mapa, com um aviso; abrir um mapa por conta própria continua permitido ao jogador até a próxima troca do mestre.
- **FR-011a**: Ao entrar na campanha (login, recarga, troca de campanha), o participante MUST abrir o mapa atual da campanha quando houver um; sem mapa atual, vale o comportamento de hoje (último mapa aberto por ele).
- **FR-012**: A exclusão de um mapa aberto ou da campanha atual MUST fechar o mapa/campanha para os demais com um aviso.
- **FR-013**: Alterações não salvas do mestre no editor de mapa MUST NOT ser descartadas por avisos recebidos.
- **FR-014**: Convites pendentes (que dependem do usuário, não da campanha) ficam fora deste canal e continuam como hoje.

### Key Entities

- **Mapa atual da campanha**: o mapa da campanha que o mestre abriu por último; é para ele que os participantes vão ao entrar e quando o mestre troca.
- **Mesa (grupo da campanha)**: conjunto de conexões de usuários que podem ver uma campanha; recebe os avisos dessa campanha.
- **Aviso de alteração**: mensagem com o tipo da alteração (peça movida, peça incluída/alterada/excluída, NPC do mapa alterado, NPCs da campanha alterados, personagem da campanha alterado, registro de turno incluído/removido, turno finalizado, mapa salvo/incluído/excluído, mapa trocado pelo mestre, campanha alterada/excluída), a campanha, o mapa quando houver, os dados alterados e o autor.
- **Conexão em tempo real**: vínculo do navegador do usuário com o servidor, autenticado, que entra no grupo da campanha atual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 95% dos casos, uma alteração feita por um usuário aparece para os outros participantes em até 2 segundos.
- **SC-002**: Nenhuma operação existente muda de comportamento: todos os testes atuais continuam passando sem alteração de expectativas.
- **SC-003**: Após uma queda de conexão de até 5 minutos, o usuário fica sincronizado em até 5 segundos depois que a rede volta, sem recarregar a página.
- **SC-004**: Um usuário fora da campanha não recebe nenhum aviso dela (0 vazamentos nos testes de permissão).
- **SC-005**: Uma sessão com 1 mestre e 6 jogadores por 1 hora funciona sem precisar recarregar a página para ver alterações dos outros.

## Assumptions

- A tecnologia do canal foi definida pelo usuário: SignalR (servidor .NET) com o cliente oficial no frontend; a API REST continua sendo o caminho de todas as alterações — o canal é só de avisos do servidor para os clientes.
- O canal usa o mesmo token de login; em produção passa pelo mesmo endereço (mesma origem) já usado pela API.
- Apenas movimentos **confirmados** são transmitidos; a prévia do modo Mover continua local.
- Convites pendentes continuam consultados como hoje (FR-014).
- Uma única instância do servidor é suficiente para o porte atual (sem distribuição entre vários servidores).
- Alterações do mapa (imagem/grade) são transmitidas ao salvar, não durante a edição.
- Abrir um modelo de mapa fora da campanha (ou um mapa novo ainda não salvo) pelo mestre não troca o mapa dos jogadores; só mapas da campanha contam.
- Se o mapa atual for excluído, a campanha fica sem mapa atual.
