# Feature Specification: Transferir personagem para outro usuário

**Feature Branch**: `021-character-transfer`
**Created**: 2026-09-27
**Status**: Draft
**Input**: User description: "crie uma opção onde posso transferir um personagens para outro usuário. Ao transferir o personagens transferido continua todas as campanhas, todos os status da mesma forma, todos os mapas do mesmo jeito"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Transferir um personagem (Priority: P1)

O dono de um personagem quer passá-lo para outra pessoa (ex.: um jogador saiu do grupo e outro vai assumir
o personagem, ou o mestre criou o personagem para um jogador). Na lista dos seus personagens ele escolhe
"Transferir", informa o e-mail do usuário de destino e confirma. A partir daí o personagem pertence ao outro
usuário, **exatamente como estava**: mesmas campanhas, mesma situação em cada campanha (aprovado, convidado,
solicitado, negado), mesma vida/energia atuais, mesmo status, mesma ficha da campanha e mesmas peças nos
mapas, na mesma posição e direção. O histórico de turnos também continua.

**Why this priority**: É o objetivo da funcionalidade; sozinha já entrega valor.

**Independent Test**: Com um personagem aprovado numa campanha, com peça no mapa, vida atual diferente do
total e ações no turno, transferi-lo para outro usuário; o novo dono vê o personagem na sua lista, pode
selecioná-lo na campanha, editá-lo e movê-lo, e nada mudou na campanha nem no mapa.

**Acceptance Scenarios**:

1. **Given** o dono na lista dos seus personagens, **When** escolhe "Transferir" num personagem, **Then** abre uma janela pedindo o e-mail do usuário de destino, com o aviso de que ele perderá o acesso de dono.
2. **Given** um destinatário válido, **When** o dono confirma, **Then** o personagem passa a pertencer ao destinatário e some da lista do antigo dono.
3. **Given** o personagem transferido, **When** o novo dono abre suas campanhas, **Then** o personagem aparece aprovado nas mesmas campanhas, com a mesma vida/energia atuais, status e ficha da campanha.
4. **Given** o personagem com peças em mapas, **When** a transferência termina, **Then** as peças continuam no mesmo hex, com a mesma direção, e passam a poder ser movidas pelo novo dono (e não mais pelo antigo).
5. **Given** o turno atual com movimento/ação do personagem, **When** a transferência termina, **Then** esses registros continuam valendo (o novo dono não ganha um segundo movimento no mesmo turno).
6. **Given** um e-mail que não pertence a nenhum usuário, **When** o dono tenta transferir, **Then** recebe uma mensagem de usuário não encontrado e nada muda.
7. **Given** o próprio dono como destino, **When** tenta transferir, **Then** a transferência é recusada.
8. **Given** um usuário que não é o dono, **When** tenta transferir o personagem, **Then** é recusado.

---

### User Story 2 - Todos veem o novo dono (Priority: P2)

O mestre e os demais participantes da campanha passam a ver o novo dono do personagem, e as telas abertas
se atualizam sem precisar recarregar.

**Why this priority**: Melhora a experiência, mas a transferência já funciona sem isso.

**Independent Test**: Com o mestre e os dois usuários conectados na campanha, transferir o personagem e
verificar que o painel do grupo e o combo "Personagem atual" de cada um se atualizam.

**Acceptance Scenarios**:

1. **Given** o mestre com a campanha aberta, **When** o personagem é transferido, **Then** o card do personagem no painel do grupo continua lá, agora ligado ao novo dono.
2. **Given** o antigo dono com o personagem selecionado como "Personagem atual", **When** a transferência termina, **Then** o combo passa para outra opção válida (outro personagem dele ou nenhum) e ele deixa de poder mover a peça ou agir com o personagem.
3. **Given** o novo dono conectado, **When** a transferência termina, **Then** o personagem aparece no seu combo "Personagem atual" nas campanhas em que está aprovado.

---

### Edge Cases

- O destinatário é o mestre de uma campanha em que o personagem participa: a transferência é permitida; ele passa a ser dono e mestre ao mesmo tempo (vale o modo de dono ao abrir o card).
- O destinatário já tem outros personagens na mesma campanha: permitido, como qualquer usuário com mais de um personagem.
- Convites pendentes do personagem passam a ser respondidos pelo novo dono; solicitações pendentes continuam aguardando o mestre.
- O token e a imagem do personagem continuam os mesmos; o token segue pertencendo a quem o criou (a biblioteca de tokens é compartilhada).
- O antigo dono perde imediatamente o acesso de dono: não consegue mais editar, excluir, mover a peça nem agir com o personagem, e só o vê nas campanhas como qualquer outro participante (se tiver outro personagem aprovado nelas).
- Duas transferências simultâneas do mesmo personagem: só a primeira vale; a segunda é recusada porque quem pediu já não é o dono.
- A transferência não pode ser desfeita pelo antigo dono; o novo dono pode transferir de volta.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que o dono de um personagem o transfira para outro usuário cadastrado.
- **FR-002**: Somente o dono atual do personagem PODE transferi-lo; o mestre da campanha não pode transferir personagens de outros usuários.
- **FR-003**: O usuário de destino DEVE ser identificado pelo **e-mail exato** informado pelo dono (sem busca nem lista de usuários, para não expor quem está cadastrado); a comparação ignora maiúsculas/minúsculas e espaços nas pontas.
- **FR-004**: A transferência DEVE ser **imediata** após a confirmação do dono; o destinatário não precisa aceitar.
- **FR-005**: A transferência DEVE ser recusada quando o destino não existe ou é o próprio dono, sem alterar nada.
- **FR-006**: Após a transferência, o personagem DEVE manter todos os seus dados (nome, ficha, vida/energia totais, movimento, imagem, token).
- **FR-007**: Após a transferência, cada participação do personagem em campanhas DEVE continuar igual: situação (aprovado, convidado, solicitado, negado), vida/energia atuais, status e ficha da campanha.
- **FR-008**: Após a transferência, as peças do personagem nos mapas DEVEM continuar na mesma posição e direção, e os registros de turno (movimento, ação, resultado) DEVEM ser mantidos.
- **FR-009**: Após a transferência, todas as permissões de dono (editar, excluir, mover a peça, agir, resetar o turno, aceitar convites) DEVEM passar ao novo dono e deixar de valer para o antigo.
- **FR-010**: A transferência DEVE ser tudo ou nada: se falhar, o personagem continua com o dono original.
- **FR-011**: O sistema DEVE avisar o dono, antes de confirmar, que ele perderá o controle do personagem.
- **FR-012**: As telas abertas dos participantes das campanhas do personagem DEVEM refletir o novo dono sem recarregar a página.
- **FR-013**: A operação DEVE estar disponível também para assistentes e ferramentas externas (MCP e chaves de API), com as mesmas regras.

### Key Entities

- **Personagem**: passa a ter outro dono; todos os outros dados ficam iguais.
- **Participação do personagem na campanha**: não muda (continua ligada ao mesmo personagem).
- **Peça no mapa / registros de turno**: não mudam; as permissões derivam do dono atual do personagem.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O dono transfere um personagem em menos de 30 segundos, a partir da lista dos seus personagens.
- **SC-002**: Em 100% das transferências, campanhas, situação, vida/energia atuais, status, fichas, peças (posição e direção) e turnos ficam idênticos aos de antes.
- **SC-003**: Logo após a transferência, o antigo dono é recusado em 100% das tentativas de editar, mover ou agir com o personagem, e o novo dono consegue fazer todas elas.
- **SC-004**: Os participantes conectados veem o novo dono em até 5 segundos, sem recarregar.

## Clarifications

### Session 2026-09-27

- Q: Como identificar o usuário de destino? → A: Pelo e-mail exato.
- Q: A transferência é imediata ou precisa de aceite? → A: Imediata, com confirmação do dono.

## Assumptions

- A transferência é de um personagem por vez; transferir vários de uma só vez fica fora do escopo.
- Não há histórico de transferências nem notificação por e-mail; o novo dono simplesmente passa a ver o personagem.
- A opção fica na lista de gerenciamento dos personagens do usuário (onde ele já edita e exclui os seus personagens).
- NPCs, tokens, mapas e campanhas não são transferíveis nesta funcionalidade.
