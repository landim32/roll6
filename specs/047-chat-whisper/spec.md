# Feature Specification: Sussurro no chat

**Feature Branch**: `047-chat-whisper`
**Created**: 2026-10-09
**Status**: Draft
**Input**: User description: "Criação do sussuro: quando o usuário digita um @ no chat, ele abre um combo com o nome dos personagens para auto completar; O mestre tb aparece na lista; Ai o chat entra em modo sussuro; No modo sussurro, a mensagem aparece em amarelho e apenas para os personagens selecionado; Na mensagem deve aparecer um texto pequeno "Visivel apenas para " + As imagens redondas dos personagens; Pode sim selecionar mais de um; O mestre consegue ver todos os sussurros; A ação tb aceita modo sussurro, essa ação deve aparecer para os outros usuários q não estão na lista como "está sussurrando!"; Inclusive no mapa e no log"

## Clarifications

### Session 2026-10-09

- Q: Depois de enviar, o modo sussurro continua ativo ou volta ao normal? → A: Volta ao chat normal depois de cada mensagem (o "@" é usado de novo para o próximo sussurro).
- Q: O que pode ser sussurrado? → A: Texto, foto, áudio, rolagem de dados e ação.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sussurrar para um ou mais personagens (Priority: P1)

Durante a sessão, a jogadora de Aria quer combinar algo só com o personagem Bram e com o mestre. No campo do chat ela digita "@", aparece uma lista com os personagens aprovados na campanha e o "Mestre"; ela escolhe Bram, digita "@" de novo e escolhe o Mestre. O campo fica amarelo, mostrando para quem ela está sussurrando. Ela envia a mensagem: Aria, Bram e o mestre a veem num balão amarelo com "Visível apenas para" e as fotos redondas de Bram e do mestre; os demais jogadores não veem nada.

**Why this priority**: é o núcleo do pedido — conversa privada dentro da mesa.

**Independent Test**: com três jogadores e o mestre, sussurrar de A para B; conferir que A, B e o mestre veem a mensagem amarela com "Visível apenas para" e que C não a vê em nenhum lugar (chat, contagem de não lidas, notificação).

**Acceptance Scenarios**:

1. **Given** o usuário está escrevendo no chat, **When** digita "@", **Then** abre uma lista com os personagens aprovados da campanha (foto redonda + nome) e "Mestre", filtrada pelo que ele digitar depois do "@".
2. **Given** a lista aberta, **When** o usuário escolhe um nome (toque, clique ou Enter), **Then** o "@texto" sai do campo, o escolhido entra como destinatário e o chat entra em modo sussurro (campo amarelo, com os destinatários visíveis acima do campo).
3. **Given** o modo sussurro com um destinatário, **When** o usuário digita "@" e escolhe outro, **Then** os dois passam a ser destinatários; um nome já escolhido não aparece de novo na lista.
4. **Given** destinatários escolhidos, **When** o usuário remove todos, **Then** o chat volta ao modo normal.
5. **Given** a mensagem sussurrada enviada, **When** o autor, os donos dos personagens escolhidos e o mestre olham o chat, **Then** a veem em amarelo com um texto pequeno "Visível apenas para" seguido das fotos redondas dos destinatários.
6. **Given** um jogador cujo personagem não foi escolhido, **When** olha o chat, **Then** a mensagem não aparece, não conta como não lida e não gera notificação para ele.
7. **Given** o mestre, **When** olha o chat, **Then** vê todos os sussurros da campanha, mesmo os que não foram para ele, marcados da mesma forma.
8. **Given** a lista do "@", **When** o personagem do próprio autor estaria nela, **Then** ele não aparece (não se sussurra para si mesmo).

---

### User Story 2 - Ação sussurrada (Priority: P1)

Com o modo sussurro ativo, a jogadora liga "Ação" e escreve "Aria esconde a adaga no casaco de Bram". Para Bram e o mestre a ação aparece completa (em amarelo, com "Visível apenas para"); para os outros jogadores a ação aparece como "Aria está sussurrando!" — no chat, no balão sobre a peça no mapa e no registro do turno.

**Why this priority**: o pedido trata a ação sussurrada explicitamente, incluindo mapa e log.

**Independent Test**: fazer uma ação sussurrada para B; A, B e o mestre veem o texto; C vê "Aria está sussurrando!" no chat, no balão do mapa (2D e 3D) e no resumo do turno.

**Acceptance Scenarios**:

1. **Given** o modo sussurro com destinatários, **When** o usuário registra uma ação, **Then** ela vale como a ação do personagem no turno (as regras de turno não mudam), mas o texto só é visível ao autor, aos destinatários e ao mestre.
2. **Given** um jogador fora da lista, **When** vê a ação no chat, **Then** vê "{personagem} está sussurrando!" no lugar do texto.
3. **Given** um jogador fora da lista, **When** vê o mapa, **Then** o balão de fala sobre a peça mostra "está sussurrando!" (também na vista 3D).
4. **Given** um jogador fora da lista, **When** abre o registro/resumo do turno, **Then** a linha da ação mostra "está sussurrando!" no lugar do texto.
5. **Given** o mestre, **When** vê a ação no chat, no mapa ou no log, **Then** vê o texto completo, marcado como sussurro.

---

### User Story 3 - Sair do modo sussurro (Priority: P2)

O usuário vê claramente que está sussurrando e consegue voltar ao chat normal com um toque.

**Why this priority**: evita mandar para todos algo que era privado (ou o contrário).

**Independent Test**: entrar em modo sussurro, enviar, conferir o estado do campo, sair com o "×".

**Acceptance Scenarios**:

1. **Given** o modo sussurro, **When** o usuário toca no "×" de um destinatário, **Then** só ele sai; tocando no último, o chat volta ao normal.
2. **Given** uma mensagem sussurrada enviada, **When** o envio termina, **Then** o chat volta ao modo normal (sem destinatários); para sussurrar de novo o usuário digita "@" outra vez.

---

### Edge Cases

- Um destinatário deixa de estar aprovado na campanha depois do sussurro: a mensagem continua visível para quem já podia vê-la (o dono daquele personagem perde o acesso ao chat da campanha como hoje).
- O personagem destinatário é transferido para outro usuário: quem vê o sussurro é o dono atual do personagem.
- O jogador tem dois personagens e só um foi escolhido: ele vê o sussurro (a visibilidade é por pessoa dona de algum personagem escolhido).
- Responder a um sussurro: quem não pode ver o original vê a citação como "Mensagem sussurrada", sem texto.
- Reações num sussurro: só quem vê o sussurro pode reagir e ver as reações.
- Converter mensagem sussurrada em ação (e vice-versa): o sussurro é mantido com os mesmos destinatários.
- Apagar um sussurro: mesmas regras de hoje (autor ou mestre).
- "@" no meio de um e-mail ou texto sem nenhum nome correspondente: a lista aparece vazia/fecha e o texto fica como foi digitado.
- O mestre, falando como "Mestre", também pode sussurrar para personagens; a lista dele não mostra "Mestre".
- Assistentes de IA da mesa veem e enviam sussurros com as mesmas regras do usuário dono da chave.

## Requirements *(mandatory)*

### Functional Requirements

**Escolher destinatários**

- **FR-001**: Digitar "@" no campo do chat MUST abrir uma lista de autocompletar com os personagens aprovados na campanha (foto redonda e nome) e "Mestre", filtrada pelas letras digitadas após o "@", sem o próprio personagem do autor nem nomes já escolhidos.
- **FR-002**: Escolher um nome MUST retirar o "@texto" do campo, adicioná-lo aos destinatários e colocar o chat em modo sussurro; é possível escolher vários.
- **FR-003**: No modo sussurro o campo MUST ficar amarelo e mostrar os destinatários (foto e nome) com um "×" para remover cada um; sem destinatários o modo termina.
- **FR-004**: Podem ser sussurrados: texto, foto (escolhida no clipe ou colada), áudio, rolagem de dados e ação. Enquetes, narrações, movimentos e mudanças de status continuam públicos.
- **FR-004a**: Depois de enviar uma mensagem, foto, áudio, rolagem ou ação sussurrada, o chat MUST voltar ao modo normal (destinatários limpos).

**Quem vê**

- **FR-005**: Uma mensagem sussurrada MUST ser visível apenas para o autor, para os usuários donos dos personagens escolhidos, para o mestre (se escolhido ou não) e para assistentes de IA usando a chave de um desses usuários.
- **FR-006**: Para os demais, uma mensagem sussurrada MUST NOT aparecer no chat, na contagem de não lidas, nas notificações, nas respostas (citação mostra "Mensagem sussurrada") nem em nenhuma leitura do sistema.
- **FR-007**: A mensagem sussurrada MUST aparecer em amarelo com o texto pequeno "Visível apenas para" seguido das fotos redondas dos destinatários (o mestre com o ícone/inicial de "Mestre").
- **FR-008**: As notificações de uma mensagem sussurrada MUST ir apenas para os destinatários (o mestre só é notificado se foi escolhido).

**Ação sussurrada**

- **FR-009**: Com o modo sussurro ativo, uma ação MUST ser registrada como a ação do personagem no turno, com as mesmas regras de hoje (uma ação válida por turno, cancelamento, conversão).
- **FR-010**: Para quem não está na lista (nem é o autor nem o mestre), a ação MUST aparecer como "{personagem} está sussurrando!" — no chat, no balão do mapa (2D e 3D), no registro e no resumo do turno —, sem o texto.
- **FR-011**: O aviso ao mestre de uma nova ação MUST continuar com o texto completo (ele vê todos os sussurros).

**Consistência**

- **FR-012**: Reações, respostas e cópia de um sussurro MUST seguir a visibilidade dele.
- **FR-013**: Os assistentes de IA MUST poder enviar mensagens e ações sussurradas e MUST ler o chat e o turno com as mesmas regras de visibilidade do usuário da chave.

### Key Entities

- **Sussurro**: uma entrada do chat (mensagem ou ação) com uma lista de destinatários; cada destinatário é um personagem da campanha ou o mestre.
- **Destinatário**: personagem aprovado (visto pelo seu dono atual) ou o mestre.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos sussurros ficam invisíveis para quem não é autor, destinatário nem mestre — em chat, contagem de não lidas, notificações, mapa, registro e assistentes de IA.
- **SC-002**: O usuário escolhe um destinatário em no máximo 3 toques a partir de digitar "@".
- **SC-003**: Uma ação sussurrada aparece como "está sussurrando!" para quem está fora da lista em todos os lugares onde a ação aparece (chat, mapa 2D, mapa 3D, resumo do turno).
- **SC-004**: Destinatários veem o sussurro em tempo real, como qualquer mensagem (menos de 2 segundos).

## Assumptions

- Os destinatários são escolhidos entre os personagens **aprovados** da campanha e o "Mestre"; NPCs não recebem sussurros.
- A visibilidade é por pessoa: o dono atual de um personagem escolhido vê o sussurro.
- A narração do mestre e as enquetes não são sussurradas.
- Uma rolagem sussurrada é sorteada pelo servidor como qualquer rolagem; quem está fora da lista não a vê.
- Movimentos e mudanças de status continuam públicos (só a ação e as mensagens podem ser sussurradas).
- O amarelo do sussurro segue a paleta do chat (o mesmo tom do Curtir), distinto do vermelho do modo Ação.
